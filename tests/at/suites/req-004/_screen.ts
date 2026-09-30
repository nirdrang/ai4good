import type { AtContext } from '../../harness/registry.ts';
import {
  eventually,
  shellUrl,
  useScreenDriver,
  VIEWPORT_SIZE,
  type LocatorStep,
  type ScreenPage,
  type Viewport,
} from '../../harness/screen.ts';
import { NAME, SCREEN, TEXT } from '../../../../src/components/discovery/a11y.ts';
import { GIVEN, MODEL_CALL_PROBE, type ScreenScenario } from '../../../../design/astra/src/givens.ts';
import { CapabilityPending, TIER } from './_bind.ts';
import { AWAITED } from './_pending.ts';

export type ScreenGiven = {
  scenario: ScreenScenario;
  viewport: Viewport;
  colorScheme?: 'light' | 'dark';
};

type Box = { x: number; y: number; width: number; height: number };

type QuestionGroupObject = {
  pick(label: string): Promise<void>;
  isAsked(): Promise<boolean>;
  isPressed(label: string): Promise<boolean>;
  suggestedCount(): Promise<number>;
  text(): Promise<string>;
  tag(): Promise<string | null>;
  hasFocus(): Promise<boolean>;
  writeOwn(): Promise<void>;
  ownVisible(): Promise<boolean>;
};

function landmark(role: string, name: string, position?: LocatorStep['position']): LocatorStep {
  return position === undefined ? { role, name } : { role, name, position };
}

async function readText(page: ScreenPage, chain: LocatorStep[]): Promise<string> {
  try {
    return await page.text(chain, 500);
  } catch {
    return '';
  }
}

async function waitBox(page: ScreenPage, chain: LocatorStep[], what: string): Promise<Box> {
  const box = await eventually(what, () => page.box(chain), (value) => value !== null && value.width > 0 && value.height > 0);
  if (box === null) throw new Error(`${what} has no box`);
  return box;
}

function questionGroup(page: ScreenPage, text: string): QuestionGroupObject {
  const root = [landmark(SCREEN.conversation.role, SCREEN.conversation.name), landmark('group', text)];
  async function option(label: string): Promise<LocatorStep[]> {
    const suggested = [...root, landmark('button', NAME.option(label, true))];
    if ((await page.count(suggested)) > 0) return suggested;
    const plain = [...root, landmark('button', label)];
    if ((await page.count(plain)) > 0) return plain;
    throw new Error(`no option named ${label}`);
  }
  return {
    async pick(label) {
      const button = await option(label);
      await page.click(button);
      await eventually(`option ${label} is pressed`, () => page.attribute(button, 'aria-pressed'), (value) => value === 'true');
    },
    isAsked: () => page.visible(root),
    async isPressed(label) {
      const button = await option(label);
      return (await page.attribute(button, 'aria-pressed')) === 'true';
    },
    suggestedCount: () => page.count([...root, { text: TEXT.suggested }]),
    text: () => page.text(root),
    async tag() {
      const body = await page.text(root);
      if (body.includes(TEXT.changing)) return TEXT.changing;
      if (body.includes(TEXT.carried)) return TEXT.carried;
      return null;
    },
    hasFocus: () => page.focused([...root, { role: 'button', position: 0 }]),
    async writeOwn() {
      await page.click([...root, landmark('button', NAME.writeOwn)]);
    },
    ownVisible: () => page.visible([...root, landmark('textbox', NAME.ownAnswer(text))]),
  };
}

/** The Discovery screen as a person meets it. Locators come from a11y.ts. */
export class DiscoveryPage {
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

  readonly chat = {
    question: (text: string): QuestionGroupObject => questionGroup(this.page, text),
    lastAssistantText: (): Promise<string> => this.messageText(NAME.aiReply),
    yourText: (): Promise<string> => this.messageText(NAME.yourTurn),
    scrollToTop: (): Promise<void> =>
      this.page.scroll([landmark(SCREEN.conversation.role, SCREEN.conversation.name)], 0),
    answerCurrent: (answer: string): Promise<string | null> =>
      this.page.attribute(
        [landmark(SCREEN.conversation.role, SCREEN.conversation.name), { text: answer }],
        'aria-current',
      ),
  };

