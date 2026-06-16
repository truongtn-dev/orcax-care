"""Create a package-free variant of DB_Schema.puml."""
import re
from pathlib import Path

SRC = Path(r"e:/SU26/WDP301/orcax-care/docs/database/DB_Schema.puml")
DST = Path(r"e:/SU26/WDP301/orcax-care/docs/database/DB_Schema_NoPkg.puml")

text = SRC.read_text(encoding="utf-8")
lines = text.split("\n")
out = []
open_packages = 0
for ln in lines:
    if re.match(r'^package "[^"]+" \{\s*$', ln):
        open_packages += 1
        continue
    if ln == "}" and open_packages > 0:
        open_packages -= 1
        continue
    out.append(ln)

result = "\n".join(out).replace("@startuml DB_Schema", "@startuml DB_Schema_NoPkg")
DST.write_text(result, encoding="utf-8")
print("written", DST)
