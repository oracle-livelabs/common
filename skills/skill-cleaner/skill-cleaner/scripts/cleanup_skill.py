#!/usr/bin/env python3
from __future__ import annotations

import argparse
import difflib
import hashlib
import json
import re
import shutil
import sys
import tempfile
import zipfile
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path, PurePosixPath, PureWindowsPath
from typing import Any
from urllib.parse import unquote


TEXT_SUFFIXES = {
    ".adoc", ".cfg", ".css", ".csv", ".env", ".html", ".ini", ".js", ".json",
    ".md", ".ps1", ".py", ".rst", ".sh", ".toml", ".ts", ".txt", ".xml",
    ".yaml", ".yml",
}

REQUIRED_REL_FILES = {"SKILL.md", "agents/openai.yaml"}
RESOURCE_DIRS = ("scripts", "references", "assets")
SKILL_NAME_PATTERN = re.compile(r"^[a-z0-9][a-z0-9-]{0,62}$")

SAFE_FILE_NAMES = {".DS_Store", "Thumbs.db", "desktop.ini"}
SENSITIVE_FILE_NAMES = {
    ".env", ".env.local", ".env.production", "credentials.json", "secrets.json",
    "id_rsa", "id_dsa", "id_ecdsa", "id_ed25519",
}
SAFE_FILE_PATTERNS = (
    "*.pyc", "*.pyo", "*.tmp", "*.temp", "*.bak", "*.old", "*.orig", "*.rej",
    "*.swp", "*.swo", "*~", "*.log", "npm-debug.log*", "yarn-debug.log*",
    "yarn-error.log*", "pnpm-debug.log*",
)
SAFE_DIR_NAMES = {"__pycache__", ".pytest_cache", ".mypy_cache", ".ruff_cache", ".ipynb_checkpoints", ".cache"}

PLACEHOLDER_NAME_PATTERN = re.compile(
    r"(^|[-_.])(example|examples|sample|samples|placeholder|starter|stub|todo|template)([-_.]|$)",
    re.IGNORECASE,
)
STALE_NAME_PATTERN = re.compile(
    r"(^|[-_.])(old|obsolete|deprecated|unused|backup|copy|duplicate|stale)([-_.( ]|$)",
    re.IGNORECASE,
)
PLACEHOLDER_TEXT_PATTERN = re.compile(
    r"(\[TODO:|TODO:|replace this|placeholder|example resource|sample resource|generated example|lorem ipsum)",
    re.IGNORECASE,
)

MARKDOWN_LINK_PATTERN = re.compile(r"!?\[[^\]]*]\(([^)]+)\)")
HTML_LINK_PATTERN = re.compile(r"""(?:href|src)\s*=\s*["']([^"']+)["']""", re.IGNORECASE)
ROOT_PATH_TOKEN_PATTERN = re.compile(r"""(?P<path>(?:scripts|references|assets|agents)/[A-Za-z0-9_.()/@%+\-=,]+)""")
BACKSLASH_ROOT_PATH_TOKEN_PATTERN = re.compile(r"""(?P<path>(?:scripts|references|assets|agents)\\[A-Za-z0-9_.()\\/@%+\-=,]+)""")
PLACEHOLDER_SKILL_ROOT_PATH_PATTERN = re.compile(
    r"""<[^>\n\r]*skill-root>[/\\](?P<path>(?:scripts|references|assets|agents)[/\\][^"'\s<>]+)""",
    re.IGNORECASE,
)
QUOTED_PATH_PATTERN = re.compile(r"""["'](?P<path>(?:\./|\.\./|scripts/|references/|assets/|agents/)[^"'\n\r]+)["']""")

SECURITY_PATTERNS: tuple[tuple[str, re.Pattern[str], str], ...] = (
    ("private_key", re.compile(r"-----BEGIN (?:RSA |DSA |EC |OPENSSH |)?PRIVATE KEY-----"), "SSH or private key material"),
    ("aws_access_key", re.compile(r"\bAKIA[0-9A-Z]{16}\b"), "AWS access key"),
    ("github_token", re.compile(r"\bgh[pousr]_[A-Za-z0-9_]{20,}\b"), "GitHub token"),
    ("openai_key", re.compile(r"\bsk-[A-Za-z0-9_-]{20,}\b"), "OpenAI-style API key"),
    ("jwt", re.compile(r"\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b"), "JWT-like token"),
    ("secret_assignment", re.compile(r"""(?i)\b(api[_-]?key|auth[_-]?token|access[_-]?token|refresh[_-]?token|secret|password|passwd|credential|client[_-]?secret|access[_-]?key)\b\s*[:=]\s*["']?([^"'\s#]{8,})"""), "secret or credential assignment"),
    ("ip_address", re.compile(r"\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b"), "hardcoded IP address"),
    ("windows_absolute_path", re.compile(r"\b[A-Za-z]:\\[^\"'\n\r<>|]+"), "hardcoded Windows absolute path"),
    ("posix_absolute_path", re.compile(r"(?<![\w:])/(?:Users|home|var|etc|opt|srv|tmp)/[^\s\"'<>]+"), "hardcoded POSIX absolute path"),
    ("hostname", re.compile(r"""(?i)\b(host|hostname|server)\s*[:=]\s*["']?([A-Za-z0-9_.-]+\.(?:local|internal|corp|lan)|[A-Za-z0-9_.-]{3,})"""), "hardcoded hostname or server"),
    ("username_or_person", re.compile(r"""(?i)\b(username|user|owner|author|maintainer|created_by)\s*[:=]\s*["']?([A-Za-z][A-Za-z ._-]{2,})"""), "hardcoded username or personal name"),
)

