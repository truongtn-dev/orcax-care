"""Recover project files from Cursor agent transcripts (Write + StrReplace)."""
from __future__ import annotations

import json
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TRANSCRIPT_ROOT = Path(
    r"C:/Users/nguye/.cursor/projects/e-SU26-WDP301-orcax-care/agent-transcripts"
)


def norm_path(path: str) -> str | None:
    p = path.replace("\\", "/")
    marker = "orcax-care/"
    idx = p.lower().find(marker)
    if idx < 0:
        return None
    return p[idx + len(marker) :]


def recover_from_transcripts(root: Path) -> dict[str, str]:
    files: dict[str, str] = {}
    patches: dict[str, list[tuple[str, str]]] = defaultdict(list)

    for transcript in root.rglob("*.jsonl"):
        for line in transcript.read_text(encoding="utf-8").splitlines():
            try:
                obj = json.loads(line)
            except json.JSONDecodeError:
                continue
            for part in obj.get("message", {}).get("content", []):
                if part.get("type") != "tool_use":
                    continue
                name = part.get("name")
                inp = part.get("input", {})
                rel = norm_path(inp.get("path", ""))
                if not rel:
                    continue
                if name == "Write" and inp.get("contents") is not None:
                    files[rel] = inp["contents"]
                elif name == "StrReplace":
                    patches[rel].append(
                        (inp.get("old_string", ""), inp.get("new_string", ""))
                    )

    for rel, ps in patches.items():
        if rel not in files:
            continue
        content = files[rel]
        for old, new in ps:
            if old and old in content:
                content = content.replace(old, new, 1)
        files[rel] = content

    return files


def extract_word_images(doc_path: Path, out_dir: Path) -> int:
    """Extract embedded PNG/JPEG from docx word/media for backup reference."""
    import zipfile

    out_dir.mkdir(parents=True, exist_ok=True)
    count = 0
    with zipfile.ZipFile(doc_path) as zf:
        for name in zf.namelist():
            if not name.startswith("word/media/"):
                continue
            data = zf.read(name)
            target = out_dir / Path(name).name
            target.write_bytes(data)
            count += 1
    return count


def main() -> None:
    if not TRANSCRIPT_ROOT.exists():
        print(f"Transcript root not found: {TRANSCRIPT_ROOT}")
        sys.exit(1)

    files = recover_from_transcripts(TRANSCRIPT_ROOT)
    prefixes = (
        "docs/sds/",
        "docs/ui-design/",
        "docs/database/",
        "docs/usecase/",
        "docs/screenflow/",
        "scripts/",
    )
    selected = {
        rel: content
        for rel, content in files.items()
        if rel.startswith(prefixes)
    }

    for rel, content in sorted(selected.items()):
        out = ROOT / rel.replace("/", "\\")
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(content, encoding="utf-8", newline="\n")

    sds = sorted(k for k in selected if k.startswith("docs/sds/"))
    ui = sorted(k for k in selected if k.startswith("docs/ui-design/"))
    scripts = sorted(k for k in selected if k.startswith("scripts/"))

    print(f"Recovered {len(selected)} files into {ROOT}")
    print(f"  docs/sds/*.puml : {len(sds)}")
    print(f"  docs/ui-design  : {len(ui)}")
    print(f"  scripts         : {len(scripts)}")

    doc_candidates = [
        Path(r"e:/SU26/WDP301/WDP301-SE1816-GROUP4_Document.docx"),
        ROOT / "docs" / "WDP301-SE1816-GROUP4_Document.docx",
    ]
    for doc in doc_candidates:
        if doc.exists():
            n = extract_word_images(doc, ROOT / "docs" / "_word_media_backup")
            print(f"  word/media backup from {doc.name}: {n} files")
            break


if __name__ == "__main__":
    main()
