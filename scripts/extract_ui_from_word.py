"""Extract UI mockup PNGs from Word doc into docs/ui-design/."""
from __future__ import annotations

import re
import sys
from pathlib import Path

from docx import Document
from docx.oxml.ns import qn
from docx.text.paragraph import Paragraph

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from build_design_specs import SECTIONS  # noqa: E402

DOC = Path(r"e:/SU26/WDP301/WDP301-SE1816-GROUP4_Document.docx")
OUT = ROOT / "docs" / "ui-design"
CAPTION_RE = re.compile(r"Figure\s+(\d+)\s*:\s*UI Design\s+(.+)", re.I)

# figure number -> output filename (Section III starts at Figure 13)
FIG_TO_IMAGE = {13 + i: s["image"] for i, s in enumerate(SECTIONS)}


def pair_images(doc: Document) -> dict[int, str]:
    """Map figure number -> relationship id by reading body in order."""
    pairs: dict[int, str] = {}
    pending_embed: str | None = None

    for el in doc.element.body.iterchildren():
        if not el.tag.endswith("}p"):
            continue
        para = Paragraph(el, doc)
        text = para.text.strip().split("\t")[0]

        blips = el.findall(".//" + qn("a:blip"))
        if blips and not text.startswith("Figure"):
            pending_embed = blips[0].get(qn("r:embed"))
            continue

        m = CAPTION_RE.match(text)
        if m and pending_embed:
            fig_num = int(m.group(1))
            if fig_num not in pairs:
                pairs[fig_num] = pending_embed
            pending_embed = None

    return pairs


def main() -> None:
    if not DOC.exists():
        print(f"Document not found: {DOC}")
        sys.exit(1)

    OUT.mkdir(parents=True, exist_ok=True)
    doc = Document(DOC)
    pairs = pair_images(doc)
    extracted = 0

    for fig_num, image_name in sorted(FIG_TO_IMAGE.items()):
        embed = pairs.get(fig_num)
        if not embed:
            print(f"SKIP Figure {fig_num} -> {image_name}")
            continue
        data = doc.part.rels[embed].target_part.blob
        (OUT / image_name).write_bytes(data)
        print(f"OK   Figure {fig_num:2d} -> {image_name}")
        extracted += 1

    print(f"\nExtracted {extracted}/{len(FIG_TO_IMAGE)} UI images -> {OUT}")


if __name__ == "__main__":
    main()
