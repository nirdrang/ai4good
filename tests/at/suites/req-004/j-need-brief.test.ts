import { expect } from 'vitest';
import { eventually } from '../../harness/screen.ts';
import { SCREEN, TEXT } from '../../../../src/components/discovery/a11y.ts';
import { GIVEN } from '../../../../design/astra/src/givens.ts';
import { atTest, AtPending, CapabilityPending } from './_bind.ts';
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
atTest(
  'AT-004.66',
  'Add a file opens a file chat that asks until the AI is ready',
  { surface: 'ui', timeoutMs: { loop: 240_000 } },
  {
    loop: async (ctx) => {
      for (const viewport of SIZES) {
        await withDiscovery(ctx, { scenario: 'mid-interview', viewport }, async (screen) => {
          await expectChooser(screen, viewport === 'desktop');
          await screen.chooser.cancel();
          expect(await screen.files.text(), 'Cancel adds nothing: the count stays 0 of 3 added').toContain('0 of 3 added');
          expect(await screen.files.has('volunteer-rota.xlsx'), 'Cancel adds nothing: volunteer-rota.xlsx is not listed').toBe(false);
          await readRotaUntilReady(screen);
          await cancelNotesBeforeAnswer(screen);
        });
      }
      await withDiscovery(ctx, { scenario: 'mid-interview', viewport: 'narrow' }, async (screen) => {
        await expectFileControlsFit(screen);
      });
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
  'AT-004.67',
  'file-chat answers are turns and the read is free',
  { surface: 'ui', timeoutMs: { loop: 180_000 } },
  {
    loop: async (ctx) => {
      for (const viewport of SIZES) {
        await withDiscovery(ctx, { scenario: 'mid-interview', viewport }, async (screen) => {
          await answerRotaTwice(screen);
          const usage = await eventually(
            'two file answers leave 1 free reply',
            () => screen.usage.text(),
            (text) => text.includes('1 left today') && !text.includes('3 left today'),
          );
          expect(usage, 'the usage display no longer shows 3 left today').not.toContain('3 left today');
          await eventually(
            'the read reaches Ready · 4 facts',
            () => screen.fileChat('volunteer-rota.xlsx').text(),
            (text) => text.includes('Ready · 4 facts'),
            8_000,
          );
          expect(await screen.usage.text(), 'the read adds no turn').toBe(usage);
          expect(await screen.modelCalls(), 'two file answers and one read').toEqual([
            'file-chat-turn',
            'file-read',
            'file-chat-turn',
          ]);
        });
        await withDiscovery(ctx, { scenario: 'mid-interview-paid', viewport }, async (screen) => {
          await answerRotaTwice(screen);
          const usage = await eventually(
            'two paid file answers show $1.10',
            () => screen.usage.text(),
            (text) => text.includes('$1.10') && !text.includes('$1.60') && !text.includes('$0.85'),
          );
          expect(usage, 'the paid display is not the balance from before the answers').not.toContain('$1.60');
          expect(usage, 'the paid display is not a third hold').not.toContain('$0.85');
          await eventually(
            'the paid read reaches Ready · 4 facts',
            () => screen.fileChat('volunteer-rota.xlsx').text(),
            (text) => text.includes('Ready · 4 facts'),
            8_000,
          );
          expect(await screen.usage.text(), 'the read adds no fuel charge').toBe(usage);
          expect(await screen.modelCalls(), 'two paid file answers and one read').toEqual([
            'file-chat-turn',
            'file-read',
            'file-chat-turn',
          ]);
        });
      }
      throw new AtPending('AT-004.67', 'sut-missing', 'the two-file ledger stays for a later unit');
    },
    integration: async () => {
      throw new AtPending('AT-004.67', 'sut-missing', 'the two-file ledger stays for a later unit');
    },
    drill: async () => {
      throw new AtPending('AT-004.67', 'sut-missing', 'the two-file ledger stays for a later unit');
    },
  },
);
atTest(
  'AT-004.68',
  'the file is read in the background into a digest',
  { surface: 'ui', timeoutMs: { loop: 240_000 } },
  {
    loop: async (ctx) => {
      const given = GIVEN['mid-interview'];
      const fact = '38 of your 45 volunteers booked at least one shift';
      for (const viewport of SIZES) {
        await withDiscovery(ctx, { scenario: 'mid-interview', viewport }, async (screen) => {
          const chat = await openRotaChat(screen);
          await chat.pick('It shows where Sundays stay empty');
          await eventually(
            'the read pauses with A question for you',
            () => chat.text(),
            (text) => text.includes('A question for you'),
            8_000,
          );
          if (viewport !== 'desktop') await chat.close();
          const owner = screen.chat.question(given.open[0].question);
          await owner.pick(given.open[0].suggested);
          const during = await screen.composer.send();
          expect(during, 'a main-chat reply during the read does not report 38 of your 45').not.toContain('38 of your 45');
          if (viewport !== 'desktop') {
            await screen.files.reopen('volunteer-rota.xlsx');
            await eventually('the file chat reopens', () => chat.visible(), (open) => open);
          }
          const before = await screen.modelCalls();
          if (viewport === 'desktop') {
            const saw = sawReadingPercent(screen, 'volunteer-rota.xlsx');
            await chat.pick('Yes, usually the same person');
            expect(await saw, 'the row shows Reading… N% while the read continues').toBe(true);
          } else {
            await chat.pick('Yes, usually the same person');
            await chat.close();
            expect(
              await sawReadingPercent(screen, 'volunteer-rota.xlsx'),
              'after the file chat closes, the row shows Reading… N%',
            ).toBe(true);
          }
          const calls = await eventually(
            'the pause answer is one file-chat turn',
            () => screen.modelCalls(),
            (kinds) => kinds.length === before.length + 1,
          );
          expect(calls, 'the pause answer does not start a second read').toEqual([...before, 'file-chat-turn']);
          await eventually(
            'the row shows Ready · 4 facts',
            () => screen.files.row('volunteer-rota.xlsx'),
            (text) => text.includes('Ready · 4 facts'),
            8_000,
          );
          expect(await screen.modelCalls(), 'reaching Ready makes no model call').toEqual(calls);
          await screen.composer.fill('What did the file show?');
          const reply = await screen.composer.send();
          expect(reply, 'the next reply reports what the file showed').toContain(fact);
          if (await chat.visible()) await chat.close();
          await screen.brief.open();
          const brief = await screen.brief.text();
          const markerAt = brief.indexOf('Suggestion · waiting for you');
          const factAt = brief.indexOf(fact);
          expect(markerAt, 'the brief lists the fact as Suggestion · waiting for you').toBeGreaterThan(-1);
          expect(factAt, 'the fact follows Suggestion · waiting for you').toBeGreaterThan(markerAt);
        });
      }
      throw new AtPending('AT-004.68', 'sut-missing', 'the digest at the context boundary stays for a later unit');
    },
    integration: async () => {
      throw new AtPending('AT-004.68', 'sut-missing', 'the digest at the context boundary stays for a later unit');
    },
    drill: async () => {
      throw new AtPending('AT-004.68', 'sut-missing', 'the digest at the context boundary stays for a later unit');
    },
  },
);
atTest('AT-004.69', 'a large file is read in parts into one digest', { default: notYet('AT-004.69') });
atTest(
  'AT-004.70',
  'three Discovery files while the project is not funded',
  { surface: 'ui', timeoutMs: { loop: 120_000 } },
  {
    loop: async (ctx) => {
      const given = GIVEN['first-reply'];
      for (const viewport of SIZES) {
        await withDiscovery(ctx, { scenario: 'three-files-unfunded', viewport }, async (screen) => {
          const unfunded = GIVEN['three-files-unfunded'];
          expect(await screen.files.addDisabled(), 'Add a file is unavailable').toBe('true');
          expect(await screen.files.text(), 'the screen explains the limit of three files for free projects').toContain(
            'Free projects can add 3 files in Discovery.',
          );
          expect(await screen.files.has(unfunded.intake), 'the intake file is listed').toBe(true);
          for (const name of unfunded.files) {
            expect(await screen.files.has(name), `${name} is listed`).toBe(true);
          }
          expect(await screen.files.text(), 'the count says 3 of 3 added').toContain('3 of 3 added');
          const opening = await screen.chat.lastAssistantText();
          expect(opening, 'three Discovery files: the first reply does not point to Add a file').not.toContain('Add a file');
          expect(opening, 'three Discovery files: the first reply does not ask for files that show how you work today').not.toContain(
            given.filePhrase,
          );
        });
        await withDiscovery(ctx, { scenario: 'three-files-funded', viewport }, async (screen) => {
          const funded = GIVEN['three-files-funded'];
          const before = await screen.modelCalls();
          expect(await screen.files.addDisabled(), 'a funded project can add a file').not.toBe('true');
          expect(await screen.files.text(), 'a funded project does not show the limit of three').not.toContain(
            'Free projects can add 3 files in Discovery.',
          );
          expect(await screen.files.text(), 'the count says 3 added').toContain('3 added');
          expect(await screen.files.text(), 'the count does not say 3 of 3').not.toContain('3 of 3');
          expect(await screen.files.has(funded.intake), 'the intake file is listed').toBe(true);
          await screen.files.openAdd();
          expect(await screen.chooser.visible(), 'Add a file opens the chooser').toBe(true);
          expect(await screen.modelCalls(), 'opening the chooser makes no model call').toEqual(before);
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

function sampleFile(name: string): { name: string; mimeType: string; base64: string } {
  return { name, mimeType: 'text/plain', base64: Buffer.from(name).toString('base64') };
}

async function openRotaChat(screen: DiscoveryPage) {
  await screen.files.openAdd();
  await screen.files.choose(sampleFile('volunteer-rota.xlsx'));
  const chat = screen.fileChat('volunteer-rota.xlsx');
  await eventually('the file chat asks what we should know', () => chat.text(), (text) =>
    text.includes(TEXT.fileQuestion),
  );
  return chat;
}

async function expectChooser(screen: DiscoveryPage, finePointer: boolean): Promise<void> {
  await screen.files.openAdd();
  expect(await screen.chooser.chooseCount(), 'the chooser has one Choose a file button').toBe(1);
  expect(await screen.chooser.dropVisible(), 'Drop a file here follows the pointer').toBe(finePointer);
  const text = await screen.chooser.text();
  expect(text, 'the chooser lists the accepted types').toContain(TEXT.acceptedTypes);
  expect(text, 'the chooser shows the sample-data sentence').toContain(TEXT.sampleData);
  expect(await screen.chooser.visible(), 'Add a file names the chooser').toBe(true);
}

async function readRotaUntilReady(screen: DiscoveryPage): Promise<void> {
  const chat = await openRotaChat(screen);
  expect(await chat.text(), 'the file chat offers It shows where Sundays stay empty').toContain(
    'It shows where Sundays stay empty',
  );
  await eventually(
    'the file chat has an answer box',
    () => chat.answerBox(),
    (box) => box.width > 0,
  );
  const before = await screen.modelCalls();
  await chat.pick('It shows where Sundays stay empty');
  await eventually('the answer starts the read', () => chat.text(), (text) => text.includes('Reading'));
  const started = await screen.modelCalls();
  expect(started, 'the answer is one file-chat turn and one read').toEqual([...before, 'file-chat-turn', 'file-read']);
  await chat.close();
  await eventually(
    'closing the file chat does not stop the read: the row shows A question for you',
    () => screen.files.row('volunteer-rota.xlsx'),
    (text) => text.includes('A question for you'),
    8_000,
  );
  await screen.files.reopen('volunteer-rota.xlsx');
  await eventually('selecting the file reopens its chat', () => chat.visible(), (open) => open);
  await chat.pick('Yes, usually the same person');
  const resumed = await eventually(
    'the next answer is one file-chat turn',
    () => screen.modelCalls(),
    (calls) => calls.length === started.length + 1,
  );
  expect(resumed, 'the read does not start again').toEqual([...started, 'file-chat-turn']);
  await eventually(
    'the file chat shows Ready · 4 facts',
    () => chat.text(),
    (text) => text.includes('Ready · 4 facts'),
    8_000,
  );
  expect(await screen.modelCalls(), 'Ready adds no model call').toEqual(resumed);
  await chat.close();
  expect(await screen.files.row('volunteer-rota.xlsx'), 'the row shows Ready · 4 facts').toContain('Ready · 4 facts');
  expect(await screen.files.text(), 'one Discovery file counts as 1 of 3 added').toContain('1 of 3 added');
}

async function cancelNotesBeforeAnswer(screen: DiscoveryPage): Promise<void> {
  const calls = await screen.modelCalls();
  await screen.files.openAdd();
  await screen.files.choose(sampleFile('shift-notes.txt'));
  const notes = screen.fileChat('shift-notes.txt');
  await eventually('the second file asks before it is added', () => notes.text(), (text) =>
    text.includes(TEXT.fileQuestion),
  );
  await notes.close();
  expect(await screen.files.has('shift-notes.txt'), 'Cancel before the first answer adds no file').toBe(false);
  expect(await screen.files.has('volunteer-rota.xlsx'), 'the first file stays listed').toBe(true);
  expect(await screen.modelCalls(), 'Cancel before the first answer makes no model call').toEqual(calls);
}

async function answerRotaTwice(screen: DiscoveryPage): Promise<void> {
  const chat = await openRotaChat(screen);
  await chat.pick('It shows where Sundays stay empty');
  await chat.pick('Yes, usually the same person');
}

async function sawReadingPercent(screen: DiscoveryPage, name: string): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < 2_500) {
    if (/Reading… \d+%/.test(await screen.files.row(name))) return true;
    await new Promise((resolveWait) => setTimeout(resolveWait, 15));
  }
  return false;
}

async function expectFileControlsFit(screen: DiscoveryPage): Promise<void> {
  await screen.chat.scrollToEnd();
  await expectFullyVisible(screen, 'Add a file', await screen.files.addBox());
  await screen.files.openAdd();
  expect(await screen.chooser.dropVisible(), 'at 320 px the drop area stays hidden').toBe(false);
  await expectFullyVisible(screen, 'Choose a file', await screen.chooser.buttonBox(SCREEN.chooseFile.name));
  await expectFullyVisible(screen, 'Cancel adding this file', await screen.chooser.buttonBox(SCREEN.cancelAdding.name));
  await expectFullyVisible(screen, 'the accepted types', await screen.chooser.textBox(TEXT.acceptedTypes));
  await expectFullyVisible(screen, 'the sample-data sentence', await screen.chooser.textBox(TEXT.sampleData));
  await expectFullyVisible(screen, 'Back to chat', await screen.chooser.buttonBox(SCREEN.backToChat.name));
  await screen.files.choose(sampleFile('volunteer-rota.xlsx'));
  const chat = screen.fileChat('volunteer-rota.xlsx');
  await eventually('the file chat opens at 320 px', () => chat.visible(), (open) => open);
  await expectFullyVisible(screen, 'Your answer about this file', await chat.answerBox());
  await expectFullyVisible(screen, 'Send', await chat.sendBox());
  await expectFullyVisible(screen, 'It shows where Sundays stay empty', await chat.chipBox('It shows where Sundays stay empty'));
  await expectFullyVisible(screen, 'Cancel adding this file', await chat.buttonBox(SCREEN.cancelAdding.name));
}

async function expectFullyVisible(
  screen: DiscoveryPage,
  what: string,
  box: { x: number; y: number; width: number; height: number },
): Promise<void> {
  expect(box.width, `${what} has width`).toBeGreaterThan(0);
  expect(box.height, `${what} has height`).toBeGreaterThan(0);
  expect(box.x, `${what} starts inside the viewport`).toBeGreaterThanOrEqual(-1);
  expect(box.y, `${what} starts inside the viewport`).toBeGreaterThanOrEqual(-1);
  expect(box.x + box.width, `${what} ends inside the viewport`).toBeLessThanOrEqual(screen.width + 1);
  expect(box.y + box.height, `${what} ends inside the viewport`).toBeLessThanOrEqual(screen.height + 1);
}

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
