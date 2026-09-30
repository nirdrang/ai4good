import { expect } from 'vitest';
import { eventually } from '../../harness/screen.ts';
import { TEXT } from '../../../../src/components/discovery/a11y.ts';
import { GIVEN } from '../../../../design/astra/src/givens.ts';
import { atTest, CapabilityPending } from './_bind.ts';
import { AWAITED, notYet } from './_pending.ts';
import { discoveryScreens, type DiscoveryPage } from './_screen.ts';

const withDiscovery = discoveryScreens();
const SCHEMES = ['light', 'dark'] as const;
const SIZES = ['desktop', 'phone'] as const;

// d94 (2026-09-29): the need brief, files, and Finish. The Discovery screen item replaces each stub
// with a body that runs against the shared mock first and the wired app after.
atTest('AT-004.61', 'the live brief updates from each reply with importance', { surface: 'ui' }, {
  loop: async (ctx) => {
    const given = GIVEN['mid-interview'];
    await withDiscovery(ctx, { scenario: 'mid-interview', viewport: 'desktop' }, async (screen) => {
      const before = await screen.modelCalls();
      const info = screen.chat.question(given.open[1].question);
      await info.pick(given.open[1].suggested);
      await screen.composer.send();
      const calls = await screen.modelCalls();
      expect(calls, 'the reply is one model call').toEqual([...before, 'chat-turn']);
      await screen.brief.open();
      const brief = await eventually(
        'the brief shows the source of the new answer',
        () => screen.brief.text(),
        (text) => text.includes('From the chat, round 5'),
      );
      expect(brief, 'an open question shows Needed before build').toContain('Needed before build');
      expect(brief, 'an open question shows A suggestion exists').toContain('A suggestion exists');
      expect(brief, 'an open question shows Can wait').toContain('Can wait');
      const owner = screen.chat.question(given.open[0].question);
      const measure = screen.chat.question(given.notSure.question);
      expect(await owner.isAsked(), 'the unanswered question stays in the chat').toBe(true);
      expect(await measure.isAsked(), 'the unsure question stays in the chat').toBe(true);
      expect(await owner.suggestedCount(), 'the owner question has one Suggested option').toBe(1);
      expect(await measure.suggestedCount(), 'the measure question has one Suggested option').toBe(1);
      expect(await owner.text(), 'the owner question shows Needed before build').toContain('Needed before build');
      expect(await measure.text(), 'the measure question shows A suggestion exists').toContain('A suggestion exists');
      expect(await screen.modelCalls(), 'opening the brief makes no model call').toEqual(calls);
    });
  },
  integration: async () => {
    throw new CapabilityPending([AWAITED.discoverySurface]);
  },
  drill: async () => {
    throw new CapabilityPending([AWAITED.discoverySurface]);
  },
});
atTest('AT-004.62', 'Finish groups open questions by importance without a model call', { default: notYet('AT-004.62') });
atTest('AT-004.63', 'the Discovery document holds the need and no technical scope', { default: notYet('AT-004.63') });
atTest('AT-004.64', 'the review offers the chat and brief edits, never an AI rewrite', { default: notYet('AT-004.64') });
atTest('AT-004.65', 'the first reply asks for files while fewer than three exist', { surface: 'ui' }, {
  loop: async (ctx) => {
    const given = GIVEN['first-reply'];
    await withDiscovery(ctx, { scenario: 'first-reply', viewport: 'desktop' }, async (screen) => {
      const text = await screen.chat.lastAssistantText();
      expect(text, 'the first reply asks for files that show how you work today').toContain(given.filePhrase);
      for (const kind of given.fileKinds) {
        expect(text, `the first reply names ${kind}`).toContain(kind);
      }
      expect(text, 'the first reply points to Add a file').toContain('Add a file');
      expect(await screen.files.addVisible(), 'Add a file is on the screen').toBe(true);
      const priority = given.questions.priority;
      const question = screen.chat.question(priority);
      expect(await question.isAsked(), 'the first question is in the chat').toBe(true);
      await question.pick(given.suggested);
      expect(await question.isPressed(given.suggested), 'the question can be answered without a file').toBe(true);
      const reply = await screen.composer.send();
      expect(reply, 'Send works with no file').not.toBe(text);
      expect(await screen.chat.yourText(), 'the sent answer is in the chat').toContain(given.suggested);
      await eventually('the answered question leaves the chat', () => question.isAsked(), (asked) => asked === false);
      expect(await screen.chat.question(given.questions.booking).isAsked(), 'the other question stays open').toBe(true);
    });
    await withDiscovery(ctx, { scenario: 'first-reply-three-files', viewport: 'desktop' }, async (screen) => {
      const text = await screen.chat.lastAssistantText();
      expect(text, 'three Discovery files: the first reply does not point to Add a file').not.toContain('Add a file');
      expect(text, 'three Discovery files: the first reply does not ask for files that show how you work today').not.toContain(
        given.filePhrase,
      );
      for (const kind of given.fileKinds) {
        expect(text, `three Discovery files: the first reply does not name ${kind}`).not.toContain(kind);
      }
      for (const name of GIVEN['first-reply-three-files'].files) {
        expect(await screen.files.has(name), `${name} is listed`).toBe(true);
      }
    });
  },
  integration: async () => {
    throw new CapabilityPending([AWAITED.discoverySurface]);
  },
  drill: async () => {
    throw new CapabilityPending([AWAITED.discoverySurface]);
  },
});
atTest('AT-004.66', 'Add a file opens a file chat that asks until the AI is ready', { default: notYet('AT-004.66') });
atTest('AT-004.67', 'file-chat answers are turns and the read is free', { default: notYet('AT-004.67') });
atTest('AT-004.68', 'the file is read in the background into a digest', { default: notYet('AT-004.68') });
atTest('AT-004.69', 'a large file is read in parts into one digest', { default: notYet('AT-004.69') });
atTest('AT-004.70', 'three Discovery files while the project is not funded', { default: notYet('AT-004.70') });
atTest('AT-004.71', 'the Questions card shows states and jumps to the chat', { surface: 'ui', timeoutMs: { loop: 90_000 } }, {
  loop: async (ctx) => {
    const given = GIVEN['mid-interview'];
    for (const viewport of SIZES) {
      await withDiscovery(ctx, { scenario: 'mid-interview', viewport }, async (screen) => {
        expect(await screen.questions.row(given.agreed[0].question), 'an agreed question shows Answered').toContain('Answered');
        expect(await screen.questions.row(given.notSure.question), 'an unsure question shows Not sure').toContain('Not sure');
        expect(await screen.questions.row(given.open[0].question), 'an open question shows Open').toContain('Open');
        expect(await screen.questions.row(given.next.question), 'a later question shows Coming next').toContain('Coming next');
        await screen.questions.close();
        const info = screen.chat.question(given.open[1].question);
        await info.pick(given.open[1].suggested);
        expect(await screen.questions.row(given.open[1].question), 'a chosen option shows Ready to send').toContain('Ready to send');
        expect(await screen.questions.row(given.open[0].question), 'the other question stays Open').toContain('Open');
        await screen.questions.close();
        const owner = screen.chat.question(given.open[0].question);
        await owner.writeOwn();
        expect(await owner.ownVisible(), 'Write my own opens a text box').toBe(true);
        expect(await screen.questions.row(given.open[0].question), 'an empty own answer stays Open').toContain('Open');
        await screen.questions.answer(given.open[0].question);
        await eventually('Answer focuses the question in the chat', () => owner.hasFocus(), (focused) => focused);
        await screen.questions.view(given.agreed[0].question);
        await eventually(
          'View highlights the answer in the chat',
          () => screen.chat.answerCurrent(given.agreed[0].answer),
          (current) => current === 'true',
        );
        await screen.composer.send();
        await eventually(
          'the unanswered question is still open from last round',
          () => owner.tag(),
          (tag) => tag === TEXT.carried,
        );
      });
    }
  },
  integration: async () => {
    throw new CapabilityPending([AWAITED.discoverySurface]);
  },
  drill: async () => {
    throw new CapabilityPending([AWAITED.discoverySurface]);
  },
});
atTest(
  'AT-004.72',
  'one usage bar and a growing message box',
  { surface: 'ui', timeoutMs: { loop: 180_000 } },
  {
    loop: async (ctx) => {
      for (const scenario of ['mid-interview', 'mid-interview-paid'] as const) {
        for (const colorScheme of SCHEMES) {
          for (const viewport of SIZES) {
            await withDiscovery(ctx, { scenario, viewport, colorScheme }, async (screen) => {
              await expectUsage(screen);
            });
          }
        }
        await withDiscovery(ctx, { scenario, viewport: 'narrow' }, async (screen) => {
          await expectUsage(screen);
          await screen.brief.back();
          await expectInside(screen);
        });
      }
    },
    integration: async () => {
      throw new CapabilityPending([AWAITED.discoverySurface]);
    },
    drill: async () => {
      throw new CapabilityPending([AWAITED.discoverySurface]);
    },
  },
);
atTest(
  'AT-004.73',
  'the brief opens as a side panel on desktop and a full-screen panel on phone',
  { surface: 'ui', timeoutMs: { loop: 120_000 } },
  {
    loop: async (ctx) => {
      const given = GIVEN['mid-interview'];
      for (const colorScheme of SCHEMES) {
        for (const viewport of SIZES) {
          await withDiscovery(ctx, { scenario: 'mid-interview', viewport, colorScheme }, async (screen) => {
            if (viewport === 'desktop') {
              await screen.brief.open();
              const panel = await screen.brief.box();
              const chat = await screen.conversationBox();
              expect(panel.x, 'the brief sits to the right of the conversation').toBeGreaterThanOrEqual(chat.x + chat.width - 1);
              expect(chat.width, 'the conversation stays visible').toBeGreaterThan(40);
              expect(await screen.brief.text(), 'a section shows Agreed').toContain('Agreed');
              expect(await screen.brief.text(), 'a section shows Not sure yet').toContain('Not sure yet');
              expect(await screen.brief.text(), 'a section shows To be discussed').toContain('To be discussed');
              for (const title of [given.agreed[0].title, given.notSure.title, given.open[0].title]) {
                expect(await screen.brief.hasEdit(title), `${title} has Edit`).toBe(true);
              }
              await screen.brief.edit(given.agreed[0].title);
              await eventually('Edit closes the brief', () => screen.brief.openVisible(), (open) => open === false);
              const question = screen.chat.question(given.agreed[0].question);
              await eventually('Edit focuses that question', () => question.hasFocus(), (focused) => focused);
              expect(await question.tag(), 'Edit says you are changing your earlier answer').toBe(TEXT.changing);
            } else {
              const draft = 'Keep this note';
              await screen.composer.fill(draft);
              await screen.brief.open();
              const panel = await eventually(
                'the phone brief covers the screen',
                () => screen.brief.box(),
                (box) => box.x <= 1 && box.y <= 1 && box.x + box.width >= screen.width - 1 && box.y + box.height >= screen.height - 1,
              );
              expect(panel.width, 'the phone brief has width').toBeGreaterThan(0);
              expect(await screen.usage.visible(), 'the usage card stays visible while the brief is open').toBe(true);
              await screen.brief.back();
              expect(await screen.composer.value(), 'Back to chat keeps the message draft').toBe(draft);
            }
          });
        }
      }
    },
    integration: async () => {
      throw new CapabilityPending([AWAITED.discoverySurface]);
    },
    drill: async () => {
      throw new CapabilityPending([AWAITED.discoverySurface]);
    },
  },
);

