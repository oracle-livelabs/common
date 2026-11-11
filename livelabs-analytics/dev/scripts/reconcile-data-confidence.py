#!/usr/bin/env python3
"""Reconcile deterministic repository, update, publish-type, and metric evidence.

The script never fuzzy-matches titles. Repository recovery is limited to an
explicit Oracle LiveLabs URL or an exact normalized title found in one repo.
Dashboard metrics remain title-scoped when more than one WMS row shares a title.
"""

from __future__ import annotations

import argparse
from collections import Counter, defaultdict
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import re
import subprocess
import unicodedata
from urllib.parse import quote, unquote, urlparse
from urllib.request import Request, urlopen


SKIP_DIRS = {".git", ".github", ".venv", "node_modules", "vendor"}
URL_FIELDS = (
    "prod_github_url",
    "paid_url",
    "greenbutton_url",
    "alwaysfree_url",
    "freetier_url",
    "sprint_url",
    "production_url",
)
VIEW_FIELDS = (
    "recent_views_7d",
    "recent_views_14d",
    "recent_views_30d",
    "recent_views_90d",
    "recent_views_180d",
    "recent_views_12m",
)


def read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def clean(value: object) -> str:
    return "" if value in (None, "") else str(value).strip()


def normalize_title(value: object) -> str:
    text = unicodedata.normalize("NFKD", clean(value)).casefold().replace("&", " and ")
    text = "".join(character for character in text if not unicodedata.combining(character))
    return re.sub(r"[^a-z0-9]+", " ", text).strip()


def git(repo: Path, *arguments: str, timeout: int = 30) -> str | None:
    process = subprocess.run(
        [
            "git",
            "-c",
            f"safe.directory={repo.as_posix()}",
            "-C",
            str(repo),
            *arguments,
        ],
        text=True,
        capture_output=True,
        check=False,
        timeout=timeout,
    )
    return process.stdout.strip() if process.returncode == 0 else None


def local_manifests(repo_root: Path) -> list[dict]:
    manifests: list[dict] = []
    if not repo_root.exists():
        return manifests
    for repo in sorted(path for path in repo_root.iterdir() if path.is_dir() and (path / ".git").exists()):
        for root, dirs, files in os.walk(repo):
            dirs[:] = [name for name in dirs if name not in SKIP_DIRS]
            if "manifest.json" not in {name.lower() for name in files}:
                continue
            manifest_path = next(Path(root) / name for name in files if name.lower() == "manifest.json")
            try:
                payload = json.loads(manifest_path.read_text(encoding="utf-8-sig"))
            except (OSError, json.JSONDecodeError):
                continue
            title = clean(payload.get("workshoptitle") or payload.get("workshopTitle") or payload.get("title"))
            if not title:
                continue
            manifests.append(
                {
                    "repo_slug": repo.name.lower(),
                    "repo_path": repo,
                    "manifest_path": manifest_path.relative_to(repo).as_posix(),
                    "title": title,
                    "source": "local",
                }
            )
    return manifests


def git_object_manifests(cache_root: Path) -> list[dict]:
    manifests: list[dict] = []
    if not cache_root.exists():
        return manifests
    for repo in sorted(path for path in cache_root.iterdir() if path.is_dir() and (path / ".git").exists()):
        listing = git(repo, "ls-tree", "-r", "--name-only", "HEAD", timeout=60)
        if not listing:
            continue
        for relative in sorted(path for path in listing.splitlines() if path.lower().endswith("manifest.json")):
            content = git(repo, "show", f"HEAD:{relative}", timeout=90)
            if not content:
                continue
            try:
                payload = json.loads(content.lstrip("\ufeff"))
            except json.JSONDecodeError:
                continue
            title = clean(payload.get("workshoptitle") or payload.get("workshopTitle") or payload.get("title"))
            if not title:
                continue
            manifests.append(
                {
                    "repo_slug": repo.name.lower(),
                    "repo_path": repo,
                    "manifest_path": relative.replace("\\", "/"),
                    "title": title,
                    "source": "live_cache",
                }
            )
    return manifests