  readonly composer = {
    send: async (): Promise<string> => {
      const before = await this.chat.lastAssistantText();
      await this.page.click([
        landmark(SCREEN.composer.role, SCREEN.composer.name),
        landmark('button', TEXT.send),
      ]);
      const article = [
        landmark(SCREEN.conversation.role, SCREEN.conversation.name),
        landmark('article', NAME.aiReply, 'last'),
      ];
      return eventually('the next AI reply', () => readText(this.page, article), (text) => text.trim().length > 0 && text !== before);
    },
    formText: (): Promise<string> => this.page.text([landmark(SCREEN.composer.role, SCREEN.composer.name)]),
    fill: (text: string): Promise<void> =>
      this.page.fill(
        [landmark(SCREEN.composer.role, SCREEN.composer.name), landmark(SCREEN.messageBox.role, SCREEN.messageBox.name)],
        text,
      ),
    value: (): Promise<string> =>
      this.page.value([
        landmark(SCREEN.composer.role, SCREEN.composer.name),
        landmark(SCREEN.messageBox.role, SCREEN.messageBox.name),
      ]),
    messageBox: (): Promise<Box> =>
      waitBox(
        this.page,
        [landmark(SCREEN.composer.role, SCREEN.composer.name), landmark(SCREEN.messageBox.role, SCREEN.messageBox.name)],
        'the message box',
      ),
    oneLineLimit: async (): Promise<number> => {
      const chain = [
        landmark(SCREEN.composer.role, SCREEN.composer.name),
        landmark(SCREEN.messageBox.role, SCREEN.messageBox.name),
      ];
      const length = async (name: string): Promise<number> => {
        const raw = await this.page.style(chain, name);
        const value = Number.parseFloat(raw);
        if (!Number.isFinite(value)) throw new Error(`${name} is ${raw}`);
        return value;
      };
      const line = await length('line-height');
      const padding = (await length('padding-top')) + (await length('padding-bottom'));
      const border = (await length('border-top-width')) + (await length('border-bottom-width'));
      return line * 2 + padding + border;
    },
  };

  readonly files = {
    addVisible: (): Promise<boolean> => this.page.visible([landmark('button', SCREEN.addFile.name)]),
    has: (name: string): Promise<boolean> =>
      this.page.visible([landmark(SCREEN.files.role, SCREEN.files.name), landmark('listitem', name)]),
  };

  readonly usage = {
    barCount: (): Promise<number> => this.page.count([this.usageRoot(), { role: 'img' }]),
    barLabel: async (): Promise<string> => (await this.page.attribute([this.usageRoot(), { role: 'img' }], 'aria-label')) ?? '',
    text: (): Promise<string> => this.page.text([this.usageRoot()]),
    visible: (): Promise<boolean> => this.page.visible([this.usageRoot()]),
    barBox: (): Promise<Box> => waitBox(this.page, [this.usageRoot(), { role: 'img' }], 'the usage bar'),
    box: (): Promise<Box> => waitBox(this.page, [this.usageRoot()], 'the usage card'),
    labelBox: (label: string): Promise<Box> => waitBox(this.page, [this.usageRoot(), { text: label }], label),
  };

  readonly questions = {
    row: async (question: string): Promise<string> => {
      const root = await this.questionsRoot();
      return this.page.text([root, landmark('listitem', question)]);
    },
    answer: async (question: string): Promise<void> => {
      const root = await this.questionsRoot();
      await this.page.click([root, landmark('listitem', question), landmark('button', NAME.answerRow(question))]);
    },
    view: async (question: string): Promise<void> => {
      const root = await this.questionsRoot();
      await this.page.click([root, landmark('listitem', question), landmark('button', NAME.viewRow(question))]);
    },
    close: async (): Promise<void> => {
      if (this.viewport === 'desktop') return;
      const dialog = landmark(SCREEN.questionsFull.role, SCREEN.questionsFull.name);
      if (!(await this.page.visible([dialog]))) return;
      await this.page.click([dialog, landmark('button', SCREEN.backToChat.name)]);
      await eventually('the questions dialog closes', () => this.page.visible([dialog]), (open) => open === false);
    },
  };

