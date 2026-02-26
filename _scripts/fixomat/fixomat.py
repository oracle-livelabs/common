#!/usr/bin/env python3
"""
Fixomat - LiveLabs Markdown + Image fixer.

UI app to fix Markdown, optimize images, or run both for a workshop root.
"""

import os
import queue
import shutil
import subprocess
import sys
import threading
import re
from pathlib import Path

try:
    import tkinter as tk
    from tkinter import filedialog, scrolledtext, messagebox
except Exception as exc:  # pragma: no cover - GUI dependency
    print("Error: tkinter is required to run Fixomat.")
    print(f"Details: {exc}")
    sys.exit(1)

SCRIPT_DIR = Path(__file__).resolve().parent
OPTISHOT_SCRIPT = SCRIPT_DIR.parent / "optishot" / "optishot.py"
MARKDOWN_FIX_SCRIPT = (
    SCRIPT_DIR.parent.parent / "md-validator" / ".github" / "scripts" / "fix-livelabs-markdown.sh"
)

MODE_BOTH = "both"
MODE_MARKDOWN = "markdown"
MODE_IMAGES = "images"


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
            text="Fix Markdown, optimize images, or run both for a workshop root.",
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
        if not MARKDOWN_FIX_SCRIPT.exists():
            self._log(f"ERROR: fix script not found: {MARKDOWN_FIX_SCRIPT}")
            return False

        bash = shutil.which("bash")
        if not bash:
            self._log("ERROR: bash not found. Unable to run markdown fix script.")
            return False

        return self._run_command([bash, str(MARKDOWN_FIX_SCRIPT), str(target_path)])

    def _run_image_opt(self, target_path: Path) -> bool:
        self._log("=== Image Optimization ===")
        if not OPTISHOT_SCRIPT.exists():
            self._log(f"ERROR: optishot not found: {OPTISHOT_SCRIPT}")
            return False

        return self._run_command([sys.executable, str(OPTISHOT_SCRIPT), str(target_path)])

    def _run_command(self, cmd):
        self._log("$ " + " ".join(cmd))
        try:
            proc = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
            )
        except Exception as exc:
            self._log(f"ERROR: Failed to start command: {exc}")
            return False

        assert proc.stdout is not None
        for line in proc.stdout:
            clean = self._strip_ansi(line.rstrip())
            self._log(clean)
        proc.wait()

        if proc.returncode != 0:
            self._log(f"ERROR: Command failed with exit code {proc.returncode}")
            return False

        return True

    @staticmethod
    def _strip_ansi(text: str) -> str:
        # Remove ANSI color/formatting codes (e.g., \x1b[0;32m)
        return re.sub(r"\x1b\[[0-9;]*m", "", text)

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
