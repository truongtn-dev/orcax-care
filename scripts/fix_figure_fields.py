"""
Fix figure captions in WDP301-SE1816-GROUP4_Document.docx:
1. Convert plain-text caption numbers (Figure 2..12) into real SEQ Figure fields.
2. Remove the "\\r 13" reset from the Figure 13 field so numbering flows
   continuously after Figure 12.
Nothing else in the document is modified. A .bak backup is created first.
"""
from __future__ import annotations

import re
import shutil
from pathlib import Path

from docx import Document
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

DOC_PATH = Path(r"e:/SU26/WDP301/WDP301-SE1816-GROUP4_Document.docx")
BACKUP = DOC_PATH.with_suffix(".docx.bak")

CAPTION_RE = re.compile(r"^(Figure\s+)(\d+)(\s*[:.])(.*)$", re.S)


def make_run(text=None, fld_type=None, instr=None):
    r = OxmlElement("w:r")
    if fld_type:
        el = OxmlElement("w:fldChar")
        el.set(qn("w:fldCharType"), fld_type)
        r.append(el)
    elif instr is not None:
        el = OxmlElement("w:instrText")
        el.set(qn("xml:space"), "preserve")
        el.text = instr
        r.append(el)
    elif text is not None:
        el = OxmlElement("w:t")
        el.set(qn("xml:space"), "preserve")
        el.text = text
        r.append(el)
    return r


def convert_caption(p, number, tail):
    """Replace paragraph runs with: 'Figure ' + SEQ field (cached number) + tail."""
    for r in p._p.findall(qn("w:r")):
        p._p.remove(r)
    parts = [
        make_run(text="Figure "),
        make_run(fld_type="begin"),
        make_run(instr=r" SEQ Figure \* ARABIC "),
        make_run(fld_type="separate"),
        make_run(text=str(number)),
        make_run(fld_type="end"),
        make_run(text=tail),
    ]
    for el in parts:
        p._p.append(el)


def fix_figure_captions(doc: Document) -> tuple[list[str], int]:
    """Ensure every Caption uses a continuous SEQ Figure field (no \\r resets)."""
    converted, reset_fixed = [], 0

    for p in doc.paragraphs:
        if p.style.name != "Caption":
            continue
        m = CAPTION_RE.match(p.text.strip())
        if not m:
            continue
        xml = p._p.xml
        if "SEQ" in xml:
            for instr in p._p.iter(qn("w:instrText")):
                if instr.text and "\\r" in instr.text and "SEQ Figure" in instr.text:
                    instr.text = r" SEQ Figure \* ARABIC "
                    reset_fixed += 1
            continue
        number = int(m.group(2))
        tail = m.group(3) + m.group(4)
        convert_caption(p, number, tail)
        converted.append(f"Figure {number}")

    return converted, reset_fixed


def main():
    backup = DOC_PATH.with_suffix(".docx.bak.figures")
    shutil.copy2(DOC_PATH, backup)
    print(f"Backup: {backup}")

    doc = Document(DOC_PATH)
    converted, reset_fixed = fix_figure_captions(doc)

    doc.save(DOC_PATH)
    print(f"Converted to SEQ fields: {len(converted)} -> {', '.join(converted)}")
    print(f"Reset flags removed: {reset_fixed}")
    print(f"Saved: {DOC_PATH}")


if __name__ == "__main__":
    main()
