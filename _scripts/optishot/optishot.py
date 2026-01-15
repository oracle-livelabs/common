#!/usr/bin/env python3
"""
Cross-platform image resize and compression script.
Works on Windows, macOS, and Linux.

Requirements:
    pip install pillow

Optional (for better PNG compression):
    - oxipng: https://github.com/shssoichiro/oxipng
"""

import argparse
import os
import queue
import shutil
import subprocess
import sys
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    print("Error: Pillow library not found.")
    print("Install it with: pip install pillow")
    sys.exit(1)


# Global reference to status window for thread-safe logging
_status_window = None
_log_queue = queue.Queue()


def is_gui_mode():
    """Check if running as a GUI app (no console available)."""
    if getattr(sys, 'frozen', False):
        # Running as compiled executable
        # Check if we have a console
        if sys.platform == "win32":
            try:
                sys.stdout.write("")
                return False
            except Exception:
                return True
        elif sys.platform == "darwin":
            # macOS .app bundles run without console
            return True
    return False


class StatusWindow:
    """A tkinter window that displays processing status."""

    def __init__(self, title="OptiShot"):
        import tkinter as tk
        from tkinter import scrolledtext

        self.root = tk.Tk()
        self.root.title(title)
        self.root.geometry("700x500")

        # Make window appear on top initially
        self.root.attributes("-topmost", True)
        self.root.after(100, lambda: self.root.attributes("-topmost", False))

        # Create main frame
        main_frame = tk.Frame(self.root, padx=10, pady=10)
        main_frame.pack(fill=tk.BOTH, expand=True)

        # Status label
        self.status_label = tk.Label(
            main_frame,
            text="Processing...",
            font=("Helvetica", 12, "bold"),
            anchor="w"
        )
        self.status_label.pack(fill=tk.X, pady=(0, 10))

        # Scrolled text area for output
        self.text_area = scrolledtext.ScrolledText(
            main_frame,
            wrap=tk.WORD,
            font=("Courier", 11),
            bg="#1e1e1e",
            fg="#d4d4d4",
            insertbackground="#d4d4d4"
        )
        self.text_area.pack(fill=tk.BOTH, expand=True)
        self.text_area.config(state=tk.DISABLED)

        # Close button (initially disabled)
        self.close_button = tk.Button(
            main_frame,
            text="Close",
            command=self.close,
            state=tk.DISABLED,
            width=15
        )
        self.close_button.pack(pady=(10, 0))

        # Track if window is closing
        self.is_closing = False
        self.root.protocol("WM_DELETE_WINDOW", self.close)

        # Start queue processing
        self.process_queue()

    def log(self, message):
        """Add a message to the log queue (thread-safe)."""
        _log_queue.put(message)

    def process_queue(self):
        """Process messages from the queue and update the text area."""
        try:
            while True:
                message = _log_queue.get_nowait()
                self._append_text(message + "\n")
        except queue.Empty:
            pass

        if not self.is_closing:
            self.root.after(50, self.process_queue)

    def _append_text(self, text):
        """Append text to the text area."""
        self.text_area.config(state="normal")
        self.text_area.insert("end", text)
        self.text_area.see("end")
        self.text_area.config(state="disabled")

    def set_status(self, status):
        """Update the status label."""
        self.status_label.config(text=status)

    def enable_close(self):
        """Enable the close button when processing is complete."""
        self.close_button.config(state="normal")
        self.set_status("Complete!")

    def close(self):
        """Close the window."""
        self.is_closing = True
        self.root.quit()
        self.root.destroy()

    def mainloop(self):
        """Start the tkinter main loop."""
        self.root.mainloop()


def log_message(message):
    """Log a message to the status window or stdout."""
    global _status_window
    if _status_window is not None:
        _status_window.log(message)
    else:
        print(message)


