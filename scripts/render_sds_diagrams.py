"""Render SDS PlantUML diagrams — verify output, retry on OOM crash PNGs."""
from __future__ import annotations

import os
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SDS_DIR = ROOT / "docs" / "sds"
EXPORT = SDS_DIR / "export"
PLANTUML = Path(os.environ.get("PLANTUML_JAR", Path.home() / "plantuml.jar"))

DPI = 100
JAVA_HEAP = "3072m"
LIMIT_SIZE = "4096"

SKIN_BLOCK = """\
skinparam dpi 100
skinparam defaultFontSize 11
"""


def strip_section_separators(text: str) -> str:
    return re.sub(r"^== .+ ==\s*\n", "", text, flags=re.MULTILINE)


def normalize_puml(text: str, is_sq: bool) -> str:
    text = strip_section_separators(text)
    text = re.sub(r"skinparam dpi \d+", f"skinparam dpi {DPI}", text)
    if f"skinparam dpi {DPI}" not in text:
        anchor = "skinparam responseMessageBelowArrow true" if is_sq else "hide circle"
        if anchor in text:
            text = text.replace(anchor, anchor + "\n" + SKIN_BLOCK.strip(), 1)
    if is_sq and "hide footbox" not in text:
        text = text.replace(
            "skinparam responseMessageBelowArrow true",
            "skinparam responseMessageBelowArrow true\nhide footbox",
            1,
        )
    return text


def patch_puml_files():
    for p in sorted(SDS_DIR.glob("*.puml")):
        if p.name.startswith("_"):
            continue
        text = p.read_text(encoding="utf-8")
        new = normalize_puml(text, p.name.startswith("SQ_"))
        if new != text:
            p.write_text(new, encoding="utf-8")


def is_crash_png(path: Path) -> bool:
    """PlantUML OOM crash pages are narrow (~450-550px wide) with tiny file size."""
    if not path.exists() or path.stat().st_size < 5000:
        return True
    try:
        from PIL import Image

        with Image.open(path) as im:
            w, h = im.size
            return w < 450 or h < 200
    except Exception:
        return True


def render_one(puml: Path) -> bool:
    if not PLANTUML.exists():
        print(f"Missing plantuml.jar: {PLANTUML}")
        sys.exit(1)
    png = EXPORT / (puml.stem + ".png")
    cmd = [
        "java",
        f"-Xmx{JAVA_HEAP}",
        f"-DPLANTUML_LIMIT_SIZE={LIMIT_SIZE}",
        "-Djava.awt.headless=true",
        "-jar",
        str(PLANTUML),
        "-tpng",
        f"-SDPI={DPI}",
        "-o",
        str(EXPORT),
        str(puml),
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"FAIL {puml.name}: {result.stderr[:200]}")
        return False
    if is_crash_png(png):
        print(f"CRASH {puml.name} -> {png.name} (OOM image)")
        return False
    from PIL import Image

    with Image.open(png) as im:
        print(f"OK   {puml.name} -> {im.size[0]}x{im.size[1]}")
    return True


def render_all() -> int:
    EXPORT.mkdir(parents=True, exist_ok=True)
    files = [p for p in sorted(SDS_DIR.glob("*.puml")) if not p.name.startswith("_")]
    failed = []
    for p in files:
        if not render_one(p):
            failed.append(p)
    if failed:
        print(f"\n{len(failed)} diagram(s) still failed:")
        for p in failed:
            print(f"  - {p.name}")
    else:
        print(f"\nAll {len(files)} diagrams rendered OK (DPI={DPI}).")
    return len(failed)


if __name__ == "__main__":
    patch_puml_files()
    sys.exit(render_all())
