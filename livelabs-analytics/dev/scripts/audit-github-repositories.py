#!/usr/bin/env python3
"""Audit current oracle-livelabs repositories against canonical WMS mappings."""

from __future__ import annotations

import argparse
from collections import Counter
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import subprocess
from urllib.parse import unquote, urlparse
from urllib.request import Request, urlopen


GITHUB_ORG = "oracle-livelabs"
SKIP_DIRS = {".git", ".github", ".venv", "node_modules", "vendor"}


def load_rows(path: Path) -> list[dict]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    if isinstance(payload, list):
        return payload
    for key in ("canonical_rows", "rows"):
        if isinstance(payload.get(key), list):
            return payload[key]
    raise ValueError(f"Unsupported WMS payload: {path}")


def github_json(url: str) -> object:
    request = Request(
        url,
        headers={
            "Accept": "application/vnd.github+json",
            "User-Agent": "oracle-livelabs-analytics-audit",
            "X-GitHub-Api-Version": "2022-11-28",
        },
    )
    with urlopen(request, timeout=30) as response:
        return json.loads(response.read().decode("utf-8"))


def load_org_repositories() -> list[dict]:
    repositories: list[dict] = []
    for page in range(1, 6):
        payload = github_json(
            f"https://api.github.com/orgs/{GITHUB_ORG}/repos"
            f"?type=public&sort=full_name&per_page=100&page={page}"
        )
        if not isinstance(payload, list):
            raise ValueError("GitHub organization response was not a repository list")
        repositories.extend(payload)
        if len(payload) < 100:
            break
    return repositories


def git_value(repo_path: Path, *args: str) -> str | None:
    process = subprocess.run(
        ["git", "-C", str(repo_path), *args],
        text=True,
        capture_output=True,
        check=False,
        timeout=20,
    )
    value = process.stdout.strip()
    return value or None if process.returncode == 0 else None


def git_success(repo_path: Path, *args: str) -> bool:
    process = subprocess.run(
        ["git", "-C", str(repo_path), *args],
        text=True,
        capture_output=True,
        check=False,
        timeout=20,
    )
    return process.returncode == 0


def probe_live_head(repo_slug: str) -> dict:
    url = f"https://github.com/{GITHUB_ORG}/{repo_slug}.git"
    environment = dict(os.environ)
    environment["GIT_TERMINAL_PROMPT"] = "0"
    try:
        process = subprocess.run(
            ["git", "ls-remote", "--symref", url, "HEAD"],
            text=True,
            capture_output=True,
            check=False,
            timeout=30,
            env=environment,
        )
    except subprocess.TimeoutExpired:
        return {"status": "timeout", "default_branch": None, "head_sha": None}
    branch = None
    head_sha = None
    for line in process.stdout.splitlines():
        if line.startswith("ref: ") and line.endswith("\tHEAD"):
            branch = line.split("\t", 1)[0].removeprefix("ref: refs/heads/")
        elif line.endswith("\tHEAD"):
            head_sha = line.split("\t", 1)[0]
    return {
        "status": "available" if process.returncode == 0 and head_sha else f"failed_{process.returncode}",
        "default_branch": branch,
        "head_sha": head_sha,
    }


def probe_live_heads(repo_slugs: list[str]) -> dict[str, dict]:
    results: dict[str, dict] = {}
    with ThreadPoolExecutor(max_workers=8) as executor:
        futures = {executor.submit(probe_live_head, slug): slug for slug in repo_slugs}
        for future in as_completed(futures):
            slug = futures[future]
            try:
                results[slug] = future.result()
            except Exception as exc:
                results[slug] = {
                    "status": f"error_{type(exc).__name__}",
                    "default_branch": None,
                    "head_sha": None,
                }
    return results


def local_manifest_count(repo_path: Path) -> int:
    count = 0
    for _root, dirs, files in os.walk(repo_path):
        dirs[:] = [name for name in dirs if name not in SKIP_DIRS]
        count += sum(1 for name in files if name.lower() == "manifest.json")
    return count


