import { expect } from "vitest";
import type { AtContext } from "../../harness/registry.ts";
import { AtPending, TIER } from "../../harness/registry.ts";
import {
  eventually,
  shellUrl,
  useScreenDriver,
  VIEWPORT_SIZE,
  type LocatorStep,
  type ScreenPage,
  type Viewport,
} from "../../harness/screen.ts";
import { MODEL_CALL_PROBE } from "../../../../design/astra/src/givens.ts";
import { testIds } from "../../../../src/components/prd-workspace/testids.ts";
import { DEV_NAME, NGO_NAME } from "./_phrases.ts";

export type PrdScenario =
  | "first-entry"
  | "prd-today"
  | "answer-complete"
  | "all-ready"
  | "check-passed"
  | "closed"
  | "queue"
  | "funds-out"
  | "funds-79999"
  | "funds-80"
  | "funds-95"
  | "funds-95001";

export type PrdViewer = "dev" | "ngo";

export type PrdGiven = {
  scenario: PrdScenario;
  viewer?: PrdViewer;
  viewport: Viewport;
  colorScheme?: "light" | "dark";
  pace?: "test" | "demo";
};

type PrdCtx = AtContext<"req-036", "scope", "loop">;
type Box = { x: number; y: number; width: number; height: number };
type PhoneTab = "chat" | "prd" | "questions";

const TOUCH = 44;

function byId(testId: string, text?: string, position?: LocatorStep["position"]): LocatorStep {
  return {
    testId,
    ...(text === undefined ? {} : { text }),
    ...(position === undefined ? {} : { position }),
  };
}

function rgb(value: string): string {
  const match = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/.exec(value);
  if (!match) return value.trim();
  return `rgb(${match[1]}, ${match[2]}, ${match[3]})`;
}

