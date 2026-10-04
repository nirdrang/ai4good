import { expect } from 'vitest';
import { eventually } from '../../harness/screen.ts';
import { TEXT } from '../../../../src/components/discovery/a11y.ts';
import { GIVEN } from '../../../../design/astra/src/givens.ts';
import { atTest, AtPending, CapabilityPending, TIER } from './_bind.ts';
import { AWAITED, notYet } from './_pending.ts';
import { discoveryScreens } from './_screen.ts';
import {
  addRota,
  agreeRequiredTopics,
  fileReady,
  answerWhenAsked,
  expectChangeReopensDiscovery,
  expectChooser,
  expectDocument,
  expectEditClearsReview,
  expectFileControlsFit,
  expectFinishFlow,
  expectInside,
  expectReviewFits,
  expectUsage,
  readRotaUntilReady,
} from './_flows.ts';
import { FILE_PART_CHARS, fileDigestContext, splitFileText, type FileRow } from '../../../../supabase/functions/_shared/discovery-files.ts';

const withDiscovery = discoveryScreens();
const SCHEMES = ['light', 'dark'] as const;
const SIZES = ['desktop', 'phone'] as const;

atTest('AT-004.61', 'the live brief updates from each reply with importance', { surface: 'ui', timeoutMs: { loop: 120_000, integration: 900_000 } }, {
  default: async (ctx) => {
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
      if (screen.backend) {
        const state = await screen.backend.read();
        expect(state.brief.topics.find((topic) => topic.id === 'info')?.state).toMatchObject({ kind: 'agreed', answer: given.open[1].suggested });
        expect(state.brief.revision).toBeGreaterThan(4);
        expect(state.usage.dailyLeft).toBe(2);
      } else {
        expect(brief, 'an open question shows Needed before build').toContain('Needed before build');
        expect(brief, 'an open question shows A suggestion exists').toContain('A suggestion exists');
        expect(brief, 'an open question shows Can wait').toContain('Can wait');
      }
      const owner = screen.chat.question(given.open[0].question);
      const measure = screen.chat.question(given.notSure.question);
      expect(await owner.isAsked(), 'the unanswered question stays in the chat').toBe(true);
      expect(await measure.isAsked(), 'the unsure question stays in the chat').toBe(true);
      expect(await owner.suggestedCount(), 'the owner question has one Suggested option').toBe(1);
      expect(await measure.suggestedCount(), 'the measure question has one Suggested option').toBe(1);
      if (!screen.backend) {
        expect(await owner.text(), 'the owner question shows Needed before build').toContain('Needed before build');
        expect(await measure.text(), 'the measure question shows A suggestion exists').toContain('A suggestion exists');
      }
      expect(await screen.modelCalls(), 'opening the brief makes no model call').toEqual(calls);
      await screen.review.open();
      expect(await screen.modelCalls(), 'opening Finish makes no model call').toEqual(calls);
    });
    await withDiscovery(ctx, { scenario: 'first-reply', viewport: 'desktop' }, async (screen) => {
      const first = GIVEN['first-reply'];
      const mid = GIVEN['mid-interview'];
      if (screen.backend) {
        expect(await screen.modelCalls(), 'the real opening is one model call').toEqual(['chat-turn']);
        expect((await screen.backend.read()).usage.dailyLeft, 'the opening uses no reply credit').toBe(10);
      } else expect(await screen.modelCalls(), 'the opening transcript makes no model call').toEqual([]);
      if (screen.backend) await agreeRequiredTopics(screen);
      else {
      await screen.chat.question(first.questions.priority).pick(first.suggested);
      await screen.chat.question(first.questions.booking).pick(mid.agreed[1].answer);
      await screen.composer.send();
      await answerWhenAsked(screen, mid.notSure.question, 'Two hours a week');
      await answerWhenAsked(screen, mid.open[0].question, mid.open[0].suggested);
      await screen.composer.send();
      await answerWhenAsked(screen, mid.open[1].question, mid.open[1].suggested);
      await answerWhenAsked(screen, mid.next.question, 'Weekly shift limit');
      await screen.composer.send();
      }
      await eventually('the finish invitation replaces the composer', () => screen.ready.visible(), (open) => open);
      expect(await screen.chat.lastAssistantText(), 'the reply says Discovery is ready for review').toContain(TEXT.readyReply);
      expect((await screen.ready.text()).trim(), 'the invitation points to Finish Discovery').toBe(TEXT.readyInvite);
      expect(await screen.composer.formCount(), 'the message form is gone').toBe(0);
      expect(await screen.composer.messageCount(), 'the message box is gone').toBe(0);
      expect(await screen.composer.sendCount(), 'Send is gone').toBe(0);
      const calls = await screen.modelCalls();
      if (screen.backend) {
        expect(calls.length).toBeGreaterThan(0);
        expect(calls.every((kind) => kind === 'chat-turn')).toBe(true);
      } else expect(calls, 'three replies are three model calls').toEqual(['chat-turn', 'chat-turn', 'chat-turn']);
      expect(await screen.modelCalls(), 'the ready state adds no model call').toEqual(calls);
    });
    await withDiscovery(ctx, { scenario: 'first-reply', viewport: 'desktop', pace: 'demo' }, async (screen) => {
      const first = GIVEN['first-reply'];
      if (screen.backend) {
        const question = (await screen.backend.read()).brief.questions[0]!;
        await screen.chat.question(question.text).pick(question.options[0]!.label);
      } else await screen.chat.question(first.questions.priority).pick(first.suggested);
      await screen.composer.fill('note before send');
      const pending = screen.composer.send();
      await eventually(
        'the sent note is in the chat',
        () => screen.chat.yourText(),
        (text) => text.includes('note before send'),
      );
      await screen.composer.fill('typed while the reply streams');
      await pending;
      expect(await screen.composer.value(), 'text typed during the reply stays').toBe('typed while the reply streams');
    });
  },
  drill: async () => {
    throw new CapabilityPending([AWAITED.discoverySurface]);
  },
});
atTest(
  'AT-004.62',
  'Finish groups open questions by importance without a model call',
  { surface: 'ui', timeoutMs: { loop: 240_000, integration: 900_000 } },
  {
    default: async (ctx) => {
      const given = GIVEN['finish-open'];
      for (const colorScheme of SCHEMES) {
        for (const viewport of SIZES) {
          await withDiscovery(ctx, { scenario: 'finish-open', viewport, colorScheme }, async (screen) => {
            await expectFinishFlow(screen, given);
          });
        }
      }
      await withDiscovery(ctx, { scenario: 'finish-open', viewport: 'narrow' }, async (screen) => {
        await expectReviewFits(screen, given);
      });
      await withDiscovery(ctx, { scenario: 'finish-open', viewport: 'desktop' }, async (screen) => {
        await expectChangeReopensDiscovery(screen, given);
      });
      await withDiscovery(ctx, { scenario: 'finish-tier-0', viewport: 'desktop' }, async (screen) => {
        const tier0 = GIVEN['finish-tier-0'];
        await screen.review.ready();
        const text = await screen.review.text();
        expect(text, 'Tier 0 shows no ordinary data box').not.toContain(TEXT.ack.data);
        expect(text, 'Tier 0 shows no sensitive data box').not.toContain(TEXT.ack.dataSensitive);
        await screen.review.tick(TEXT.ack.reviewed(tier0.revision));
        await screen.review.tick(TEXT.ack.gaps(tier0.open.length));
        expect(await screen.review.finishDisabled(), 'Tier 0 can finish without a data box').toBe(false);
        await screen.review.finish();
        expect(await screen.review.text(), 'Tier 0 finishes').toContain('Discovery finished');
      });
      await withDiscovery(ctx, { scenario: 'finish-tier-2', viewport: 'desktop' }, async (screen) => {
        await screen.review.ready();
        const text = await screen.review.text();
        expect(text, 'Tier 2 shows the fake-records sentence').toContain(TEXT.ack.dataSensitive);
        expect(text, 'Tier 2 keeps the In practice line').toContain('In practice:');
      });
    },
    drill: async () => {
      throw new CapabilityPending([AWAITED.discoverySurface]);
    },
  },
);
atTest(
  'AT-004.63',
  'the Discovery document holds the need and no technical scope',
  { surface: 'ui', timeoutMs: { loop: 240_000, integration: 900_000 } },
  {
    default: async (ctx) => {
      for (const colorScheme of SCHEMES) {
        for (const viewport of SIZES) {
          await withDiscovery(ctx, { scenario: 'confirmed-tier-2', viewport, colorScheme }, async (screen) => {
            await expectDocument(screen, GIVEN['confirmed-tier-2']);
          });
          await withDiscovery(ctx, { scenario: 'confirmed-tier-1', viewport, colorScheme }, async (screen) => {
            await expectDocument(screen, GIVEN['confirmed-tier-1']);
          });
        }
      }
      await withDiscovery(ctx, { scenario: 'confirmed-tier-2', viewport: 'narrow' }, async (screen) => {
        await screen.review.ready();
        const box = await screen.document.box();
        expect(box.x, 'the document starts inside the 320 px viewport').toBeGreaterThanOrEqual(-1);
        expect(box.x + box.width, 'the document ends inside the 320 px viewport').toBeLessThanOrEqual(screen.width + 1);
      });
    },
    drill: async () => {
      throw new CapabilityPending([AWAITED.discoverySurface]);
    },
  },
);
atTest(
  'AT-004.64',
  'the review offers the chat and brief edits, never an AI rewrite',
  { surface: 'ui', timeoutMs: { loop: 240_000, integration: 900_000 } },
  {
    default: async (ctx) => {
      const given = GIVEN['finish-open'];
      for (const colorScheme of SCHEMES) {
        for (const viewport of SIZES) {
          await withDiscovery(ctx, { scenario: 'finish-open', viewport, colorScheme }, async (screen) => {
            await expectEditClearsReview(screen, given);
          });
        }
      }
      await withDiscovery(ctx, { scenario: 'finish-open', viewport: 'narrow' }, async (screen) => {
        await expectReviewFits(screen, given);
      });
    },
    drill: async () => {
      throw new CapabilityPending([AWAITED.discoverySurface]);
    },
  },
);
atTest('AT-004.65', 'the first reply asks for files while fewer than three exist', { surface: 'ui', timeoutMs: { integration: 600_000 } }, {
  default: async (ctx) => {
    const given = GIVEN['first-reply'];
    await withDiscovery(ctx, { scenario: 'first-reply', viewport: 'desktop' }, async (screen) => {
      const text = await screen.chat.lastAssistantText();
      expect(text, 'the first reply asks for files that show how you work today').toContain(given.filePhrase);
      for (const kind of given.fileKinds) {
        expect(text, `the first reply names ${kind}`).toContain(kind);
      }
      expect(text, 'the first reply points to Add a file').toContain('Add a file');
      expect(await screen.files.addVisible(), 'Add a file is on the screen').toBe(true);
      if (screen.backend) {
        const before = await screen.backend.read();
        const question = before.brief.questions[0]!;
        expect(before.brief.questions.length).toBeGreaterThan(0);
        await screen.chat.question(question.text).pick(question.options[0]!.label);
        await screen.composer.send();
        const after = await screen.backend.read();
        expect(after.brief.topics.find((topic) => topic.id === question.topicId)?.state).toMatchObject({ kind: 'agreed', answer: question.options[0]!.answer });
        expect(after.brief.revision).toBeGreaterThan(before.brief.revision);
        expect(after.usage.dailyLeft).toBe(before.usage.dailyLeft - 1);
        expect(after.files.filter((file) => file.origin === 'discovery')).toHaveLength(0);
        return;
      }
      const priority = given.questions.priority;
      const question = screen.chat.question(priority);
      expect(await question.isAsked(), 'the first question is in the chat').toBe(true);
      expect(await screen.progress.text(), 'the interview starts with no topic agreed').toContain('0%');
      await question.pick(given.suggested);
      expect(await question.isPressed(given.suggested), 'the question can be answered without a file').toBe(true);
      const reply = await screen.composer.send();
      expect(reply, 'Send works with no file').not.toBe(text);
      expect(await screen.chat.yourText(), 'the sent answer is in the chat').toContain(given.suggested);
      await eventually('the answered question leaves the chat', () => question.isAsked(), (asked) => asked === false);
      expect(await screen.chat.question(given.questions.booking).isAsked(), 'the other question stays open').toBe(true);
      const progress = await eventually(
        'the percent rises after the first answer',
        () => screen.progress.text(),
        (value) => value.includes('16%') && value.includes('1 of 6'),
      );
      expect(progress, 'one topic agreed is 16 percent').toContain('16%');
      expect(
        await screen.chat.question('What weekly scheduling time would count as success?').isAsked(),
        'the next open topic is asked',
      ).toBe(true);
    });
    await withDiscovery(ctx, { scenario: 'first-reply-three-files', viewport: 'desktop' }, async (screen) => {
      const text = await screen.chat.lastAssistantText();
      expect(text, 'three Discovery files: the first reply does not point to Add a file').not.toContain('Add a file');
      expect(text, 'three Discovery files: the first reply does not ask for files that show how you work today').not.toContain(
        given.filePhrase,
      );
      if (!screen.backend) {
        for (const kind of given.fileKinds) {
          expect(text, `three Discovery files: the first reply does not name ${kind}`).not.toContain(kind);
        }
      }
      for (const name of GIVEN['first-reply-three-files'].files) {
        expect(await screen.files.has(name), `${name} is listed`).toBe(true);
      }
    });
  },
  drill: async () => {
    throw new CapabilityPending([AWAITED.discoverySurface]);
  },
});
atTest(
  'AT-004.66',
  'choosing a file starts the read and the file panel is read-only',
  { surface: 'ui', timeoutMs: { loop: 240_000, integration: 900_000 } },
  {
    default: async (ctx) => {
      for (const viewport of SIZES) {
        await withDiscovery(ctx, { scenario: 'mid-interview', viewport }, async (screen) => {
          await expectChooser(screen, viewport === 'desktop');
          await screen.chooser.cancel();
          expect(await screen.files.text(), 'Cancel adds nothing: the count stays 0 of 3 added').toContain('0 of 3 added');
          expect(await screen.files.has('volunteer-rota.xlsx'), 'Cancel adds nothing: volunteer-rota.xlsx is not listed').toBe(false);
          await readRotaUntilReady(screen);
        });
      }
      await withDiscovery(ctx, { scenario: 'mid-interview', viewport: 'narrow' }, async (screen) => {
        await expectFileControlsFit(screen);
      });
    },
    drill: async () => {
      throw new CapabilityPending([AWAITED.discoverySurface]);
    },
  },
);
atTest(
  'AT-004.67',
  'a file read consumes no turn and no fuel',
  { surface: 'ui', timeoutMs: { loop: 180_000, integration: 900_000 } },
  {
    default: async (ctx) => {
      for (const viewport of SIZES) {
        await withDiscovery(ctx, { scenario: 'mid-interview', viewport }, async (screen) => {
          const before = await screen.usage.text();
          const saved = screen.backend ? await screen.backend.read() : null;
          expect(before, 'Free today starts at 3 left today').toContain('3 left today');
          await addRota(screen);
          if (screen.backend) await fileReady(screen, 'volunteer-rota.xlsx');
          else await eventually(
            'the read reaches Ready · 4 facts',
            () => screen.files.row('volunteer-rota.xlsx'),
            (text) => text.includes('Ready · 4 facts'),
            8_000,
          );
          expect(await screen.usage.text(), 'adding and reading a file leaves the usage card unchanged').toBe(before);
          expect(await screen.modelCalls(), 'the read is one file-read and no turn').toEqual(['file-read']);
          if (screen.backend) {
            await screen.files.openAdd();
            await screen.files.choose({ name: 'second-rota.txt', mimeType: 'text/plain', base64: Buffer.from('Kitchen coordinators fill Sunday shifts by phone.').toString('base64') });
            await fileReady(screen, 'second-rota.txt');
            expect((await screen.backend.read()).usage).toEqual(saved!.usage);
            const turns = await screen.backend.sql`select charged_credits, actual_micros from public.discovery_turns where project_id = ${screen.backend.projectId}::uuid` as { charged_credits: number; actual_micros: number }[];
            expect(turns).toHaveLength(4);
            expect(turns.reduce((total, row) => total + Number(row.actual_micros), 0)).toBe(0);
            expect(await screen.modelCalls()).toEqual(['file-read', 'file-read']);
          }
        });
        if (TIER === 'loop') await withDiscovery(ctx, { scenario: 'mid-interview-paid', viewport }, async (screen) => {
          const before = await screen.usage.text();
          expect(before, 'the paid balance starts at $1.60').toContain('$1.60');
          await addRota(screen);
          await eventually(
            'the paid read reaches Ready · 4 facts',
            () => screen.files.row('volunteer-rota.xlsx'),
            (text) => text.includes('Ready · 4 facts'),
            8_000,
          );
          const usage = await screen.usage.text();
          expect(usage, 'the read adds no fuel charge').toBe(before);
          expect(usage, 'the paid display stays $1.60').toContain('$1.60');
          expect(usage, 'the read does not charge one hold').not.toContain('$1.10');
          expect(usage, 'the read does not charge two holds').not.toContain('$0.85');
          expect(await screen.modelCalls(), 'the paid read is one file-read and no turn').toEqual(['file-read']);
        });
      }
    },
    drill: async () => {
      throw new AtPending('AT-004.67', 'sut-missing', 'The drill stack is not configured.');
    },
  },
);
atTest(
  'AT-004.68',
  'the file is read in the background into a digest',
  { surface: 'ui', timeoutMs: { loop: 240_000, integration: 900_000 } },
  {
    default: async (ctx) => {
      const given = GIVEN['mid-interview'];
      const fact = '38 of your 45 volunteers booked at least one shift';
      for (const viewport of SIZES) {
        await withDiscovery(ctx, { scenario: 'mid-interview', viewport }, async (screen) => {
          await addRota(screen);
          const owner = screen.chat.question(given.open[0].question);
          await owner.pick(given.open[0].suggested);
          const during = await screen.composer.send();
          if (!screen.backend) expect(during, 'a main-chat reply during the read does not report 38 of your 45').not.toContain('38 of your 45');
          const duringCalls = await screen.modelCalls();
          if (!screen.backend) expect(duringCalls, 'the read is one file-read and the reply is one turn').toEqual(['file-read', 'chat-turn']);
          if (screen.backend) await fileReady(screen, 'volunteer-rota.xlsx');
          else await eventually(
            'the row shows Ready · 4 facts',
            () => screen.files.row('volunteer-rota.xlsx'),
            (text) => text.includes('Ready · 4 facts'),
            8_000,
          );
          if (!screen.backend) expect(await screen.modelCalls(), 'reaching Ready makes no model call').toEqual(duringCalls);
          await screen.composer.fill('What did the file show?');
          const reply = await screen.composer.send();
          const report = reply.split('\n\n')[0] ?? '';
          if (!screen.backend) {
            expect(report, 'the report is one sentence').not.toContain('?');
            expect(reply, 'the next reply reports what the file showed').toContain(fact);
            expect(reply, 'the reply does not ask if the fact is right').not.toContain('Is that right?');
            expect(reply, 'the reply does not ask the NGO to agree').not.toContain('when you agree');
          }
          await screen.brief.open();
          const brief = await screen.brief.text();
          if (screen.backend) {
            const rows = await screen.backend.sql`select * from public.discovery_files where project_id = ${screen.backend.projectId}::uuid` as FileRow[];
            expect(rows[0]!.digest?.facts.length).toBeGreaterThan(0);
            const context = fileDigestContext(rows);
            expect(context).toHaveLength(1);
            expect(context[0]!.content).toContain(JSON.stringify(rows[0]!.digest));
            const state = await screen.backend.read();
            expect(state.brief.revision).toBeGreaterThan(4);
            expect(state.files[1]!.tookFromIt).toBeTruthy();
            expect(brief).toContain(state.files[1]!.tookFromIt!);
            expect(await screen.modelCalls()).toEqual(['file-read', 'chat-turn', 'chat-turn']);
          } else {
          const fromAt = brief.indexOf(TEXT.source.file('volunteer-rota.xlsx'));
          const tookAt = brief.indexOf('The AI took from it:');
          const factAt = brief.indexOf(fact);
          expect(fromAt, 'the brief marks the fact as from the file').toBeGreaterThan(-1);
          expect(tookAt, 'the brief says what the AI took from the file').toBeGreaterThan(fromAt);
          expect(factAt, 'the fact follows the took line').toBeGreaterThan(tookAt);
          expect(brief, 'a file fact is not waiting for agreement').not.toContain('Suggestion · waiting for you');
          }
        });
      }
    },
    drill: async () => {
      throw new AtPending('AT-004.68', 'sut-missing', 'The drill stack is not configured.');
    },
  },
);
atTest('AT-004.69', 'a large file is read in parts into one digest', { surface: 'ui', timeoutMs: { integration: 600_000 } }, {
  default: async (ctx) => {
    await ctx.open();
    const text = 'Kitchen volunteers cover Sunday shifts. '.repeat(450);
    const parts = splitFileText(text);
    expect(parts.length).toBe(2);
    expect(parts.join('')).toBe(text);
    expect(parts.every((part) => part.length <= FILE_PART_CHARS)).toBe(true);
    if (TIER === 'integration') await withDiscovery(ctx, { scenario: 'mid-interview', viewport: 'desktop' }, async (screen) => {
      const before = await screen.backend!.read();
      await screen.files.openAdd();
      await screen.files.choose({ name: 'large-rota.txt', mimeType: 'text/plain', base64: Buffer.from(text).toString('base64') });
      await fileReady(screen, 'large-rota.txt');
      const rows = await screen.backend!.sql`select f.total_parts, f.completed_parts, f.digest, count(p.*)::integer as parts
        from public.discovery_files f join public.discovery_file_parts p on p.file_id = f.id
        where f.project_id = ${screen.backend!.projectId}::uuid group by f.id` as { total_parts: number; completed_parts: number; digest: { facts: unknown[] }; parts: number }[];
      expect(rows[0]).toMatchObject({ total_parts: 2, completed_parts: 2, parts: 2 });
      expect(rows[0]!.digest.facts.length).toBeGreaterThan(0);
      expect((await screen.backend!.read()).usage).toEqual(before.usage);
      expect(await screen.modelCalls()).toEqual(['file-read', 'file-read']);
    });
  },
  drill: notYet('AT-004.69'),
});
atTest(
  'AT-004.70',
  'three Discovery files while the project is not funded',
  { surface: 'ui', timeoutMs: { loop: 120_000, integration: 900_000 } },
  {
    default: async (ctx) => {
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
    drill: async () => {
      throw new CapabilityPending([AWAITED.discoverySurface]);
    },
  },
);
atTest('AT-004.71', 'the Questions card shows states and jumps to the chat', { surface: 'ui', timeoutMs: { loop: 120_000, integration: 900_000 } }, {
  default: async (ctx) => {
    const given = GIVEN['mid-interview'];
    for (const viewport of SIZES) {
      await withDiscovery(ctx, { scenario: 'mid-interview', viewport }, async (screen) => {
        expect(await screen.questions.row(given.agreed[0].question), 'an agreed question shows Answered').toContain('Answered');
        expect(await screen.questions.row(given.notSure.question), 'an unsure question shows Not sure').toContain('Not sure');
        expect(await screen.questions.viewCount(given.notSure.question), 'a Not sure row has no View').toBe(0);
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
        const outline = await screen.chat.answerStyle(given.agreed[0].answer, 'outline-style');
        const background = await screen.chat.answerStyle(given.agreed[0].answer, 'background-color');
        expect(outline, 'View draws an outline on the answer').not.toBe('none');
        expect(background, 'View fills the answer').not.toBe('rgba(0, 0, 0, 0)');
        expect(background, 'View fills the answer').not.toBe('transparent');
        await screen.composer.send();
        await eventually(
          'the unanswered question is still open from last round',
          () => owner.tag(),
          (tag) => tag === TEXT.carried,
        );
      });
    }
    await withDiscovery(ctx, { scenario: 'first-reply', viewport: 'desktop' }, async (screen) => {
      const first = GIVEN['first-reply'];
      const mid = GIVEN['mid-interview'];
      if (screen.backend) {
        let questions = (await screen.backend.read()).brief.questions;
        if (questions.length < 2) {
          const next = (await screen.backend.read()).brief.topics.find((topic) => !questions.some((question) => question.topicId === topic.id))!;
          await screen.review.open();
          await screen.review.answerInChat(next.title);
          questions = (await screen.backend.read()).brief.questions;
        }
        await screen.chat.oneAtATime();
        expect(await screen.chat.question(questions[0]!.text).isAsked()).toBe(true);
        expect(await screen.chat.question(questions[1]!.text).isAsked()).toBe(false);
        await screen.chat.question(questions[0]!.text).pick(questions[0]!.options[0]!.label);
        await screen.chat.nextQuestion();
        expect(await screen.chat.question(questions[1]!.text).isAsked()).toBe(true);
        await screen.chat.question(questions[1]!.text).pick(questions[1]!.options[0]!.label);
        await screen.composer.send();
        const state = await screen.backend.read();
        for (const question of questions.slice(0, 2)) expect(state.brief.topics.find((topic) => topic.id === question.topicId)?.state.kind).toBe('agreed');
        return;
      }
      await screen.chat.oneAtATime();
      const priority = screen.chat.question(first.questions.priority);
      const booking = screen.chat.question(first.questions.booking);
      expect(await priority.isAsked(), 'one question at a time starts at the first question').toBe(true);
      expect(await booking.isAsked(), 'the second question waits').toBe(false);
      expect(await screen.chat.showTogetherVisible(), 'Show questions together is the way back').toBe(true);
      await priority.pick(first.suggested);
      await screen.chat.nextQuestion();
      await eventually('Next question shows who books shifts', () => booking.isAsked(), (asked) => asked);
      expect(await priority.isAsked(), 'Next question leaves the first question').toBe(false);
      await booking.pick(mid.agreed[1].answer);
      await screen.composer.send();
      const measure = screen.chat.question(mid.notSure.question);
      const owner = screen.chat.question(mid.open[0].question);
      await eventually('the next round starts at Success measure', () => measure.isAsked(), (asked) => asked);
      expect(await owner.isAsked(), 'the next round does not skip to Maintenance owner').toBe(false);
      await screen.chat.nextQuestion();
      await eventually('Next question shows Maintenance owner', () => owner.isAsked(), (asked) => asked);
      expect(await measure.isAsked(), 'Next question leaves Success measure').toBe(false);
      await screen.chat.showTogether();
      await eventually('Show questions together shows Success measure', () => measure.isAsked(), (asked) => asked);
      expect(await owner.isAsked(), 'Show questions together keeps Maintenance owner').toBe(true);
    });
  },
  drill: async () => {
    throw new CapabilityPending([AWAITED.discoverySurface]);
  },
});
atTest(
  'AT-004.72',
  'one usage bar and a growing message box',
  { surface: 'ui', timeoutMs: { loop: 180_000, integration: 900_000 } },
  {
    default: async (ctx) => {
      for (const scenario of ['mid-interview', 'mid-interview-paid'] as const) {
        if (TIER !== 'loop' && scenario === 'mid-interview-paid') continue;
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
      await withDiscovery(ctx, { scenario: 'mid-interview', viewport: 'desktop' }, async (screen) => {
        const before = await screen.usage.text();
        expect(before, 'Free today starts at 3 of 10').toContain('3 of 10');
        const given = GIVEN['mid-interview'];
        await screen.chat.question(given.open[1].question).pick(given.open[1].suggested);
        await screen.composer.send();
        const after = await eventually(
          'one free send drops the daily free turns',
          () => screen.usage.text(),
          (text) => text.includes('2 of 10'),
        );
        expect(after, 'Free today drops by one').toContain('2 of 10');
      });
      await withDiscovery(ctx, { scenario: 'daily-empty', viewport: 'desktop' }, async (screen) => {
        const text = await screen.usage.text();
        expect(text, 'Free today is used up').toContain('0 of 10');
        expect(text, 'no fuel is available').toContain('$0.00');
        expect(text, 'Buy fuel shows when the next reply is not free').toContain(TEXT.buyFuel);
        expect(text, 'the note names the $50 minimum').toContain(TEXT.buyFuelNote);
        if (TIER === 'loop') {
          await screen.usage.buyFuel();
          await eventually('Buy fuel opens the fuel page', () => screen.fuel.visible(), (open) => open);
        } else {
          const state = await screen.backend!.read();
          expect(state.usage.nextReply).toBe('unavailable');
          expect(state.usage.dailyLeft).toBe(0);
        }
      });
    },
    drill: async () => {
      throw new CapabilityPending([AWAITED.discoverySurface]);
    },
  },
);
atTest(
  'AT-004.73',
  'the brief opens as a side panel on desktop and a full-screen panel on phone',
  { surface: 'ui', timeoutMs: { loop: 120_000, integration: 900_000 } },
  {
    default: async (ctx) => {
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
              await screen.brief.back();
              await eventually(
                'focus returns to Open your live brief',
                () => screen.brief.openerFocused(),
                (focused) => focused,
              );
              await screen.brief.open();
              await screen.brief.edit(given.agreed[0].title);
              await eventually('Edit closes the brief', () => screen.brief.openVisible(), (open) => open === false);
              const question = screen.chat.question(given.agreed[0].question);
              await eventually('Edit focuses that question', () => question.hasFocus(), (focused) => focused);
              expect(await question.tag(), 'Edit says you are changing your earlier answer').toBe(TEXT.changing);
              expect(await question.text(), 'Save change sits with the question').toContain(TEXT.saveChange);
              const calls = await screen.modelCalls();
              const usage = await screen.usage.text();
              expect(usage, 'Free today starts at 3 of 10').toContain('3 of 10');
              await question.pick('Fewer unfilled shifts');
              await question.saveChange();
              await screen.brief.open();
              const saved = await eventually(
                'the brief shows the saved answer',
                () => screen.brief.text(),
                (text) => text.includes('Fewer unfilled shifts') && text.includes('Revision 5'),
              );
              expect(saved, 'the brief shows the new answer').toContain('Fewer unfilled shifts');
              expect(saved, 'the brief records your edit').toContain('Your edit');
              expect(saved, 'the dependent topic needs review').toContain('Needs review');
              expect(await screen.modelCalls(), 'Save change makes no model call').toEqual(calls);
              const after = await screen.usage.text();
              expect(after, 'Free today stays 3 of 10').toContain('3 of 10');
              expect(after, 'the edit leaves the usage card unchanged').toBe(usage);
              const line = TEXT.changedAnswer(given.agreed[0].title, 'Fewer unfilled shifts');
              await eventually('Save change adds your line', () => screen.chat.yourText(), (text) => text.includes(line));
              await screen.brief.back();
              await screen.questions.view(given.agreed[0].question);
              await eventually(
                'View highlights the saved change',
                () => screen.chat.answerCurrent(line),
                (current) => current === 'true',
              );
              const savedOutline = await screen.chat.answerStyle(line, 'outline-style');
              const savedBackground = await screen.chat.answerStyle(line, 'background-color');
              expect(savedOutline, 'View draws an outline on the saved change').not.toBe('none');
              expect(savedBackground, 'View fills the saved change').not.toBe('rgba(0, 0, 0, 0)');
              expect(savedBackground, 'View fills the saved change').not.toBe('transparent');
              await screen.reload();
              await eventually('the saved line survives a reload', () => screen.chat.yourText(), (text) => text.includes(line));
              await screen.questions.view(given.agreed[0].question);
              await eventually(
                'View highlights the saved line after a reload',
                () => screen.chat.answerCurrent(line),
                (current) => current === 'true',
              );
            } else {
              const log = await screen.conversationBox();
              expect(log.height, 'the chat log is at least 450 px at 390 by 844').toBeGreaterThanOrEqual(450);
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
              await eventually(
                'focus returns to Open your live brief',
                () => screen.brief.openerFocused(),
                (focused) => focused,
              );
              expect(await screen.composer.value(), 'Back to chat keeps the message draft').toBe(draft);
            }
          });
        }
      }
      await withDiscovery(ctx, { scenario: 'mid-interview', viewport: 'short' }, async (screen) => {
        const log = await screen.conversationBox();
        expect(log.height, 'the chat log is at least 250 px at 320 by 700').toBeGreaterThanOrEqual(250);
      });
    },
    drill: async () => {
      throw new CapabilityPending([AWAITED.discoverySurface]);
    },
  },
);