def github_subpath(value: object, repo_slug: str) -> str | None:
    if not value:
        return None
    parsed = urlparse(str(value))
    parts = [unquote(part) for part in parsed.path.strip("/").split("/")]
    if parsed.netloc.lower() == "oracle-livelabs.github.io":
        if len(parts) < 2 or parts[0].lower() != repo_slug.lower():
            return None
        subpath = "/".join(parts[1:]).strip("/")
        return subpath or None
    if len(parts) < 6 or parts[0].lower() != GITHUB_ORG or parts[1].lower() != repo_slug.lower():
        return None
    if parts[2].lower() not in {"tree", "blob"}:
        return None
    subpath = "/".join(parts[4:]).strip("/")
    return subpath or None


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--wms-json", required=True, help="Canonical WMS JSON path")
    parser.add_argument("--repo-root", required=True, help="Local repository mirror root")
    parser.add_argument("--output", required=True, help="Output JSON path")
    args = parser.parse_args()

    wms_path = Path(args.wms_json)
    repo_root = Path(args.repo_root)
    rows = load_rows(wms_path)
    mapped_counts = Counter(row.get("repo_slug") for row in rows if row.get("repo_slug"))

    api_error = None
    try:
        org_repositories = load_org_repositories()
    except Exception as exc:
        org_repositories = []
        api_error = f"{type(exc).__name__}: {exc}"

    org_by_name = {str(repo.get("name", "")).lower(): repo for repo in org_repositories}
    live_heads = probe_live_heads(sorted(mapped_counts))
    local_repo_names = {
        path.name.lower()
        for path in repo_root.iterdir()
        if path.is_dir() and (path / ".git").exists()
    } if repo_root.exists() else set()
    all_names = sorted(set(org_by_name) | set(mapped_counts) | local_repo_names)
    repository_rows: list[dict] = []
    local_manifest_total = 0

    for name in all_names:
        api_repo = org_by_name.get(name, {})
        local_path = repo_root / name
        local_exists = (local_path / ".git").exists()
        manifest_count = local_manifest_count(local_path) if local_exists else 0
        local_manifest_total += manifest_count
        live_head = live_heads.get(name, {})
        local_contains_live_head = None
        if local_exists and live_head.get("head_sha"):
            local_contains_live_head = git_success(
                local_path, "cat-file", "-e", f"{live_head['head_sha']}^{{commit}}"
            )
        repository_rows.append(
            {
                "repo_slug": name,
                "github_url": api_repo.get("html_url") or f"https://github.com/{GITHUB_ORG}/{name}",
                "github_api_present": bool(api_repo),
                "default_branch": live_head.get("default_branch") or api_repo.get("default_branch"),
                "live_head_probe_status": live_head.get("status"),
                "live_head_sha": live_head.get("head_sha"),
                "github_pushed_at": api_repo.get("pushed_at"),
                "github_updated_at": api_repo.get("updated_at"),
                "archived": api_repo.get("archived"),
                "disabled": api_repo.get("disabled"),
                "wms_mapped_row_count": mapped_counts.get(name, 0),
                "wms_mapped": name in mapped_counts,
                "local_repo_exists": local_exists,
                "local_manifest_count": manifest_count,
                "local_contains_live_head": local_contains_live_head,
                "local_head_commit_date": git_value(local_path, "log", "-1", "--format=%cI", "HEAD")
                if local_exists
                else None,
                "latest_local_remote_ref_date": git_value(
                    local_path,
                    "for-each-ref",
                    "--sort=-committerdate",
                    "--count=1",
                    "--format=%(committerdate:iso-strict)",
                    "refs/remotes",
                )
                if local_exists
                else None,
            }
        )

    testable_paths = 0
    existing_paths = 0
    for row in rows:
        repo_slug = row.get("repo_slug")
        subpath = github_subpath(row.get("prod_github_url"), repo_slug) if repo_slug else None
        if not repo_slug or not subpath:
            continue
        local_path = repo_root / repo_slug
        if not (local_path / ".git").exists():
            continue
        testable_paths += 1
        if (local_path / Path(*subpath.split("/"))).exists():
            existing_paths += 1

    payload = {
        "metadata": {
            "generated_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "snapshot_date": datetime.now(timezone.utc).date().isoformat(),
            "github_org": GITHUB_ORG,
            "github_api_error": api_error,
            "github_org_public_repo_count": len(org_repositories),
            "live_head_probe": "git_ls_remote_symref",
            "live_head_available_repo_count": sum(
                1 for value in live_heads.values() if value.get("status") == "available"
            ),
            "live_head_unavailable_repositories": sorted(
                name for name, value in live_heads.items() if value.get("status") != "available"
            ),
            "wms_mapped_repo_count": len(mapped_counts),
            "wms_mapped_row_count": sum(mapped_counts.values()),
            "mapped_repos_present_in_github_api": (
                sum(1 for name in mapped_counts if name in org_by_name) if not api_error else None
            ),
            "mapped_repos_missing_from_github_api": (
                sorted(name for name in mapped_counts if name not in org_by_name) if not api_error else []
            ),
            "local_mapped_repo_count": sum(1 for name in mapped_counts if (repo_root / name / ".git").exists()),
            "local_repository_count": len(local_repo_names),
            "local_repositories_without_wms_mapping": sorted(local_repo_names - set(mapped_counts)),
            "local_manifest_count": local_manifest_total,
            "testable_wms_github_paths": testable_paths,
            "existing_local_wms_github_paths": existing_paths,
            "repo_root": str(repo_root),
            "wms_json": str(wms_path),
        },
        "repositories": repository_rows,
    }
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
