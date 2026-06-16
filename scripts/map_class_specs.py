"""Map class spec tables to class names with section context."""
import re
import sys
from collections import defaultdict
from docx import Document
from docx.oxml.ns import qn

path = r"E:\SU26\WDP301\WDP301-SE1816-GROUP4_Document.docx"
doc = Document(path)
body = doc.element.body

in_design = False
section = ""
tbl_i = 0
mappings = []
pending_class = None
in_class_specs = False

for child in body:
    tag = child.tag.split("}")[-1]
    if tag == "p":
        text = "".join(t.text or "" for t in child.iter(qn("w:t"))).strip()
        if "II. Requirement Specifications" in text:
            in_design = True
            continue
        if not in_design:
            continue
        if re.match(r"^\d+\.\d+\s+", text) and "UC-" not in text:
            section = text
            in_class_specs = False
        elif text == "b. Class Specifications":
            in_class_specs = True
            pending_class = None
        elif text.startswith("c. Sequence"):
            in_class_specs = False
            pending_class = None
        elif in_class_specs and text and text not in ("No", "Method", "Description"):
            if not text.startswith("Figure") and "Class Diagram" not in text:
                pending_class = text.replace(" Class", "").strip()
    elif tag == "tbl" and in_design:
        table = doc.tables[tbl_i]
        hdr = [c.text.strip() for c in table.rows[0].cells]
        if hdr[:3] == ["No", "Method", "Description"]:
            row1 = [c.text.strip() for c in table.rows[1].cells] if len(table.rows) > 1 else []
            if row1 and "see class diagram" in row1[1].lower():
                mappings.append({"table": tbl_i, "section": section, "class": pending_class or "?"})
                pending_class = None
        tbl_i += 1

print("count", len(mappings))
sections = defaultdict(list)
for m in mappings:
    sections[m["section"]].append(m["class"])
for sec, cls in list(sections.items())[:8]:
    print(sec, "->", cls)
print("...")
for sec, cls in list(sections.items())[-3:]:
    print(sec, "->", cls)

unique = sorted(set(m["class"] for m in mappings))
print("unique classes", len(unique))
for c in unique:
    print(c)
