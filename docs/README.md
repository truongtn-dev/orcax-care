# OrcaXCare documentation assets

**Do not delete** the diagram folders below. They back the WDP301 Word report (RDS + SDS).

| Folder | Contents |
|--------|----------|
| `sds/` | 66 PlantUML + PNG (Section V SDS) |
| `ui-design/` | 34 UI mockup PNGs (Section III) |
| `database/` | ERD / code package diagrams |
| `usecase/`, `screenflow/` | RDS use-case and screen-flow diagrams |

## Restore if lost

```powershell
python scripts/recover_from_transcript.py
python scripts/render_sds_diagrams.py
python scripts/extract_ui_from_word.py
```

See `sds/README.md` for details.
