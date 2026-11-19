"""Render icon.svg and splash.svg into the app's PNGs.

    python tools/icon/make_icons.py

Needs Microsoft Edge or Google Chrome (to draw the SVGs) and ffmpeg (to resize).
Set BROWSER=<path> if your browser isn't found automatically.
"""
import os
import shutil
import subprocess
import sys
import tempfile
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
APP = HERE.parent.parent

CANDIDATES = [
    os.environ.get("BROWSER", ""),
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    shutil.which("google-chrome") or "",
    shutil.which("chromium") or "",
]


def browser():
    for c in CANDIDATES:
        if c and Path(c).exists():
            return c
    sys.exit("No Edge or Chrome found. Set BROWSER to its path.")


def shoot(exe, url, size, out, profile):
    subprocess.run([
        exe, "--headless", "--disable-gpu", "--hide-scrollbars", "--no-first-run",
        f"--user-data-dir={profile}", "--force-device-scale-factor=1",
        "--default-background-color=00000000", f"--window-size={size[0]},{size[1]}",
        f"--screenshot={out}", url,
    ], check=True, timeout=90, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    # Edge on Windows can hand off to a child process and return before the file lands.
    for _ in range(60):
        if out.exists() and out.stat().st_size > 0:
            time.sleep(0.5)
            break
        time.sleep(0.5)
    if not out.exists():
        sys.exit(f"Browser did not write {out}")


def resize(src, dst, w, h):
    subprocess.run([
        "ffmpeg", "-y", "-loglevel", "error", "-i", str(src),
        "-vf", f"scale={w}:{h}:flags=lanczos", "-frames:v", "1", str(dst),
    ], check=True)


def main():
    if not shutil.which("ffmpeg"):
        sys.exit("ffmpeg not found on PATH.")
    exe = browser()
    with tempfile.TemporaryDirectory() as tmp:
        tmp = Path(tmp)
        for name in ("icon.svg", "splash.svg"):
            shutil.copy(HERE / name, tmp / name)
        (tmp / "icon.html").write_text(
            '<!doctype html><body style="margin:0;background:transparent">'
            '<img src="icon.svg" style="display:block;width:1024px;height:1024px">',
            encoding="utf-8",
        )
        big, splash = tmp / "icon-1024.png", tmp / "splash-full.png"
        shoot(exe, (tmp / "icon.html").as_uri(), (1024, 1024), big, tmp / "p1")
        shoot(exe, (tmp / "splash.svg").as_uri(), (1920, 1080), splash, tmp / "p2")

        resize(big, APP / "icon.png", 80, 80)
        resize(big, APP / "largeIcon.png", 130, 130)
        resize(splash, APP / "splash.png", 1920, 1080)
        shutil.copy(big, HERE / "icon-1024.png")
    print("wrote icon.png, largeIcon.png, splash.png and tools/icon/icon-1024.png")


if __name__ == "__main__":
    main()
