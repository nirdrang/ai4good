import { Buffer } from 'node:buffer';

export async function extractFileText(bytes: Uint8Array, mediaType: string): Promise<string> {
  if (mediaType.startsWith('text/')) return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  if (mediaType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    const mammoth = await import('npm:mammoth@1.11.0');
    return (await mammoth.extractRawText({ buffer: Buffer.from(bytes) })).value;
  }
  if (mediaType === 'application/msword') {
    const { default: WordExtractor } = await import('npm:word-extractor@1.0.4');
    const document = await new WordExtractor().extract(Buffer.from(bytes));
    return [document.getBody(), document.getFootnotes(), document.getEndnotes(), document.getHeaders(), document.getFooters()].join('\n');
  }
  if (mediaType === 'application/vnd.ms-excel' || mediaType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
    const xlsx = await import('npm:xlsx@0.18.5');
    const workbook = xlsx.read(bytes, { type: 'array' });
    return workbook.SheetNames.map((name) => `${name}\n${xlsx.utils.sheet_to_csv(workbook.Sheets[name])}`).join('\n\n');
  }
  if (mediaType === 'application/pdf') {
    const { default: pdfjs } = await import('npm:pdfjs-dist@3.11.174/legacy/build/pdf.js');
    const document = await pdfjs.getDocument({ data: bytes, useSystemFonts: true, isEvalSupported: false }).promise;
    try {
      const pages: string[] = [];
      for (let page = 1; page <= document.numPages; page++) {
        const content = await (await document.getPage(page)).getTextContent();
        pages.push(content.items.map((item: { str?: string }) => item.str ?? '').join(' '));
      }
      const text = pages.join('\n\n');
      if (!text.trim()) throw new Error('This PDF has no extractable text. Add a text PDF or an image of the page.');
      return text;
    } finally { await document.destroy(); }
  }
  throw new Error('This file type cannot be read.');
}