def get_bundled_path(filename):
    """Get path to a file bundled with the executable (PyInstaller support)."""
    if getattr(sys, 'frozen', False):
        # Running as compiled executable
        base_path = Path(sys._MEIPASS)
    else:
        # Running as script
        base_path = Path(__file__).parent

    bundled = base_path / filename
    if bundled.exists():
        return str(bundled)
    return None


def get_oxipng_path():
    """Get path to oxipng binary (bundled or system)."""
    # Check for bundled oxipng first
    bundled = get_bundled_path("oxipng")
    if bundled:
        return bundled

    # Fall back to system oxipng
    system_oxipng = shutil.which("oxipng")
    if system_oxipng:
        return system_oxipng

    return None


def has_oxipng():
    """Check if oxipng is available (bundled or system)."""
    return get_oxipng_path() is not None


def get_image_dimensions(filepath):
    """Get image dimensions using Pillow."""
    try:
        with Image.open(filepath) as img:
            return img.size  # (width, height)
    except Exception as e:
        return None


def process_file(filepath, max_dim, dry_run, use_oxipng, results):
    """Process a single image file."""
    filepath = Path(filepath)

    if not filepath.exists():
        return

    # Get original size
    size_before = filepath.stat().st_size

    # Get dimensions
    dims = get_image_dimensions(filepath)
    if dims is None:
        log_message(f"Skipping (failed to read): {filepath}")
        results.append(("failed", size_before, size_before))
        return

    w, h = dims
    ext_lower = filepath.suffix.lower()

    needs_resize = w > max_dim or h > max_dim

    # Handle JPEG files
    if ext_lower in (".jpg", ".jpeg"):
        if not needs_resize:
            log_message(f"Skipping (already <= {max_dim}px): {filepath} ({w}x{h})")
            results.append(("skipped", size_before, size_before))
            return

        if dry_run:
            log_message(f"[DRY-RUN] Would resize: {filepath} ({w}x{h} → max {max_dim}px)")
            results.append(("would_resize", size_before, size_before))
            return

        log_message(f"Resizing: {filepath} ({w}x{h} → max {max_dim}px)")

        try:
            with Image.open(filepath) as img:
                # Calculate new dimensions maintaining aspect ratio
                img.thumbnail((max_dim, max_dim), Image.Resampling.LANCZOS)
                # Save with high quality
                img.save(filepath, "JPEG", quality=92, optimize=True)

            size_after = filepath.stat().st_size
            delta = size_before - size_after
            if delta >= 0:
                log_message(f"  Saved: {delta / 1048576:.2f} MB ({delta} bytes)")
            else:
                log_message(f"  Grew:  {abs(delta) / 1048576:.2f} MB ({delta} bytes)")

            results.append(("resized", size_before, size_after))
        except Exception as e:
            log_message(f"Failed on: {filepath} ({e})")
            results.append(("failed", size_before, size_before))
        return

    # Handle PNG files
    if ext_lower == ".png":
        was_resized = False

        if needs_resize:
            if dry_run:
                action = "Resize + optimize PNG" if use_oxipng else "Resize PNG"
                log_message(f"[DRY-RUN] Would {action.lower()}: {filepath} ({w}x{h} → max {max_dim}px)")
                results.append(("would_resize", size_before, size_before))
                return

            log_message(f"Resizing: {filepath} ({w}x{h} → max {max_dim}px)")

            try:
                with Image.open(filepath) as img:
                    img.thumbnail((max_dim, max_dim), Image.Resampling.LANCZOS)
                    img.save(filepath, "PNG", optimize=True)
                was_resized = True
            except Exception as e:
                log_message(f"Failed on: {filepath} ({e})")
                results.append(("failed", size_before, size_before))
                return

        # Optimize with oxipng if available
        if use_oxipng:
            if dry_run:
                log_message(f"[DRY-RUN] Would optimize PNG: {filepath} ({w}x{h})")
                results.append(("would_optimize", size_before, size_before))
                return

            if not was_resized:
                log_message(f"Optimizing PNG: {filepath} ({w}x{h})")

            try:
                oxipng_bin = get_oxipng_path()
                subprocess.run(
                    [oxipng_bin, "-o", "4", "--strip", "safe", str(filepath)],
                    capture_output=True,
                    check=False
                )
            except Exception:
                pass  # oxipng optimization is best-effort

            size_after = filepath.stat().st_size
            status = "optimized" if not was_resized else "resized"
        elif not needs_resize:
            log_message(f"Skipping (no resize needed, oxipng not installed): {filepath} ({w}x{h})")
            results.append(("skipped", size_before, size_before))
            return
        else:
            size_after = filepath.stat().st_size
            status = "resized"

        delta = size_before - size_after
        if delta >= 0:
            log_message(f"  Saved: {delta / 1048576:.2f} MB ({delta} bytes)")
        else:
            log_message(f"  Grew:  {abs(delta) / 1048576:.2f} MB ({delta} bytes)")

        results.append((status, size_before, size_after))


