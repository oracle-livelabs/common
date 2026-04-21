#!/usr/bin/env python3
"""
Fixomat - LiveLabs Markdown + Image fixer.

Self-contained UI app to fix Markdown, optimize images, or run both for a
workshop root. No dependency on external fixer/optimizer scripts.
"""

import os
import queue
import re
import shutil
import subprocess
import sys
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

try:
    import tkinter as tk
    from tkinter import filedialog, messagebox, scrolledtext
except Exception as exc:  # pragma: no cover - GUI dependency
    print("Error: tkinter is required to run Fixomat.")
    print(f"Details: {exc}")
    sys.exit(1)

try:
    from PIL import Image
except Exception:  # pragma: no cover - optional dependency until image mode
    Image = None

SCRIPT_DIR = Path(__file__).resolve().parent

MODE_BOTH = "both"
MODE_MARKDOWN = "markdown"
MODE_IMAGES = "images"

IMAGE_MAX_DIM = 1280
IMAGE_JOBS = 4

TASK_HEADER_VALID_RE = re.compile(r"^## Task [^:\s][^:]*:")
YOUTUBE_VALID_RE = re.compile(r"\[[^\]]*\]\(youtube:[^)]+\)")
LEGACY_CDN_HOST_RE = re.compile(r"oracle-livelabs\.github\.io", re.IGNORECASE)