def repository_from_url(value: object, known_repositories: set[str]) -> tuple[str | None, str | None, str | None]:
    raw = clean(value)
    if not raw:
        return None, None, None
    try:
        parsed = urlparse(raw)
    except ValueError:
        return None, None, None
    parts = [unquote(part) for part in parsed.path.split("/") if part]
    host = parsed.netloc.casefold()
    if host in {"oracle-livelabs.github.io", "oracle.github.io"} and parts:
        candidate = parts[0].casefold()
        if candidate in known_repositories:
            source = "oracle_livelabs_url" if host == "oracle-livelabs.github.io" else "legacy_oracle_github_url"
            return candidate, "/".join(parts[1:]), source
    if host == "github.com" and len(parts) >= 2 and parts[0].casefold() == "oracle-livelabs":
        candidate = parts[1].removesuffix(".git").casefold()
        if candidate in known_repositories:
            subpath = None
            if len(parts) >= 5 and parts[2].casefold() in {"tree", "blob"}:
                subpath = "/".join(parts[4:])
            return candidate, subpath, "oracle_livelabs_github_url"
    return None, None, None


def row_repository_url(row: dict, known_repositories: set[str]) -> tuple[str | None, str | None, str | None, str | None]:
    for field in URL_FIELDS:
        repo_slug, subpath, source = repository_from_url(row.get(field), known_repositories)
        if repo_slug:
            return repo_slug, subpath, source, field
    return None, None, None, None


def mapping_gap_status(row: dict) -> tuple[str, str]:
    values = [clean(row.get(field)) for field in URL_FIELDS if clean(row.get(field))]
    if not values:
        return "no_repository_url", "No repository URL is present in the current WMS export."
    hosts = []
    for value in values:
        try:
            hosts.append(urlparse(value).netloc.casefold())
        except ValueError:
            continue
    if hosts and set(hosts) <= {"livelabs.oracle.com"}:
        return "catalog_url_only", "The current WMS export contains a LiveLabs catalog URL but no repository URL."
    return (
        "external_or_legacy_url_unmapped",
        "The current WMS URL does not deterministically identify an available oracle-livelabs repository.",
    )


def candidate_manifest_paths(subpath: str | None) -> list[str]:
    if not subpath:
        return []
    cleaned = subpath.strip("/")
    cleaned = re.sub(r"/index\.html$", "", cleaned, flags=re.IGNORECASE)
    candidates = [cleaned]
    if not cleaned.lower().endswith("manifest.json"):
        candidates.append(f"{cleaned}/manifest.json")
    return list(dict.fromkeys(candidate for candidate in candidates if candidate))


