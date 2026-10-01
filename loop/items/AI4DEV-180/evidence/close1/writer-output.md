A Discovery file is read as soon as the NGO adds it. AI4DEV-180 (automatic file ingest) is on `lane/ai4dev-180/close1-ingest`. Nothing was pushed.

## Commits

- `c0217b6982461c0efeaee75f672c41faaa96eadc` — loop: a Discovery file is read as soon as it is added (AI4DEV-180)
- `7b213165f60462b3434c2aca983f12268c2f14b6` — loop: screenshots of an automatic Discovery file read (AI4DEV-180)

## Checks

| Check | Exit | Result |
|---|---|---|
| `bun run typecheck` | 0 | All four projects clean |
| `bun run at:selftest` | 0 | 35 files, 474 tests passed |
| `bun run at:check req-004` | 0 | 70 priority ids in bijection |
| `bun run at:verify req-004 --tier loop --expect` | 0 | 70 priority ids: 44 green, 26 red, 0 missing. The run matches the expected file (44 declared green, 26 declared red). |

The expected file was left as it is. AT-004.66 is green. AT-004.67 and AT-004.68 stay red and pending for their backend halves, after the screen checks.

## Documents

The founder decision of 2026-10-01 is named in each file.

- `design/discovery-ui-contract.md`: lines 98, 174, 188–189, 256, 268–276
- `.taskmaster/docs/acceptance/at-req-004.md`: lines 34, 37, 104–108, 137, 141
- `.taskmaster/docs/acceptance/at-req-032.md`: lines 25–26, 48
- `loop/decomp/req-004.md`: line 50
- `design/astra/discovery-review.md`: lines 51, 54–58

## Screenshots

All five are in `loop/items/AI4DEV-180/evidence/close1/`. The fixture server on 127.0.0.1:4310 was started for the capture and then stopped.

- `files-reading-and-ready-desktop-light.png` — Your files, with volunteer-rota.xlsx at Ready · 4 facts and sunday-gaps.csv at Reading… 5%
- `file-panel-desktop-light.png` — the read-only panel, desktop, light
- `file-panel-phone-light.png` — the same panel, full screen, 390×844, light
- `file-panel-desktop-dark.png` — the same panel, desktop, dark
- `finish-hint-while-reading-desktop-light.png` — Finish Discovery unavailable, with "A file is still being read. You can finish when it is ready."