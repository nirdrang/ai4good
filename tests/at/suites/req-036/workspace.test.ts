import { expect } from "vitest";
import { eventually } from "../../harness/screen.ts";
import { PRD_GIVEN } from "../../../../design/astra/src/prd-givens.ts";
import { scopeKey } from "../../../../src/lib/prd-stream.ts";
import { atTest } from "./_bind.ts";
import {
  closeFlow,
  closePassedFlow,
  confirmReadyTopics,
  ngoCannotClose,
  sideChatFlow,
  topicFlow,
  topicReadOnly,
  useAnswerFlow,
  useAnswerPlain,
} from "./_flows.ts";
import {
  AI_COLOR,
  AI_NAME,
  BAND_GREEN,
  BAND_RED,
  BAND_YELLOW,
  CLOSED_AT_18,
  DAYS,
  DECISION_CHANGE,
  DEV_COLOR,
  DEV_NAME,
  DISCOVERY_SOURCE,
  FIX_SHIFTS,
  FIX_USERS,
  FUNDS_LINE,
  FUNDS_OUT,
  GAP_SHIFTS,
  GAP_USERS,
  MAYA_BLOCKER,
  NGO_COLOR,
  NGO_OPENS_DESIGN,
  NGO_READS,
  ONLY_PRIYA_CLOSES,
  OPENING,
  OPEN_QUESTION,
  POST_TO_MAYA,
  PRIYA_ASKS,
  PUBLISH_QUESTION,
  PUBLISH_WHY,
  READY_BLOCKER,
  RETENTION_QUESTION,
  REVIEW_BLOCKER,
  SHIFT_BLOCKER,
  SHIFTS_OPENER,
  STATES,
  SUCCESS_QUESTION,
  SUGGESTED_HEADING,
  SWAP_QUESTION,
  SWAP_WHY,
  THRESHOLD,
  TOPIC,
  TOPICS,
  UNPOSTED_BLOCKER,
} from "./_phrases.ts";
import { prdScreens, wiringPending, type PrdPage } from "./_screen.ts";
import {
  actionsOf,
  chatText,
  deliver,
  DEV,
  loadPrdWorld,
  NGO,
  occurrences,
  QUESTION_ID,
  requestId,
  snapshot,
  TOPIC_ID,
} from "./_world.ts";

const withPrd = prdScreens();

async function showChat(prd: PrdPage): Promise<void> {
  await prd.phone.tab("chat");
  if ((await prd.topics.listVisible()) && (await prd.topic.pageCount()) === 0) {
    await prd.topics.openMain();
  }
}

atTest(
  "AT-036.01",
  "Kickoff shows the Discovery topics once, and entry again does not duplicate them",
  { surface: "ui", timeoutMs: { loop: 60_000 } },
  {
    loop: async (ctx) => {
      await withPrd(ctx, { scenario: "first-entry", viewport: "desktop" }, async (prd) => {
        const chat = await prd.chat.text();
        expect(chat, "the opening names the approved Discovery revision").toContain(OPENING);
        expect(await prd.chat.turnCount(OPENING), "the opening is one message").toBe(1);
        expect(await prd.topics.count(), "six required topics are on the board").toBe(
          TOPICS.length,
        );
        for (const title of TOPICS) {
          expect(await prd.topics.listText(), `${title} is on the board`).toContain(title);
          const state = await prd.topics.state(title);
          expect(["Open", "Draft"], `${title} starts open or draft`).toContain(state);
        }
        await prd.topics.open(TOPIC.users);
        expect(await prd.topic.sectionText(), "a topic cites Discovery revision 12").toContain(
          DISCOVERY_SOURCE,
        );
        await prd.phone.tab("questions");
        expect(await prd.questions.text(), "nothing has been posted to Maya").not.toContain(
          RETENTION_QUESTION,
        );
        await prd.reload();
        await showChat(prd);
        expect(await prd.chat.turnCount(OPENING), "entry again does not repeat the opening").toBe(
          1,
        );
        expect(await prd.topics.count(), "entry again does not repeat the topics").toBe(
          TOPICS.length,
        );
      });
    },
    default: wiringPending("AT-036.01"),
  },
);