  readonly brief = {
    open: async (): Promise<void> => {
      await this.page.click([landmark('button', SCREEN.openBrief.name)]);
      const root = this.briefRoot();
      await eventually('the live brief opens', () => this.page.visible([root]), (open) => open);
    },
    text: (): Promise<string> => this.page.text([this.briefRoot()]),
    hasEdit: (title: string): Promise<boolean> =>
      this.page.visible([this.briefRoot(), landmark('button', NAME.editSection(title))]),
    edit: (title: string): Promise<void> =>
      this.page.click([this.briefRoot(), landmark('button', NAME.editSection(title))]),
    back: async (): Promise<void> => {
      await this.page.click([this.briefRoot(), landmark('button', SCREEN.backToChat.name)]);
      await eventually('the live brief closes', () => this.page.visible([this.briefRoot()]), (open) => open === false);
    },
    box: (): Promise<Box> => waitBox(this.page, [this.briefRoot()], 'the live brief'),
    openVisible: (): Promise<boolean> => this.page.visible([this.briefRoot()]),
  };

  readonly progress = {
    finishBox: (): Promise<Box> => waitBox(this.page, [landmark('button', SCREEN.finish.name)], SCREEN.finish.name),
  };

  async sendBox(): Promise<Box> {
    const paid = landmark('button', TEXT.sendPaid);
    const free = landmark('button', TEXT.send);
    if ((await this.page.count([landmark(SCREEN.composer.role, SCREEN.composer.name), paid])) > 0) {
      return waitBox(this.page, [landmark(SCREEN.composer.role, SCREEN.composer.name), paid], TEXT.sendPaid);
    }
    return waitBox(this.page, [landmark(SCREEN.composer.role, SCREEN.composer.name), free], TEXT.send);
  }

  conversationBox(): Promise<Box> {
    return waitBox(
      this.page,
      [landmark(SCREEN.conversation.role, SCREEN.conversation.name)],
      SCREEN.conversation.name,
    );
  }

  private usageRoot(): LocatorStep {
    return landmark(SCREEN.usage.role, SCREEN.usage.name);
  }

  private briefRoot(): LocatorStep {
    return this.viewport === 'desktop'
      ? landmark(SCREEN.briefSide.role, SCREEN.briefSide.name)
      : landmark(SCREEN.briefFull.role, SCREEN.briefFull.name);
  }

  private async questionsRoot(): Promise<LocatorStep> {
    if (this.viewport === 'desktop') return landmark(SCREEN.questions.role, SCREEN.questions.name);
    const dialog = landmark(SCREEN.questionsFull.role, SCREEN.questionsFull.name);
    if (await this.page.visible([dialog])) return dialog;
    await this.page.click([landmark('button', SCREEN.openQuestions.name)]);
    await eventually('the questions dialog opens', () => this.page.visible([dialog]), (open) => open);
    return dialog;
  }

  private messageText(name: string): Promise<string> {
    const article = [
      landmark(SCREEN.conversation.role, SCREEN.conversation.name),
      landmark('article', name, 'last'),
    ];
    return eventually(`the message named ${name}`, () => readText(this.page, article), (text) => text.trim().length > 0);
  }
}

/**
 * Call once at the top of a screen test file. Returns `withDiscovery`.
 * Loop drives the fixture shell. Integration and drill refuse before anything is built.
 */
export function discoveryScreens() {
  const driver = useScreenDriver({ viteConfig: 'design/astra/vite.config.ts', enabled: TIER === 'loop' });

  return async function withDiscovery(
    ctx: AtContext<'req-004', 'discovery'>,
    given: ScreenGiven,
    body: (screen: DiscoveryPage) => Promise<void>,
  ): Promise<void> {
    if (TIER !== 'loop') throw new CapabilityPending([AWAITED.discoverySurface]);
    await ctx.open();
    const start = GIVEN[given.scenario].start === 'review' ? 'review' : 'chat';
    const opened = await driver.open({
      viewport: given.viewport,
      colorScheme: given.colorScheme,
      probeName: MODEL_CALL_PROBE,
      url: (base) => shellUrl(base, given.scenario, start),
    });
    try {
      await body(new DiscoveryPage(opened.page, given.viewport));
    } finally {
      await opened.close();
    }
  };
}
