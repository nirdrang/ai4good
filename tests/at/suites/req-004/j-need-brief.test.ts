import { expect } from 'vitest';
import { eventually } from '../../harness/screen.ts';
import { GIVEN } from '../../../../design/astra/src/givens.ts';
import { atTest, CapabilityPending } from './_bind.ts';
import { AWAITED, notYet } from './_pending.ts';
import { discoveryScreens } from './_screen.ts';

const withDiscovery = discoveryScreens();

// d94 (2026-09-29): the need brief, files, and Finish. The Discovery screen item replaces each stub
// with a body that runs against the shared mock first and the wired app after.
atTest('AT-004.61', 'the live brief updates from each reply with importance', { default: notYet('AT-004.61') });
atTest('AT-004.62', 'Finish groups open questions by importance without a model call', { default: notYet('AT-004.62') });
atTest('AT-004.63', 'the Discovery document holds the need and no technical scope', { default: notYet('AT-004.63') });
atTest('AT-004.64', 'the review offers the chat and brief edits, never an AI rewrite', { default: notYet('AT-004.64') });
atTest('AT-004.65', 'the first reply asks for files while fewer than three exist', { surface: 'ui' }, {
  loop: async (ctx) => {
    await withDiscovery(ctx, { scenario: 'first-reply', viewport: 'desktop' }, async (screen) => {
      const text = await screen.chat.lastAssistantText();
      expect(text, 'the first reply asks for files that show how the NGO works today').toContain(
        'files that show how the NGO works today',
      );
      expect(text, 'the first reply names a rota').toContain('rota');
      expect(text, 'the first reply names a sign-up sheet').toContain('sign-up sheet');
      expect(text, 'the first reply names volunteer rules').toContain('volunteer rules');
      expect(text, 'the first reply points to Add a file').toContain('Add a file');
      expect(await screen.files.addVisible(), 'Add a file is on the screen').toBe(true);
      const priority = GIVEN['first-reply'].questions.priority;
      const question = screen.chat.question(priority);
      expect(await question.isAsked(), 'the first question is in the chat').toBe(true);
      await question.pick(GIVEN['first-reply'].suggested);
      expect(
        await question.isPressed(GIVEN['first-reply'].suggested),
        'the question can be answered without a file',
      ).toBe(true);
      const reply = await screen.composer.send();
      expect(reply, 'Send works with no file').not.toBe(text);
      expect(await screen.chat.yourText(), 'the sent answer is in the chat').toContain(GIVEN['first-reply'].suggested);
      await eventually(
        'the answered question leaves the chat',
        () => question.isAsked(),
        (asked) => asked === false,
      );
      expect(
        await screen.chat.question(GIVEN['first-reply'].questions.booking).isAsked(),
        'the other question stays open',
      ).toBe(true);
    });
    await withDiscovery(ctx, { scenario: 'first-reply-three-files', viewport: 'desktop' }, async (screen) => {
      const text = await screen.chat.lastAssistantText();
      expect(text, 'three Discovery files: the first reply does not point to Add a file').not.toContain('Add a file');
      expect(
        text,
        'three Discovery files: the first reply does not ask for files that show how the NGO works today',
      ).not.toContain('files that show how the NGO works today');
      expect(text, 'three Discovery files: the first reply does not name a sign-up sheet').not.toContain('sign-up sheet');
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
atTest('AT-004.71', 'the Questions card shows states and jumps to the chat', { default: notYet('AT-004.71') });
atTest('AT-004.72', 'one usage bar and a growing message box', { default: notYet('AT-004.72') });
atTest('AT-004.73', 'the brief opens as a side panel on desktop and a full-screen panel on phone', { default: notYet('AT-004.73') });
