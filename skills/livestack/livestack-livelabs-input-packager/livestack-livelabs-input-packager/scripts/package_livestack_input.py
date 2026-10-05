#!/usr/bin/env python3
"""Package an industry LiveStack as a LiveLabs Author INPUT_ZIP.

The script is path-neutral: it accepts a stack path and an output path, derives
industry naming from the stack directory, and never modifies the source stack.
"""
from __future__ import annotations

import argparse
import os
import re
import shutil
import sys
import tempfile
import zipfile
from dataclasses import dataclass, field
from pathlib import Path
from typing import Iterable

TEXT_EXTENSIONS_FOR_API_SCAN = {".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs"}

EXCLUDED_DIRS = {
    ".git",
    ".hg",
    ".svn",
    ".cache",
    ".parcel-cache",
    ".turbo",
    ".vite",
    ".next",
    ".nuxt",
    ".pytest_cache",
    "__pycache__",
    "node_modules",
    "bower_components",
    "dist",
    "build",
    "coverage",
    "tmp",
    "temp",
    "logs",
    "log",
    "wallet",
    "wallets",
    "Wallet",
    "Wallets",
}

EXCLUDED_FILE_NAMES = {
    ".DS_Store",
    ".env",
    ".env.local",
    ".env.development",
    ".env.production",
    ".env.test",
    "npm-debug.log",
    "yarn-debug.log",
    "yarn-error.log",
    "pnpm-debug.log",
}

EXCLUDED_SUFFIXES = {
    ".log",
    ".tmp",
    ".temp",
    ".pyc",
    ".pyo",
    ".class",
    ".key",
    ".pem",
    ".p12",
    ".pfx",
    ".jks",
    ".sso",
}

DATABASE_FILE_EXTENSIONS = {
    ".sql",
    ".pls",
    ".pks",
    ".pkb",
    ".json",
    ".csv",
    ".tsv",
    ".md",
    ".txt",
    ".ctl",
    ".yaml",
    ".yml",
}

EXCLUDED_RELATIVE_DIRS = {
    "public/jet/libs",
}

ROOT_BACKEND_SUPPORT_FILES = {
    "package.json",
    "package-lock.json",
    "pnpm-lock.yaml",
    "yarn.lock",
    "bun.lockb",
    "compose.yml",
    "compose.yaml",
    "docker-compose.yml",
    "docker-compose.yaml",
    "Dockerfile",
    "Containerfile",
}

@dataclass
class CopySummary:
    copied_roots: list[str] = field(default_factory=list)
    copied_files: list[str] = field(default_factory=list)
    skipped: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)


def slugify(value: str) -> str:
    value = value.strip().lower()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    value = re.sub(r"-+", "-", value).strip("-")
    return value or "livestack"


def derive_industry_slug(stack_path: Path) -> str:
    name = slugify(stack_path.name)
    for suffix in ("-livestack", "-live-stack", "-stack"):
        if name.endswith(suffix) and len(name) > len(suffix):
            name = name[: -len(suffix)]
            break
    return slugify(name)


def is_excluded(path: Path) -> bool:
    name = path.name
    if path.is_dir() and name in EXCLUDED_DIRS:
        return True
    if name in EXCLUDED_FILE_NAMES:
        return True
    if name.startswith(".env"):
        return True
    if path.suffix in EXCLUDED_SUFFIXES:
        return True
    return False


def should_copy_database_file(path: Path) -> bool:
    return path.suffix.lower() in DATABASE_FILE_EXTENSIONS


def is_excluded_relative_dir(rel_path: Path) -> bool:
    rel = rel_path.as_posix()
    return any(rel == pattern or rel.startswith(pattern + "/") for pattern in EXCLUDED_RELATIVE_DIRS)