atTest(
  "AT-036.02",
  "Drafts, history, and chats survive reload, with no turn to restore",
  { surface: "ui", timeoutMs: { loop: 90_000 } },
  {
    loop: async (ctx) => {
      await withPrd(ctx, { scenario: "prd-today", viewport: "desktop" }, async (prd) => {
        const chat = await prd.chat.text();
        for (const day of DAYS) expect(chat, "the history keeps its days").toContain(day);
        expect(chat, "Dev's messages keep Dev's name").toContain(DEV_NAME);
        expect(chat, "the AI's messages keep the AI's name").toContain(AI_NAME);
        expect(await prd.panel.revision(), "the revision is on screen").toBeGreaterThan(0);
        expect(chat.toLowerCase(), "there is no turn owner").not.toContain("turn owner");
        await prd.topics.open(TOPIC.users);
        expect(await prd.topic.sectionText(), "a topic shows its Discovery source").toContain(
          DISCOVERY_SOURCE,
        );
        await prd.topics.open(TOPIC.shifts);
        expect(await prd.topic.chatText(), "the topic chat is already there").toContain(
          SHIFTS_OPENER,
        );
        await prd.phone.tab("questions");
        await prd.questions.open(RETENTION_QUESTION);
        expect(await prd.side.text(), "the side chat keeps Priya's question").toContain(PRIYA_ASKS);
        await prd.side.back();
        await showChat(prd);
        await prd.composer.write("Priya main draft for later");
        await prd.composer.blur();
        await prd.reload();
        await showChat(prd);
        expect(await prd.composer.value(), "the main draft survives reload").toBe(
          "Priya main draft for later",
        );
        expect(await prd.chat.text(), "the history survives reload").toContain(DAYS[0]);
        await prd.topics.open(TOPIC.shifts);
        await prd.topic.write("Priya topic draft for later");
        await prd.topic.blur();
        await prd.reload();
        await prd.topics.open(TOPIC.shifts);
        expect(await prd.topic.value(), "the topic draft survives reload").toBe(
          "Priya topic draft for later",
        );
      });
      await withPrd(
        ctx,
        { scenario: "prd-today", viewer: "ngo", viewport: "desktop" },
        async (prd) => {
          await prd.phone.tab("questions");
          await prd.questions.open(RETENTION_QUESTION);
          await prd.side.write("Maya side draft for later");
          await prd.side.blur();
          await prd.reload();
          await prd.phone.tab("questions");
          await prd.questions.open(RETENTION_QUESTION);
          expect(await prd.side.value(), "Maya's draft survives reload").toBe(
            "Maya side draft for later",
          );
        },
      );
    },
    default: wiringPending("AT-036.02"),
  },
);

atTest(
  "AT-036.03",
  "Ready questions show together, and a suggested NGO question stays unposted until Dev posts it",
  { surface: "ui", timeoutMs: { loop: 60_000 } },
  {
    loop: async (ctx) => {
      await withPrd(ctx, { scenario: "prd-today", viewport: "desktop" }, async (prd) => {
        await prd.topics.open(TOPIC.shifts);
        const chat = await prd.topic.chatText();
        expect(await prd.topic.questionCount(SWAP_QUESTION), "the swap question is asked").toBe(1);
        expect(
          await prd.topic.questionCount(PUBLISH_QUESTION),
          "the publish question is asked with it",
        ).toBe(1);
        expect(chat, "the swap question says why").toContain(SWAP_WHY);
        expect(chat, "the publish question says why").toContain(PUBLISH_WHY);
        expect(await prd.topic.suggestedCount(SWAP_QUESTION), "one swap option is suggested").toBe(
          1,
        );
        expect(
          await prd.topic.suggestedCount(PUBLISH_QUESTION),
          "one publish option is suggested",
        ).toBe(1);
        expect(await prd.topic.text(), "the swap is still an open question").toContain(
          OPEN_QUESTION,
        );
        const before = await prd.modelCalls();
        await prd.topics.open(TOPIC.scope);
        expect(await prd.modelCalls(), "opening a blocked topic spends nothing").toEqual(before);
        await showChat(prd);
        expect(await prd.chat.text(), "the success question is suggested and not posted").toContain(
          SUGGESTED_HEADING,
        );
        expect(await prd.questions.postCount(), "Dev can post the suggestion").toBeGreaterThan(0);
        expect(await prd.questions.text(), "Maya's list does not have it yet").not.toContain(
          SUCCESS_QUESTION,
        );
        await prd.questions.post(SUCCESS_QUESTION);
        await prd.viewAs("ngo");
        await prd.phone.tab("questions");
        expect(await prd.questions.text(), "posting puts the question in Maya's list").toContain(
          SUCCESS_QUESTION,
        );
        expect(await prd.questions.postCount(), "Maya is not offered Post to Maya").toBe(0);
        expect(await prd.buttonCount(POST_TO_MAYA), "Maya has no post button").toBe(0);
      });
    },
    default: wiringPending("AT-036.03"),
  },
);