function messageBody(raw: string, actor: string): string {
  const lines = raw
    .split(/\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  if (lines[0] === actor) lines.shift();
  return lines.join("\n");
}

function queueText(raw: string): string {
  return raw
    .split(/\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && line !== "Edit" && line !== "Remove")
    .join("\n");
}

async function controlOff(page: ScreenPage, chain: LocatorStep[]): Promise<boolean> {
  const disabled = await page.attribute(chain, "disabled");
  const aria = await page.attribute(chain, "aria-disabled");
  return disabled !== null || aria === "true";
}

export function wiringPending(atId: string): () => Promise<void> {
  return async () => {
    throw new AtPending(
      atId,
      "sut-missing",
      "The PRD workspace route and edge functions ship at screen wiring.",
    );
  };
}

export class PrdPage {
  constructor(
    private readonly page: ScreenPage,
    readonly viewport: Viewport,
  ) {}

  get width(): number {
    return VIEWPORT_SIZE[this.viewport].width;
  }

  get height(): number {
    return VIEWPORT_SIZE[this.viewport].height;
  }

  modelCalls(): Promise<readonly string[]> {
    return this.page.modelCalls();
  }

  async reload(): Promise<void> {
    await this.page.reload();
    await this.ready();
  }

  async hold(ms = 500): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  async viewAs(viewer: PrdViewer): Promise<void> {
    const name = viewer === "dev" ? DEV_NAME : NGO_NAME;
    const button: LocatorStep[] = [
      byId(testIds.prototypeViewerSwitch),
      { role: "button", name, exact: false },
    ];
    await this.page.click(button);
    await eventually(
      `${name} is the viewer`,
      () => this.page.attribute(button, "aria-pressed"),
      (value) => value === "true",
    );
    await this.ready();
  }

  async ready(): Promise<void> {
    await eventually(
      "the PRD workspace is on screen",
      async () => {
        const chat = await this.page.count([byId(testIds.prdChat)]);
        const tabs = await this.page.count([byId(testIds.phoneTabBar)]);
        const topics = await this.page.count([byId(testIds.prdTopicList)]);
        const questions = await this.page.count([byId(testIds.prdNgoQuestions)]);
        return chat + tabs + topics + questions;
      },
      (shown) => shown > 0,
      10_000,
    );
  }

  async buttonCount(name: string): Promise<number> {
    return this.page.count([{ role: "button", name, exact: true }]);
  }

  async surfaceText(): Promise<string> {
    const regions = [
      testIds.prdChat,
      testIds.prdTopicList,
      testIds.prdNgoQuestions,
      testIds.prdClosePanel,
      testIds.prdSection,
      testIds.prdClosedBanner,
      testIds.prdReadonlyBanner,
    ];
    const parts: string[] = [];
    for (const testId of regions) {
      if ((await this.page.count([byId(testId)])) === 0) continue;
      parts.push(await this.page.text([byId(testId)]));
    }
    return parts.join("\n");
  }

  async nameColor(actor: string): Promise<string> {
    const chain = [
      byId(testIds.prdTurn, actor, "last"),
      { text: actor, exact: true, position: "last" as const },
    ];
    return rgb(await this.page.style(chain, "color"));
  }

  async participantBackground(name: string): Promise<string> {
    const count = await this.page.count([byId(testIds.prdParticipant)]);
    for (let index = 0; index < count; index += 1) {
      const chain = [byId(testIds.prdParticipant, undefined, index)];
      const label = (await this.page.attribute(chain, "aria-label")) ?? "";
      if (!label.includes(name)) continue;
      return rgb(await this.page.style(chain, "background-color"));
    }
    throw new Error(`no participant named ${name}`);
  }

  async inside(chain: LocatorStep[], what: string): Promise<void> {
    await this.page.scrollIntoView(chain);
    const box = await this.boxOf(chain, what);
    expect(box.width, `${what} has a size`).toBeGreaterThan(0);
    expect(box.x, `${what} starts inside the screen`).toBeGreaterThanOrEqual(-1);
    expect(box.x + box.width, `${what} ends inside the screen`).toBeLessThanOrEqual(this.width + 1);
  }

  async expectTarget(chain: LocatorStep[], what: string): Promise<void> {
    if (this.viewport !== "phone") return;
    const box = await this.boxOf(chain, what);
    expect(box.height, `${what} is at least 44 pixels tall`).toBeGreaterThanOrEqual(TOUCH);
    expect(box.width, `${what} is at least 44 pixels wide`).toBeGreaterThanOrEqual(TOUCH);
  }

  private async topicItem(title: string): Promise<LocatorStep | null> {
    const count = await this.page.count([byId(testIds.prdTopicItem)]);
    for (let index = 0; index < count; index += 1) {
      const step = byId(testIds.prdTopicItem, undefined, index);
      const first = (await this.page.text([step])).split(/\n/)[0]?.trim();
      if (first === title) return step;
    }
    return null;
  }

  private async press(chain: LocatorStep[], what: string): Promise<void> {
    await this.expectTarget(chain, what);
    await this.page.click(chain);
  }

  private async boxOf(chain: LocatorStep[], what: string): Promise<Box> {
    const box = await eventually(
      what,
      () => this.page.box(chain),
      (value) => value !== null && value.width > 0 && value.height > 0,
    );
    if (box === null) throw new Error(`${what} has no box`);
    return box;
  }

  private async optionsFit(option: string, row: string, what: string): Promise<void> {
    const bound = await this.boxOf([byId(row)], what);
    const left = Math.max(0, bound.x);
    const right = Math.min(this.width, bound.x + bound.width);
    const count = await this.page.count([byId(option)]);
    expect(count, `${what} offer suggested options`).toBeGreaterThan(0);
    for (let index = 0; index < count; index += 1) {
      const label = `${what}, option ${index + 1}`;
      const box = await this.boxOf([byId(option, undefined, index)], label);
      expect(box.x, `${label} starts inside its row`).toBeGreaterThanOrEqual(left - 1);
      expect(box.x + box.width, `${label} ends inside its row`).toBeLessThanOrEqual(right + 1);
      expect(box.height, `${label} is at least 44 pixels tall`).toBeGreaterThanOrEqual(TOUCH);
      expect(box.width, `${label} is at least 44 pixels wide`).toBeGreaterThanOrEqual(TOUCH);
    }
  }

  private async oneLine(testId: string, label: string): Promise<void> {
    const chain = [byId(testId), { text: label, exact: true, position: "last" as const }];
    const box = await this.boxOf(chain, label);
    const lineHeight = await this.page.style(chain, "line-height");
    const parsed = Number.parseFloat(lineHeight);
    const fontSize = Number.parseFloat(await this.page.style(chain, "font-size"));
    const limit = Number.isFinite(parsed) && parsed > 0 ? parsed * 1.5 + 1 : fontSize * 1.5 + 1;
    expect(Number.isFinite(limit), `${label} has a line height`).toBe(true);
    expect(box.height, `${label} stays on one line`).toBeLessThanOrEqual(limit);
  }

  readonly panel = {
    text: (): Promise<string> => this.page.text([byId(testIds.prdClosePanel)]),
    revision: async (): Promise<number> => {
      const text = await this.page.text([byId(testIds.prdRevision)]);
      const match = /(\d+)/.exec(text);
      if (!match) throw new Error(`revision is missing a number: ${text}`);
      return Number(match[1]);
    },
    progress: async (): Promise<{ confirmed: number; total: number }> => {
      const text = await this.page.text([byId(testIds.prdTopicProgress)]);
      const match = /(\d+) of (\d+)/.exec(text);
      if (!match) throw new Error(`progress is missing a count: ${text}`);
      return { confirmed: Number(match[1]), total: Number(match[2]) };
    },
    remainingCount: (): Promise<number> => this.page.count([byId(testIds.prdCloseRemainingItem)]),
    remainingLinkCount: (text: string): Promise<number> =>
      this.page.count([byId(testIds.prdCloseRemainingItem, text), { role: "button" }]),
    openRemaining: (text: string): Promise<void> =>
      this.press([byId(testIds.prdCloseRemainingItem, text), { role: "button" }], text),
    closeCount: (): Promise<number> =>
      this.page.count([byId(testIds.prdClosePanel), byId(testIds.prdCloseButton)]),
    close: (): Promise<void> =>
      this.press([byId(testIds.prdClosePanel), byId(testIds.prdCloseButton)], "Close PRD"),
  };

  readonly topics = {
    count: (): Promise<number> => this.page.count([byId(testIds.prdTopicItem)]),
    listText: (): Promise<string> => this.page.text([byId(testIds.prdTopicList)]),
    listVisible: async (): Promise<boolean> =>
      (await this.page.count([byId(testIds.prdTopicList)])) > 0 &&
      (await this.page.visible([byId(testIds.prdTopicList)])),
    state: async (title: string): Promise<string> => {
      const item = await this.topicItem(title);
      if (item) return (await this.page.text([item, byId(testIds.prdTopicState)])).trim();
      return (await this.page.text([byId(testIds.prdSectionState)])).trim();
    },
    blocker: async (title: string): Promise<string> => {
      const item = await this.topicItem(title);
      if (!item) return "";
      const chain = [item, byId(testIds.prdTopicBlocker)];
      if ((await this.page.count(chain)) === 0) return "";
      return (await this.page.text(chain)).trim();
    },
    titled: async (state: string): Promise<string> => {
      const list = await this.page.text([byId(testIds.prdTopicList)]);
      const titles = [
        "Users and roles",
        "Shift scheduling rules",
        "Notifications",
        "Data handling",
        "Technical scope",
        "Success criteria",
      ];
      for (const title of titles) {
        if (!list.includes(title)) continue;
        if ((await this.topics.state(title)) === state) return title;
      }
      throw new Error(`no topic is ${state}`);
    },
    open: async (title: string): Promise<void> => {
      if (
        (await this.page.count([byId(testIds.prdTopicItem)])) === 0 &&
        (await this.page.count([byId(testIds.prdSectionBack)])) > 0
      ) {
        await this.press([byId(testIds.prdSectionBack)], "Back to PRD sections");
      }
      const item = await eventually(
        `${title} is in the topic list`,
        () => this.topicItem(title),
        (found) => found !== null,
      );
      if (!item) throw new Error(`no topic item titled ${title}`);
      await this.press([item], title);
    },
    openMain: (): Promise<void> => this.press([byId(testIds.prdMainChatItem)], "Main chat"),
  };

  readonly gauge = {
    text: (): Promise<string> => this.page.text([byId(testIds.prdUsdGauge)]),
    availableText: (): Promise<string> => this.page.text([byId(testIds.prdUsdAvailable)]),
    availableColor: async (): Promise<string> =>
      rgb(await this.page.style([byId(testIds.prdUsdAvailable)], "color")),
    pendingCount: (): Promise<number> => this.page.count([byId(testIds.prdUsdPending)]),
    pendingText: (): Promise<string> => this.page.text([byId(testIds.prdUsdPending)]),
    outText: (): Promise<string> => this.page.text([byId(testIds.prdUsdOut)]),
  };

  readonly chat = {
    text: (): Promise<string> => this.page.text([byId(testIds.prdChat)]),
    shown: async (): Promise<boolean> => (await this.page.count([byId(testIds.prdChat)])) > 0,
    background: async (): Promise<string> =>
      rgb(await this.page.style([byId(testIds.prdChat)], "background-color")),
    color: async (): Promise<string> =>
      rgb(await this.page.style([byId(testIds.prdChat)], "color")),
    turnCount: (text: string): Promise<number> => this.page.count([byId(testIds.prdTurn, text)]),
    dayCount: (): Promise<number> => this.page.count([byId(testIds.prdDayDivider)]),
    waitAnswering: (): Promise<unknown> =>
      eventually(
        "the AI is answering",
        () => this.page.visible([byId(testIds.prdAiAnswering)]),
        (visible) => visible,
        8_000,
      ),
    waitIdle: (timeoutMs = 10_000): Promise<unknown> =>
      eventually(
        "the AI is idle and the queue is empty",
        async () => {
          const answering = await this.page.visible([byId(testIds.prdAiAnswering)]);
          const queued = await this.page.count([byId(testIds.prdQueueItem)]);
          return !answering && queued === 0;
        },
        (idle) => idle,
        timeoutMs,
      ),
    devTexts: async (): Promise<string[]> => {
      const count = await this.page.count([byId(testIds.prdTurn, DEV_NAME)]);
      const texts: string[] = [];
      for (let index = 0; index < count; index += 1) {
        const raw = await this.page.text([byId(testIds.prdTurn, DEV_NAME, index)]);
        texts.push(messageBody(raw, DEV_NAME));
      }
      return texts;
    },
    gapCount: (): Promise<number> => this.page.count([byId(testIds.prdCheckGap)]),
    openGap: (title: string): Promise<void> =>
      this.press([byId(testIds.prdCheckGapOpen, `Open ${title}`)], `Open ${title}`),
    warningCount: (): Promise<number> => this.page.count([byId(testIds.prdCloseWarning)]),
    closeAnyway: (): Promise<void> => this.press([byId(testIds.prdCloseAnyway)], "Close anyway"),
    keepWorking: (): Promise<void> => this.press([byId(testIds.prdCloseKeep)], "Keep working"),
    recommendationCloseCount: (): Promise<number> =>
      this.page.count([byId(testIds.prdRecommendation), byId(testIds.prdCloseButton)]),
    briefCount: (): Promise<number> => this.page.count([byId(testIds.prdClaimBrief)]),
    briefText: (): Promise<string> => this.page.text([byId(testIds.prdClaimBrief)]),
    briefFocused: (text: string): Promise<boolean> =>
      this.page.focused([byId(testIds.prdTurn, text, 0)]),
    sourceLinkCount: (): Promise<number> => this.page.count([byId(testIds.prdOpenSectionChat)]),
    openSource: (): Promise<void> =>
      this.press([byId(testIds.prdOpenSectionChat)], "the section link"),
  };

  readonly composer = {
    count: (): Promise<number> => this.page.count([byId(testIds.prdComposer)]),
    write: (text: string): Promise<void> => this.page.fill([byId(testIds.prdComposerInput)], text),
    value: (): Promise<string> => this.page.value([byId(testIds.prdComposerInput)]),
    blur: (): Promise<void> => this.page.press([byId(testIds.prdComposerInput)], "Tab"),
    focus: (): Promise<void> => this.page.click([byId(testIds.prdComposerInput)]),
    send: (): Promise<void> => this.press([byId(testIds.prdSendButton)], "Send"),
    sendLabel: async (): Promise<string> =>
      (await this.page.attribute([byId(testIds.prdSendButton)], "aria-label")) ?? "",
    enabled: async (): Promise<boolean> =>
      !(await controlOff(this.page, [byId(testIds.prdSendButton)])),
    sendFocused: (): Promise<boolean> => this.page.focused([byId(testIds.prdSendButton)]),
    input: (): LocatorStep[] => [byId(testIds.prdComposerInput)],
    sendButton: (): LocatorStep[] => [byId(testIds.prdSendButton)],
  };

  readonly queue = {
    texts: async (): Promise<string[]> => {
      const count = await this.page.count([byId(testIds.prdQueueItem)]);
      const texts: string[] = [];
      for (let index = 0; index < count; index += 1) {
        texts.push(queueText(await this.page.text([byId(testIds.prdQueueItem, undefined, index)])));
      }
      return texts;
    },
    editCount: (text: string): Promise<number> =>
      this.page.count([byId(testIds.prdQueueItem, text), byId(testIds.prdQueueEdit)]),
    edit: (text: string): Promise<void> =>
      this.page.click([byId(testIds.prdQueueItem, text), byId(testIds.prdQueueEdit)]),
    remove: (text: string): Promise<void> =>
      this.page.click([byId(testIds.prdQueueItem, text), byId(testIds.prdQueueRemove)]),
  };

  readonly topic = {
    text: (): Promise<string> => this.page.text([byId(testIds.prdSectionText)]),
    sectionText: (): Promise<string> => this.page.text([byId(testIds.prdSection)]),
    sectionCount: (): Promise<number> => this.page.count([byId(testIds.prdSection)]),
    chatText: (): Promise<string> => this.page.text([byId(testIds.prdSectionChat)]),
    state: async (): Promise<string> =>
      (await this.page.text([byId(testIds.prdSectionState)])).trim(),
    storyCount: (): Promise<number> => this.page.count([byId(testIds.prdSectionStory)]),
    changeCount: (): Promise<number> => this.page.count([byId(testIds.prdSectionChange)]),
    changeText: async (): Promise<string> =>
      (await this.page.text([byId(testIds.prdSectionChange)])).trim(),
    confirmCount: (): Promise<number> => this.page.count([byId(testIds.prdSectionConfirm)]),
    reopenCount: (): Promise<number> => this.page.count([byId(testIds.prdSectionReopen)]),
    composerCount: (): Promise<number> => this.page.count([byId(testIds.prdSectionInput)]),
    pageCount: (): Promise<number> => this.page.count([byId(testIds.prdSectionPage)]),
    confirm: (): Promise<void> => this.press([byId(testIds.prdSectionConfirm)], "Confirm section"),
    reopen: (): Promise<void> => this.press([byId(testIds.prdSectionReopen)], "Reopen for review"),
    write: (text: string): Promise<void> => this.page.fill([byId(testIds.prdSectionInput)], text),
    value: (): Promise<string> => this.page.value([byId(testIds.prdSectionInput)]),
    blur: (): Promise<void> => this.page.press([byId(testIds.prdSectionInput)], "Tab"),
    send: (): Promise<void> => this.press([byId(testIds.prdSectionSend)], "Send to the section"),
    back: (): Promise<void> => this.press([byId(testIds.prdSectionBack)], "Back to PRD sections"),
    expectBackTarget: (): Promise<void> =>
      this.expectTarget([byId(testIds.prdSectionBack)], "Back to PRD sections"),
    expectSendTarget: (): Promise<void> =>
      this.expectTarget([byId(testIds.prdSectionSend)], "Send to the section"),
    questionCount: (text: string): Promise<number> =>
      this.page.count([byId(testIds.prdQuestion, text)]),
    suggestedCount: (question: string): Promise<number> =>
      this.page.count([byId(testIds.prdQuestion, question), { text: "Suggested", exact: true }]),
  };

  readonly questions = {
    count: (): Promise<number> => this.page.count([byId(testIds.prdNgoQuestions)]),
    text: (): Promise<string> => this.page.text([byId(testIds.prdNgoQuestions)]),
    open: (question: string): Promise<void> =>
      this.press(
        [byId(testIds.prdNgoQuestion, question), byId(testIds.prdNgoQuestionOpen)],
        question,
      ),
    answerFromChat: (question: string): Promise<void> =>
      this.press(
        [byId(testIds.prdNgoQuestionIntro, question), byId(testIds.prdNgoQuestionAnswer)],
        "Answer it",
      ),
    view: (question: string): Promise<void> =>
      this.press(
        [byId(testIds.prdNgoQuestion, question), byId(testIds.prdNgoQuestionView)],
        "View answer",
      ),
    use: (question: string): Promise<void> =>
      this.press(
        [byId(testIds.prdNgoQuestion, question), byId(testIds.prdNgoQuestionClaim)],
        "Use answer",
      ),
    useCount: (question: string): Promise<number> =>
      this.page.count([byId(testIds.prdNgoQuestion, question), byId(testIds.prdNgoQuestionClaim)]),
    viewCount: (question: string): Promise<number> =>
      this.page.count([byId(testIds.prdNgoQuestion, question), byId(testIds.prdNgoQuestionView)]),
    postCount: (): Promise<number> => this.page.count([byId(testIds.prdPostQuestion)]),
    post: (question: string): Promise<void> =>
      this.press(
        [byId(testIds.prdNgoQuestionIntro, question), byId(testIds.prdPostQuestion)],
        "Post to Maya",
      ),
    sent: (question: string): Promise<string> =>
      this.page.text([byId(testIds.prdNgoQuestion, question), byId(testIds.prdNgoQuestionSent)]),
    openSection: (question: string, title: string): Promise<void> =>
      this.press(
        [
          byId(testIds.prdNgoQuestion, question),
          byId(testIds.prdNgoQuestionSection, `Open ${title}`),
        ],
        `Open ${title}`,
      ),
    toggleCount: (): Promise<number> => this.page.count([byId(testIds.prdAnsweredToggle)]),
    toggleAnswered: (): Promise<void> => this.press([byId(testIds.prdAnsweredToggle)], "Answered"),
    expandAnswered: async (): Promise<void> => {
      const expanded = await this.page.attribute(
        [byId(testIds.prdAnsweredToggle)],
        "aria-expanded",
      );
      if (expanded !== "true") await this.press([byId(testIds.prdAnsweredToggle)], "Answered");
    },
    openAnswered: (answer: string): Promise<void> =>
      this.press([byId(testIds.prdAnsweredQuestion, answer)], "the answered question"),
    actionCount: async (): Promise<number> => {
      const post = await this.page.count([byId(testIds.prdPostQuestion)]);
      const view = await this.page.count([byId(testIds.prdNgoQuestionView)]);
      const use = await this.page.count([byId(testIds.prdNgoQuestionClaim)]);
      const complete = await this.page.count([byId(testIds.prdSideChatComplete)]);
      return post + view + use + complete;
    },
  };

  readonly side = {
    count: (): Promise<number> => this.page.count([byId(testIds.prdSideChat)]),
    text: (): Promise<string> => this.page.text([byId(testIds.prdSideChatMessages)]),
    optionCount: (): Promise<number> => this.page.count([byId(testIds.prdSideChatOption)]),
    inputCount: (): Promise<number> => this.page.count([byId(testIds.prdSideChatInput)]),
    write: (text: string): Promise<void> => this.page.fill([byId(testIds.prdSideChatInput)], text),
    value: (): Promise<string> => this.page.value([byId(testIds.prdSideChatInput)]),
    blur: (): Promise<void> => this.page.press([byId(testIds.prdSideChatInput)], "Tab"),
    send: (): Promise<void> => this.press([byId(testIds.prdSideChatSend)], "Send the answer"),
    completeEnabled: async (): Promise<boolean> =>
      !(await controlOff(this.page, [byId(testIds.prdSideChatComplete)])),
    hint: (): Promise<string> => this.page.text([byId(testIds.prdSideChatCompleteHint)]),
    hintCount: (): Promise<number> => this.page.count([byId(testIds.prdSideChatCompleteHint)]),
    complete: (): Promise<void> =>
      this.press([byId(testIds.prdSideChatComplete)], "Mark answer complete"),
    expectCompleteTarget: (): Promise<void> =>
      this.expectTarget([byId(testIds.prdSideChatComplete)], "Mark answer complete"),
    back: (): Promise<void> => this.press([byId(testIds.prdSideChatBack)], "All questions"),
  };

  readonly review = {
    count: (): Promise<number> => this.page.count([byId(testIds.prdAnswerReview)]),
    text: (): Promise<string> => this.page.text([byId(testIds.prdAnswerReview)]),
    answer: (): Promise<string> => this.page.value([byId(testIds.prdAnswerReviewAnswer)]),
    editAnswer: (text: string): Promise<void> =>
      this.page.fill([byId(testIds.prdAnswerReviewAnswer)], text),
    note: (text: string): Promise<void> =>
      this.page.fill([byId(testIds.prdAnswerReviewNote)], text),
    use: (): Promise<void> => this.press([byId(testIds.prdAnswerReviewClaim)], "Use answer"),
  };

  readonly banner = {
    count: (): Promise<number> => this.page.count([byId(testIds.prdClosedBanner)]),
    text: (): Promise<string> => this.page.text([byId(testIds.prdClosedBanner)]),
    openDesignCount: (): Promise<number> => this.page.count([byId(testIds.prdOpenUiDesign)]),
    openDesign: (): Promise<void> => this.press([byId(testIds.prdOpenUiDesign)], "Open UI Design"),
    noteCount: (): Promise<number> => this.page.count([byId(testIds.prdUiDesignNote)]),
    noteText: (): Promise<string> => this.page.text([byId(testIds.prdUiDesignNote)]),
    readOnlyCount: (): Promise<number> => this.page.count([byId(testIds.prdReadonlyBanner)]),
    readOnlyText: (): Promise<string> => this.page.text([byId(testIds.prdReadonlyBanner)]),
  };

  readonly phone = {
    barCount: (): Promise<number> => this.page.count([byId(testIds.phoneTabBar)]),
    tab: async (which: PhoneTab): Promise<void> => {
      if ((await this.page.count([byId(testIds.phoneTabBar)])) === 0) return;
      const testId =
        which === "chat"
          ? testIds.phoneTabChat
          : which === "prd"
            ? testIds.phoneTabPrd
            : testIds.phoneTabQuestions;
      await this.press([byId(testId)], `${which} tab`);
    },
    current: async (): Promise<PhoneTab> => {
      const tabs: readonly (readonly [PhoneTab, string])[] = [
        ["chat", testIds.phoneTabChat],
        ["prd", testIds.phoneTabPrd],
        ["questions", testIds.phoneTabQuestions],
      ];
      for (const [name, testId] of tabs) {
        const value = await this.page.attribute([byId(testId)], "aria-current");
        if (value === "true" || value === "page" || value === "step") return name;
      }
      throw new Error("no phone tab is current");
    },
    badge: async (): Promise<string | null> => {
      if ((await this.page.count([byId(testIds.phoneTabQuestionsBadge)])) === 0) return null;
      return (await this.page.text([byId(testIds.phoneTabQuestionsBadge)])).trim();
    },
    targets: (): Promise<void> =>
      Promise.all([
        this.expectTarget([byId(testIds.phoneTabChat)], "Chat"),
        this.expectTarget([byId(testIds.phoneTabPrd)], "PRD"),
        this.expectTarget([byId(testIds.phoneTabQuestions)], "Questions"),
      ]).then(() => undefined),
    labelsOneLine: async (): Promise<void> => {
      await this.oneLine(testIds.phoneTabChat, "Chat");
      await this.oneLine(testIds.phoneTabQuestions, "Questions");
      const prdText = await this.page.text([byId(testIds.phoneTabPrd)]);
      const label = /PRD \d+\/\d+/.exec(prdText)?.[0] ?? "";
      expect(label, "the PRD tab names confirmed and total").toMatch(/^PRD \d+\/\d+$/);
      await this.oneLine(testIds.phoneTabPrd, label);
    },
    topicOptionsFit: (): Promise<void> =>
      this.optionsFit(testIds.prdQuestionOption, testIds.prdSectionPage, "the topic questions"),
    sideOptionsFit: (): Promise<void> =>
      this.optionsFit(testIds.prdSideChatOption, testIds.prdSideChat, "the side chat answers"),
    sectionGeometry: async (): Promise<void> => {
      const pageBox = await this.boxOf([byId(testIds.prdSectionPage)], "the topic page");
      const textBox = await this.boxOf([byId(testIds.prdSectionText)], "the topic document");
      const chatBox = await this.boxOf(
        [byId(testIds.prdSectionChat), { text: "Section chat", exact: true }],
        "Section chat",
      );
      const inputBox = await this.boxOf([byId(testIds.prdSectionInput)], "the topic input");
      const tabs = await this.boxOf([byId(testIds.phoneTabBar)], "the phone tabs");
      const overflow = (await this.page.style([byId(testIds.prdSectionPage)], "overflow-y")).trim();
      const sectionOverflow = (
        await this.page.style([byId(testIds.prdSection)], "overflow-y")
      ).trim();
      expect(["auto", "scroll", "overlay"], "the topic page is the one scroll").toContain(overflow);
      expect(["visible", "hidden"], "the topic document does not scroll on its own").toContain(
        sectionOverflow,
      );
      expect(textBox.y, "the document starts at the top of the topic page").toBeGreaterThanOrEqual(
        pageBox.y - 4,
      );
      expect(textBox.y, "the document is the first part of the topic page").toBeLessThanOrEqual(
        pageBox.y + 120,
      );
      expect(textBox.y, "the document sits above Section chat").toBeLessThan(chatBox.y);
      expect(inputBox.y, "the input is pinned below the topic page").toBeGreaterThanOrEqual(
        pageBox.y + pageBox.height - 8,
      );
      expect(inputBox.y + inputBox.height, "the input sits above the tabs").toBeLessThanOrEqual(
        tabs.y + 4,
      );
    },
  };
}

function usePrdScreens() {
  const driver = useScreenDriver({
    viteConfig: "design/astra/vite.config.ts",
    enabled: TIER === "loop",
  });

  return async function withPrd(
    ctx: PrdCtx,
    given: PrdGiven,
    body: (screen: PrdPage) => Promise<void>,
  ): Promise<void> {
    await ctx.open();
    const opened = await driver.open({
      viewport: given.viewport,
      colorScheme: given.colorScheme,
      probeName: MODEL_CALL_PROBE,
      url: (base) =>
        shellUrl(
          base,
          given.scenario,
          "prd-workspace",
          given.pace ?? "test",
          given.viewer ? { viewer: given.viewer } : {},
        ),
    });
    const screen = new PrdPage(opened.page, given.viewport);
    try {
      await screen.ready();
      await body(screen);
    } finally {
      await opened.close();
    }
  };
}

export const prdScreens = usePrdScreens;