def find_images(directory):
    """Find all JPG/PNG images recursively, excluding .git directory."""
    images = []
    for root, dirs, files in os.walk(directory):
        # Skip .git directory
        if ".git" in dirs:
            dirs.remove(".git")

        for file in files:
            if file.lower().endswith((".png", ".jpg", ".jpeg")):
                images.append(Path(root) / file)

    return sorted(images, key=lambda p: p.stat().st_mtime, reverse=True)


def is_interactive():
    """Check if running interactively (e.g., double-clicked on Windows)."""
    # On Windows, check if launched from explorer (no parent console)
    if sys.platform == "win32":
        try:
            # If stdin is not a terminal, likely double-clicked
            return not sys.stdin.isatty() or os.environ.get("PROMPT") is None
        except Exception:
            return True
    return False


def select_folder_dialog():
    """Show a folder picker dialog and return the selected path."""
    try:
        import tkinter as tk
        from tkinter import filedialog

        # Create and hide the root window
        root = tk.Tk()
        root.withdraw()

        # Make the dialog appear on top
        root.attributes("-topmost", True)

        # Show folder picker dialog
        folder_path = filedialog.askdirectory(
            title="OptiShot - Select folder containing images",
            mustexist=True
        )

        root.destroy()

        if folder_path:
            return Path(folder_path)
        return None
    except Exception as e:
        print(f"Could not open folder dialog: {e}")
        print("Please specify a directory as a command-line argument.")
        return None


def run_processing(target_dir, args, callback_done=None):
    """Run the image processing (can be called from main thread or background)."""
    log_message(f"Processing directory: {target_dir}")
    log_message("")

    use_oxipng = has_oxipng()

    if args.dry_run:
        log_message("=== DRY-RUN MODE (no files will be modified) ===")
        log_message("")

    # Find all images
    images = find_images(target_dir)

    if not images:
        log_message("No images found.")
        if callback_done:
            callback_done()
        return

    log_message(f"Found {len(images)} images. Processing with {args.jobs} parallel jobs...")
    log_message("")

    # Thread-safe results collection
    results = []

    # Process files in parallel
    with ThreadPoolExecutor(max_workers=args.jobs) as executor:
        futures = {
            executor.submit(process_file, img, args.max, args.dry_run, use_oxipng, results): img
            for img in images
        }

        for future in as_completed(futures):
            try:
                future.result()
            except Exception as e:
                log_message(f"Error processing {futures[future]}: {e}")

    # Aggregate results
    count_resized = 0
    count_skipped = 0
    count_failed = 0
    count_optimized = 0
    count_would_resize = 0
    count_would_optimize = 0
    bytes_before_total = 0
    bytes_after_total = 0

    for status, before, after in results:
        bytes_before_total += before
        bytes_after_total += after
        if status == "resized":
            count_resized += 1
        elif status == "skipped":
            count_skipped += 1
        elif status == "failed":
            count_failed += 1
        elif status == "optimized":
            count_optimized += 1
        elif status == "would_resize":
            count_would_resize += 1
        elif status == "would_optimize":
            count_would_optimize += 1

    # Print summary
    total_delta = bytes_before_total - bytes_after_total

    log_message("")
    log_message("================ Summary ================")
    if args.dry_run:
        log_message("MODE:        DRY-RUN (no changes made)")
        log_message(f"Would resize:    {count_would_resize}")
        log_message(f"Would optimize:  {count_would_optimize}")
        log_message(f"Skipped:         {count_skipped}")
        log_message(f"Failed:          {count_failed}")
    else:
        log_message(f"Resized:     {count_resized}")
        log_message(f"Optimized:   {count_optimized}")
        log_message(f"Skipped:     {count_skipped}")
        log_message(f"Failed:      {count_failed}")
        if not use_oxipng:
            log_message("(oxipng not installed - PNG optimization skipped)")
        log_message(f"Before:      {bytes_before_total / 1048576:.2f} MB")
        log_message(f"After:       {bytes_after_total / 1048576:.2f} MB")
        if total_delta >= 0:
            log_message(f"Saved:       {total_delta / 1048576:.2f} MB")
        else:
            log_message(f"Net grew:    {abs(total_delta) / 1048576:.2f} MB")
    log_message("=========================================")

    if callback_done:
        callback_done()


