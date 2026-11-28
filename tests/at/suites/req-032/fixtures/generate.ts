import { writeFileSync } from 'node:fs';
import { chromium } from 'playwright-core';
import { FILE_FORMATS, fixtureUrl, sentence, type FormatFixture } from './file-formats.ts';

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 900, height: 240 } });
  const render = (fixture: FormatFixture) => page.setContent(
    `<body style="margin:0;padding:48px;background:#fff;font:32px sans-serif;color:#000"><p>Kitchen rota notes</p><p>${sentence(fixture)}</p></body>`,
  );
  const write: Record<string, (fixture: FormatFixture) => Promise<Buffer>> = {
    'PDF': async (fixture) => { await render(fixture); return page.pdf({ format: 'A4' }); },
    'PNG image': async (fixture) => { await render(fixture); return page.screenshot({ fullPage: true }); },
    'scanned PDF': async (fixture) => {
      await render(fixture);
      const scan = (await page.screenshot({ fullPage: true })).toString('base64');
      await page.setContent(`<body style="margin:0"><img style="width:100%" src="data:image/png;base64,${scan}"></body>`);
      return page.pdf({ format: 'A4' });
    },
  };
  for (const fixture of FILE_FORMATS) writeFileSync(fixtureUrl(fixture), await write[fixture.format]!(fixture));
} finally { await browser.close(); }