atTest(
  "AT-036.04",
  "The completion check names each gap and its topic, and a failing score stays on screen",
  { surface: "ui", timeoutMs: { loop: 180_000 } },
  {
    loop: async (ctx) => {
      await withPrd(ctx, { scenario: "all-ready", viewport: "desktop" }, async (prd) => {
        await confirmReadyTopics(prd);
        await eventually(
          "the last confirmation runs the check",
          () => prd.chat.gapCount(),
          (count) => count === 2,
          20_000,
        );
        const chat = await prd.chat.text();
        expect(chat, "the holiday gap names Shift scheduling rules").toContain(GAP_SHIFTS);
        expect(chat, "the age gap names Users and roles").toContain(GAP_USERS);
        expect(chat, "the failing score shows the configured threshold").toContain(THRESHOLD);
        expect(chat, "a failing score stays a failure").toContain("does not pass");
        expect(await prd.topics.state(TOPIC.shifts), "the holiday gap reopens its topic").toBe(
          "Needs review",
        );
        expect(await prd.topics.state(TOPIC.users), "the age gap reopens its topic").toBe(
          "Needs review",
        );
        await prd.topics.open(TOPIC.shifts);
        expect(await prd.topic.confirmCount(), "a gapped topic cannot be confirmed yet").toBe(0);
        await prd.topics.open(TOPIC.users);
        expect(
          await prd.topic.confirmCount(),
          "the other gapped topic cannot be confirmed yet",
        ).toBe(0);
        expect(await prd.panel.closeCount(), "a failing score does not hide Close PRD").toBe(1);
        const beforeClose = await prd.modelCalls();
        expect(beforeClose, "the confirmation asked for the check").toContain("prd-check");
        await prd.panel.close();
        await showChat(prd);
        await eventually(
          "Close PRD asks for the check again",
          async () => (await prd.modelCalls()).filter((kind) => kind === "prd-check").length,
          (checks) => checks > beforeClose.filter((kind) => kind === "prd-check").length,
          15_000,
        );
        await eventually(
          "the warning offers a choice",
          () => prd.chat.warningCount(),
          (count) => count > 0,
          15_000,
        );
        expect(await prd.chat.gapCount(), "each check keeps its own gaps in the history").toBe(4);
        await prd.chat.keepWorking();
        expect(await prd.banner.count(), "Keep working leaves the PRD open").toBe(0);
        await prd.chat.openGap(TOPIC.shifts);
        await prd.topic.write(FIX_SHIFTS);
        await prd.topic.send();
        await eventually(
          "the holiday fix brings Confirm back",
          () => prd.topic.confirmCount(),
          (count) => count === 1,
          15_000,
        );
        await prd.topic.confirm();
        await showChat(prd);
        await prd.chat.openGap(TOPIC.users);
        await prd.topic.write(FIX_USERS);
        await prd.topic.send();
        await eventually(
          "the age fix brings Confirm back",
          () => prd.topic.confirmCount(),
          (count) => count === 1,
          15_000,
        );
        await prd.topic.confirm();
        await showChat(prd);
        await eventually(
          "the check passes at 91 percent",
          () => prd.chat.text(),
          (text) => text.includes("91%") && text.includes("passes") && text.includes(THRESHOLD),
          20_000,
        );
      });
    },
    default: wiringPending("AT-036.04"),
  },
);

atTest(
  "AT-036.05",
  "The chat shows no receipt and no effort control, and one request is charged once",
  { surface: "ui", timeoutMs: { loop: 90_000 } },
  {
    loop: async (ctx) => {
      await withPrd(ctx, { scenario: "queue", viewport: "desktop" }, async (prd) => {
        expect(await prd.gauge.text(), "the sample balance is shown in full").toContain(FUNDS_LINE);
        expect(await prd.buttonCount("Effort"), "the composer has no effort control").toBe(0);
        const before = await prd.modelCalls();
        await prd.composer.write("Show the pending hold.");
        await prd.composer.send();
        await prd.chat.waitAnswering();
        expect(await prd.gauge.pendingText(), "a reply shows its pending hold").toMatch(/\$/);
        await prd.chat.waitIdle(20_000);
        expect(
          await prd.gauge.pendingCount(),
          "the hold leaves the gauge when the reply finishes",
        ).toBe(0);
        const chat = await prd.chat.text();
        expect(chat, "the chat has no platform fee").not.toContain("Platform fee");
        expect(chat, "the chat has no receipt").not.toContain("Receipt");
        expect((await prd.modelCalls()).length - before.length, "the reply is one paid call").toBe(
          1,
        );
      });
      const world = await loadPrdWorld("prd-today");
      try {
        const port = world.port(DEV);
        const before = await snapshot(port);
        const calls = world.calls().length;
        const text = "Charge this reply once.";
        const scope = { kind: "main" as const };
        const id = requestId("once");
        const first = await deliver(port, scope, { kind: "text", text }, before.revision, id);
        expect(first.ok, JSON.stringify(first)).toBe(true);
        await deliver(port, scope, { kind: "text", text }, before.revision, id);
        const after = await snapshot(port);
        expect(occurrences(chatText(after, scope), text), "the same request is one turn").toBe(1);
        expect(world.calls().length - calls, "the same request is one probe call").toBe(1);
      } finally {
        world.release();
      }
    },
    default: wiringPending("AT-036.05"),
  },
);