def copy_tree_filtered(
    src: Path,
    dst: Path,
    summary: CopySummary,
    *,
    database_only: bool = False,
    source_root: Path | None = None,
    package_root: Path | None = None,
) -> int:
    copied = 0
    if not src.exists():
        return copied
    for root, dirs, files in os.walk(src):
        root_path = Path(root)
        kept_dirs = []
        for d in dirs:
            dir_path = root_path / d
            rel_dir = dir_path.relative_to(src)
            if is_excluded(dir_path) or is_excluded_relative_dir(rel_dir):
                summary.skipped.append(str(dir_path))
                continue
            kept_dirs.append(d)
        dirs[:] = kept_dirs
        rel_root = root_path.relative_to(src)
        for filename in files:
            source_file = root_path / filename
            if is_excluded(source_file):
                summary.skipped.append(str(source_file))
                continue
            if database_only and not should_copy_database_file(source_file):
                summary.skipped.append(str(source_file))
                continue
            rel_file = rel_root / filename if str(rel_root) != "." else Path(filename)
            target_file = dst / rel_file
            target_file.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source_file, target_file)
            summary.copied_files.append(str(target_file))
            copied += 1
    if copied:
        if source_root is not None:
            try:
                source_label = src.relative_to(source_root).as_posix() + "/"
            except ValueError:
                source_label = src.name + "/"
        else:
            source_label = src.name + "/"
        if package_root is not None:
            try:
                dest_label = dst.relative_to(package_root).as_posix() + "/"
            except ValueError:
                dest_label = dst.name + "/"
        else:
            dest_label = dst.name + "/"
        summary.copied_roots.append(f"{source_label} -> {dest_label}")
    return copied


def copy_file_if_exists(src: Path, dst: Path, summary: CopySummary) -> bool:
    if not src.exists() or not src.is_file() or is_excluded(src):
        return False
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, dst)
    summary.copied_files.append(str(dst))
    return True


def find_database_sources(stack_path: Path) -> list[Path]:
    candidates = []
    for name in ("db", "database", "sql", "schema", "schemas", "migrations"):
        p = stack_path / name
        if p.exists() and p.is_dir():
            candidates.append(p)
    return candidates


def find_backend_sources(stack_path: Path) -> list[Path]:
    candidates = []
    for name in ("backend", "server", "api", "services", "service"):
        p = stack_path / name
        if p.exists() and p.is_dir():
            candidates.append(p)
    return candidates


def parse_mounts(server_js: Path) -> dict[str, str]:
    mounts: dict[str, str] = {}
    if not server_js.exists():
        return mounts
    try:
        text = server_js.read_text(encoding="utf-8", errors="ignore")
    except OSError:
        return mounts

    require_map: dict[str, str] = {}
    req_pattern = re.compile(
        r"(?:const|let|var)\s+(?P<var>[A-Za-z_$][\w$]*)\s*=\s*require\(['\"](?P<path>[^'\"]+)['\"]\)"
    )
    for match in req_pattern.finditer(text):
        require_map[match.group("var")] = match.group("path")

    use_pattern = re.compile(
        r"app\.use\(\s*['\"](?P<prefix>/[^'\"]*)['\"]\s*,\s*(?P<var>[A-Za-z_$][\w$]*)"
    )
    for match in use_pattern.finditer(text):
        prefix = match.group("prefix")
        var = match.group("var")
        mounts[require_map.get(var, var)] = prefix
    return mounts


def route_file_to_require_path(file_path: Path, backend_root: Path) -> str:
    rel = file_path.relative_to(backend_root).with_suffix("")
    return "./" + rel.as_posix()


def normalize_endpoint(prefix: str, route: str) -> str:
    if route in ("/", ""):
        return prefix or "/"
    if not prefix or prefix == "/":
        return route if route.startswith("/") else f"/{route}"
    return f"{prefix.rstrip('/')}/{route.lstrip('/')}"


def scan_api_routes(backend_root: Path) -> list[tuple[str, str, str, int]]:
    if not backend_root.exists():
        return []
    mounts = parse_mounts(backend_root / "server.js")
    rows: list[tuple[str, str, str, int]] = []
    route_pattern = re.compile(
        r"\b(?P<obj>router|app)\.(?P<method>get|post|put|patch|delete|options|head|all)\(\s*['\"](?P<route>/[^'\"]*|\*)['\"]",
        re.IGNORECASE,
    )
    for file_path in sorted(backend_root.rglob("*")):
        if not file_path.is_file() or file_path.suffix.lower() not in TEXT_EXTENSIONS_FOR_API_SCAN:
            continue
        if any(part in EXCLUDED_DIRS for part in file_path.parts):
            continue
        try:
            text = file_path.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            continue
        require_path = route_file_to_require_path(file_path, backend_root)
        prefix = mounts.get(require_path, "")
        rel_file = file_path.relative_to(backend_root).as_posix()
        for line_no, line in enumerate(text.splitlines(), start=1):
            for match in route_pattern.finditer(line):
                method = match.group("method").upper()
                route = match.group("route")
                obj = match.group("obj")
                endpoint = normalize_endpoint(prefix if obj.lower() == "router" else "", route)
                rows.append((method, endpoint, rel_file, line_no))
    return rows


