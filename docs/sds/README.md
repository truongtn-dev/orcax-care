# OrcaXCare SDS Diagrams

> **Keep this folder.** Required for WDP301 Section V. Do not delete during repo cleanup.

PlantUML source and exported PNGs for **Section V. Software Design Specifications**.

## Layout

```
docs/sds/
  CD_<Feature>.puml     # Class diagrams (33 functions)
  SQ_<Feature>.puml     # Sequence diagrams (33 functions)
  export/
    CD_<Feature>.png
    SQ_<Feature>.png
```

## Render

```powershell
python scripts/render_sds_diagrams.py
```

Requires `plantuml.jar` in `%USERPROFILE%` or set `PLANTUML_JAR`.

## Recover from Cursor chat history

If files are lost again:

```powershell
python scripts/recover_from_transcript.py
python scripts/render_sds_diagrams.py
```

UI mockups: `docs/ui-design/` (extract with `python scripts/extract_ui_from_word.py`).