atTest(
  "AT-036.06",
  "Close freezes the revision and opens UI Design as read-only",
  { surface: "ui", timeoutMs: { loop: 60_000 } },
  {
    loop: async (ctx) => {
      await withPrd(ctx, { scenario: "closed", viewport: "desktop" }, async (prd) => {
        const revision = await prd.panel.revision();
        expect(revision, "the closed sample is revision 18").toBe(18);
        const banner = await prd.banner.text();
        expect(banner, "the banner freezes revision 18 and its two open points").toContain(
          CLOSED_AT_18,
        );
        expect(banner, "the banner uses the revision on the panel").toContain(
          `revision ${revision}`,
        );
        expect(await prd.composer.count(), "Dev has no composer").toBe(0);
        await prd.topics.open(TOPIC.users);
        expect(await prd.topic.composerCount(), "the topic chat is read-only").toBe(0);
        await prd.phone.tab("questions");
        expect(await prd.questions.actionCount(), "question actions are gone").toBe(0);
        expect(await prd.banner.openDesignCount(), "Dev can open UI Design").toBe(1);
        await prd.banner.openDesign();
        expect(await prd.banner.noteText(), "UI Design receives this revision").toContain(
          String(revision),
        );
      });
      await withPrd(
        ctx,
        { scenario: "closed", viewer: "ngo", viewport: "desktop" },
        async (prd) => {
          expect(await prd.banner.text(), "Maya sees the next step").toContain(NGO_OPENS_DESIGN);
          expect(await prd.banner.openDesignCount(), "Maya does not open UI Design").toBe(0);
          expect(await prd.composer.count(), "Maya has no composer").toBe(0);
          expect(await prd.banner.readOnlyText(), "Maya is told the PRD is Priya's").toContain(
            NGO_READS,
          );
        },
      );
    },
    default: wiringPending("AT-036.06"),
  },
);

atTest(
  "AT-036.07",
  "The gauge shows funds and the exact color boundaries, and reading spends nothing",
  { surface: "ui", timeoutMs: { loop: 180_000 } },
  {
    loop: async (ctx) => {
      const bands = [
        ["funds-79999", BAND_GREEN],
        ["funds-80", BAND_YELLOW],
        ["funds-95", BAND_YELLOW],
        ["funds-95001", BAND_RED],
      ] as const;
      for (const [scenario, color] of bands) {
        await withPrd(ctx, { scenario, viewport: "desktop", colorScheme: "light" }, async (prd) => {
          expect(await prd.gauge.availableColor(), scenario).toBe(color);
          expect(await prd.gauge.availableText(), `${scenario} shows an unrounded amount`).toMatch(
            /^\$\d/,
          );
        });
      }
      await withPrd(ctx, { scenario: "funds-95001", viewport: "desktop" }, async (prd) => {
        await prd.composer.write("A funded red reply.");
        expect(await prd.composer.enabled(), "red alone still allows a funded reply").toBe(true);
        const before = await prd.modelCalls();
        await prd.composer.send();
        await eventually(
          "the funded red reply is sent",
          () => prd.modelCalls(),
          (calls) => calls.length > before.length,
          15_000,
        );
      });
      await withPrd(ctx, { scenario: "funds-out", viewport: "desktop" }, async (prd) => {
        await prd.composer.write("This reply cannot be funded.");
        expect(await prd.composer.enabled(), "Send is off when the hold does not fit").toBe(false);
        expect(await prd.gauge.outText(), "the gauge says the kitchen adds funds").toBe(FUNDS_OUT);
      });
      await withPrd(ctx, { scenario: "prd-today", viewport: "desktop" }, async (prd) => {
        const before = await prd.modelCalls();
        await prd.composer.write("First extra reply.");
        await prd.composer.send();
        await eventually(
          "the first extra reply is in the chat",
          () => prd.chat.text(),
          (text) => text.includes("First extra reply."),
          15_000,
        );
        await prd.composer.write("Second extra reply.");
        await prd.composer.send();
        await eventually(
          "a long history does not cap the next reply",
          () => prd.chat.text(),
          (text) => text.includes("Second extra reply."),
          15_000,
        );
        expect((await prd.modelCalls()).length - before.length, "both replies are paid").toBe(2);
      });
      await withPrd(ctx, { scenario: "prd-today", viewport: "desktop" }, async (prd) => {
        const before = await prd.modelCalls();
        await prd.topics.open(TOPIC.users);
        await prd.topics.open(TOPIC.shifts);
        await prd.topics.openMain();
        await prd.phone.tab("questions");
        await prd.questions.open(RETENTION_QUESTION);
        await prd.side.back();
        await showChat(prd);
        expect(await prd.chat.sourceLinkCount(), "the history has a section link").toBeGreaterThan(
          0,
        );
        await prd.chat.openSource();
        await prd.topic.write("typed but not sent");
        expect(await prd.modelCalls(), "reading and navigation spend nothing").toEqual(before);
      });
      await withPrd(ctx, { scenario: "answer-complete", viewport: "desktop" }, async (prd) => {
        const before = await prd.modelCalls();
        await prd.phone.tab("questions");
        await prd.questions.view(RETENTION_QUESTION);
        expect(await prd.modelCalls(), "opening an answer spends nothing").toEqual(before);
      });
      await withPrd(ctx, { scenario: "queue", viewport: "desktop" }, async (prd) => {
        await prd.composer.write("Hold the gauge.");
        await prd.composer.send();
        await prd.chat.waitAnswering();
        expect(
          await prd.gauge.pendingCount(),
          "pending is on the gauge during a reply",
        ).toBeGreaterThan(0);
        const pending = await prd.gauge.pendingText();
        expect(pending, "pending is text, not only a bar").toMatch(/\$/);
        await prd.chat.waitIdle(20_000);
        expect(await prd.gauge.pendingCount(), "pending leaves when the reply finishes").toBe(0);
      });
    },
    default: wiringPending("AT-036.07"),
  },
);