HIGH_SENSITIVITY_TYPES = {"private_key", "aws_access_key", "github_token", "openai_key", "jwt", "secret_assignment", "sensitive_filename"}
PLACEHOLDER_SECRET_VALUES = {"changeme", "change-me", "placeholder", "example", "sample", "dummy", "fake", "token", "password", "secret", "your-key-here"}


@dataclass
class ReportItem:
    path: str
    reason: str
    detail: str = ""


@dataclass
class SecurityFinding:
    path: str
    pattern_type: str
    description: str
    line: int | None = None
    action: str = "manual_review"
    detail: str = ""
    recommendation: str = ""
    suggested_replacement: str = ""


@dataclass
class ValidationResult:
    check: str
    status: str
    detail: str = ""


@dataclass
class CleanupReport:
    target: str
    mode: str
    skill_root: str = ""
    report_path: str = ""
    json_report_path: str = ""
    output_zip: str = ""
    removed_files: list[ReportItem] = field(default_factory=list)
    removed_dirs: list[ReportItem] = field(default_factory=list)
    remove_failures: list[ReportItem] = field(default_factory=list)
    kept_files: list[ReportItem] = field(default_factory=list)
    skipped_uncertain: list[ReportItem] = field(default_factory=list)
    security_findings: list[SecurityFinding] = field(default_factory=list)
    portability_findings: list[SecurityFinding] = field(default_factory=list)
    validation_results: list[ValidationResult] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    broken_references: list[ReportItem] = field(default_factory=list)
    referenced_files: list[str] = field(default_factory=list)

    def as_dict(self) -> dict[str, Any]:
        return {
            "target": self.target,
            "mode": self.mode,
            "skill_root": self.skill_root,
            "report_path": self.report_path,
            "json_report_path": self.json_report_path,
            "output_zip": self.output_zip,
            "removed_files": [item.__dict__ for item in self.removed_files],
            "removed_dirs": [item.__dict__ for item in self.removed_dirs],
            "remove_failures": [item.__dict__ for item in self.remove_failures],
            "kept_files": [item.__dict__ for item in self.kept_files],
            "skipped_uncertain": [item.__dict__ for item in self.skipped_uncertain],
            "security_findings": [item.__dict__ for item in self.security_findings],
            "portability_findings": [item.__dict__ for item in self.portability_findings],
            "validation_results": [item.__dict__ for item in self.validation_results],
            "warnings": self.warnings,
            "broken_references": [item.__dict__ for item in self.broken_references],
            "referenced_files": self.referenced_files,
        }


def relpath(path: Path, root: Path) -> str:
    return path.resolve().relative_to(root.resolve()).as_posix()


def is_within_root(path: Path, root: Path) -> bool:
    try:
        resolved = path.resolve()
        root_resolved = root.resolve()
    except OSError:
        return False
    return resolved == root_resolved or root_resolved in resolved.parents


def is_text_file(path: Path) -> bool:
    if path.suffix.lower() in TEXT_SUFFIXES or path.name in SENSITIVE_FILE_NAMES:
        return True
    try:
        sample = path.read_bytes()[:4096]
    except OSError:
        return False
    return b"\x00" not in sample


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="ignore").lstrip("\ufeff")


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def normalized_text(path: Path) -> str:
    return re.sub(r"\s+", " ", read_text(path)).strip().lower()


def find_skill_roots(base: Path) -> list[Path]:
    if base.is_file():
        return []
    return sorted(path.parent for path in base.rglob("SKILL.md"))


def discover_skill_root(target: Path) -> Path:
    if target.is_file():
        raise ValueError(f"Expected extracted folder, got file: {target}")
    if (target / "SKILL.md").exists():
        return target.resolve()
    roots = find_skill_roots(target)
    if len(roots) == 1:
        return roots[0].resolve()
    if not roots:
        raise ValueError(f"No SKILL.md found under {target}")
    choices = ", ".join(str(root) for root in roots[:8])
    raise ValueError(f"Multiple skill roots found; pass a specific folder. Found: {choices}")


def safe_extract_zip(zip_path: Path, work_dir: Path) -> Path:
    extract_root = work_dir / zip_path.stem
    extract_root.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(zip_path, "r") as archive:
        for member in archive.infolist():
            target = (extract_root / member.filename).resolve()
            if not is_within_root(target, extract_root):
                raise ValueError(f"Unsafe ZIP member path: {member.filename}")
        archive.extractall(extract_root)
    return discover_skill_root(extract_root)


