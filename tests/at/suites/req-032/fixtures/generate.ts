import { writeFileSync } from 'node:fs';
import { crc32 } from 'node:zlib';
import { chromium } from 'playwright-core';
import { SEVEN_FORMATS, fixtureUrl, sentence, type FormatFixture } from './seven-formats.ts';

function storedZip(entries: Record<string, string>): Buffer {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  for (const [name, text] of Object.entries(entries)) {
    const data = Buffer.from(text);
    const path = Buffer.from(name);
    const head = Buffer.alloc(30);
    head.writeUInt32LE(0x04034b50, 0); head.writeUInt16LE(20, 4);
    head.writeUInt32LE(crc32(data), 14); head.writeUInt32LE(data.length, 18); head.writeUInt32LE(data.length, 22);
    head.writeUInt16LE(path.length, 26);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(20, 4); central.writeUInt16LE(20, 6);
    central.writeUInt32LE(crc32(data), 16); central.writeUInt32LE(data.length, 20); central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(path.length, 28); central.writeUInt32LE(offset, 42);
    locals.push(head, path, data);
    centrals.push(central, path);
    offset += head.length + path.length + data.length;
  }
  const directory = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(centrals.length / 2, 8); end.writeUInt16LE(centrals.length / 2, 10);
  end.writeUInt32LE(directory.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, directory, end]);
}

const XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
const RELS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const PKG_RELS = 'http://schemas.openxmlformats.org/package/2006/relationships';

function docx(fixture: FormatFixture): Buffer {
  const paragraph = (text: string) => `<w:p><w:r><w:t>${text}</w:t></w:r></w:p>`;
  return storedZip({
    '[Content_Types].xml': `${XML}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`,
    '_rels/.rels': `${XML}<Relationships xmlns="${PKG_RELS}"><Relationship Id="rId1" Type="${RELS}/officeDocument" Target="word/document.xml"/></Relationships>`,
    'word/document.xml': `${XML}<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${paragraph('Kitchen rota notes')}${paragraph(sentence(fixture))}</w:body></w:document>`,
  });
}

function xlsx(fixture: FormatFixture): Buffer {
  const cell = (ref: string, value: string | number) => typeof value === 'number'
    ? `<c r="${ref}"><v>${value}</v></c>`
    : `<c r="${ref}" t="inlineStr"><is><t>${value}</t></is></c>`;
  const row = (index: number, values: (string | number)[]) =>
    `<row r="${index}">${values.map((value, column) => cell(`${'ABC'[column]}${index}`, value)).join('')}</row>`;
  return storedZip({
    '[Content_Types].xml': `${XML}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`,
    '_rels/.rels': `${XML}<Relationships xmlns="${PKG_RELS}"><Relationship Id="rId1" Type="${RELS}/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    'xl/workbook.xml': `${XML}<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="${RELS}"><sheets><sheet name="Rota" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    'xl/_rels/workbook.xml.rels': `${XML}<Relationships xmlns="${PKG_RELS}"><Relationship Id="rId1" Type="${RELS}/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`,
    'xl/worksheets/sheet1.xml': `${XML}<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${row(1, ['kitchen', 'shift', 'volunteers needed'])}${row(2, [`${fixture.kitchen} kitchen`, fixture.shift, fixture.volunteers])}</sheetData></worksheet>`,
  });
}

const table = (fixture: FormatFixture, separator: string) =>
  `kitchen${separator}shift${separator}volunteers needed\n${fixture.kitchen} kitchen${separator}${fixture.shift}${separator}${fixture.volunteers}\n`;

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 900, height: 240 } });
  const render = (fixture: FormatFixture) => page.setContent(
    `<body style="margin:0;padding:48px;background:#fff;font:32px sans-serif;color:#000"><p>Kitchen rota notes</p><p>${sentence(fixture)}</p></body>`,
  );
  const write: Record<string, (fixture: FormatFixture) => Promise<Buffer | string>> = {
    'application/pdf': async (fixture) => { await render(fixture); return page.pdf({ format: 'A4' }); },
    'image/png': async (fixture) => { await render(fixture); return page.screenshot({ fullPage: true }); },
    'text/csv': async (fixture) => table(fixture, ','),
    'text/tab-separated-values': async (fixture) => table(fixture, '\t'),
    'text/plain': async (fixture) => `Kitchen rota notes\n${sentence(fixture)}\n`,
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': async (fixture) => docx(fixture),
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': async (fixture) => xlsx(fixture),
  };
  for (const fixture of SEVEN_FORMATS) writeFileSync(fixtureUrl(fixture), await write[fixture.mediaType]!(fixture));
} finally { await browser.close(); }