async function expectUsage(screen: DiscoveryPage): Promise<void> {
  await expectFramePins(screen);
  expect(await screen.usage.barCount(), 'the usage card has one bar').toBe(1);
  const label = (await screen.usage.barLabel()).toLowerCase();
  const freeAt = label.indexOf('free replies');
  const paidAt = label.indexOf('paid fuel');
  expect(freeAt, 'the bar names free replies').toBeGreaterThanOrEqual(0);
  expect(paidAt, 'the bar names paid fuel after free replies').toBeGreaterThan(freeAt);
  const values = await screen.usage.text();
  expect(values, 'the values line names Free today').toContain('Free today');
  expect(values, 'the values line names Beta').toContain('Beta');
  expect(values, 'the values line names Fuel').toContain('Fuel');
  const form = await screen.composer.formText();
  expect(form, 'no dollar amount sits beside Send').not.toContain('$');
  expect(form, 'no reply count sits beside Send').not.toContain('left today');
  expect(form.toLowerCase(), 'no free-reply text sits beside Send').not.toContain('free');
  if (screen.viewport !== 'desktop') {
    const card = await screen.usage.box();
    const message = await screen.composer.messageBox();
    expect(card.y + card.height, 'the usage card sits above the message box').toBeLessThanOrEqual(message.y + 1);
    expect(message.y - (card.y + card.height), 'the usage card sits within 16 px of the message box').toBeLessThanOrEqual(16);
  }
  const before = await screen.composer.messageBox();
  const lineLimit = await screen.composer.oneLineLimit();
  expect(before.height, 'the message box starts at one line').toBeLessThan(lineLimit);
  await screen.composer.fill('One\nTwo\nThree\nFour');
  await eventually('the message box grows with the text', () => screen.composer.messageBox(), (box) => box.height > before.height * 2);
  await screen.brief.open();
  expect(await screen.usage.visible(), 'the usage card stays visible while the brief is open').toBe(true);
  expect(await screen.usage.barCount(), 'one bar remains while the brief is open').toBe(1);
}