atTest(
  "AT-036.08",
  "Topic states, confirmation, and a changed answer",
  { surface: "ui", timeoutMs: { loop: 120_000 } },
  {
    loop: async (ctx) => {
      await withPrd(ctx, { scenario: "prd-today", viewport: "desktop" }, async (prd) => {
        const list = await prd.topics.listText();
        for (const state of STATES) expect(list, `the board shows ${state}`).toContain(state);
        expect(list, "a ready topic says Priya can confirm").toContain(READY_BLOCKER);
        expect(list, "a reopened topic says Priya reviews again").toContain(REVIEW_BLOCKER);
        expect(list, "the shift questions are the blocker").toContain(SHIFT_BLOCKER);
        expect(list, "Maya's open answer is the blocker").toContain(MAYA_BLOCKER);
        expect(list, "an unposted question is the blocker").toContain(UNPOSTED_BLOCKER);
        expect((await prd.panel.progress()).total, "six required topics stay the denominator").toBe(
          6,
        );
        expect(await prd.buttonCount("Ready to confirm"), "only the AI sets Ready to confirm").toBe(
          0,
        );
        const ready = await prd.topics.titled("Ready to confirm");
        await prd.topics.open(ready);
        await prd.topic.confirm();
        expect(await prd.topics.state(ready), "Dev's confirmation marks the topic confirmed").toBe(
          "Confirmed",
        );
        const before = await prd.panel.progress();
        const confirmed = await prd.topics.titled("Confirmed");
        await prd.topics.open(confirmed);
        await prd.topic.reopen();
        expect(await prd.topic.state(), "reopen sets Needs review").toBe("Needs review");
        const after = await prd.panel.progress();
        expect(after.confirmed, "reopen lowers the confirmed count").toBe(before.confirmed - 1);
        expect(after.total, "reopen does not change the denominator").toBe(6);
      });
      await withPrd(ctx, { scenario: "check-passed", viewport: "desktop" }, async (prd) => {
        expect(await prd.panel.progress(), "every required topic starts confirmed").toEqual({
          confirmed: 6,
          total: 6,
        });
        expect(
          await prd.chat.recommendationCloseCount(),
          "the passing check offers Close PRD",
        ).toBe(1);
        await prd.topics.open(TOPIC.shifts);
        await prd.topic.write(DECISION_CHANGE);
        await prd.topic.send();
        await eventually(
          "the changed shift decision needs review",
          () => prd.topics.state(TOPIC.shifts),
          (state) => state === "Needs review",
          15_000,
        );
        expect(
          await prd.topics.state(TOPIC.scope),
          "technical scope follows the shift decision",
        ).toBe("Needs review");
        for (const title of [TOPIC.users, TOPIC.notify, TOPIC.data, TOPIC.success]) {
          expect(await prd.topics.state(title), `${title} stays confirmed`).toBe("Confirmed");
        }
        expect(await prd.panel.progress(), "four confirmations remain out of six").toEqual({
          confirmed: 4,
          total: 6,
        });
        await showChat(prd);
        expect(await prd.chat.recommendationCloseCount(), "the old inline close is gone").toBe(0);
        expect(await prd.panel.closeCount(), "Close PRD in the panel remains").toBe(1);
      });
    },
    default: wiringPending("AT-036.08"),
  },
);