def write_api_map(package_root: Path, stack_path: Path, backend_roots: list[Path]) -> bool:
    rows: list[tuple[str, str, str, int]] = []
    for backend_root in backend_roots:
        rows.extend(scan_api_routes(backend_root))
    api_map = package_root / "api-map.md"
    if not rows:
        api_map.write_text(
            "# API Map\n\n"
            "No Express route declarations were detected automatically. Use `backend-source/` as the backend mapping source.\n",
            encoding="utf-8",
        )
        return False
    lines = [
        "# API Map",
        "",
        f"Source stack: `{stack_path.name}`",
        "",
        "Generated from backend route declarations. Confirm route behavior against the backend source before authoring final workshop steps.",
        "",
        "| Method | Endpoint | Source file | Line |",
        "| --- | --- | --- | ---: |",
    ]
    for method, endpoint, rel_file, line_no in sorted(set(rows), key=lambda r: (r[1], r[0], r[2], r[3])):
        lines.append(f"| {method} | `{endpoint}` | `backend-source/{rel_file}` | {line_no} |")
    api_map.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return True


def write_source_map(package_root: Path, stack_path: Path, industry_slug: str, summary: CopySummary) -> None:
    lines = [
        "# Source Map",
        "",
        f"Industry slug: `{industry_slug}`",
        f"Source stack directory name: `{stack_path.name}`",
        "",
        "This package was generated for LiveLabs Workshop Author 26.5.2.",
        "The source stack was not modified.",
        "",
        "## Package roots",
        "",
        "- `frontend-source/`: frontend application source copied from the stack frontend directory.",
        "- `database-source/`: database schema, SQL, data-load, and related database text assets.",
        "- `backend-source/`: backend/API source copied from the stack backend directory when present.",
        "- `api-map.md`: generated route map when route declarations can be detected.",
        "",
        "## Copied roots",
        "",
    ]
    if summary.copied_roots:
        for item in summary.copied_roots:
            lines.append(f"- `{item}`")
    else:
        lines.append("- None detected.")
    if summary.warnings:
        lines.extend(["", "## Warnings", ""])
        lines.extend(f"- {warning}" for warning in summary.warnings)
    package_root.joinpath("source-map.md").write_text("\n".join(lines) + "\n", encoding="utf-8")


def write_readme(package_root: Path, zip_name: str) -> None:
    package_root.joinpath("README.md").write_text(
        "# LiveLabs Author INPUT_ZIP\n\n"
        f"Package file: `{zip_name}`\n\n"
        "Use this archive as `INPUT_ZIP` with LiveLabs Workshop Author 26.5.2.\n\n"
        "Recommended prompt variables:\n\n"
        "```text\n"
        f"INPUT_ZIP=/path/to/{zip_name}\n"
        "OUTPUT_DIR=/path/to/workshop-output\n"
        "```\n\n"
        "Authoring guidance: treat `frontend-source/` as the learner-facing story, "
        "`database-source/` as the technical truth for schema and data behavior, and "
        "`backend-source/` plus `api-map.md` as the route mapping from UI actions to service/API behavior.\n",
        encoding="utf-8",
    )