async function expectFramePins(screen: DiscoveryPage): Promise<void> {
  await expectInViewport(screen, 'at the initial scroll');
  await screen.chat.scrollToTop();
  await expectInViewport(screen, 'after the chat scrolls to its top');
}

async function expectInViewport(screen: DiscoveryPage, when: string): Promise<void> {
  const finish = await screen.progress.finishBox();
  const send = await screen.sendBox();
  const message = await screen.composer.messageBox();
  const usage = await screen.usage.box();
  for (const [what, box] of [
    ['Finish Discovery', finish],
    ['Send', send],
    ['the message box', message],
    ['the usage card', usage],
  ] as const) {
    expect(box.width, `${what} has width ${when}`).toBeGreaterThan(0);
    expect(box.height, `${what} has height ${when}`).toBeGreaterThan(0);
    expect(box.x, `${what} starts inside the viewport ${when}`).toBeGreaterThanOrEqual(-1);
    expect(box.y, `${what} starts inside the viewport ${when}`).toBeGreaterThanOrEqual(-1);
    expect(box.x + box.width, `${what} ends inside the viewport ${when}`).toBeLessThanOrEqual(screen.width + 1);
    expect(box.y + box.height, `${what} ends inside the viewport ${when}`).toBeLessThanOrEqual(screen.height + 1);
  }
}

async function expectInside(screen: DiscoveryPage): Promise<void> {
  const finish = await screen.progress.finishBox();
  const send = await screen.sendBox();
  const message = await screen.composer.messageBox();
  const free = await screen.usage.labelBox('Free today');
  const beta = await screen.usage.labelBox('Beta');
  const fuel = await screen.usage.labelBox('Fuel');
  for (const [what, box] of [
    ['Finish Discovery', finish],
    ['Send', send],
    ['the message box', message],
    ['Free today', free],
    ['Beta', beta],
    ['Fuel', fuel],
  ] as const) {
    expect(box.width, `${what} has width`).toBeGreaterThan(0);
    expect(box.height, `${what} has height`).toBeGreaterThan(0);
    expect(box.x, `${what} starts inside the 320 px screen`).toBeGreaterThanOrEqual(-1);
    expect(box.x + box.width, `${what} ends inside the 320 px screen`).toBeLessThanOrEqual(screen.width + 1);
  }
}
