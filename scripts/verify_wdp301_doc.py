import hashlib
import re
import zipfile
from docx import Document
from docx.oxml.ns import qn

PATH = r"e:\SU26\WDP301\orcax-care\docs\WDP301-SE1816-GROUP4_Document.docx"
BACKUP = r"e:\SU26\WDP301\orcax-care\docs\WDP301-SE1816-GROUP4_Document.backup.docx"
TARGET = {2, 10, 12, 19, 24, 47, 61, 62, 71, 72}

doc = Document(PATH)
body = doc.element.body
last_embed = None
mapping = {}
for child in body:
    if child.tag.split("}")[-1] != "p":
        continue
    for b in child.findall(".//" + qn("a:blip")):
        last_embed = b.get(qn("r:embed"))
    text = "".join(t.text or "" for t in child.iter(qn("w:t"))).strip()
    m = re.match(r"Figure\s+(\d+):", text)
    if m:
        n = int(m.group(1))
        if n in TARGET and last_embed:
            mapping[n] = last_embed

with zipfile.ZipFile(PATH) as z:
    rels = z.read("word/_rels/document.xml.rels").decode("utf-8")

def media_for(rid):
    m = re.search(rf'Id="{re.escape(rid)}"[^>]+Target="([^"]+)"', rels)
    if not m:
        m = re.search(rf'Target="([^"]+)"[^>]+Id="{re.escape(rid)}"', rels)
    return "word/" + m.group(1).lstrip("/") if m else None

with zipfile.ZipFile(PATH) as z1, zipfile.ZipFile(BACKUP) as z2:
    for fig, rid in sorted(mapping.items()):
        media = media_for(rid)
        h1 = hashlib.md5(z1.read(media)).hexdigest()[:10] if media else "NA"
        h2 = hashlib.md5(z2.read(media)).hexdigest()[:10] if media else "NA"
        status = "CHANGED" if h1 != h2 else "SAME"
        print(f"Figure {fig:2d} {rid} {media} {status}")