def main():
    global _status_window

    parser = argparse.ArgumentParser(
        description="Resize and optimize images (JPG/PNG) in a directory recursively.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s                      # Opens folder picker dialog
  %(prog)s C:\\path\\to\\images   # Process images in specified directory
  %(prog)s -n                   # Preview what would be done (dry-run)
  %(prog)s -j 8                 # Use 8 parallel jobs
  %(prog)s -m 1920              # Resize to max 1920px

Windows tip: Double-click the .exe to open a folder picker, or drag a folder onto it.
"""
    )
    parser.add_argument("directory", nargs="?", default=None,
                        help="Directory to process (opens folder picker if not specified)")
    parser.add_argument("-n", "--dry-run", action="store_true",
                        help="Preview changes without modifying files")
    parser.add_argument("-j", "--jobs", type=int, default=4,
                        help="Number of parallel jobs (default: 4)")
    parser.add_argument("-m", "--max", type=int, default=1280,
                        help="Maximum dimension in pixels (default: 1280)")

    args = parser.parse_args()

    # Determine target directory
    if args.directory:
        # Directory provided via command line or drag-and-drop
        target_dir = Path(args.directory).resolve()
    else:
        # No directory specified - show folder picker dialog
        target_dir = select_folder_dialog()

        if target_dir is None:
            if not is_gui_mode():
                print("No folder selected. Exiting.")
            sys.exit(0)

    # Validate directory
    if not target_dir.exists():
        log_message(f"Error: Directory not found: {target_dir}")
        if is_interactive() and not is_gui_mode():
            input("\nPress Enter to exit...")
        sys.exit(1)
    if not target_dir.is_dir():
        log_message(f"Error: Not a directory: {target_dir}")
        if is_interactive() and not is_gui_mode():
            input("\nPress Enter to exit...")
        sys.exit(1)

    # Check if we should use GUI mode
    if is_gui_mode():
        # Create status window
        _status_window = StatusWindow()

        # Run processing in background thread
        def on_complete():
            _status_window.root.after(0, _status_window.enable_close)

        processing_thread = threading.Thread(
            target=run_processing,
            args=(target_dir, args, on_complete)
        )
        processing_thread.daemon = True
        processing_thread.start()

        # Run the GUI main loop
        _status_window.mainloop()
    else:
        # Console mode - run directly
        run_processing(target_dir, args)

        # Keep window open on Windows if double-clicked
        if is_interactive():
            input("\nPress Enter to exit...")


if __name__ == "__main__":
    main()