def latest_path_commit_api(repo_slug: str, paths: list[str], cache: dict[tuple[str, str], dict]) -> dict:
    results: list[dict] = []
    for path in sorted(set(paths)):
        key = (repo_slug, path)
        if key not in cache:
            url = (
                f"https://api.github.com/repos/oracle-livelabs/{quote(repo_slug)}/commits"
                f"?path={quote(path)}&per_page=1"
            )
            request = Request(
                url,
                headers={
                    "Accept": "application/vnd.github+json",
                    "User-Agent": "oracle-livelabs-analytics-reconciliation",
                    "X-GitHub-Api-Version": "2022-11-28",
                },
            )
            try:
                with urlopen(request, timeout=30) as response:
                    payload = json.loads(response.read().decode("utf-8"))
                first = payload[0] if isinstance(payload, list) and payload else {}
                commit = first.get("commit") or {}
                committer = commit.get("committer") or {}
                author = commit.get("author") or {}
                cache[key] = {
                    "date": committer.get("date") or author.get("date"),
                    "subject": clean(commit.get("message")).splitlines()[0] if commit.get("message") else None,
                    "author": author.get("name"),
                }
            except Exception as exc:  # Network evidence is optional and reported, never guessed.
                cache[key] = {"error": f"{type(exc).__name__}: {exc}"}
        if cache[key].get("date"):
            results.append(cache[key])
    return max(results, key=lambda item: item["date"]) if results else {}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--wms-json", required=True)
    parser.add_argument("--workshop-updates", required=True)
    parser.add_argument("--prior-workshop-updates")
    parser.add_argument("--dashboard-views", required=True)
    parser.add_argument("--github-audit", required=True)
    parser.add_argument("--prior-search-index")
    parser.add_argument("--repo-root", required=True)
    parser.add_argument("--live-cache-root")
    parser.add_argument("--refresh-live-path-dates", action="store_true")
    parser.add_argument("--wms-output", required=True)
    parser.add_argument("--updates-output", required=True)
    parser.add_argument("--report-output", required=True)
    args = parser.parse_args()

    wms_payload = read_json(Path(args.wms_json))
    updates_payload = read_json(Path(args.workshop_updates))
    dashboard_payload = read_json(Path(args.dashboard_views))
    github_payload = read_json(Path(args.github_audit))
    rows = wms_payload.get("canonical_rows", [])
    updates = updates_payload.get("rows", [])
    prior_update_source_by_key: dict[str, str] = {}
    if args.prior_workshop_updates and Path(args.prior_workshop_updates).exists():
        prior_updates_payload = read_json(Path(args.prior_workshop_updates))
        prior_update_source_by_key = {
            clean(row.get("workshop_key")): clean(row.get("last_updated_source"))
            for row in prior_updates_payload.get("rows", [])
            if clean(row.get("workshop_key"))
        }

    live_repositories = {
        clean(row.get("repo_slug")).casefold()
        for row in github_payload.get("repositories", [])
        if clean(row.get("repo_slug")) and row.get("live_head_probe_status") == "available"
    }
    audit_by_repo = {
        clean(row.get("repo_slug")).casefold(): row
        for row in github_payload.get("repositories", [])
        if clean(row.get("repo_slug"))
    }
    local = local_manifests(Path(args.repo_root))
    cached = git_object_manifests(Path(args.live_cache_root)) if args.live_cache_root else []
    manifests = local + cached
    known_repositories = live_repositories | {entry["repo_slug"] for entry in manifests}
    manifests_by_title: dict[str, list[dict]] = defaultdict(list)
    manifests_by_repo: dict[str, list[dict]] = defaultdict(list)
    for manifest in manifests:
        manifests_by_title[normalize_title(manifest["title"])].append(manifest)
        manifests_by_repo[manifest["repo_slug"]].append(manifest)

    title_groups: dict[str, list[dict]] = defaultdict(list)
    for row in rows:
        title_groups[clean(row.get("normalized_title")) or normalize_title(row.get("title"))].append(row)
    dashboard_by_title = {
        clean(row.get("normalized_title")) or normalize_title(row.get("title")): row
        for row in dashboard_payload.get("workshops", [])
    }
    prior_missing_metric_keys: set[str] = set()
    if args.prior_search_index and Path(args.prior_search_index).exists():
        prior_search_payload = read_json(Path(args.prior_search_index))
        prior_missing_metric_keys = {
            clean(record.get("key"))
            for record in prior_search_payload.get("records", [])
            if clean(record.get("livelabsId"))
            and not (record.get("sourceFlags") or {}).get("in_dashboard_windows")
        }

    mapping_before = sum(1 for row in rows if clean(row.get("repo_slug")))
    crossmapped: list[dict] = []
    mapping_status_counts: Counter[str] = Counter()
    metric_status_counts: Counter[str] = Counter()
    publish_type_resolution_counts: Counter[str] = Counter()

    for row in rows:
        normalized = clean(row.get("normalized_title")) or normalize_title(row.get("title"))
        current_repo = clean(row.get("repo_slug")).casefold()
        url_repo, url_subpath, url_source, url_field = row_repository_url(row, known_repositories)
        title_matches = manifests_by_title.get(normalized, [])
        title_repositories = sorted(set(match["repo_slug"] for match in title_matches))
        recovered_repo = None
        recovered_source = None
        recovered_detail = None
        if not current_repo and clean(row.get("livelabs_id")):
            if url_repo:
                recovered_repo = url_repo
                recovered_source = url_source
                recovered_detail = f"{url_field} deterministically identifies oracle-livelabs/{url_repo}."
            elif len(title_repositories) == 1:
                recovered_repo = title_repositories[0]
                recovered_source = "exact_unique_manifest_title"
                recovered_detail = (
                    f"Exact normalized workshop title found in {len(title_matches)} manifest variant(s) "
                    f"inside oracle-livelabs/{recovered_repo}."
                )
            if recovered_repo:
                row["repo_slug"] = recovered_repo
                row["repo_mapping_source"] = recovered_source
                row["repo_mapping_confidence"] = "high" if recovered_source != "exact_unique_manifest_title" else "medium"
                row["repository_mapping_status"] = "mapped_deterministically"
                row["repository_mapping_evidence"] = recovered_detail
                crossmapped.append(
                    {
                        "workshop_key": row.get("workshop_key"),
                        "livelabs_id": row.get("livelabs_id"),
                        "wms_id": row.get("wms_id"),
                        "title": row.get("title"),
                        "repo_slug": recovered_repo,
                        "mapping_source": recovered_source,
                        "mapping_evidence": recovered_detail,
                    }
                )
                current_repo = recovered_repo
        if current_repo and not row.get("repository_mapping_status"):
            row["repository_mapping_status"] = "mapped_from_current_wms"
            row["repository_mapping_evidence"] = clean(row.get("repo_mapping_source")) or "Current WMS repository URL"
        elif not current_repo:
            status, reason = mapping_gap_status(row)
            row["repository_mapping_status"] = status
            row["repository_mapping_evidence"] = reason
        mapping_status_counts[row["repository_mapping_status"]] += 1

        if clean(row.get("publish_type")):
            row["publish_type_resolution_status"] = "confirmed_from_current_or_stable_id_history"
            row["publish_type_resolution_reason"] = "Publish Type is present in the reconciled WMS record."
        elif clean(row.get("livelabs_id")):
            row["publish_type_resolution_status"] = "not_assigned_in_current_wms_workflow"
            row["publish_type_resolution_reason"] = (
                f"Current WMS Publish Status is {clean(row.get('publish_status')) or 'unset'}; "
                "the supplied export and stable-ID history do not provide a Publish Type."
            )
        else:
            row["publish_type_resolution_status"] = "pending_livelabs_identity"
            row["publish_type_resolution_reason"] = "No LiveLabs ID or Publish Type exists in the current WMS row."
        publish_type_resolution_counts[row["publish_type_resolution_status"]] += 1

        dashboard = dashboard_by_title.get(normalized)
        group_size = len(title_groups.get(normalized, []))
        if not dashboard:
            row["dashboard_metric_status"] = "not_in_dashboard_snapshot"
            row["dashboard_metric_scope"] = "unavailable"
            row["dashboard_metric_resolution_reason"] = "No exact title row exists in the 14 August 2026 dashboard workbook."
        elif not any(dashboard.get(field) is not None for field in VIEW_FIELDS):
            row["dashboard_metric_status"] = "dashboard_title_ambiguous_no_usable_metric"
            row["dashboard_metric_scope"] = "unavailable_ambiguous_title"
            row["dashboard_metric_shared_record_count"] = group_size
            ambiguous_windows = ", ".join(dashboard.get("ambiguous_window_keys") or []) or "all supplied windows"
            row["dashboard_metric_resolution_reason"] = (
                f"The dashboard title is present, but {ambiguous_windows} contain conflicting duplicate values; "
                "no metric is assigned."
            )
        elif group_size > 1:
            row["dashboard_metric_status"] = "available_shared_title_scope"
            row["dashboard_metric_scope"] = "shared_title_across_wms_records"
            row["dashboard_metric_shared_record_count"] = group_size
            row["dashboard_metric_resolution_reason"] = (
                f"Dashboard metrics are title-level and are shared by {group_size} current WMS records; "
                "they are not LiveLabs-ID-specific."
            )
        else:
            row["dashboard_metric_status"] = "available_unique_title_scope"
            row["dashboard_metric_scope"] = "exact_unique_title"
            row["dashboard_metric_shared_record_count"] = 1
            row["dashboard_metric_resolution_reason"] = "Exact dashboard title maps to one current WMS record."
        metric_status_counts[row["dashboard_metric_status"]] += 1

    row_by_key = {clean(row.get("workshop_key")): row for row in rows}
    live_api_cache: dict[tuple[str, str], dict] = {}
    update_resolution_counts: Counter[str] = Counter()
    update_resolutions: list[dict] = []
    for update in updates:
        source = clean(update.get("last_updated_source"))
        if source not in {"missing_local_repo", "unmapped_repo"}:
            continue
        row = row_by_key.get(clean(update.get("workshop_key")))
        if not row:
            continue
        repo_slug = clean(row.get("repo_slug")).casefold()
        if not repo_slug:
            update["repository_evidence_status"] = row.get("repository_mapping_status")
            update_resolution_counts["repository_unmapped"] += 1
            continue

        normalized = clean(row.get("normalized_title")) or normalize_title(row.get("title"))
        matches = [item for item in manifests_by_title.get(normalized, []) if item["repo_slug"] == repo_slug]
        _url_repo, subpath, _url_source, _url_field = row_repository_url(row, known_repositories)
        available_paths = {item["manifest_path"] for item in manifests_by_repo.get(repo_slug, [])}
        direct_paths = [path for path in candidate_manifest_paths(subpath) if path in available_paths]
        selected_paths = direct_paths or sorted(set(item["manifest_path"] for item in matches))
        repo_entries = manifests_by_repo.get(repo_slug, [])
        repo_entry = repo_entries[0] if repo_entries else None
        update_date = None
        commit_subject = None
        commit_author = None
        if selected_paths and repo_entry and repo_entry["source"] == "local":
            update_date = git(repo_entry["repo_path"], "log", "-1", "--format=%cI", "--", *selected_paths, timeout=90)
            commit_subject = git(repo_entry["repo_path"], "log", "-1", "--format=%s", "--", *selected_paths, timeout=90)
            commit_author = git(repo_entry["repo_path"], "log", "-1", "--format=%an", "--", *selected_paths, timeout=90)
        elif selected_paths and args.refresh_live_path_dates:
            evidence = latest_path_commit_api(repo_slug, selected_paths, live_api_cache)
            update_date = evidence.get("date")
            commit_subject = evidence.get("subject")
            commit_author = evidence.get("author")

        audit = audit_by_repo.get(repo_slug, {})
        repo_head_date = None
        if repo_entry:
            repo_head_date = git(repo_entry["repo_path"], "log", "-1", "--format=%cI", "HEAD")
        repo_head_date = repo_head_date or clean(audit.get("github_pushed_at")) or None
        if selected_paths and update_date:
            evidence_source = (
                "local_repo_workshop_path" if repo_entry and repo_entry["source"] == "local"
                else "live_github_http_workshop_path"
            )
            update.update(
                {
                    "repo_slug": repo_slug,
                    "last_meaningful_workshop_update_date": update_date,
                    "last_updated_source": evidence_source,
                    "last_updated_confidence": "high",
                    "resolved_workshop_path": str(Path(selected_paths[0]).parent).replace("\\", "/"),
                    "resolved_manifest_path": selected_paths[0],
                    "resolved_manifest_paths": selected_paths,
                    "latest_workshop_commit_date": update_date,
                    "latest_meaningful_commit_subject": commit_subject,
                    "commit_author_name": commit_author,
                    "latest_live_git_commit_date": repo_head_date,
                    "repository_evidence_status": "workshop_path_resolved",
                }
            )
            resolution = "workshop_path_resolved"
        elif repo_slug in live_repositories and repo_head_date:
            update.update(
                {
                    "repo_slug": repo_slug,
                    "last_meaningful_workshop_update_date": repo_head_date,
                    "last_updated_source": "live_github_http_repo_level_proxy",
                    "last_updated_confidence": "medium",
                    "latest_live_git_commit_date": repo_head_date,
                    "repository_evidence_status": "live_repository_proxy",
                }
            )
            resolution = "live_repository_proxy"
        elif repo_entry and repo_head_date:
            update.update(
                {
                    "repo_slug": repo_slug,
                    "last_meaningful_workshop_update_date": repo_head_date,
                    "last_updated_source": "local_repo_level_proxy",
                    "last_updated_confidence": "medium",
                    "latest_live_git_commit_date": repo_head_date,
                    "repository_evidence_status": "local_repository_proxy",
                }
            )
            resolution = "local_repository_proxy"
        else:
            update["repository_evidence_status"] = "live_repository_unavailable"
            update["last_updated_confidence"] = "unavailable"
            resolution = "live_repository_unavailable"
        update_resolution_counts[resolution] += 1
        if source == "missing_local_repo" or row.get("repository_mapping_status") == "mapped_deterministically":
            update_resolutions.append(
                {
                    "workshop_key": row.get("workshop_key"),
                    "livelabs_id": row.get("livelabs_id"),
                    "wms_id": row.get("wms_id"),
                    "repo_slug": repo_slug,
                    "prior_source": source,
                    "resolution": resolution,
                    "resolved_manifest_paths": selected_paths,
                    "latest_update": update.get("last_meaningful_workshop_update_date"),
                }
            )

    generated_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    final_update_resolution_counts: Counter[str] = Counter()
    prior_missing_local_resolutions: Counter[str] = Counter()
    prior_missing_local_records: list[dict] = []
    for update in updates:
        final_source = clean(update.get("last_updated_source"))
        evidence_status = clean(update.get("repository_evidence_status"))
        if final_source.endswith("workshop_path"):
            final_resolution = "workshop_path_resolved"
        elif final_source.endswith("repo_level_proxy"):
            final_resolution = "repository_proxy"
        elif evidence_status == "live_repository_unavailable":
            final_resolution = "live_repository_unavailable"
        elif final_source == "unmapped_repo":
            final_resolution = "repository_unmapped"
        else:
            final_resolution = final_source or "unavailable"
        final_update_resolution_counts[final_resolution] += 1
        key = clean(update.get("workshop_key"))
        if prior_update_source_by_key.get(key) == "missing_local_repo":
            prior_missing_local_resolutions[final_resolution] += 1
            row = row_by_key.get(key, {})
            prior_missing_local_records.append(
                {
                    "workshop_key": key,
                    "livelabs_id": row.get("livelabs_id"),
                    "wms_id": row.get("wms_id"),
                    "repo_slug": row.get("repo_slug"),
                    "resolution": final_resolution,
                    "repository_evidence_status": evidence_status or None,
                    "latest_update": update.get("last_meaningful_workshop_update_date"),
                }
            )
    prior_gap_breakdown: Counter[str] = Counter()
    for row in rows:
        if clean(row.get("workshop_key")) not in prior_missing_metric_keys:
            continue
        normalized = clean(row.get("normalized_title")) or normalize_title(row.get("title"))
        dashboard = dashboard_by_title.get(normalized)
        if not dashboard:
            prior_gap_breakdown["no_exact_dashboard_title"] += 1
        elif not any(dashboard.get(field) is not None for field in VIEW_FIELDS):
            prior_gap_breakdown["dashboard_title_ambiguous_no_usable_metric"] += 1
        else:
            prior_gap_breakdown["shared_title_assigned_to_another_wms_row"] += 1
    wms_payload.setdefault("metadata", {}).update(
        {
            "data_confidence_reconciled_at": generated_at,
            "repository_mapping_count_before": mapping_before,
            "repository_mapping_count_after": sum(1 for row in rows if clean(row.get("repo_slug"))),
            "repository_mapping_status_counts": dict(mapping_status_counts),
            "publish_type_resolution_counts": dict(publish_type_resolution_counts),
            "dashboard_metric_status_counts": dict(metric_status_counts),
            "data_confidence_policy": "explicit URL or exact unique manifest title only; no fuzzy matching",
        }
    )
    updates_payload.setdefault("metadata", {}).update(
        {
            "data_confidence_reconciled_at": generated_at,
            "reconciliation_source_counts": dict(update_resolution_counts),
            "live_path_api_request_count": len(live_api_cache),
        }
    )
    report = {
        "generated_at": generated_at,
        "source_snapshot_date": dashboard_payload.get("metadata", {}).get("source_snapshot_date"),
        "policy": "No fuzzy title matching and no inferred Publish Type.",
        "repository_mapping": {
            "mapped_before": mapping_before,
            "mapped_after": sum(1 for row in rows if clean(row.get("repo_slug"))),
            "crossmapped_records": len(crossmapped),
            "remaining_unmapped_livelabs_id_records": sum(
                1 for row in rows if clean(row.get("livelabs_id")) and not clean(row.get("repo_slug"))
            ),
            "status_counts": dict(mapping_status_counts),
            "crossmapped": crossmapped,
        },
        "repository_update_evidence": {
            "resolution_counts": dict(final_update_resolution_counts),
            "prior_missing_local_repo_resolution_counts": dict(prior_missing_local_resolutions),
            "reviewed_records": prior_missing_local_records or update_resolutions,
        },
        "publish_type": {
            "missing_livelabs_id_records": sum(
                1 for row in rows if clean(row.get("livelabs_id")) and not clean(row.get("publish_type"))
            ),
            "resolution_counts": dict(publish_type_resolution_counts),
        },
        "dashboard_metrics": {
            "livelabs_id_without_exact_dashboard_title": sum(
                1
                for row in rows
                if clean(row.get("livelabs_id")) and row.get("dashboard_metric_status") == "not_in_dashboard_snapshot"
            ),
            "livelabs_id_with_shared_title_metrics": sum(
                1
                for row in rows
                if clean(row.get("livelabs_id")) and row.get("dashboard_metric_status") == "available_shared_title_scope"
            ),
            "livelabs_id_with_ambiguous_dashboard_title_no_usable_metric": sum(
                1
                for row in rows
                if clean(row.get("livelabs_id"))
                and row.get("dashboard_metric_status") == "dashboard_title_ambiguous_no_usable_metric"
            ),
            "previously_reported_missing_livelabs_id_gap": {
                "total": len(prior_missing_metric_keys),
                **dict(prior_gap_breakdown),
            },
            "status_counts": dict(metric_status_counts),
        },
    }
    write_json(Path(args.wms_output), wms_payload)
    write_json(Path(args.updates_output), updates_payload)
    write_json(Path(args.report_output), report)
    print(json.dumps(report, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
