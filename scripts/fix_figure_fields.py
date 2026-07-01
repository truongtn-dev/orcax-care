"""
Normalize figure captions in WDP301-SE1816-GROUP4_Document.docx for Word TOC / Table of Figures.

Each caption paragraph (style Caption) gets exactly one complex field:
  Figure { SEQ Figure \\* ARABIC \\h }: title

Removes duplicate w:fldSimple SEQ fields (cause "15Figure 8: ..." display).

Run: python scripts/fix_figure_fields.py
"""
from __future__ import annotations

import re
import shutil
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Pt

DOC_PATH = Path(__file__).resolve().parent.parent / "docs" / "WDP301-SE1816-GROUP4_Document.docx"
W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
W = f"{{{W_NS}}}"

CAPTION_TAIL_RE = re.compile(
    r"^(?:\d+\s*)+(?:Figure\s*)?(?:\d+\s*)?[:\.](.+)$|"
    r"^(?:\d+\s*)?(?:Figure\s*)?(?:\d+\s*)?[:\.](.+)$",
    re.I | re.S,
)


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


def paragraph_plain_text(p_el) -> str:
    return re.sub(r"\s+", " ", "".join(t.text or "" for t in p_el.iter(f"{W}t"))).strip()


def caption_tail(text: str) -> str:
    text = re.sub(r"\s+", " ", (text or "").strip())
    m = CAPTION_TAIL_RE.match(text)
    if m:
        return (m.group(1) or m.group(2) or "").strip()
    if text.lower().startswith("figure"):
        return re.sub(r"^Figure\s*(?:\d+\s*)?[:\.]?\s*", "", text, count=1, flags=re.I).strip()
    return text


def clear_caption_content(p_el) -> None:
    """Remove runs, fldSimple, bookmarks — keep pPr only."""
    p_pr = p_el.find(f"{W}pPr")
    for child in list(p_el):
        if child is not p_pr:
            p_el.remove(child)


def set_caption_paragraph(p, number: int, tail: str) -> None:
    """Rebuild: Figure {SEQ Figure \\* ARABIC \\h}: tail — single field only."""
    clear_caption_content(p._p)
    sep = ": " if tail and not tail.startswith(":") else ""
    suffix = f"{sep}{tail}" if tail else ""
    for el in (
        make_run(text="Figure "),
        make_run(fld_type="begin"),
        make_run(instr=r" SEQ Figure \* ARABIC \h "),
        make_run(fld_type="separate"),
        make_run(text=str(number)),
        make_run(fld_type="end"),
        make_run(text=suffix),
    ):
        p._p.append(el)
    p.style = "Caption"
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    for run in p.runs:
        run.font.size = Pt(10)


def normalize_all_figure_captions(doc: Document) -> list[str]:
    updated: list[str] = []
    n = 0
    for p in doc.paragraphs:
        if p.style.name != "Caption":
            continue
        tail = caption_tail(paragraph_plain_text(p._p))
        if not tail:
            continue
        n += 1
        set_caption_paragraph(p, n, tail)
        updated.append(f"Figure {n}: {tail[:60]}")
    return updated


def fix_figure_captions(doc: Document) -> tuple[list[str], int]:
    updated = normalize_all_figure_captions(doc)
    return updated, 0


def enable_update_fields_on_open(docx_path: Path) -> None:
    """Ask Word to refresh fields when the document opens."""
    with zipfile.ZipFile(docx_path, "r") as zf:
        names = zf.namelist()
        if "word/settings.xml" not in names:
            return
        root = ET.fromstring(zf.read("word/settings.xml"))
        upd = root.find(f"{W}updateFields")
        if upd is None:
            upd = ET.Element(f"{W}updateFields")
            root.insert(0, upd)
        upd.set(f"{W}val", "true")
        new_settings = ET.tostring(root, encoding="utf-8", xml_declaration=True)
        payload = {n: zf.read(n) for n in names}

    payload["word/settings.xml"] = new_settings
    with zipfile.ZipFile(docx_path, "w") as zf:
        for name in payload:
            zf.writestr(name, payload[name])


def count_duplicate_seq(docx_path: Path) -> int:
    with zipfile.ZipFile(docx_path) as zf:
        root = ET.fromstring(zf.read("word/document.xml"))
    dup = 0
    for p_el in root.iter(f"{W}p"):
        p_pr = p_el.find(f"{W}pPr")
        if p_pr is None:
            continue
        ps = p_pr.find(f"{W}pStyle")
        if ps is None or ps.get(f"{W}val") != "Caption":
            continue
        seq_fields = 0
        for fs in p_el.findall(f"{W}fldSimple"):
            if "SEQ Figure" in (fs.get(f"{W}instr") or ""):
                seq_fields += 1
        in_complex = False
        for instr in p_el.iter(f"{W}instrText"):
            if "SEQ Figure" in (instr.text or ""):
                seq_fields += 1
        if seq_fields > 1:
            dup += 1
    return dup


def main():
    if not DOC_PATH.exists():
        print(f"Not found: {DOC_PATH}")
        return

    backup = DOC_PATH.with_suffix(".docx.bak.figures")
    shutil.copy2(DOC_PATH, backup)
    print(f"Backup: {backup}")

    before_dup = count_duplicate_seq(DOC_PATH)
    if before_dup:
        print(f"Captions with duplicate SEQ fields: {before_dup}")

    doc = Document(DOC_PATH)
    updated = normalize_all_figure_captions(doc)
    doc.save(DOC_PATH)
    enable_update_fields_on_open(DOC_PATH)

    after_dup = count_duplicate_seq(DOC_PATH)
    print(f"Normalized {len(updated)} figure captions (single SEQ Figure field each).")
    print(f"Duplicate SEQ captions remaining: {after_dup}")
    print(f"Saved: {DOC_PATH}")
    print("Close Word, reopen file (fields auto-update), or Ctrl+A > F9.")
    print("Then References > Insert Table of Figures (label: Figure).")


if __name__ == "__main__":
    main()
