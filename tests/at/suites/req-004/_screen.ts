import type { AtContext } from '../../harness/registry.ts';
import {
  eventually,
  shellUrl,
  useScreenDriver,
  VIEWPORT_SIZE,
  type LocatorStep,
  type ScreenFile,
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
  pace?: 'test' | 'demo';
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
  saveChange(): Promise<void>;
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
    saveChange: () => page.click([...root, landmark('button', TEXT.saveChange)]),
    async writeOwn() {
      await page.click([...root, landmark('button', NAME.writeOwn)]);
    },
    ownVisible: () => page.visible([...root, landmark('textbox', NAME.ownAnswer(text))]),
  };
}

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
    oneAtATime: (): Promise<void> =>
      this.page.click([
        landmark(SCREEN.conversation.role, SCREEN.conversation.name),
        landmark('button', TEXT.oneAtATime),
      ]),
    showTogether: (): Promise<void> =>
      this.page.click([
        landmark(SCREEN.conversation.role, SCREEN.conversation.name),
        landmark('button', TEXT.showTogether),
      ]),
    showTogetherVisible: (): Promise<boolean> =>
      this.page.visible([
        landmark(SCREEN.conversation.role, SCREEN.conversation.name),
        landmark('button', TEXT.showTogether),
      ]),
    nextQuestion: (): Promise<void> =>
      this.page.click([
        landmark(SCREEN.conversation.role, SCREEN.conversation.name),
        landmark('button', TEXT.nextQuestion),
      ]),
    scrollToTop: (): Promise<void> =>
      this.page.scroll([landmark(SCREEN.conversation.role, SCREEN.conversation.name)], 0),
    scrollToEnd: (): Promise<void> =>
      this.page.scroll([landmark(SCREEN.conversation.role, SCREEN.conversation.name)], 100_000),
    answerCurrent: (answer: string): Promise<string | null> =>
      this.page.attribute(
        [landmark(SCREEN.conversation.role, SCREEN.conversation.name), { text: answer }],
        'aria-current',
      ),
    answerStyle: (answer: string, cssName: string): Promise<string> =>
      this.page.style(
        [landmark(SCREEN.conversation.role, SCREEN.conversation.name), { text: answer }],
        cssName,
      ),
  };

  readonly composer = {
    send: async (): Promise<string> => {
      const before = await this.chat.lastAssistantText();
      const root = landmark(SCREEN.composer.role, SCREEN.composer.name);
      const paid = [root, landmark('button', TEXT.sendPaid)];
      const free = [root, landmark('button', TEXT.send)];
      await this.page.click((await this.page.count(paid)) > 0 ? paid : free);
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
    formCount: (): Promise<number> => this.page.count([landmark(SCREEN.composer.role, SCREEN.composer.name)]),
    messageCount: (): Promise<number> => this.page.count([landmark(SCREEN.messageBox.role, SCREEN.messageBox.name)]),
    sendCount: (): Promise<number> => this.page.count([landmark('button', TEXT.send)]),
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
    text: (): Promise<string> => this.page.text([this.filesRoot()]),
    addDisabled: (): Promise<string | null> =>
      this.page.attribute([landmark('button', SCREEN.addFile.name)], 'aria-disabled'),
    addBox: (): Promise<Box> => waitBox(this.page, [landmark('button', SCREEN.addFile.name)], SCREEN.addFile.name),
    openAdd: async (): Promise<void> => {
      await this.page.click([landmark('button', SCREEN.addFile.name)]);
      await eventually('Add a file opens the chooser', () => this.page.visible([this.chooserRoot()]), (open) => open);
    },
    choose: (file: ScreenFile): Promise<void> => this.page.setFiles([this.chooserRoot()], [file]),
    row: (name: string): Promise<string> =>
      readText(this.page, [this.filesRoot(), landmark('listitem', name)]),
    has: (name: string): Promise<boolean> =>
      this.page.visible([this.filesRoot(), landmark('listitem', name)]),
    reopen: (name: string): Promise<void> =>
      this.page.click([this.filesRoot(), landmark('button', NAME.openFile(name))]),
  };

  readonly chooser = {
    visible: (): Promise<boolean> => this.page.visible([this.chooserRoot()]),
    dropVisible: (): Promise<boolean> => this.page.visible([this.chooserRoot(), { text: TEXT.dropHere }]),
    text: (): Promise<string> => this.page.text([this.chooserRoot()]),
    chooseCount: (): Promise<number> =>
      this.page.count([this.chooserRoot(), landmark('button', SCREEN.chooseFile.name)]),
    cancel: async (): Promise<void> => {
      await this.page.click([this.chooserRoot(), landmark('button', SCREEN.cancelAdding.name)]);
      await eventually('Cancel closes the chooser', () => this.page.visible([this.chooserRoot()]), (open) => open === false);
    },
    buttonBox: (name: string): Promise<Box> =>
      waitBox(this.page, [this.chooserRoot(), landmark('button', name)], name),
    textBox: (phrase: string): Promise<Box> => waitBox(this.page, [this.chooserRoot(), { text: phrase }], phrase),
  };

  readonly usage = {
    barCount: (): Promise<number> => this.page.count([this.usageRoot(), { role: 'img' }]),
    barLabel: async (): Promise<string> => (await this.page.attribute([this.usageRoot(), { role: 'img' }], 'aria-label')) ?? '',
    text: (): Promise<string> => this.page.text([this.usageRoot()]),
    visible: (): Promise<boolean> => this.page.visible([this.usageRoot()]),
    barBox: (): Promise<Box> => waitBox(this.page, [this.usageRoot(), { role: 'img' }], 'the usage bar'),
    box: (): Promise<Box> => waitBox(this.page, [this.usageRoot()], 'the usage card'),
    labelBox: (label: string): Promise<Box> => waitBox(this.page, [this.usageRoot(), { text: label }], label),
    buyFuel: (): Promise<void> => this.page.click([this.usageRoot(), landmark('button', TEXT.buyFuel)]),
  };

  readonly fuel = {
    visible: (): Promise<boolean> => this.page.visible([landmark('heading', 'Fuel for your project')]),
  };

  readonly steps = {
    done: (label: string): Promise<boolean> => this.page.visible([{ role: 'link', name: `${label}, done` }]),
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
    viewCount: async (question: string): Promise<number> => {
      const root = await this.questionsRoot();
      return this.page.count([root, landmark('listitem', question), landmark('button', NAME.viewRow(question))]);
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
    openerFocused: (): Promise<boolean> => this.page.focused([landmark('button', SCREEN.openBrief.name)]),
  };

  readonly ready = {
    visible: (): Promise<boolean> =>
      this.page.visible([landmark(SCREEN.readyInvite.role, SCREEN.readyInvite.name)]),
    text: (): Promise<string> => this.page.text([landmark(SCREEN.readyInvite.role, SCREEN.readyInvite.name)]),
  };

  readonly progress = {
    finishBox: (): Promise<Box> => waitBox(this.page, [landmark('button', SCREEN.finish.name)], SCREEN.finish.name),
    text: (): Promise<string> => this.page.text([landmark(SCREEN.progress.role, SCREEN.progress.name)]),
  };

  readonly review = {
    ready: (): Promise<boolean> =>
      eventually('the review page is open', () => this.page.visible([this.reviewRoot()]), (open) => open),
    text: (): Promise<string> => this.page.text([this.reviewRoot()]),
    openText: (): Promise<string> => readText(this.page, [this.openRoot()]),
    openItem: (title: string): Promise<string> => readText(this.page, [this.openRoot(), landmark('listitem', title)]),
    sectionText: (title: string): Promise<string> => readText(this.page, [this.sectionRoot(title)]),
    hasEdit: (title: string): Promise<boolean> =>
      this.page.visible([this.sectionRoot(title), landmark('button', NAME.editSection(title))]),
    openBox: (): Promise<Box> => waitBox(this.page, [this.openRoot()], SCREEN.reviewOpen.name),
    sectionBox: (title: string): Promise<Box> => waitBox(this.page, [this.sectionRoot(title)], title),
    useSuggestion: (title: string): Promise<void> =>
      this.page.click([this.openRoot(), landmark('listitem', title), landmark('button', NAME.useSuggestion)]),
    answerInChat: (title: string): Promise<void> =>
      this.page.click([this.openRoot(), landmark('listitem', title), landmark('button', NAME.answerInChat)]),
    edit: async (title: string): Promise<void> => {
      await this.page.click([this.sectionRoot(title), landmark('button', NAME.editSection(title))]);
      await eventually(
        `the edit box for ${title} is open`,
        () => this.page.visible([this.sectionRoot(title), landmark('textbox', title)]),
        (open) => open,
      );
    },
    fill: (title: string, text: string): Promise<void> =>
      this.page.fill([this.sectionRoot(title), landmark('textbox', title)], text),
    save: (title: string): Promise<void> =>
      this.page.click([this.sectionRoot(title), landmark('button', TEXT.review.save)]),
    tick: async (name: string): Promise<void> => {
      const box = this.check(name);
      if ((await this.page.attribute(box, 'aria-checked')) !== 'true') await this.page.click(box);
      await eventually(`${name} is ticked`, () => this.page.attribute(box, 'aria-checked'), (value) => value === 'true');
    },
    ticked: async (name: string): Promise<boolean> => (await this.page.attribute(this.check(name), 'aria-checked')) === 'true',
    finishDisabled: async (): Promise<boolean> =>
      (await this.page.attribute([this.confirmRoot(), landmark('button', SCREEN.finish.name)], 'aria-disabled')) === 'true',
    finish: async (): Promise<void> => {
      await this.page.click([this.confirmRoot(), landmark('button', SCREEN.finish.name)]);
      await eventually(
        'Finish Discovery confirms the document',
        () => readText(this.page, [this.reviewRoot()]),
        (text) => text.includes('Discovery finished'),
      );
    },
    backVisible: (): Promise<boolean> => this.page.visible([landmark('button', SCREEN.reviewBack.name)]),
    back: async (): Promise<void> => {
      await this.page.click([landmark('button', SCREEN.reviewBack.name)]);
      await eventually(
        'Back to the chat shows the conversation',
        () => this.page.visible([landmark(SCREEN.conversation.role, SCREEN.conversation.name)]),
        (open) => open,
      );
    },
    open: async (): Promise<void> => {
      await this.page.click([landmark('button', SCREEN.finish.name)]);
      await eventually('Finish Discovery opens the review', () => this.page.visible([this.reviewRoot()]), (open) => open);
    },
    jumpVisible: (): Promise<boolean> => this.page.visible([landmark('button', TEXT.review.goToFinish)]),
    goToFinish: async (): Promise<void> => {
      await this.page.click([landmark('button', TEXT.review.goToFinish)]);
      await eventually(
        'the jump bar hides when the confirm card is in view',
        () => this.page.visible([landmark('button', TEXT.review.goToFinish)]),
        (open) => open === false,
      );
    },
    buttonCount: (fragment: string): Promise<number> => this.page.count([{ role: 'button', name: fragment, exact: false }]),
    backBox: (): Promise<Box> => this.fitBox([landmark('button', SCREEN.reviewBack.name)], SCREEN.reviewBack.name),
    suggestionBox: (): Promise<Box> =>
      this.fitBox([this.openRoot(), landmark('button', NAME.useSuggestion, 0)], NAME.useSuggestion),
    answerBox: (): Promise<Box> =>
      this.fitBox([this.openRoot(), landmark('button', NAME.answerInChat, 0)], NAME.answerInChat),
    jumpBox: (): Promise<Box> => this.fitBox([landmark('button', TEXT.review.goToFinish)], TEXT.review.goToFinish),
    finishBox: (): Promise<Box> =>
      this.fitBox([this.confirmRoot(), landmark('button', SCREEN.finish.name)], SCREEN.finish.name),
    checkBox: (name: string): Promise<Box> => this.fitBox(this.check(name), name),
    editBox: (title: string): Promise<Box> => this.fitBox([this.sectionRoot(title), landmark('textbox', title)], title),
    saveBox: (title: string): Promise<Box> =>
      this.fitBox([this.sectionRoot(title), landmark('button', TEXT.review.save)], TEXT.review.save),
    cancelBox: (title: string): Promise<Box> =>
      this.fitBox([this.sectionRoot(title), landmark('button', TEXT.review.cancel)], TEXT.review.cancel),
  };

  reload(): Promise<void> {
    return this.page.reload();
  }

  readonly document = {
    text: (): Promise<string> =>
      eventually(
        'the Discovery document',
        () => readText(this.page, [this.documentRoot()]),
        (text) => text.trim().length > 0,
      ),
    box: (): Promise<Box> => waitBox(this.page, [this.documentRoot()], SCREEN.document.name),
  };

  async sendBox(): Promise<Box> {
    const paid = landmark('button', TEXT.sendPaid);
    const free = landmark('button', TEXT.send);
    if ((await this.page.count([landmark(SCREEN.composer.role, SCREEN.composer.name), paid])) > 0) {
      return waitBox(this.page, [landmark(SCREEN.composer.role, SCREEN.composer.name), paid], TEXT.sendPaid);
    }
    return waitBox(this.page, [landmark(SCREEN.composer.role, SCREEN.composer.name), free], TEXT.send);
  }

  filePanel(name: string) {
    const root = this.viewport === 'desktop' ? landmark('region', name) : landmark('dialog', name);
    const button = (label: string): LocatorStep[] => [root, landmark('button', label)];
    return {
      visible: (): Promise<boolean> => this.page.visible([root]),
      text: (): Promise<string> => this.page.text([root]),
      answerCount: (): Promise<number> => this.page.count([root, { role: 'textbox' as const }]),
      sendCount: (): Promise<number> => this.page.count(button(TEXT.send)),
      closeBox: (): Promise<Box> => waitBox(this.page, button(TEXT.closeFile), TEXT.closeFile),
      textBox: (phrase: string, exact = true): Promise<Box> =>
        waitBox(this.page, [root, { text: phrase, exact }], phrase),
      close: async (): Promise<void> => {
        await this.page.click(button(TEXT.closeFile));
        await eventually('the file panel closes', () => this.page.visible([root]), (open) => open === false);
      },
    };
  }

  conversationBox(): Promise<Box> {
    return waitBox(
      this.page,
      [landmark(SCREEN.conversation.role, SCREEN.conversation.name)],
      SCREEN.conversation.name,
    );
  }

  private filesRoot(): LocatorStep {
    return landmark(SCREEN.files.role, SCREEN.files.name);
  }

  private chooserRoot(): LocatorStep {
    return landmark(SCREEN.chooser.role, SCREEN.chooser.name);
  }

  private usageRoot(): LocatorStep {
    return landmark(SCREEN.usage.role, SCREEN.usage.name);
  }

  private briefRoot(): LocatorStep {
    return this.viewport === 'desktop'
      ? landmark(SCREEN.briefSide.role, SCREEN.briefSide.name)
      : landmark(SCREEN.briefFull.role, SCREEN.briefFull.name);
  }

  private async fitBox(chain: LocatorStep[], what: string): Promise<Box> {
    await this.page.scrollIntoView(chain);
    return waitBox(this.page, chain, what);
  }

  private check(name: string): LocatorStep[] {
    return [this.confirmRoot(), landmark('checkbox', name)];
  }

  private reviewRoot(): LocatorStep {
    return landmark(SCREEN.review.role, SCREEN.review.name);
  }

  private openRoot(): LocatorStep {
    return landmark(SCREEN.reviewOpen.role, SCREEN.reviewOpen.name);
  }

  private confirmRoot(): LocatorStep {
    return landmark(SCREEN.confirmation.role, SCREEN.confirmation.name);
  }

  private sectionRoot(title: string): LocatorStep {
    return landmark('region', title);
  }

  private documentRoot(): LocatorStep {
    return landmark(SCREEN.document.role, SCREEN.document.name);
  }

  private async questionsRoot(): Promise<LocatorStep> {
    if (this.viewport === 'desktop') return landmark(SCREEN.questions.role, SCREEN.questions.name);
    const dialog = landmark(SCREEN.questionsFull.role, SCREEN.questionsFull.name);
    if (await this.page.visible([dialog])) return dialog;
    await this.page.click([{ role: 'button', name: 'Questions', exact: false }]);
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
      url: (base) => shellUrl(base, given.scenario, start, given.pace ?? 'test'),
    });
    try {
      await body(new DiscoveryPage(opened.page, given.viewport));
    } finally {
      await opened.close();
    }
  };
}
