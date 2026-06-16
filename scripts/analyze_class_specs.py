"""Analyze WDP301 document class specification structure."""
import re
import sys
from docx import Document
from docx.oxml.ns import qn

path = r"E:\SU26\WDP301\WDP301-SE1816-GROUP4_Document.docx"
doc = Document(path)
body = doc.element.body

in_design = False
last_uc = ""
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

        if re.match(r"^\d+\.\d+\s+UC-", text):
            last_uc = text
            in_class_specs = False
            pending_class = None
        elif text == "b. Class Specifications":
            in_class_specs = True
            pending_class = None
        elif text.startswith("c. Sequence"):
            in_class_specs = False
            pending_class = None
        elif in_class_specs and text and text not in ("No", "Method", "Description"):
            if not text.startswith("Figure") and len(text) < 50:
                pending_class = text.rstrip(" Class")
    elif tag == "tbl" and in_design:
        table = doc.tables[tbl_i]
        hdr = [c.text.strip() for c in table.rows[0].cells]
        if hdr[:3] == ["No", "Method", "Description"] and len(table.rows) >= 2:
            row1 = [c.text.strip() for c in table.rows[1].cells]
            if "see class diagram" in row1[1].lower():
                mappings.append(
                    {
                        "table": tbl_i,
                        "uc": last_uc,
                        "class": pending_class or "?",
                        "rows": len(table.rows),
                    }
                )
                pending_class = None
        tbl_i += 1

print(f"Placeholder spec tables: {len(mappings)}")
for m in mappings[:20]:
    print(m)
print("...")
for m in mappings[-10:]:
    print(m)

# unique classes
from collections import Counter

c = Counter(m["class"] for m in mappings)
print("\nUnique classes:", len(c))
for name, n in sorted(c.items(), key=lambda x: -x[1])[:30]:
    print(n, name)
