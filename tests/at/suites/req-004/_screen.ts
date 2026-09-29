import type { AtContext } from '../../harness/registry.ts';
import {
  eventually,
  shellUrl,
  useScreenDriver,
  type LocatorStep,
  type ScreenPage,
  type Viewport,
} from '../../harness/screen.ts';
import { NAME, SCREEN } from '../../../../src/components/discovery/a11y.ts';
import { GIVEN, MODEL_CALL_PROBE, type ScreenScenario } from '../../../../design/astra/src/givens.ts';
import { CapabilityPending, TIER } from './_bind.ts';
import { AWAITED } from './_pending.ts';

export type ScreenGiven = { scenario: ScreenScenario; viewport: Viewport };

type QuestionGroupObject = {
  pick(label: string): Promise<void>;
  isAsked(): Promise<boolean>;
  isPressed(label: string): Promise<boolean>;
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

function questionGroup(page: ScreenPage, text: string): QuestionGroupObject {
  const root = [
    landmark(SCREEN.conversation.role, SCREEN.conversation.name),
    landmark('group', text),
  ];
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
      await eventually(
        `option ${label} is pressed`,
        () => page.attribute(button, 'aria-pressed'),
        (value) => value === 'true',
      );
    },
    isAsked: () => page.visible(root),
    async isPressed(label) {
      const button = await option(label);
      return (await page.attribute(button, 'aria-pressed')) === 'true';
    },
  };
}

/** The Discovery screen as a person meets it. Locators come from a11y.ts. */
export class DiscoveryPage {
  constructor(
    private readonly page: ScreenPage,
    readonly viewport: Viewport,
  ) {}

  readonly chat = {
    question: (text: string): QuestionGroupObject => questionGroup(this.page, text),
    lastAssistantText: (): Promise<string> => this.messageText(NAME.aiReply),
    yourText: (): Promise<string> => this.messageText(NAME.yourTurn),
  };

  readonly composer = {
    send: async (): Promise<string> => {
      const before = await this.chat.lastAssistantText();
      await this.page.click([
        landmark(SCREEN.composer.role, SCREEN.composer.name),
        landmark('button', 'Send'),
      ]);
      const article = [
        landmark(SCREEN.conversation.role, SCREEN.conversation.name),
        landmark('article', NAME.aiReply, 'last'),
      ];
      return eventually(
        'the next AI reply',
        () => readText(this.page, article),
        (text) => text.trim().length > 0 && text !== before,
      );
    },
  };

  readonly files = {
    addVisible: (): Promise<boolean> => this.page.visible([landmark('button', SCREEN.addFile.name)]),
    has: (name: string): Promise<boolean> =>
      this.page.visible([
        landmark(SCREEN.files.role, SCREEN.files.name),
        landmark('listitem', name),
      ]),
  };

  private messageText(name: string): Promise<string> {
    const article = [
      landmark(SCREEN.conversation.role, SCREEN.conversation.name),
      landmark('article', name, 'last'),
    ];
    return eventually(
      `the message named ${name}`,
      () => readText(this.page, article),
      (text) => text.trim().length > 0,
    );
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
