const LINE_CHARS = 90;
const PAGE_LINES = 48;

function wrap(text: string): string[] {
  return text.split('\n').flatMap((paragraph) => {
    const lines: string[] = [];
    let line = '';
    for (const word of paragraph.split(' ')) {
      if (line && line.length + word.length + 1 > LINE_CHARS) { lines.push(line); line = word; } else line = line ? `${line} ${word}` : word;
    }
    return [...lines, line];
  });
}

export function pdfFromText(text: string): Uint8Array<ArrayBuffer> {
  if (!/^[\x20-\x7e\n]*$/.test(text)) throw new Error('pdfFromText takes printable ASCII text only.');
  const lines = wrap(text);
  const pages = Array.from({ length: Math.max(1, Math.ceil(lines.length / PAGE_LINES)) }, (_, page) => lines.slice(page * PAGE_LINES, (page + 1) * PAGE_LINES));
  const objects = ['<< /Type /Catalog /Pages 2 0 R >>', '', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'];
  const kids: string[] = [];
  for (const page of pages) {
    const stream = `BT /F1 11 Tf 14 TL 56 760 Td ${page.map((line) => `(${line.replace(/[\\()]/g, '\\$&')}) '`).join(' ')} ET`;
    objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ${objects.length} 0 R >>`);
    kids.push(`${objects.length} 0 R`);
  }
  objects[1] = `<< /Type /Pages /Kids [${kids.join(' ')}] /Count ${pages.length} >>`;
  let body = '%PDF-1.4\n';
  const offsets = objects.map((object, index) => { const at = body.length; body += `${index + 1} 0 obj\n${object}\nendobj\n`; return at; });
  const xref = body.length;
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map((at) => `${String(at).padStart(10, '0')} 00000 n \n`).join('')}`;
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new TextEncoder().encode(body);
}
