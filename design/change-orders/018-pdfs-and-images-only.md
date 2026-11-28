# Change order 018: Reference files are PDFs and images only

Date: 2026-11-22. Decision d105.

## Founder ruling, in the founder's words

The file reader had moved to OpenAI. PDFs and images went to the model whole, and Word, Excel, CSV, TSV and text went through converters in our code. The founder ruled: "well at this stage drop this complication and have only images and pdf allowed without other formats".

## What changes

REQ-032, in `loop/out/pure-s6-req-027-036.md` (assembled into `.taskmaster/docs/prd-mvp.md` and `.taskmaster/docs/requirements/req-032.md`). Before:

> Supported types include PDF, images, CSV/TSV, TXT, and DOCX/XLSX, under per-file and per-project size caps.

After:

> At this stage the supported types are PDF and images (PNG, JPEG, GIF, WebP), and each file is read whole; other formats are deferred, and a file of another type is refused with a message that names the supported types. Files are under per-file and per-project size caps.

REQ-004, in `loop/out/pure-s3-req-001-006.md`. Before:

> One read processes the whole file, in parts when the file is large, with the NGO's answers as its instruction

After:

> One read processes the whole file in one request, with the NGO's answers as its instruction

Acceptance, tagged `[d105]`: AT-032.02 accepts PDF, PNG, JPEG, GIF and WebP and refuses a CSV with the message. AT-032.12 derives content from a text PDF, an image and a scanned PDF that holds only a picture of its text. AT-004.69 reads a PDF of several pages whole, in one request, into one digest.

Manifests: `loop/decomp/req-032.md` D1.L2 and D4.L1 name the supported types. `loop/decomp/req-004.md` D7.L2 reads the whole file.

## The screens

- Discovery file chooser: the line of accepted types reads "A PDF or a picture (PNG, JPEG, GIF or WebP)." and the device picker offers only those extensions. A refused upload shows "Add a PDF or a picture (PNG, JPEG, GIF or WebP)."
- Reference files (`design/ui-ux-instructions.md` row 7): PDF and images only; another type gets an upload error that names them.
- The approved Discovery canvases in `design/canvas/discovery/project/` and `design/astra/canvas-rev12/` still show `volunteer-rota.xlsx`, `sunday-gaps.csv` and `kitchen-rules.docx` in their sample data. They are not revised here; the next Discovery screen design pass renames them. The coded screen and the sample-data shell in `design/astra/src/` already use `volunteer-rota.pdf`, `sunday-gaps.pdf` and `kitchen-rules.pdf`.

## Code

The upload allow-list in `supabase/functions/_shared/discovery-files.ts` is PDF, PNG, JPEG, GIF and WebP. The text converters (`discovery-file-extract.ts`, with its Word, Excel and spreadsheet libraries) and the splitting and merging of text parts are deleted. The reader reports one part per file, so the database read protocol is unchanged.