def make_zip(package_root: Path, output_zip: Path) -> None:
    if output_zip.exists():
        output_zip.unlink()
    with zipfile.ZipFile(output_zip, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        for path in sorted(package_root.rglob("*")):
            if path.is_file():
                zf.write(path, path.relative_to(package_root.parent))


def validate_package(package_root: Path) -> list[str]:
    errors: list[str] = []
    if not (package_root / "frontend-source").is_dir():
        errors.append("Missing frontend-source/")
    if not (package_root / "database-source").is_dir():
        errors.append("Missing database-source/")
    has_backend = (package_root / "backend-source").is_dir()
    has_api_reference = (package_root / "api-reference" / "backend" / "server.js").is_file()
    has_api_map = (package_root / "api-map.md").is_file()
    if not (has_backend or has_api_reference or has_api_map):
        errors.append("Missing backend mapping source: need backend-source/, api-reference/backend/server.js, or api-map.md")
    return errors


def resolve_output_path(output_arg: str, zip_name: str) -> Path:
    output = Path(output_arg).expanduser()
    if output.suffix.lower() == ".zip":
        output.parent.mkdir(parents=True, exist_ok=True)
        return output.resolve()
    output.mkdir(parents=True, exist_ok=True)
    return (output / zip_name).resolve()


def package_livestack(stack_arg: str, output_arg: str) -> int:
    stack_path = Path(stack_arg).expanduser().resolve()
    if not stack_path.exists() or not stack_path.is_dir():
        print(f"ERROR: stack path does not exist or is not a directory: {stack_path}", file=sys.stderr)
        return 2

    industry_slug = derive_industry_slug(stack_path)
    package_name = f"{industry_slug}-stack-livelab-input"
    zip_name = f"{package_name}.zip"
    output_zip = resolve_output_path(output_arg, zip_name)
    summary = CopySummary()

    with tempfile.TemporaryDirectory(prefix=f"{package_name}-") as tmp_dir:
        tmp_root = Path(tmp_dir)
        package_root = tmp_root / package_name
        package_root.mkdir(parents=True)

        frontend_src = stack_path / "frontend"
        frontend_dst = package_root / "frontend-source"
        if frontend_src.exists():
            copy_tree_filtered(frontend_src, frontend_dst, summary, source_root=stack_path, package_root=package_root)
        else:
            summary.warnings.append("No frontend/ directory found in source stack.")

        database_sources = find_database_sources(stack_path)
        database_dst = package_root / "database-source"
        for db_src in database_sources:
            target = database_dst if db_src.name in {"db", "database"} else database_dst / db_src.name
            copy_tree_filtered(db_src, target, summary, database_only=True, source_root=stack_path, package_root=package_root)
        if not database_sources:
            summary.warnings.append("No database source directory found. Expected one of db/, database/, sql/, schema/, schemas/, migrations/.")

        backend_sources = find_backend_sources(stack_path)
        backend_dst = package_root / "backend-source"
        for backend_src in backend_sources:
            target = backend_dst if backend_src.name == "backend" else backend_dst / backend_src.name
            copy_tree_filtered(backend_src, target, summary, source_root=stack_path, package_root=package_root)
        if backend_sources:
            for support_name in ROOT_BACKEND_SUPPORT_FILES:
                copy_file_if_exists(stack_path / support_name, backend_dst / support_name, summary)
        else:
            summary.warnings.append("No backend source directory found. Expected one of backend/, server/, api/, services/, service/.")

        write_api_map(package_root, stack_path, backend_sources)
        write_source_map(package_root, stack_path, industry_slug, summary)
        write_readme(package_root, zip_name)

        errors = validate_package(package_root)
        if errors:
            for error in errors:
                print(f"ERROR: {error}", file=sys.stderr)
            return 3

        make_zip(package_root, output_zip)

    print(f"Created INPUT_ZIP: {output_zip}")
    print(f"Industry slug: {industry_slug}")
    print("Required package roots: database-source/, frontend-source/, backend-source/ or api-map.md")
    print(f"Copied files: {len(summary.copied_files)}")
    if summary.warnings:
        print("Warnings:")
        for warning in summary.warnings:
            print(f"- {warning}")
    return 0


def main(argv: Iterable[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Package an industry LiveStack as a LiveLabs Author INPUT_ZIP.")
    parser.add_argument("stack_path", help="Path to the industry LiveStack root, for example /path/to/finance-livestack")
    parser.add_argument("output_path", help="Output directory, or explicit .zip path, for the generated INPUT_ZIP")
    args = parser.parse_args(argv)
    return package_livestack(args.stack_path, args.output_path)


if __name__ == "__main__":
    raise SystemExit(main())