def zip_skill(skill_root: Path, output_zip: Path, include_root: bool) -> None:
    output_zip.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(output_zip, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for file_path in sorted(path for path in skill_root.rglob("*") if path.is_file()):
            rel = relpath(file_path, skill_root)
            arcname = f"{skill_root.name}/{rel}" if include_root else rel
            archive.write(file_path, arcname)


def clean_reference_token(raw: str) -> str:
    token = raw.strip().strip("<>").strip()
    if not token or re.match(r"^[a-z][a-z0-9+.-]*:", token, re.IGNORECASE):
        return ""
    if "{" in token or "}" in token:
        return ""
    token = token.split("#", 1)[0].split("?", 1)[0].strip()
    token = unquote(token.rstrip("`.,;:)]}")).replace("\\", "/")
    if re.search(r"\s", token):
        return ""
    return token


def resolve_reference(source_file: Path, root: Path, token: str) -> tuple[Path | None, str]:
    cleaned = clean_reference_token(token)
    if not cleaned:
        return None, ""
    if cleaned.rstrip("/") in RESOURCE_DIRS or cleaned.rstrip("/") == "agents":
        return None, ""
    if cleaned.startswith("/"):
        return None, cleaned
    candidate = Path(cleaned)
    if cleaned.startswith(("./", "../")):
        resolved = (source_file.parent / candidate).resolve()
    elif cleaned.startswith(("scripts/", "references/", "assets/", "agents/")):
        resolved = (root / candidate).resolve()
    else:
        resolved = (source_file.parent / candidate).resolve()
    if not is_within_root(resolved, root):
        return None, cleaned
    return resolved, cleaned


def extract_reference_tokens(text: str) -> list[str]:
    tokens: list[str] = []
    for pattern in (
        MARKDOWN_LINK_PATTERN,
        HTML_LINK_PATTERN,
        ROOT_PATH_TOKEN_PATTERN,
        BACKSLASH_ROOT_PATH_TOKEN_PATTERN,
        PLACEHOLDER_SKILL_ROOT_PATH_PATTERN,
        QUOTED_PATH_PATTERN,
    ):
        for match in pattern.finditer(text):
            token = match.groupdict().get("path") if match.groupdict() else match.group(1)
            if token:
                tokens.append(token.rstrip(".,;:)]}"))
    return tokens


def collect_references(root: Path, report: CleanupReport) -> set[Path]:
    required: set[Path] = set()
    queue: list[Path] = []
    for rel_file in REQUIRED_REL_FILES:
        path = root / rel_file
        if path.exists():
            required.add(path.resolve())
            queue.append(path.resolve())
        elif rel_file == "SKILL.md":
            report.warnings.append("SKILL.md is missing; this is not a valid skill.")
        else:
            report.warnings.append(f"{rel_file} is missing; preserve it when present.")

    visited: set[Path] = set()
    while queue:
        current = queue.pop(0)
        if current in visited or not current.exists() or not current.is_file():
            continue
        visited.add(current)
        if not is_text_file(current):
            continue
        for token in extract_reference_tokens(read_text(current)):
            resolved, cleaned = resolve_reference(current, root, token)
            if resolved is None:
                continue
            if resolved.exists():
                if resolved.is_dir():
                    for child in resolved.rglob("*"):
                        if child.is_file():
                            child = child.resolve()
                            if child not in required:
                                required.add(child)
                                queue.append(child)
                elif resolved.is_file():
                    resolved = resolved.resolve()
                    if resolved not in required:
                        required.add(resolved)
                        queue.append(resolved)
            elif cleaned.startswith(("scripts/", "references/", "assets/", "agents/", "./", "../")):
                report.broken_references.append(ReportItem(relpath(current, root), "missing_reference", cleaned))

    report.referenced_files = sorted(relpath(path, root) for path in required if path.exists() and path.is_file())
    return required


def is_required(path: Path, required_files: set[Path]) -> bool:
    return path.resolve() in required_files


def matches_pattern(path: Path, patterns: tuple[str, ...]) -> bool:
    return any(path.match(pattern) or Path(path.name).match(pattern) for pattern in patterns)


def top_level_dir(path: Path, root: Path) -> str:
    try:
        parts = path.resolve().relative_to(root.resolve()).parts
    except ValueError:
        return ""
    return parts[0] if parts else ""


def is_resource_file(path: Path, root: Path) -> bool:
    return top_level_dir(path, root) in RESOURCE_DIRS


def is_under(path: Path, root: Path, dirname: str) -> bool:
    return top_level_dir(path, root) == dirname


def placeholder_like(path: Path) -> bool:
    if PLACEHOLDER_NAME_PATTERN.search(path.name):
        return True
    if path.is_file() and path.stat().st_size <= 50_000 and is_text_file(path):
        return bool(PLACEHOLDER_TEXT_PATTERN.search(read_text(path)))
    return False


def stale_name_like(path: Path) -> bool:
    return bool(STALE_NAME_PATTERN.search(path.name))


def safe_cache_dirs(root: Path, required_files: set[Path], report: CleanupReport) -> set[Path]:
    dirs: set[Path] = set()
    for dir_path in sorted(path for path in root.rglob("*") if path.is_dir()):
        if dir_path.name not in SAFE_DIR_NAMES:
            continue
        protected = any(is_required(child, required_files) for child in dir_path.rglob("*") if child.is_file())
        if protected:
            report.skipped_uncertain.append(ReportItem(relpath(dir_path, root), "protected_cache_dir", "contains referenced file"))
        else:
            dirs.add(dir_path.resolve())
    return dirs


def classify_file(path: Path, root: Path, required_files: set[Path], remove_unused_references: bool) -> tuple[str, str]:
    if is_required(path, required_files):
        return "keep", "required or referenced"
    if path.name in SENSITIVE_FILE_NAMES:
        return "remove", "unreferenced sensitive file name"
    if path.name in SAFE_FILE_NAMES or matches_pattern(path, SAFE_FILE_PATTERNS):
        return "remove", "temporary/editor/cache/log file"
    if path.stat().st_size == 0 and is_resource_file(path, root):
        return "remove", "empty unreferenced resource file"
    if is_resource_file(path, root) and placeholder_like(path):
        return "remove", "unreferenced placeholder/example resource"
    if is_resource_file(path, root) and stale_name_like(path):
        return "remove", "unreferenced stale or backup resource"
    if remove_unused_references and is_under(path, root, "references"):
        return "remove", "unreferenced reference file"
    if is_under(path, root, "references"):
        return "review", "unreferenced reference file; use --remove-unused-references only after review"
    if is_resource_file(path, root):
        return "review", "unreferenced resource; not obviously safe to remove"
    return "keep", "outside resource cleanup scope"


def choose_keeper(paths: list[Path], root: Path, required_files: set[Path]) -> Path:
    def score(path: Path) -> tuple[int, int, int, str]:
        required_score = 0 if is_required(path, required_files) else 1
        stale_score = 1 if stale_name_like(path) or placeholder_like(path) else 0
        copy_score = 1 if re.search(r"(copy|duplicate|\(\d+\))", path.name, re.IGNORECASE) else 0
        return (required_score, stale_score, copy_score, relpath(path, root))
    return sorted(paths, key=score)[0]


def add_duplicate_candidates(
    root: Path,
    files: list[Path],
    required_files: set[Path],
    candidates: dict[Path, str],
    uncertain: list[ReportItem],
) -> None:
    by_hash: dict[str, list[Path]] = {}
    for path in files:
        if path in candidates:
            continue
        try:
            by_hash.setdefault(sha256_file(path), []).append(path)
        except OSError:
            continue

    for group in by_hash.values():
        if len(group) < 2:
            continue
        keeper = choose_keeper(group, root, required_files)
        for path in group:
            if path == keeper:
                continue
            if is_required(path, required_files):
                uncertain.append(ReportItem(relpath(path, root), "duplicate_but_referenced", f"matches {relpath(keeper, root)}"))
            else:
                candidates[path] = f"exact duplicate of {relpath(keeper, root)}"

    text_files = [path for path in files if path not in candidates and path.is_file() and is_text_file(path)]
    normalized: dict[str, list[Path]] = {}
    for path in text_files:
        try:
            text = normalized_text(path)
        except OSError:
            continue
        if len(text) >= 80:
            normalized.setdefault(hashlib.sha256(text.encode("utf-8")).hexdigest(), []).append(path)

    for group in normalized.values():
        if len(group) < 2:
            continue
        keeper = choose_keeper(group, root, required_files)
        for path in group:
            if path == keeper:
                continue
            if is_required(path, required_files):
                uncertain.append(ReportItem(relpath(path, root), "near_duplicate_but_referenced", f"matches {relpath(keeper, root)}"))
            else:
                candidates[path] = f"near-duplicate normalized text of {relpath(keeper, root)}"

    pool = [path for path in text_files if path not in candidates and not is_required(path, required_files)]
    for index, left in enumerate(pool):
        if left in candidates:
            continue
        try:
            left_text = normalized_text(left)
        except OSError:
            continue
        if len(left_text) < 200:
            continue
        for right in pool[index + 1:]:
            if right in candidates:
                continue
            try:
                right_text = normalized_text(right)
            except OSError:
                continue
            if len(right_text) < 200:
                continue
            ratio = difflib.SequenceMatcher(None, left_text, right_text).ratio()
            if ratio >= 0.985:
                keeper = choose_keeper([left, right], root, required_files)
                loser = right if keeper == left else left
                if stale_name_like(loser) or placeholder_like(loser):
                    candidates[loser] = f"near-duplicate of {relpath(keeper, root)}"
                else:
                    uncertain.append(ReportItem(relpath(loser, root), "near_duplicate_review", f"{ratio:.3f} similar to {relpath(keeper, root)}"))


def redacted_detail(line: str) -> str:
    compact = line.strip()
    if len(compact) > 140:
        compact = compact[:137] + "..."
    compact = re.sub(r"(?i)(api[_-]?key|token|secret|password|credential)(\s*[:=]\s*)\S+", r"\1\2<redacted>", compact)
    compact = re.sub(r"\bAKIA[0-9A-Z]{16}\b", "<redacted-aws-key>", compact)
    compact = re.sub(r"\bgh[pousr]_[A-Za-z0-9_]{20,}\b", "<redacted-github-token>", compact)
    compact = re.sub(r"\bsk-[A-Za-z0-9_-]{20,}\b", "<redacted-api-key>", compact)
    return compact


def looks_like_placeholder_secret(line: str) -> bool:
    lowered = line.lower()
    return any(value in lowered for value in PLACEHOLDER_SECRET_VALUES)


def portable_path_guidance(raw_path: str, source_file: Path, root: Path, pattern_type: str) -> tuple[str, str]:
    """Return recommendation and suggested replacement for environment-specific paths."""
    if pattern_type == "windows_absolute_path":
        raw_normalized = str(PureWindowsPath(raw_path)).replace("\\", "/").lower()
    elif pattern_type == "posix_absolute_path":
        raw_normalized = str(PurePosixPath(raw_path)).lower()
    else:
        return "", ""

    root_normalized = root.resolve().as_posix().lower()
    source_dir = source_file.parent
    if raw_normalized.startswith(root_normalized.rstrip("/") + "/"):
        concrete = Path(raw_path)
        try:
            replacement = concrete.resolve().relative_to(source_dir.resolve()).as_posix()
            if not replacement.startswith("."):
                replacement = f"./{replacement}"
        except (OSError, ValueError):
            replacement = raw_normalized.removeprefix(root_normalized.rstrip("/") + "/")
        return (
            "Path appears to point inside the skill package. Prefer a relative path from the referencing file or from the skill root.",
            replacement,
        )

    if "/tasks/plans" in raw_normalized:
        return (
            "Path appears to be a workspace output directory outside the skill package. A relative path from the skill package is not suitable because it would escape the package and depend on install location. Prefer a caller-provided option or environment variable with a working-directory fallback.",
            'Path(os.environ.get("CODEX_TASK_PLANS_DIR", str(Path.cwd() / "Tasks" / "plans")))',
        )

    if "/users/" in raw_normalized or "/home/" in raw_normalized:
        return (
            "Path appears user-specific. Prefer a CLI option, environment variable, or Path.home()/Path.cwd() derived default instead of a hardcoded user directory.",
            "CLI option or environment-variable fallback",
        )

    return (
        "Path is absolute and environment-specific. Prefer a relative path when the target is packaged with the skill; otherwise use a CLI option or environment variable.",
        "relative path, CLI option, or environment-variable fallback",
    )


def scan_security(root: Path, files: list[Path], required_files: set[Path], candidates: dict[Path, str], report: CleanupReport) -> None:
    for path in files:
        if not path.exists() or not path.is_file() or not is_text_file(path):
            continue
        rel = relpath(path, root)
        if path.name in SENSITIVE_FILE_NAMES:
            if is_required(path, required_files):
                action = "manual_review_required_file"
            elif path in candidates:
                action = "remove_sensitive_unreferenced"
            else:
                action = "manual_review"
            report.security_findings.append(SecurityFinding(
                path=rel,
                pattern_type="sensitive_filename",
                description="sensitive filename",
                line=None,
                action=action,
                detail=f"filename={path.name}",
                recommendation="Keep only if this file is intentionally packaged and referenced; otherwise remove it before publishing.",
            ))
            if action == "remove_sensitive_unreferenced":
                candidates[path] = "unreferenced sensitive file name"

        try:
            lines = read_text(path).splitlines()
        except OSError:
            continue
        for line_number, line in enumerate(lines, start=1):
            for pattern_type, pattern, description in SECURITY_PATTERNS:
                match = pattern.search(line)
                if not match:
                    continue
                recommendation = ""
                suggested_replacement = ""
                if pattern_type in {"windows_absolute_path", "posix_absolute_path"}:
                    recommendation, suggested_replacement = portable_path_guidance(match.group(0), path, root, pattern_type)

                if pattern_type in HIGH_SENSITIVITY_TYPES and looks_like_placeholder_secret(line):
                    action = "manual_review_placeholder_like"
                elif path.name in SENSITIVE_FILE_NAMES and not is_required(path, required_files):
                    action = "remove_sensitive_unreferenced" if pattern_type in HIGH_SENSITIVITY_TYPES else "manual_review"
                elif pattern_type in HIGH_SENSITIVITY_TYPES and path in candidates and not is_required(path, required_files):
                    action = "remove_sensitive_confirmed_cruft"
                elif is_required(path, required_files):
                    action = "manual_review_required_file"
                else:
                    action = "manual_review"

                if action.startswith("remove_sensitive"):
                    candidates[path] = f"unreferenced sensitive artifact: {pattern_type}"

                finding = SecurityFinding(
                    path=rel,
                    pattern_type=pattern_type,
                    description=description,
                    line=line_number,
                    action=action,
                    detail=redacted_detail(line),
                    recommendation=recommendation,
                    suggested_replacement=suggested_replacement,
                )
                report.security_findings.append(finding)
                if recommendation:
                    report.portability_findings.append(finding)


def remove_path(path: Path) -> None:
    if path.is_dir():
        shutil.rmtree(path)
    elif path.exists():
        path.unlink()


def cleanup_empty_dirs(root: Path, apply: bool, report: CleanupReport) -> list[ReportItem]:
    removed: list[ReportItem] = []
    for dir_path in sorted((path for path in root.rglob("*") if path.is_dir()), key=lambda item: len(item.parts), reverse=True):
        if dir_path == root:
            continue
        try:
            next(dir_path.iterdir())
        except StopIteration:
            item = ReportItem(relpath(dir_path, root), "empty_directory")
            if apply:
                try:
                    dir_path.rmdir()
                except OSError as exc:
                    report.remove_failures.append(ReportItem(item.path, "remove_failed", str(exc)))
                    report.warnings.append(f"Remove failed: {item.path}: {exc}")
                    continue
            removed.append(item)
        except OSError:
            continue
    return removed


def validate_frontmatter(skill_md: Path, report: CleanupReport) -> None:
    if not skill_md.exists():
        report.validation_results.append(ValidationResult("required_file_SKILL.md", "fail", "SKILL.md is missing"))
        return
    text = read_text(skill_md)
    if not text.startswith("---"):
        report.validation_results.append(ValidationResult("frontmatter", "fail", "SKILL.md does not start with YAML frontmatter"))
        return
    parts = text.split("---", 2)
    if len(parts) < 3:
        report.validation_results.append(ValidationResult("frontmatter", "fail", "SKILL.md frontmatter is not closed"))
        return
    metadata = parts[1]
    missing: list[str] = []
    name_match = re.search(r"""^name:\s*["']?([^"'\s]+)["']?\s*$""", metadata, re.MULTILINE)
    description_match = re.search(r"""^description:\s*["']?(.+?)["']?\s*$""", metadata, re.MULTILINE)
    if not name_match:
        missing.append("name")
    if not description_match:
        missing.append("description")
    if missing:
        report.validation_results.append(ValidationResult("frontmatter", "fail", f"missing {', '.join(missing)}"))
    else:
        report.validation_results.append(ValidationResult("frontmatter", "pass", "name and description present"))
        skill_name = name_match.group(1).strip()
        if SKILL_NAME_PATTERN.fullmatch(skill_name):
            report.validation_results.append(ValidationResult("skill_name", "pass", f"name `{skill_name}` follows lowercase hyphen naming"))
        else:
            report.validation_results.append(ValidationResult("skill_name", "fail", f"name `{skill_name}` must use lowercase letters, digits, and hyphens, under 64 characters"))
        if skill_md.parent.name == skill_name:
            report.validation_results.append(ValidationResult("folder_name", "pass", "folder name matches skill name"))
        else:
            report.validation_results.append(ValidationResult("folder_name", "warn", f"folder `{skill_md.parent.name}` does not match skill name `{skill_name}`"))


def validate_agents_metadata(root: Path, report: CleanupReport) -> None:
    metadata_path = root / "agents" / "openai.yaml"
    if not metadata_path.exists():
        report.validation_results.append(ValidationResult("agents_openai_yaml", "warn", "agents/openai.yaml is missing"))
        return
    text = read_text(metadata_path)
    missing = [
        field for field in ("display_name", "short_description", "default_prompt")
        if not re.search(rf"^\s*{field}\s*:\s*\S+", text, re.MULTILINE)
    ]
    if not text.lstrip().startswith("interface:"):
        report.validation_results.append(ValidationResult("agents_openai_yaml", "warn", "agents/openai.yaml should start with an interface mapping"))
    elif missing:
        report.validation_results.append(ValidationResult("agents_openai_yaml", "warn", f"missing interface field(s): {', '.join(missing)}"))
    else:
        report.validation_results.append(ValidationResult("agents_openai_yaml", "pass", "interface metadata fields present"))


def validate_packageability(root: Path, include_root: bool, report: CleanupReport) -> None:
    try:
        with tempfile.TemporaryDirectory(prefix="skill-package-check-") as temp:
            zip_skill(root, Path(temp) / "package-check.zip", include_root=include_root)
        report.validation_results.append(ValidationResult("packageability", "pass", "temporary ZIP packaging succeeded"))
    except Exception as exc:  # noqa: BLE001
        report.validation_results.append(ValidationResult("packageability", "fail", str(exc)))


def validate_skill(root: Path, required_files: set[Path], removed_files: set[Path], args: argparse.Namespace, report: CleanupReport) -> None:
    skill_md = root / "SKILL.md"
    validate_frontmatter(skill_md, report)
    validate_agents_metadata(root, report)

    for rel_file in REQUIRED_REL_FILES:
        path = root / rel_file
        status = "pass" if path.exists() else "warn"
        detail = "exists" if path.exists() else "missing"
        report.validation_results.append(ValidationResult(f"required_file_{rel_file}", status, detail))

    for ref in sorted(required_files):
        if ref in removed_files:
            report.validation_results.append(ValidationResult("reference_preservation", "fail", f"referenced file removed: {relpath(ref, root)}"))
        elif not ref.exists():
            report.validation_results.append(ValidationResult("reference_preservation", "warn", f"referenced file missing: {relpath(ref, root)}"))
    if not any(result.check == "reference_preservation" for result in report.validation_results):
        report.validation_results.append(ValidationResult("reference_preservation", "pass", f"{len(required_files)} referenced/required files preserved"))

    if report.broken_references:
        report.validation_results.append(ValidationResult("internal_references", "warn", f"{len(report.broken_references)} broken reference(s) detected"))
    else:
        report.validation_results.append(ValidationResult("internal_references", "pass", "all discovered references resolve"))

    unresolved_high = [
        finding for finding in report.security_findings
        if finding.pattern_type in HIGH_SENSITIVITY_TYPES and not finding.action.startswith("remove_sensitive")
    ]
    if unresolved_high:
        report.validation_results.append(ValidationResult("security_scan", "warn", f"{len(unresolved_high)} high-sensitivity finding(s) require manual review"))
    else:
        report.validation_results.append(ValidationResult("security_scan", "pass", "no unresolved high-sensitivity findings"))

    validate_packageability(root, include_root=args.zip_include_root, report=report)

    for result in report.validation_results:
        if result.status == "fail":
            report.warnings.append(f"Validation failed: {result.check}: {result.detail}")
        elif result.status == "warn":
            report.warnings.append(f"Validation warning: {result.check}: {result.detail}")


def clean_skill_root(root: Path, args: argparse.Namespace, report: CleanupReport) -> CleanupReport:
    report.skill_root = str(root)
    required_files = collect_references(root, report)
    all_files = sorted(path.resolve() for path in root.rglob("*") if path.is_file())
    candidates: dict[Path, str] = {}
    uncertain: list[ReportItem] = []

    for dir_path in safe_cache_dirs(root, required_files, report):
        candidates[dir_path] = "generated cache directory"

    for path in all_files:
        if any(candidate.is_dir() and (candidate == path or candidate in path.parents) for candidate in candidates):
            continue
        action, reason = classify_file(path, root, required_files, args.remove_unused_references)
        if action == "remove":
            candidates[path] = reason
        elif action == "review":
            uncertain.append(ReportItem(relpath(path, root), reason))
        else:
            report.kept_files.append(ReportItem(relpath(path, root), "kept", reason))

    add_duplicate_candidates(root, all_files, required_files, candidates, uncertain)
    scan_security(root, all_files, required_files, candidates, report)

    removed_files: set[Path] = set()
    for path, reason in sorted(candidates.items(), key=lambda item: relpath(item[0], root), reverse=True):
        if path.is_file() and is_required(path, required_files):
            report.skipped_uncertain.append(ReportItem(relpath(path, root), "candidate_is_required", reason))
            continue
        item = ReportItem(relpath(path, root), reason)
        was_dir = path.is_dir()
        if args.apply:
            try:
                remove_path(path)
            except OSError as exc:
                report.remove_failures.append(ReportItem(item.path, "remove_failed", f"{reason}; {exc}"))
                report.warnings.append(f"Remove failed: {item.path}: {exc}")
                continue
        if was_dir:
            report.removed_dirs.append(item)
        else:
            report.removed_files.append(item)
            removed_files.add(path.resolve())

    report.skipped_uncertain.extend(sorted(uncertain, key=lambda item: item.path))
    report.removed_dirs.extend(cleanup_empty_dirs(root, args.apply, report))
    validate_skill(root, required_files, removed_files, args, report)
    return report


def default_report_path(target: Path, skill_root: Path) -> Path:
    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    if target.is_file():
        return target.with_name(f"{target.stem}-cleanup-report-{timestamp}.md")
    return skill_root.parent / f"{skill_root.name}-cleanup-report-{timestamp}.md"


def markdown_report(report: CleanupReport) -> str:
    lines: list[str] = []
    lines.append("# Skill Cleanup QA Report")
    lines.append("")
    lines.append("## Summary")
    lines.append("")
    lines.append(f"- Target: `{report.target}`")
    lines.append(f"- Mode: `{report.mode}`")
    lines.append(f"- Skill root: `{report.skill_root}`")
    if report.output_zip:
        lines.append(f"- Output ZIP: `{report.output_zip}`")
    lines.append(f"- Files removed or proposed: {len(report.removed_files)}")
    lines.append(f"- Directories removed or proposed: {len(report.removed_dirs)}")
    lines.append(f"- Remove failures: {len(report.remove_failures)}")
    lines.append(f"- Security findings: {len(report.security_findings)}")
    lines.append(f"- Portability findings: {len(report.portability_findings)}")
    lines.append(f"- Manual-review items: {len(report.skipped_uncertain)}")
    lines.append(f"- Broken references: {len(report.broken_references)}")
    lines.append(f"- Warnings: {len(report.warnings)}")

    def section(title: str, items: list[Any], formatter) -> None:
        lines.append("")
        lines.append(f"## {title}")
        lines.append("")
        if not items:
            lines.append("- none")
            return
        for item in items:
            lines.append(formatter(item))

    section("Files Removed", report.removed_files, lambda item: f"- `{item.path}`: {item.reason}" + (f" ({item.detail})" if item.detail else ""))
    section("Directories Removed", report.removed_dirs, lambda item: f"- `{item.path}`: {item.reason}" + (f" ({item.detail})" if item.detail else ""))
    section("Remove Failures", report.remove_failures, lambda item: f"- `{item.path}`: {item.reason}" + (f" ({item.detail})" if item.detail else ""))
    section("Files Preserved", report.kept_files, lambda item: f"- `{item.path}`: {item.detail or item.reason}")
    section(
        "Security Findings",
        report.security_findings,
        lambda item: f"- `{item.path}` line {item.line or 'n/a'}: {item.pattern_type} - {item.description}; action={item.action}; detail={item.detail}"
        + (f"; recommendation={item.recommendation}" if item.recommendation else "")
        + (f"; suggested={item.suggested_replacement}" if item.suggested_replacement else ""),
    )
    section(
        "Portability Recommendations",
        report.portability_findings,
        lambda item: f"- `{item.path}` line {item.line or 'n/a'}: {item.recommendation} Suggested replacement: `{item.suggested_replacement}`",
    )
    section("Manual Review", report.skipped_uncertain, lambda item: f"- `{item.path}`: {item.reason}" + (f" ({item.detail})" if item.detail else ""))
    section("Broken References", report.broken_references, lambda item: f"- `{item.path}`: {item.detail}")
    section("Validation Results", report.validation_results, lambda item: f"- {item.status.upper()} `{item.check}`: {item.detail}")
    section("Warnings", [ReportItem("", warning) for warning in report.warnings], lambda item: f"- {item.reason}")
    lines.append("")
    return "\n".join(lines)


def write_reports(report: CleanupReport, report_path: Path, json_report_path: Path | None) -> None:
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report.report_path = str(report_path)
    report_path.write_text(markdown_report(report), encoding="utf-8")
    if json_report_path:
        json_report_path.parent.mkdir(parents=True, exist_ok=True)
        report.json_report_path = str(json_report_path)
        json_report_path.write_text(json.dumps(report.as_dict(), indent=2, ensure_ascii=True) + "\n", encoding="utf-8")


def concise_summary(report: CleanupReport, as_json: bool) -> None:
    payload = {
        "mode": report.mode,
        "skill_root": report.skill_root,
        "report_path": report.report_path,
        "output_zip": report.output_zip,
        "removed_files": len(report.removed_files),
        "removed_dirs": len(report.removed_dirs),
        "remove_failures": len(report.remove_failures),
        "security_findings": len(report.security_findings),
        "portability_findings": len(report.portability_findings),
        "manual_review": len(report.skipped_uncertain),
        "broken_references": len(report.broken_references),
        "warnings": len(report.warnings),
        "validation_failures": len([item for item in report.validation_results if item.status == "fail"]),
    }
    if as_json:
        print(json.dumps(payload, indent=2, ensure_ascii=True))
        return
    print("Skill cleanup summary")
    for key, value in payload.items():
        print(f"- {key}: {value}")


def default_output_zip(zip_path: Path) -> Path:
    return zip_path.with_name(f"{zip_path.stem}.cleaned.zip")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Safely clean, security-scan, validate, and report on a skill folder or ZIP archive.")
    parser.add_argument("target", help="Skill folder or skill ZIP archive.")
    parser.add_argument("--apply", action="store_true", help="Apply cleanup. Default is report-only dry run.")
    parser.add_argument("--remove-unused-references", action="store_true", help="Remove unreferenced files under references/ after review.")
    parser.add_argument("--report", help="Markdown report path. Defaults beside the skill or ZIP.")
    parser.add_argument("--json-report", help="Optional JSON report path.")
    parser.add_argument("--json", action="store_true", help="Print concise stdout summary as JSON.")
    parser.add_argument("--output-zip", help="Write cleaned ZIP to this path. For ZIP input with --apply, defaults to <name>.cleaned.zip.")
    parser.add_argument("--zip-include-root", action=argparse.BooleanOptionalAction, default=True, help="Include skill root directory in package.")
    parser.add_argument("--keep-work-dir", action="store_true", help="Keep temporary extraction directory for ZIP input.")
    return parser


def main() -> int:
    args = build_parser().parse_args()
    target = Path(args.target).expanduser().resolve()
    if not target.exists():
        print(f"Error: target not found: {target}", file=sys.stderr)
        return 1

    report = CleanupReport(target=str(target), mode="apply" if args.apply else "dry-run")
    temp_dir: tempfile.TemporaryDirectory[str] | None = None

    try:
        if target.is_file() and target.suffix.lower() == ".zip":
            temp_dir = tempfile.TemporaryDirectory(prefix="skill-cleaner-")
            skill_root = safe_extract_zip(target, Path(temp_dir.name))
            clean_skill_root(skill_root, args, report)
            if args.apply:
                output_zip = Path(args.output_zip).expanduser().resolve() if args.output_zip else default_output_zip(target)
                zip_skill(skill_root, output_zip, include_root=args.zip_include_root)
                report.output_zip = str(output_zip)
        elif target.is_dir():
            skill_root = discover_skill_root(target)
            clean_skill_root(skill_root, args, report)
            if args.output_zip and args.apply:
                output_zip = Path(args.output_zip).expanduser().resolve()
                zip_skill(skill_root, output_zip, include_root=args.zip_include_root)
                report.output_zip = str(output_zip)
        else:
            print("Error: target must be a skill folder or .zip archive.", file=sys.stderr)
            return 1

        markdown_path = Path(args.report).expanduser().resolve() if args.report else default_report_path(target, Path(report.skill_root))
        json_path = Path(args.json_report).expanduser().resolve() if args.json_report else None
        write_reports(report, markdown_path, json_path)
        concise_summary(report, as_json=args.json)
        return 1 if any(result.status == "fail" for result in report.validation_results) else 0
    except (ValueError, zipfile.BadZipFile, OSError) as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1
    finally:
        if temp_dir is not None and args.keep_work_dir:
            print(f"Kept work dir: {temp_dir.name}")
            temp_dir._finalizer.detach()  # type: ignore[attr-defined]
        elif temp_dir is not None:
            temp_dir.cleanup()


if __name__ == "__main__":
    raise SystemExit(main())