atTest(
  "AT-036.09",
  "Only Dev writes the PRD, and the port refuses everyone else",
  { surface: "ui", timeoutMs: { loop: 90_000 } },
  {
    loop: async (ctx) => {
      await withPrd(
        ctx,
        { scenario: "prd-today", viewer: "ngo", viewport: "desktop" },
        async (prd) => {
          expect(await prd.composer.count(), "Maya has no main composer").toBe(0);
          expect(await prd.buttonCount(POST_TO_MAYA), "Maya cannot post a question").toBe(0);
          expect(await prd.buttonCount("Close PRD"), "Maya cannot close").toBe(0);
          expect(await prd.panel.text(), "Maya is told only Priya can close").toContain(
            ONLY_PRIYA_CLOSES,
          );
          await prd.topics.open(TOPIC.users);
          expect(await prd.topic.reopenCount(), "Maya cannot reopen").toBe(0);
          expect(await prd.topic.confirmCount(), "Maya cannot confirm").toBe(0);
          expect(await prd.topic.composerCount(), "Maya cannot write in a topic chat").toBe(0);
          await prd.phone.tab("questions");
          expect(
            await prd.questions.useCount(RETENTION_QUESTION),
            "Maya cannot use an answer",
          ).toBe(0);
          await prd.questions.open(RETENTION_QUESTION);
          expect(await prd.side.inputCount(), "Maya can write in the posted side chat").toBe(1);
          await prd.side.write("Maya can answer here.");
          expect(await prd.side.value(), "the side chat accepts Maya's draft").toBe(
            "Maya can answer here.",
          );
          const text = await prd.surfaceText();
          expect(text.toLowerCase(), "Maya's screen has no development board").not.toContain(
            "development board",
          );
          expect(text, "Maya's screen has no Linear").not.toContain("Linear");
        },
      );
      await withPrd(ctx, { scenario: "prd-today", viewport: "desktop" }, async (prd) => {
        expect(await prd.composer.count(), "Dev has the main composer").toBe(1);
        expect(await prd.questions.postCount(), "Dev can post to Maya").toBeGreaterThan(0);
      });
      const world = await loadPrdWorld("prd-today");
      try {
        const dev = world.port(DEV);
        const ngo = world.port(NGO);
        const devSnap = await snapshot(dev);
        const ngoSnap = await snapshot(ngo);
        const main = { kind: "main" as const };
        const retention = { kind: "side" as const, questionId: QUESTION_ID.retention };
        expect(devSnap.canWrite[scopeKey(main)], "Dev can write the main chat").toBe(true);
        expect(devSnap.canWrite[scopeKey(retention)], "Dev cannot write Maya's side chat").toBe(
          false,
        );
        expect(ngoSnap.canWrite[scopeKey(main)], "Maya cannot write the main chat").toBe(false);
        expect(ngoSnap.canWrite[scopeKey(retention)], "Maya can write the posted side chat").toBe(
          true,
        );
        const sequence = devSnap.sequence;
        const actions = actionsOf(devSnap);
        expect(actions.length, "Dev has actions to refuse").toBeGreaterThan(0);
        for (const action of actions) {
          const refused = await ngo.act(action);
          expect(refused.ok, action.kind).toBe(false);
          if (!refused.ok) expect(refused.refusal.kind, action.kind).toBe("forbidden");
        }
        expect((await snapshot(dev)).sequence, "a refusal changes nothing").toBe(sequence);
        if (devSnap.close.kind !== "open" || devSnap.close.close.kind !== "available") {
          throw new Error("Dev has no close action");
        }
        const close = devSnap.close.close.action;
        const suggested = devSnap.questions.find((question) => question.text === SUCCESS_QUESTION);
        if (!suggested || suggested.kind !== "suggested" || suggested.post.kind !== "available") {
          throw new Error("Dev cannot post the suggested success question");
        }
        await dev.saveDraft("main", "priya draft");
        await ngo.saveDraft("main", "maya draft");
        expect((await snapshot(dev)).drafts.main, "Dev's draft stays Dev's").toBe("priya draft");
        expect((await snapshot(ngo)).drafts.main, "Maya's draft stays Maya's").toBe("maya draft");
        const posted = await dev.act(suggested.post.action);
        expect(posted.ok, "the first post lands").toBe(true);
        await dev.act(suggested.post.action);
        const questions = (await snapshot(dev)).questions.filter(
          (question) => question.text === SUCCESS_QUESTION,
        );
        expect(questions, "a repeated post does not add a question").toHaveLength(1);
        expect(questions[0]?.kind, "the question is no longer only a suggestion").not.toBe(
          "suggested",
        );
        const devSide = await deliver(
          dev,
          retention,
          { kind: "text", text: "Priya cannot answer Maya." },
          devSnap.revision,
          requestId("dev-side"),
        );
        expect(devSide.ok, "Dev is refused in the side chat").toBe(false);
        if (!devSide.ok) expect(devSide.kind).toBe("forbidden");
        const mayaLine = "Maya writes a year in her chat.";
        const ngoSide = await deliver(
          ngo,
          retention,
          { kind: "text", text: mayaLine },
          (await snapshot(ngo)).revision,
          requestId("ngo-side"),
        );
        expect(ngoSide.ok, "Maya's side-chat message lands").toBe(true);
        const shared = await snapshot(dev);
        expect(chatText(shared, retention), "Dev sees Maya's side chat").toContain(mayaLine);
        expect(chatText(shared, main), "a side-chat line is not a main-chat message").not.toContain(
          mayaLine,
        );
        const base = await snapshot(dev);
        const priyaLine = "Priya writes the roster rule.";
        const logoLine = "Maya writes the logo choice.";
        const logo = { kind: "side" as const, questionId: QUESTION_ID.logo };
        const [left, right] = await Promise.all([
          deliver(
            dev,
            main,
            { kind: "text", text: priyaLine },
            base.revision,
            requestId("sim-dev"),
          ),
          deliver(ngo, logo, { kind: "text", text: logoLine }, base.revision, requestId("sim-ngo")),
        ]);
        expect(left.ok, "Dev's simultaneous send lands").toBe(true);
        expect(right.ok, "Maya's simultaneous send lands").toBe(true);
        const both = await snapshot(dev);
        expect(occurrences(chatText(both, main), priyaLine), "Dev's line is stored once").toBe(1);
        expect(occurrences(chatText(both, logo), logoLine), "Maya's line is stored once").toBe(1);
        expect(chatText(both, main), "Maya's line stays in her chat").not.toContain(logoLine);
        const bump = await deliver(
          dev,
          { kind: "topic", topicId: TOPIC_ID.shifts },
          { kind: "text", text: DECISION_CHANGE },
          (await snapshot(dev)).revision,
          requestId("bump"),
        );
        expect(bump.ok, "the shift change lands").toBe(true);
        expect(
          (await snapshot(dev)).revision,
          "the shift change moves the revision",
        ).toBeGreaterThan(devSnap.revision);
        const stale = await dev.act(close);
        expect(stale.ok, "the old close token is refused").toBe(false);
        if (!stale.ok) expect(stale.refusal.kind, "the refusal is stale").toBe("stale");
        expect((await snapshot(dev)).close.kind, "the stale close does not close the PRD").toBe(
          "open",
        );
      } finally {
        world.release();
      }
    },
    default: wiringPending("AT-036.09"),
  },
);