class FixomatApp:
    def __init__(self):
        self.root = tk.Tk()
        self.root.title("LiveLabs Fixomat 2000")
        self.root.geometry("820x560")

        self.mode_var = tk.StringVar(value=MODE_BOTH)
        self.folder_var = tk.StringVar(value="")
        self.status_var = tk.StringVar(value="Idle")

        self.log_queue = queue.Queue()
        self.is_running = False

        self._build_ui()
        self._process_log_queue()

    def _build_ui(self):
        header = tk.Frame(self.root, padx=12, pady=10)
        header.pack(fill=tk.X)

        title = tk.Label(header, text="LiveLabs Fixomat 2000", font=("Helvetica", 16, "bold"), anchor="w")
        title.pack(fill=tk.X)

        subtitle = tk.Label(
            header,
            text="Fix your markdown & optimize your images",
            font=("Helvetica", 11),
            anchor="w",
        )
        subtitle.pack(fill=tk.X, pady=(2, 0))

        mode_frame = tk.LabelFrame(self.root, text="Mode", padx=12, pady=10)
        mode_frame.pack(fill=tk.X, padx=12)

        tk.Radiobutton(
            mode_frame,
            text="Fix Markdown only",
            variable=self.mode_var,
            value=MODE_MARKDOWN,
        ).pack(anchor="w")
        tk.Radiobutton(
            mode_frame,
            text="Optimize images only",
            variable=self.mode_var,
            value=MODE_IMAGES,
        ).pack(anchor="w")
        tk.Radiobutton(
            mode_frame,
            text="Fix Markdown + Optimize images",
            variable=self.mode_var,
            value=MODE_BOTH,
        ).pack(anchor="w")
        tk.Label(
            mode_frame,
            text="Note: Always review Markdown fixes before publishing.",
            font=("Helvetica", 10),
            fg="#555555",
            anchor="w",
        ).pack(anchor="w", pady=(6, 0))

        folder_frame = tk.LabelFrame(self.root, text="Workshop root", padx=12, pady=10)
        folder_frame.pack(fill=tk.X, padx=12, pady=(10, 0))

        path_label = tk.Label(folder_frame, textvariable=self.folder_var, anchor="w")
        path_label.pack(fill=tk.X)

        btn_frame = tk.Frame(folder_frame)
        btn_frame.pack(fill=tk.X, pady=(6, 0))

        select_btn = tk.Button(btn_frame, text="Select folder", command=self._select_folder)
        select_btn.pack(side=tk.LEFT)

        self.run_btn = tk.Button(btn_frame, text="Run", command=self._start_run)
        self.run_btn.pack(side=tk.LEFT, padx=(8, 0))

        self.save_btn = tk.Button(btn_frame, text="Save Log", command=self._save_log)
        self.save_btn.pack(side=tk.LEFT, padx=(8, 0))

        self.close_btn = tk.Button(btn_frame, text="Close", command=self.root.destroy)
        self.close_btn.pack(side=tk.RIGHT)

        status_frame = tk.Frame(self.root, padx=12, pady=8)
        status_frame.pack(fill=tk.X)
        status_label = tk.Label(status_frame, textvariable=self.status_var, anchor="w")
        status_label.pack(fill=tk.X)

        log_frame = tk.LabelFrame(self.root, text="Output", padx=6, pady=6)
        log_frame.pack(fill=tk.BOTH, expand=True, padx=12, pady=(0, 12))

        self.log_area = scrolledtext.ScrolledText(
            log_frame,
            wrap=tk.WORD,
            font=("Courier", 10),
            bg="#1e1e1e",
            fg="#d4d4d4",
            insertbackground="#d4d4d4",
        )
        self.log_area.pack(fill=tk.BOTH, expand=True)
        self.log_area.config(state=tk.DISABLED)

    def _select_folder(self):
        folder = filedialog.askdirectory(
            title="Fixomat - Select workshop root",
            mustexist=True,
        )
        if folder:
            self.folder_var.set(folder)

    def _save_log(self):
        log_text = self.log_area.get("1.0", tk.END).strip()
        if not log_text:
            messagebox.showinfo("Fixomat", "There is no log output to save yet.")
            return

        target_dir = self.folder_var.get().strip()
        if target_dir:
            default_path = Path(target_dir) / "fixomat.log"
            save_path = filedialog.asksaveasfilename(
                title="Save Fixomat Log",
                initialdir=str(default_path.parent),
                initialfile=default_path.name,
                defaultextension=".log",
                filetypes=[("Log files", "*.log"), ("All files", "*.*")],
            )
        else:
            save_path = filedialog.asksaveasfilename(
                title="Save Fixomat Log",
                defaultextension=".log",
                initialfile="fixomat.log",
                filetypes=[("Log files", "*.log"), ("All files", "*.*")],
            )

        if not save_path:
            return

        try:
            with open(save_path, "w", encoding="utf-8") as handle:
                handle.write(log_text + "\n")
            messagebox.showinfo("Fixomat", f"Log saved to {save_path}")
        except Exception as exc:
            messagebox.showerror("Fixomat", f"Failed to save log: {exc}")

    def _start_run(self):
        if self.is_running:
            return

        target = self.folder_var.get().strip()
        if not target:
            messagebox.showwarning("Fixomat", "Please select a workshop root folder first.")
            return

        target_path = Path(target).resolve()
        if not target_path.exists() or not target_path.is_dir():
            messagebox.showerror("Fixomat", f"Not a directory: {target_path}")
            return

        self.is_running = True
        self._set_status("Running...")
        self.run_btn.config(state=tk.DISABLED)

        thread = threading.Thread(target=self._run_tasks, args=(target_path,))
        thread.daemon = True
        thread.start()

    def _run_tasks(self, target_path: Path):
        mode = self.mode_var.get()
        self._log(f"Target: {target_path}")
        self._log(f"Mode: {mode}")
        self._log("")

        ok = True

        if mode in (MODE_MARKDOWN, MODE_BOTH):
            ok = self._run_markdown_fix(target_path) and ok

        if mode in (MODE_IMAGES, MODE_BOTH):
            ok = self._run_image_opt(target_path) and ok

        self._log("")
        self._log("Done." if ok else "Done with errors.")
        self._set_status("Complete" if ok else "Complete (errors)")
        self.run_btn.config(state=tk.NORMAL)
        self.is_running = False

    def _run_markdown_fix(self, target_path: Path) -> bool:
        self._log("=== Markdown Fix ===")

        files = self._collect_fixable_files(target_path)
        if not files:
            self._log("No markdown, index.html, or manifest.json files found.")
            return True

        fixed_total = 0
        manual_total = 0

        for content_file in files:
            rel = self._safe_relative(content_file, target_path)
            self._log(f"Processing: {rel}")

            try:
                fixed_msgs, manual_msgs = self._fix_content_file(content_file)
            except Exception as exc:
                self._log(f"  ERROR: Failed to process file ({exc})")
                return False

            if fixed_msgs:
                for msg in fixed_msgs:
                    self._log(f"  FIXED: {msg}")
            else:
                self._log("  No auto-fixes needed")

            for msg in manual_msgs:
                self._log(f"  MANUAL: {msg}")

            fixed_total += len(fixed_msgs)
            manual_total += len(manual_msgs)
            self._log("")

        self._log("================================================")
        self._log("Summary")
        self._log("================================================")
        self._log(f"Auto-fixes applied : {fixed_total}")
        self._log(f"Manual fixes needed: {manual_total}")

        if manual_total > 0:
            self._log("Some issues require manual attention. Run the validator to see remaining errors.")
        else:
            self._log("All fixable issues resolved. Run the validator to confirm.")

        return True

    def _run_image_opt(self, target_path: Path) -> bool:
        self._log("=== Image Optimization ===")

        if Image is None:
            self._log("ERROR: Pillow library not found. Install it with: pip install pillow")
            return False

        images = self._find_images(target_path)
        if not images:
            self._log("No images found.")
            return True

        oxipng_path = self._get_oxipng_path()
        use_oxipng = oxipng_path is not None

        self._log(f"Found {len(images)} images. Processing with {IMAGE_JOBS} parallel jobs...")
        self._log("")

        results = []

        with ThreadPoolExecutor(max_workers=IMAGE_JOBS) as executor:
            futures = {
                executor.submit(self._process_image_file, img, oxipng_path): img
                for img in images
            }
            for future in as_completed(futures):
                try:
                    results.append(future.result())
                except Exception as exc:
                    self._log(f"Failed on: {futures[future]} ({exc})")
                    before = futures[future].stat().st_size if futures[future].exists() else 0
                    results.append(("failed", before, before))

        count_resized = 0
        count_optimized = 0
        count_skipped = 0
        count_failed = 0
        bytes_before_total = 0
        bytes_after_total = 0

        for status, before, after in results:
            bytes_before_total += before
            bytes_after_total += after
            if status == "resized":
                count_resized += 1
            elif status == "optimized":
                count_optimized += 1
            elif status == "skipped":
                count_skipped += 1
            elif status == "failed":
                count_failed += 1

        total_delta = bytes_before_total - bytes_after_total

        self._log("")
        self._log("================ Summary ================")
        self._log(f"Resized:     {count_resized}")
        self._log(f"Optimized:   {count_optimized}")
        self._log(f"Skipped:     {count_skipped}")
        self._log(f"Failed:      {count_failed}")
        if not use_oxipng:
            self._log("(oxipng not installed - PNG optimization skipped)")
        self._log(f"Before:      {bytes_before_total / 1048576:.2f} MB")
        self._log(f"After:       {bytes_after_total / 1048576:.2f} MB")
        if total_delta >= 0:
            self._log(f"Saved:       {total_delta / 1048576:.2f} MB")
        else:
            self._log(f"Net grew:    {abs(total_delta) / 1048576:.2f} MB")
        self._log("=========================================")

        return True

    @staticmethod
    def _collect_fixable_files(target_path: Path):
        files = []
        for path in target_path.rglob("*"):
            if not path.is_file():
                continue
            parts = set(path.parts)
            if "node_modules" in parts or ".github" in parts:
                continue
            basename = path.name.lower()
            if basename == "readme.md":
                continue
            if basename.endswith(".md") or basename in {"index.html", "manifest.json"}:
                files.append(path)
        return sorted(files)

    def _fix_content_file(self, file_path: Path):
        basename = file_path.name.lower()
        if basename in {"index.html", "manifest.json"}:
            return self._fix_legacy_cdn_file(file_path)
        return self._fix_markdown_file(file_path)

    @staticmethod
    def _fix_legacy_cdn_file(file_path: Path):
        original = file_path.read_text(encoding="utf-8")
        text, replaced_count = FixomatApp._replace_legacy_cdn_urls(original)
        fixed_msgs = []

        if replaced_count:
            occurrence_label = "occurrence" if replaced_count == 1 else "occurrences"
            fixed_msgs.append(
                f"Replaced {replaced_count} legacy 'oracle-livelabs.github.io' URL {occurrence_label} "
                "with 'livelabs.oracle.com/cdn'"
            )

        if text != original:
            file_path.write_text(text, encoding="utf-8")

        return fixed_msgs, []

    def _fix_markdown_file(self, file_path: Path):
        original = file_path.read_text(encoding="utf-8")
        text = original
        fixed_msgs = []

        # Fix 9b: tabs after numbered list markers.
        text, changed_tabs = self._fix_numbered_tabs(text)
        if changed_tabs:
            fixed_msgs.append("Replaced tab characters with spaces in numbered list items")

        # Fix 9c: multiple spaces after numbered list markers.
        text, changed_spaces = self._fix_numbered_multispaces(text)
        if changed_spaces:
            fixed_msgs.append("Replaced multiple spaces with single space in numbered list items")

        # Fix 5b: convert inline HTML anchors to markdown links.
        text, anchor_count = re.subn(
            r'<a\s+href=["\']([^"\']+)["\']\s*>([^<]*)</a>',
            r'[\2](\1)',
            text,
            flags=re.IGNORECASE,
        )
        if anchor_count:
            fixed_msgs.append("Converted HTML anchor tags to Markdown links")

        # Fix 5: add placeholder alt text for empty/blank alt markdown images.
        text, empty_alt_count = re.subn(r'!\[\s*\]\((?!youtube:)', '![Image](', text)
        if empty_alt_count:
            fixed_msgs.append(
                "Added placeholder alt text 'Image' to image references with missing alt text "
                "(review and replace with descriptive text)"
            )

        # Fix 14: lowercase image paths in image markdown references.
        text, changed_img_paths = self._lowercase_markdown_image_paths(text)
        if changed_img_paths:
            fixed_msgs.append("Lowercased image file paths in references")

        # Fix 3: ensure acknowledgements section exists.
        if not re.search(r'^## Acknowledgements', text, flags=re.MULTILINE):
            if text and not text.endswith("\n"):
                text += "\n"
            text += (
                "\n## Acknowledgements\n\n"
                "* **Author** - TODO: Your Name, Your Title, Your Organization\n"
                "* **Last Updated By/Date** - TODO: Your Name, Month Year\n"
            )
            fixed_msgs.append("Added '## Acknowledgements' section at end of file (update with your details)")

        # Fix 12/13: ensure estimated time exists.
        basename = file_path.name.lower()
        if basename == "introduction.md":
            if not re.search(r'Estimated Workshop Time.*:', text, flags=re.IGNORECASE):
                text, inserted = self._insert_after_heading_or_h1(
                    text,
                    heading="## Introduction",
                    insert_line="Estimated Workshop Time: TODO - x minutes",
                )
                if inserted:
                    fixed_msgs.append("Added 'Estimated Workshop Time:' placeholder (update with actual time)")
        else:
            if not re.search(r'Estimated.*Time.*:', text, flags=re.IGNORECASE):
                text, inserted = self._insert_after_heading_or_h1(
                    text,
                    heading="## Introduction",
                    insert_line="Estimated Time: TODO - x minutes",
                )
                if inserted:
                    fixed_msgs.append("Added 'Estimated Time:' placeholder (update with actual time)")

        # Fix 11: ensure objectives section exists.
        if not re.search(r'^(###|##) Objectives', text, flags=re.MULTILINE):
            text, inserted = self._insert_objectives(text)
            if inserted:
                fixed_msgs.append("Added '### Objectives' section (update with actual objectives)")

        # Fix 10: ensure introduction section exists when tasks exist.
        if re.search(r'^## Task', text, flags=re.MULTILINE) and not re.search(r'^## Introduction', text, flags=re.MULTILINE):
            text, inserted = self._insert_intro_before_first_task(text)
            if inserted:
                fixed_msgs.append("Added '## Introduction' section before first Task (update with actual content)")

        # Fix 16-18: indentation inside ordered task steps.
        text, indentation_fixes = self._fix_task_indentation(text)
        if indentation_fixes > 0:
            fixed_msgs.append(f"Fixed indentation ({indentation_fixes} lines) inside numbered steps")

        # Manual checks after auto-fix pass.
        manual_msgs = self._collect_manual_markdown_issues(text)

        if text != original:
            if text and not text.endswith("\n"):
                text += "\n"
            file_path.write_text(text, encoding="utf-8")

        return fixed_msgs, manual_msgs

    @staticmethod
    def _replace_legacy_cdn_urls(text: str):
        return LEGACY_CDN_HOST_RE.subn("livelabs.oracle.com/cdn", text)

    @staticmethod
    def _fix_numbered_tabs(text: str):
        lines = text.splitlines(keepends=True)
        changed = False
        out = []
        for line in lines:
            new_line = re.sub(r'^(\s*\d+\.)\t', r'\1 ', line)
            if new_line != line:
                changed = True
            out.append(new_line)
        return "".join(out), changed

    @staticmethod
    def _fix_numbered_multispaces(text: str):
        lines = text.splitlines(keepends=True)
        changed = False
        out = []
        for line in lines:
            new_line = re.sub(r'^(\s*\d+\.) {2,}', r'\1 ', line)
            if new_line != line:
                changed = True
            out.append(new_line)
        return "".join(out), changed

    @staticmethod
    def _lowercase_markdown_image_paths(text: str):
        changed = False
        in_code = False
        out_lines = []

        def replace_image_ref(match):
            nonlocal changed
            pre, path, post = match.groups()
            new_path = re.sub(
                r'images/[^"\s)]+',
                lambda img_match: img_match.group(0).lower(),
                path,
            )
            if new_path != path:
                changed = True
            return f"{pre}{new_path}{post}"

        for line in text.splitlines(keepends=True):
            if re.match(r'^\s*```[^`]*$', line.rstrip("\n\r")):
                in_code = not in_code
                out_lines.append(line)
                continue

            if in_code:
                out_lines.append(line)
                continue

            out_lines.append(re.sub(r'(!\[[^\]]*\]\()([^)]+)(\))', replace_image_ref, line))

        new_text = "".join(out_lines)
        return new_text, changed

    @staticmethod
    def _insert_after_heading_or_h1(text: str, heading: str, insert_line: str):
        lines = text.splitlines(keepends=True)
        if not lines:
            lines = ["# TODO: Title\n"]

        insert_idx = None
        for idx, line in enumerate(lines):
            if line.rstrip("\n\r") == heading:
                insert_idx = idx + 1
                break

        if insert_idx is None:
            for idx, line in enumerate(lines):
                if re.match(r'^# [^#]', line):
                    insert_idx = idx + 1
                    break

        if insert_idx is None:
            insert_idx = 1

        block = ["\n", f"{insert_line}\n", "\n"]
        lines[insert_idx:insert_idx] = block
        return "".join(lines), True

    @staticmethod
    def _insert_objectives(text: str):
        lines = text.splitlines(keepends=True)
        block = [
            "### Objectives\n",
            "\n",
            "In this lab, you will:\n",
            "* TODO: Add objectives\n",
            "\n",
        ]

        intro_idx = None
        for idx, line in enumerate(lines):
            if re.match(r'^## Introduction\s*$', line.rstrip("\n\r")):
                intro_idx = idx
                break

        if intro_idx is not None:
            insert_at = len(lines)
            for idx in range(intro_idx + 1, len(lines)):
                if re.match(r'^## ', lines[idx]):
                    insert_at = idx
                    break
            lines[insert_at:insert_at] = block
            return "".join(lines), True

        for idx, line in enumerate(lines):
            if re.match(r'^# [^#]', line):
                insert_at = idx + 1
                lines[insert_at:insert_at] = ["\n"] + block
                return "".join(lines), True

        lines = ["# TODO: Title\n", "\n"] + block + lines
        return "".join(lines), True

    @staticmethod
    def _insert_intro_before_first_task(text: str):
        lines = text.splitlines(keepends=True)
        task_idx = None
        for idx, line in enumerate(lines):
            if re.match(r'^## Task', line):
                task_idx = idx
                break

        if task_idx is None:
            return text, False

        block = [
            "## Introduction\n",
            "\n",
            "TODO: Add introduction text here.\n",
            "\n",
        ]
        lines[task_idx:task_idx] = block
        return "".join(lines), True

    @staticmethod
    def _fix_task_indentation(text: str):
        lines = text.splitlines(keepends=True)

        heading_indices = []
        task_indices = []
        for idx, raw in enumerate(lines):
            if re.match(r'^## ', raw):
                heading_indices.append(idx)
                if re.match(r'^## Task', raw):
                    task_indices.append(idx)

        fixes = 0
        for start in task_indices:
            section_start = start + 1
            next_headings = [h for h in heading_indices if h > start]
            section_end = next_headings[0] if next_headings else len(lines)
            block = lines[section_start:section_end]
            if not block:
                continue

            has_ordered = any(re.match(r'[0-9]+\. ', ln.rstrip("\n\r")) for ln in block)
            if not has_ordered:
                continue

            first_step_offset = None
            for offset, ln in enumerate(block):
                if re.match(r'[0-9]+\. ', ln.rstrip("\n\r")):
                    first_step_offset = offset
                    break

            if first_step_offset is None:
                continue

            in_code_block = False
            in_ordered_block = False

            for offset in range(first_step_offset, len(block)):
                abs_idx = section_start + offset
                raw_line = lines[abs_idx].rstrip("\n\r")
                stripped = raw_line.lstrip(" ")
                indent = len(raw_line) - len(stripped)

                if re.match(r'[0-9]+\. ', raw_line):
                    in_ordered_block = True
                    in_code_block = False
                    continue

                if not in_ordered_block:
                    continue

                if stripped.startswith("```"):
                    if not in_code_block:
                        in_code_block = True
                        if indent < 4:
                            lines[abs_idx] = "    " + stripped + "\n"
                            fixes += 1
                    else:
                        in_code_block = False
                        if indent < 4 and stripped.rstrip() == "```":
                            lines[abs_idx] = "    " + stripped + "\n"
                            fixes += 1
                    continue

                if in_code_block:
                    if indent < 4 and stripped:
                        lines[abs_idx] = "    " + stripped + "\n"
                        fixes += 1
                    continue

                if not stripped:
                    continue

                if indent < 4 and stripped.startswith("<") and stripped.endswith(">"):
                    continue

                if indent < 4 and stripped.startswith("#"):
                    in_ordered_block = False
                    continue

                if indent < 4:
                    remaining = [ln.rstrip("\n\r") for ln in lines[abs_idx + 1:section_end]]
                    has_later_step = any(re.match(r'[0-9]+\. ', ln) for ln in remaining)
                    if not has_later_step:
                        in_ordered_block = False
                        continue

                if indent < 4:
                    lines[abs_idx] = "    " + stripped + "\n"
                    fixes += 1

        return "".join(lines), fixes

    @staticmethod
    def _collect_manual_markdown_issues(text: str):
        manual = []
        lines = text.splitlines()

        first_non_empty = next((line for line in lines if line.strip()), "")
        if not re.match(r'^#[^#]', first_non_empty):
            manual.append("Missing H1 title - add '# Your Lab Title' as the first line")

        in_code = False
        h1_count = 0
        for line in lines:
            if re.match(r'^\s*```\s*$', line) or re.match(r'^\s*```[a-zA-Z]+\s*$', line):
                in_code = not in_code
                continue
            if not in_code and re.match(r'^# ', line):
                h1_count += 1
        if h1_count > 1:
            manual.append(f"Multiple H1 headers ({h1_count} found) - manually remove extra H1s")

        open_copy = len(re.findall(r'<copy>', text))
        close_copy = len(re.findall(r'</copy>', text))
        if open_copy != close_copy:
            manual.append(f"Mismatched <copy> tags (open: {open_copy}, close: {close_copy}) - manually fix")

        for idx, line in enumerate(lines, start=1):
            if line.startswith("## Task") and not TASK_HEADER_VALID_RE.match(line):
                manual.append(
                    "Task header at line "
                    f"{idx} doesn't follow '## Task Number and/or string: Description' format - manually fix"
                )

        for idx, line in enumerate(lines, start=1):
            if "youtube:" in line and not YOUTUBE_VALID_RE.search(line):
                manual.append(
                    "YouTube embed at line "
                    f"{idx} is not in [optional text](youtube:VIDEO_ID[:size]) format - manually fix"
                )

        return manual

    @staticmethod
    def _find_images(target_path: Path):
        images = []
        for root, dirs, files in os.walk(target_path):
            if ".git" in dirs:
                dirs.remove(".git")
            for name in files:
                if name.lower().endswith((".png", ".jpg", ".jpeg")):
                    path = Path(root) / name
                    images.append(path)

        return sorted(images, key=lambda p: p.stat().st_mtime, reverse=True)

    @staticmethod
    def _safe_relative(path: Path, base: Path):
        try:
            return path.relative_to(base)
        except Exception:
            return path

    def _get_oxipng_path(self):
        names = ["oxipng.exe"] if os.name == "nt" else ["oxipng"]
        if os.name != "nt":
            names.append("oxipng")

        candidates = []
        if getattr(sys, "frozen", False):
            meipass = getattr(sys, "_MEIPASS", None)
            if meipass:
                candidates.extend([Path(meipass), Path(meipass) / "_internal"])
            exe_parent = Path(sys.executable).parent
            candidates.extend([exe_parent, exe_parent / "_internal"])

        candidates.extend([SCRIPT_DIR, SCRIPT_DIR / "build"])

        for base in candidates:
            for name in names:
                candidate = base / name
                if candidate.exists() and candidate.is_file():
                    return str(candidate)

        return shutil.which("oxipng")

    def _process_image_file(self, filepath: Path, oxipng_path: str | None):
        size_before = filepath.stat().st_size

        try:
            with Image.open(filepath) as img:
                w, h = img.size
        except Exception:
            self._log(f"Skipping (failed to read): {filepath}")
            return "failed", size_before, size_before

        ext = filepath.suffix.lower()
        needs_resize = w > IMAGE_MAX_DIM or h > IMAGE_MAX_DIM

        if ext in (".jpg", ".jpeg"):
            if not needs_resize:
                self._log(f"Skipping (already <= {IMAGE_MAX_DIM}px): {filepath} ({w}x{h})")
                return "skipped", size_before, size_before

            self._log(f"Resizing: {filepath} ({w}x{h} -> max {IMAGE_MAX_DIM}px)")
            try:
                with Image.open(filepath) as img:
                    img.thumbnail((IMAGE_MAX_DIM, IMAGE_MAX_DIM), Image.Resampling.LANCZOS)
                    img.save(filepath, "JPEG", quality=92, optimize=True)
            except Exception as exc:
                self._log(f"Failed on: {filepath} ({exc})")
                return "failed", size_before, size_before

            size_after = filepath.stat().st_size
            self._log(self._format_delta(size_before, size_after))
            return "resized", size_before, size_after

        if ext == ".png":
            was_resized = False
            status = "optimized"

            if needs_resize:
                self._log(f"Resizing: {filepath} ({w}x{h} -> max {IMAGE_MAX_DIM}px)")
                try:
                    with Image.open(filepath) as img:
                        img.thumbnail((IMAGE_MAX_DIM, IMAGE_MAX_DIM), Image.Resampling.LANCZOS)
                        img.save(filepath, "PNG", optimize=True)
                    was_resized = True
                except Exception as exc:
                    self._log(f"Failed on: {filepath} ({exc})")
                    return "failed", size_before, size_before

            if oxipng_path:
                if not was_resized:
                    self._log(f"Optimizing PNG: {filepath} ({w}x{h})")
                kwargs = {"capture_output": True, "check": False}
                if os.name == "nt":
                    kwargs["creationflags"] = subprocess.CREATE_NO_WINDOW
                try:
                    subprocess.run(
                        [oxipng_path, "-o", "4", "--strip", "safe", str(filepath)],
                        **kwargs,
                    )
                except Exception:
                    pass
                status = "resized" if was_resized else "optimized"
            elif not needs_resize:
                self._log(f"Skipping (no resize needed, oxipng not installed): {filepath} ({w}x{h})")
                return "skipped", size_before, size_before
            else:
                status = "resized"

            size_after = filepath.stat().st_size
            self._log(self._format_delta(size_before, size_after))
            return status, size_before, size_after

        return "skipped", size_before, size_before

    @staticmethod
    def _format_delta(before: int, after: int):
        delta = before - after
        if delta >= 0:
            return f"  Saved: {delta / 1048576:.2f} MB ({delta} bytes)"
        return f"  Grew:  {abs(delta) / 1048576:.2f} MB ({delta} bytes)"

    def _log(self, message: str):
        self.log_queue.put(message)

    def _set_status(self, message: str):
        self.root.after(0, lambda: self.status_var.set(message))

    def _process_log_queue(self):
        try:
            while True:
                message = self.log_queue.get_nowait()
                self.log_area.config(state=tk.NORMAL)
                self.log_area.insert(tk.END, message + "\n")
                self.log_area.see(tk.END)
                self.log_area.config(state=tk.DISABLED)
        except queue.Empty:
            pass

        self.root.after(50, self._process_log_queue)

    def run(self):
        self.root.mainloop()


def main():
    app = FixomatApp()
    app.run()


if __name__ == "__main__":
    main()