atTest(
  "AT-036.10",
  "Actors, history, and controls stay readable on a narrow screen and in the dark",
  { surface: "ui", timeoutMs: { loop: 120_000 } },
  {
    loop: async (ctx) => {
      let lightBackground = "";
      await withPrd(
        ctx,
        { scenario: "prd-today", viewport: "desktop", colorScheme: "light" },
        async (prd) => {
          const chat = await prd.chat.text();
          for (const day of DAYS) expect(chat, "the long history keeps its days").toContain(day);
          expect(await prd.nameColor(DEV_NAME), "Dev's name stays blue").toBe(DEV_COLOR);
          expect(await prd.nameColor(AI_NAME), "the AI's name stays purple").toBe(AI_COLOR);
          expect(await prd.participantBackground("Maya Levi"), "Maya's chip stays amber").toBe(
            NGO_COLOR,
          );
          await prd.topics.open(TOPIC.users);
          expect(await prd.topic.sectionText(), "the topic shows its source").toContain(
            DISCOVERY_SOURCE,
          );
          for (const name of ["Bookmark", "Hand over", "Handover", "Effort"]) {
            expect(await prd.buttonCount(name), `there is no ${name} control`).toBe(0);
          }
          expect(chat.toLowerCase(), "there is no turn owner").not.toContain("turn owner");
          expect(await prd.panel.closeCount(), "Close PRD is in the panel").toBe(1);
          await showChat(prd);
          await prd.composer.focus();
          await prd.composer.blur();
          expect(await prd.composer.sendFocused(), "Tab from the composer reaches Send").toBe(true);
          lightBackground = await prd.chat.background();
        },
      );
      await withPrd(ctx, { scenario: "check-passed", viewport: "desktop" }, async (prd) => {
        expect(await prd.chat.recommendationCloseCount(), "Close PRD is also inline").toBe(1);
        expect(await prd.panel.closeCount(), "the panel close remains").toBe(1);
      });
      await withPrd(ctx, { scenario: "prd-today", viewport: "narrow" }, async (prd) => {
        await prd.inside(prd.composer.input(), "the composer");
        await prd.inside(prd.composer.sendButton(), "Send");
      });
      await withPrd(
        ctx,
        { scenario: "prd-today", viewport: "desktop", colorScheme: "dark" },
        async (prd) => {
          const background = await prd.chat.background();
          expect(background, "dark uses a different chat background").not.toBe(lightBackground);
          expect(
            await prd.chat.color(),
            "the chat text stays distinct from its background",
          ).not.toBe(background);
          expect(await prd.chat.text(), "Dev's name is still readable").toContain(DEV_NAME);
        },
      );
      await withPrd(
        ctx,
        { scenario: "prd-today", viewer: "ngo", viewport: "desktop" },
        async (prd) => {
          const text = await prd.surfaceText();
          expect(text.toLowerCase(), "Maya's projection has no development board").not.toContain(
            "development board",
          );
          expect(text, "Maya's projection has no Linear").not.toContain("Linear");
        },
      );
    },
    default: wiringPending("AT-036.10"),
  },
);

atTest(
  "AT-036.13",
  "The NGO answers in a side chat, and the AI writes one answer",
  { surface: "ui", timeoutMs: { loop: 120_000 } },
  {
    loop: async (ctx) => {
      await withPrd(
        ctx,
        { scenario: "prd-today", viewer: "ngo", viewport: "desktop" },
        sideChatFlow,
      );
    },
    default: wiringPending("AT-036.13"),
  },
);

atTest(
  "AT-036.14",
  "Dev can view an answer, edit it, and use it in the PRD",
  { surface: "ui", timeoutMs: { loop: 120_000 } },
  {
    loop: async (ctx) => {
      await withPrd(ctx, { scenario: "answer-complete", viewport: "desktop" }, useAnswerFlow);
      await withPrd(ctx, { scenario: "answer-complete", viewport: "desktop" }, useAnswerPlain);
    },
    default: wiringPending("AT-036.14"),
  },
);

atTest(
  "AT-036.15",
  "A topic is its current document plus its own chat",
  { surface: "ui", timeoutMs: { loop: 90_000 } },
  {
    loop: async (ctx) => {
      await withPrd(ctx, { scenario: "prd-today", viewport: "desktop" }, topicFlow);
      await withPrd(
        ctx,
        { scenario: "prd-today", viewer: "ngo", viewport: "desktop" },
        topicReadOnly,
      );
    },
    default: wiringPending("AT-036.15"),
  },
);

atTest(
  "AT-036.16",
  "Dev can close the PRD at any time, and gaps warn without blocking",
  { surface: "ui", timeoutMs: { loop: 180_000 } },
  {
    loop: async (ctx) => {
      await withPrd(ctx, { scenario: "prd-today", viewport: "desktop" }, closeFlow);
      await withPrd(ctx, { scenario: "check-passed", viewport: "desktop" }, closePassedFlow);
      await withPrd(
        ctx,
        { scenario: "prd-today", viewer: "ngo", viewport: "desktop" },
        ngoCannotClose,
      );
    },
    default: wiringPending("AT-036.16"),
  },
);

atTest(
  "AT-036.17",
  "Messages sent while the AI answers wait in a queue and stay editable",
  { surface: "ui", timeoutMs: { loop: 90_000 } },
  {
    loop: async (ctx) => {
      await withPrd(ctx, { scenario: "queue", viewer: "dev", viewport: "desktop" }, async (prd) => {
        const before = await prd.modelCalls();
        await prd.composer.write("What does each reply cost?");
        await prd.composer.send();
        await prd.chat.waitAnswering();
        expect(await prd.composer.sendLabel()).toBe("Add to queue");
        for (const text of ["First queued", "Second queued", "Third queued"]) {
          await prd.composer.write(text);
          await prd.composer.send();
        }
        expect(await prd.queue.texts()).toEqual(["First queued", "Second queued", "Third queued"]);
        expect(
          (await prd.modelCalls()).length - before.length,
          "the queue is read while the first reply still runs",
        ).toBe(1);
        await prd.composer.write("A draft in progress");
        expect(await prd.queue.editCount("Second queued"), "Edit waits for an empty composer").toBe(
          0,
        );
        await prd.composer.write("");
        await prd.queue.edit("Second queued");
        expect(await prd.composer.value()).toBe("Second queued");
        await prd.queue.remove("Third queued");
        expect(await prd.queue.texts()).toEqual(["First queued"]);
        await prd.chat.waitIdle(20_000);
        expect((await prd.chat.devTexts()).slice(-2)).toEqual([
          "What does each reply cost?",
          "First queued",
        ]);
        expect((await prd.modelCalls()).length - before.length).toBe(2);
      });
      await withPrd(ctx, { scenario: "queue", viewer: "dev", viewport: "desktop" }, async (prd) => {
        const before = await prd.modelCalls();
        await prd.composer.write("Answer this one.");
        await prd.composer.send();
        await prd.chat.waitAnswering();
        await prd.composer.write("Queued, then left behind.");
        await prd.composer.send();
        expect(await prd.queue.texts()).toEqual(["Queued, then left behind."]);
        await prd.viewAs("ngo");
        await prd.hold(PRD_GIVEN.queue.replyMs.test + 2_000);
        expect(
          (await prd.modelCalls()).length - before.length,
          "a queued message does not send after its screen is gone",
        ).toBe(1);
      });
    },
    default: wiringPending("AT-036.17"),
  },
);

atTest(
  "AT-036.18",
  "The phone workspace has three tabs and the same question, topic, and close flows",
  { surface: "ui", timeoutMs: { loop: 180_000 } },
  {
    loop: async (ctx) => {
      await withPrd(
        ctx,
        { scenario: "prd-today", viewer: "dev", viewport: "phone" },
        async (prd) => {
          expect(await prd.phone.current(), "Dev opens on Chat").toBe("chat");
          await prd.phone.labelsOneLine();
          await prd.phone.targets();
          await prd.phone.tab("prd");
          await prd.topics.open(TOPIC.shifts);
          await prd.phone.sectionGeometry();
          await prd.topic.expectBackTarget();
          await prd.topic.expectSendTarget();
          await prd.topic.back();
          expect(await prd.topics.listVisible(), "back returns to the topic list").toBe(true);
          expect(await prd.topic.pageCount(), "the topic page closes").toBe(0);
        },
      );
      await withPrd(
        ctx,
        { scenario: "prd-today", viewer: "ngo", viewport: "phone" },
        async (prd) => {
          expect(await prd.phone.current(), "Maya opens on Questions").toBe("questions");
          const badge = await prd.phone.badge();
          expect(badge, "the questions tab shows how many are waiting").toMatch(/^\d+$/);
          expect(Number(badge), "Maya has questions waiting").toBeGreaterThan(0);
          await prd.phone.labelsOneLine();
        },
      );
      await withPrd(ctx, { scenario: "prd-today", viewer: "ngo", viewport: "phone" }, sideChatFlow);
      await withPrd(ctx, { scenario: "answer-complete", viewport: "phone" }, useAnswerFlow);
      await withPrd(ctx, { scenario: "answer-complete", viewport: "phone" }, useAnswerPlain);
      await withPrd(ctx, { scenario: "prd-today", viewport: "phone" }, topicFlow);
      await withPrd(
        ctx,
        { scenario: "prd-today", viewer: "ngo", viewport: "phone" },
        topicReadOnly,
      );
      await withPrd(ctx, { scenario: "prd-today", viewport: "phone" }, closeFlow);
      await withPrd(ctx, { scenario: "check-passed", viewport: "phone" }, closePassedFlow);
      await withPrd(
        ctx,
        { scenario: "prd-today", viewer: "ngo", viewport: "phone" },
        ngoCannotClose,
      );
    },
    default: wiringPending("AT-036.18"),
  },
);
