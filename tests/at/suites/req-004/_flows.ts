import { expect } from 'vitest';
import { eventually } from '../../harness/screen.ts';
import { SCREEN, TEXT } from '../../../../src/components/discovery/a11y.ts';
import { GIVEN } from '../../../../design/astra/src/givens.ts';
import type { DiscoveryPage } from './_screen.ts';

export async function answerWhenAsked(screen: DiscoveryPage, question: string, label: string): Promise<void> {
  const group = screen.chat.question(question);
  await eventually(`${question} is asked`, () => group.isAsked(), (asked) => asked);
  await group.pick(label);
}

function sampleFile(name: string): { name: string; mimeType: string; base64: string } {
  return { name, mimeType: 'text/plain', base64: Buffer.from(name).toString('base64') };
}

export async function addRota(screen: DiscoveryPage): Promise<void> {
  await screen.files.openAdd();
  await screen.files.choose(sampleFile('volunteer-rota.xlsx'));
  await eventually(
    'choosing the file starts the read',
    () => screen.files.row('volunteer-rota.xlsx'),
    (text) => /Reading… \d+%/.test(text),
  );
  expect(await screen.chooser.visible(), 'the chooser closes when the read starts').toBe(false);
}

export async function expectChooser(screen: DiscoveryPage, finePointer: boolean): Promise<void> {
  await screen.files.openAdd();
  expect(await screen.chooser.chooseCount(), 'the chooser has one Choose a file button').toBe(1);
  expect(await screen.chooser.dropVisible(), 'Drop a file here follows the pointer').toBe(finePointer);
  const text = await screen.chooser.text();
  expect(text, 'the chooser lists the accepted types').toContain(TEXT.acceptedTypes);
  expect(text, 'the chooser shows the sample-data sentence').toContain(TEXT.sampleData);
  expect(await screen.chooser.visible(), 'Add a file names the chooser').toBe(true);
}

export async function readRotaUntilReady(screen: DiscoveryPage): Promise<void> {
  await addRota(screen);
  expect(await screen.modelCalls(), 'choosing the file is one file-read and no question').toEqual(['file-read']);
  const panel = screen.filePanel('volunteer-rota.xlsx');
  await screen.files.reopen('volunteer-rota.xlsx');
  await eventually('selecting the file opens its panel', () => panel.visible(), (open) => open);
  const openText = await panel.text();
  expect(openText, 'the panel shows the file name').toContain('volunteer-rota.xlsx');
  expect(await panel.answerCount(), 'the file panel has no answer box').toBe(0);
  expect(await panel.sendCount(), 'the file panel has no Send').toBe(0);
  await panel.close();
  await eventually(
    'closing the panel does not stop the read',
    () => screen.files.row('volunteer-rota.xlsx'),
    (text) => text.includes('Ready · 4 facts'),
    8_000,
  );
  expect(await screen.modelCalls(), 'Ready adds no model call').toEqual(['file-read']);
  await screen.files.reopen('volunteer-rota.xlsx');
  await eventually('the ready file opens again', () => panel.visible(), (open) => open);
  const readyText = await panel.text();
  expect(readyText, 'the ready panel shows Ready · 4 facts').toContain('Ready · 4 facts');
  expect(readyText, 'the ready panel shows the facts').toContain('38 of your 45 volunteers booked at least one shift');
  expect(await panel.answerCount(), 'the ready panel has no answer box').toBe(0);
  await panel.close();
  expect(await screen.files.text(), 'one Discovery file counts as 1 of 3 added').toContain('1 of 3 added');
}

export async function expectFileControlsFit(screen: DiscoveryPage): Promise<void> {
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
  await eventually(
    'choosing the file closes the chooser',
    () => screen.chooser.visible(),
    (open) => open === false,
  );
  await screen.files.reopen('volunteer-rota.xlsx');
  const panel = screen.filePanel('volunteer-rota.xlsx');
  await eventually('the file panel opens at 320 px', () => panel.visible(), (open) => open);
  expect(await panel.answerCount(), 'the file panel has no answer box').toBe(0);
  expect(await panel.sendCount(), 'the file panel has no Send').toBe(0);
  await expectFullyVisible(screen, 'Close', await panel.closeBox());
  await expectFullyVisible(screen, 'the read status', await panel.textBox('Reading…', false));
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

export async function expectUsage(screen: DiscoveryPage): Promise<void> {
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

export async function expectInside(screen: DiscoveryPage): Promise<void> {
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

const OPEN_IMPORTANCE = ['Needed before build', 'A suggestion exists', 'A suggestion exists', 'Can wait'] as const;

export async function expectFinishFlow(screen: DiscoveryPage, given: (typeof GIVEN)['finish-open']): Promise<void> {
  await screen.review.ready();
  expect(await screen.modelCalls(), 'the review starts with no model call').toEqual([]);
  const pageText = await screen.review.text();
  const needAt = pageText.indexOf('The need');
  expect(needAt, 'the brief is on the review page').toBeGreaterThanOrEqual(0);
  expect(pageText.indexOf(given.open[0].title), 'open questions come before the brief').toBeGreaterThanOrEqual(0);
  expect(pageText.indexOf(given.open[0].title), 'open questions come before The need').toBeLessThan(needAt);
  const openBox = await screen.review.openBox();
  const needBox = await screen.review.sectionBox('The need');
  expect(openBox.y, 'the open questions sit above the brief').toBeLessThan(needBox.y);
  let previous = -1;
  const openText = await screen.review.openText();
  for (let index = 0; index < given.open.length; index += 1) {
    const item = given.open[index];
    const at = openText.indexOf(item.title);
    expect(at, `${item.title} is on the review in importance order`).toBeGreaterThan(previous);
    previous = at;
    const row = await screen.review.openItem(item.title);
    expect(row, `${item.title} shows ${OPEN_IMPORTANCE[index]}`).toContain(OPEN_IMPORTANCE[index]);
    expect(row, `${item.title} shows why it matters`).toContain(item.why);
    expect(row, `${item.title} shows its suggestion`).toContain(`Suggested: ${item.suggested}`);
  }
  const rules = given.open[2];
  await screen.review.useSuggestion(rules.title);
  const section = await eventually(
    'the accepted suggestion becomes a section',
    () => screen.review.sectionText(rules.title),
    (text) => text.includes('Suggestion you accepted') && text.includes(rules.suggested),
  );
  expect(section, 'the source is Suggestion you accepted').toContain('Suggestion you accepted');
  expect(section, 'the accepted words stay Weekly shift limit').toContain(rules.suggested);
  expect(await screen.review.hasEdit(rules.title), 'the accepted section has Edit').toBe(true);
  expect(await screen.modelCalls(), 'Use the suggestion makes no model call').toEqual([]);
  const accepted = await screen.review.text();
  expect(accepted, 'accepting creates the next revision').toContain(`Revision ${given.revision + 1}`);
  expect(accepted, 'accepting lowers the open count').toContain('3 questions are still open');
  const line = TEXT.usedSuggestion(rules.title, rules.suggested);
  await screen.review.back();
  await eventually('Use the suggestion adds your line', () => screen.chat.yourText(), (text) => text.includes(line));
  await screen.brief.open();
  expect(await screen.brief.hasEdit(rules.title), 'the live brief section has Edit').toBe(true);
  await screen.brief.edit(rules.title);
  const rulesQuestion = screen.chat.question(rules.question);
  await eventually('Edit reopens the accepted question', () => rulesQuestion.isAsked(), (asked) => asked);
  const rulesText = await rulesQuestion.text();
  expect(rulesText, 'Edit shows the suggestion option').toContain(rules.suggested);
  expect(rulesText, 'Edit shows Save change').toContain(TEXT.saveChange);
  await screen.questions.view(rules.question);
  await eventually(
    'View highlights the suggestion line',
    () => screen.chat.answerCurrent(line),
    (current) => current === 'true',
  );
  await screen.questions.close();
  await screen.review.open();
  const owner = given.open[0];
  await screen.review.answerInChat(owner.title);
  const question = screen.chat.question(owner.question);
  await eventually('Answer in the chat keeps the question in the chat', () => question.isAsked(), (asked) => asked);
  await eventually('Answer in the chat focuses the question', () => question.hasFocus(), (focused) => focused);
  const row = await screen.questions.row(owner.question);
  expect(row, 'the question stays Open').toContain('Open');
  await screen.questions.close();
  const usageBefore = await screen.usage.text();
  const callsBefore = await screen.modelCalls();
  await screen.files.openAdd();
  await screen.files.choose(sampleFile('shift-notes.txt'));
  await eventually(
    'the new file shows Reading',
    () => screen.files.row('shift-notes.txt'),
    (text) => /Reading… \d+%/.test(text),
  );
  await screen.review.open();
  expect(await screen.review.text(), 'Finish stays unavailable while a file is reading').toContain(TEXT.fileStillReading);
  expect(await screen.review.finishDisabled(), 'Finish Discovery is unavailable while a file is reading').toBe(true);
  await screen.review.tick(TEXT.ack.reviewed(given.revision + 1));
  await screen.review.tick(TEXT.ack.gaps(given.open.length - 1));
  await screen.review.tick(TEXT.ack.data);
  await eventually(
    'the read is ready and the hint is gone',
    () => screen.review.text(),
    (text) => text.includes('I found three facts in shift-notes.txt') && !text.includes(TEXT.fileStillReading),
    8_000,
  );
  expect(await screen.review.finishDisabled(), 'Finish Discovery is available when the read is ready').toBe(false);
  const callsAfter = await screen.modelCalls();
  expect(callsAfter, 'the read is one file-read').toEqual([...callsBefore, 'file-read']);
  await screen.review.finish();
  expect(await screen.review.text(), 'Finish records Discovery finished with open questions').toContain(
    'Discovery finished with open questions',
  );
  expect(await screen.modelCalls(), 'Finish makes no model call').toEqual(callsAfter);
  await screen.review.back();
  expect(await screen.usage.text(), 'Finish and the read consume no turn or fuel').toBe(usageBefore);
  expect(await screen.modelCalls(), 'returning to the chat makes no model call').toEqual(callsAfter);
  await screen.brief.open();
  expect(await screen.brief.hasEdit(rules.title), 'the accepted section has Edit after confirmation').toBe(true);
  await screen.brief.back();
}

export async function expectChangeReopensDiscovery(
  screen: DiscoveryPage,
  given: (typeof GIVEN)['finish-open'],
): Promise<void> {
  const priorityQuestion = 'What should improve first?';
  const nextAnswer = 'Fewer unfilled shifts';
  await screen.review.ready();
  await screen.review.tick(TEXT.ack.reviewed(given.revision));
  await screen.review.tick(TEXT.ack.gaps(given.open.length));
  await screen.review.tick(TEXT.ack.data);
  await screen.review.finish();
  await eventually('the sidebar shows Discovery done', () => screen.steps.done('Discovery'), (done) => done);
  expect(await screen.steps.done('Discovery review'), 'the sidebar shows Discovery review done').toBe(true);
  const calls = await screen.modelCalls();
  await screen.review.back();
  await eventually('confirmation replaces the composer', () => screen.composer.formCount(), (count) => count === 0);
  const usage = await screen.usage.text();
  expect(usage, 'Free today stays 3 of 10 before the edit').toContain('3 of 10');
  expect(usage, 'Beta stays 18 of 50 before the edit').toContain('18 of 50');
  expect(await screen.files.addDisabled(), 'a confirmed Discovery disables Add a file').toBe('true');
  expect(await screen.files.text(), 'the files card says why').toContain(TEXT.filesFinished);

  const owner = given.open[0];
  await screen.questions.answer(owner.question);
  const ownerQuestion = screen.chat.question(owner.question);
  await eventually('Answer shows the question after confirmation', () => ownerQuestion.isAsked(), (asked) => asked);
  const ownerText = await ownerQuestion.text();
  expect(ownerText, 'Answer shows an option').toContain(owner.suggested);
  expect(ownerText, 'Answer shows Save change').toContain(TEXT.saveChange);
  await screen.review.open();
  expect(await screen.review.text(), 'Answer does not clear the confirmation').toContain('Discovery finished');

  await screen.review.back();
  await screen.brief.open();
  await screen.brief.edit(given.agreed[0].title);
  const priority = screen.chat.question(priorityQuestion);
  await eventually('Edit shows the question after confirmation', () => priority.isAsked(), (asked) => asked);
  const priorityText = await priority.text();
  expect(priorityText, 'Edit shows the other option').toContain(nextAnswer);
  expect(priorityText, 'Edit shows Save change').toContain(TEXT.saveChange);
  await screen.brief.open();
  await screen.brief.back();
  await screen.review.open();
  expect(await screen.review.text(), 'Back without Save change keeps the confirmation').toContain('Discovery finished');
  expect(await screen.modelCalls(), 'Edit and Back make no model call').toEqual(calls);

  await screen.review.back();
  await priority.pick(nextAnswer);
  await priority.saveChange();
  await screen.brief.open();
  const saved = await eventually(
    'the brief shows the saved answer',
    () => screen.brief.text(),
    (text) => text.includes(nextAnswer) && text.includes(`Revision ${given.revision + 1}`),
  );
  expect(saved, 'the brief shows the new answer').toContain(nextAnswer);
  expect(saved, 'the brief records your edit').toContain('Your edit');
  expect(saved, 'the dependent topic needs review').toContain('Needs review');
  const after = await screen.usage.text();
  expect(after, 'Free today stays 3 of 10').toContain('3 of 10');
  expect(after, 'Beta stays 18 of 50').toContain('18 of 50');
  expect(after, 'Save change leaves the usage card unchanged').toBe(usage);
  expect(await screen.modelCalls(), 'Save change makes no model call').toEqual(calls);
  await eventually('the finished composer leaves', () => screen.composer.formCount(), (count) => count === 1);
  expect(await screen.files.addDisabled(), 'a reopened Discovery enables Add a file again').toBeNull();

  await screen.review.open();
  const review = await screen.review.text();
  expect(review, 'the finished state is gone').not.toContain('Discovery finished');
  expect(review, 'the review asks for the new revision').toContain(TEXT.ack.reviewed(given.revision + 1));
  expect(await screen.review.ticked(TEXT.ack.reviewed(given.revision + 1)), 'the review tick is clear').toBe(false);
  expect(await screen.review.ticked(TEXT.ack.data), 'the data acknowledgment is clear').toBe(false);
  expect(await screen.review.finishDisabled(), 'Finish Discovery needs the acknowledgments again').toBe(true);
  await eventually('a change removes the Discovery check', () => screen.steps.done('Discovery'), (done) => done === false);
  expect(await screen.steps.done('Discovery review'), 'a change removes the Discovery review check').toBe(false);
}

export async function expectDocument(
  screen: DiscoveryPage,
  given: (typeof GIVEN)['confirmed-tier-2'] | (typeof GIVEN)['confirmed-tier-1'],
): Promise<void> {
  const text = await screen.document.text();
  expect(text, 'the document names the project').toContain('Volunteer scheduling');
  expect(text, 'the document is your Discovery document').toContain('your Discovery document');
  expect(text, 'the document holds the need in the NGO words').toContain(given.need);
  expect(text, 'the need shows From your intake').toContain('From your intake');
  expect(text, 'the document names who uses the tool').toContain('Who uses it, and what they do today');
  for (const line of given.users.split('\n')) {
    expect(text, 'the document holds how they work today').toContain(line);
  }
  for (const item of given.agreed) {
    expect(text, `${item.title} keeps the agreed answer`).toContain(item.answer);
    expect(text, `${item.title} shows From the chat, round ${item.round}`).toContain(`From the chat, round ${item.round}`);
  }
  expect(text, 'the document holds how the NGO will know it works').toContain('How you will know it works');
  expect(text, 'the success measure stays in the NGO words').toContain(given.success);
  expect(text, 'the success measure shows From the chat, round 4').toContain('From the chat, round 4');
  const openImportance = ['Needed before build', 'A suggestion exists'] as const;
  for (let index = 0; index < given.open.length; index += 1) {
    const item = given.open[index];
    expect(text, `${item.title} stays in the document`).toContain(item.title);
    expect(text, `${item.title} keeps ${openImportance[index]}`).toContain(openImportance[index]);
    expect(text, `${item.title} keeps why it matters`).toContain(item.why);
  }
  for (const file of given.files) {
    expect(text, `${file.name} is in the document`).toContain(file.name);
    expect(text, `${file.name} says what the AI took`).toContain('The AI took from it:');
    expect(text, `${file.name} keeps what the AI took`).toContain(file.took);
  }
  expect(text, `the document explains Tier ${given.tier}`).toContain(`Tier ${given.tier}`);
  if (given.tier === 2) expect(text, 'Tier 2 says sample data only').toContain('sample data only');
  else expect(text, 'Tier 1 does not say sample data only').not.toContain('sample data only');
  expect(text, 'the fit verdict says a staff member can look after this tool by chat').toContain(
    'a staff member can look after this tool by chat',
  );
  expect(given.labels.length, 'the document has at most three cause labels').toBeLessThanOrEqual(3);
  if (given.labels.length === 0) expect(text, 'zero cause labels say No cause label.').toContain('No cause label.');
  for (const label of given.labels) expect(text, `the cause label ${label} is in the document`).toContain(label);
  for (const blocked of ['stack', 'complexity', 'Lovable', 'build split', '$']) {
    expect(text, `the document does not contain ${blocked}`).not.toContain(blocked);
  }
}

export async function expectEditClearsReview(screen: DiscoveryPage, given: (typeof GIVEN)['finish-open']): Promise<void> {
  await screen.review.ready();
  expect(await screen.review.backVisible(), 'Back to the chat is available before the edit').toBe(true);
  expect(await screen.modelCalls(), 'the review starts with no model call').toEqual([]);
  await screen.review.back();
  const usageBefore = await screen.usage.text();
  await screen.review.open();
  await screen.review.tick(TEXT.ack.reviewed(given.revision));
  await screen.review.tick(TEXT.ack.gaps(given.open.length));
  await screen.review.tick(TEXT.ack.data);
  expect(await screen.review.finishDisabled(), 'Finish Discovery is available after the three ticks').toBe(false);
  await screen.review.edit('The need');
  expect(await screen.review.finishDisabled(), 'Finish Discovery stays unavailable while an edit is open').toBe(true);
  expect(await screen.review.backVisible(), 'Back to the chat is available while an edit is open').toBe(true);
  await screen.review.fill('The need', given.edit);
  await screen.review.save('The need');
  const section = await eventually(
    'the saved section keeps the new words',
    () => screen.review.sectionText('The need'),
    (text) => text.includes(given.edit),
  );
  expect(section, 'the edit is kept verbatim').toContain(given.edit);
  expect(await screen.review.text(), 'saving creates the next revision').toContain(`Revision ${given.revision + 1}`);
  expect(await screen.review.ticked(TEXT.ack.reviewed(given.revision + 1)), 'the review tick clears for the new revision').toBe(
    false,
  );
  expect(await screen.review.ticked(TEXT.ack.gaps(given.open.length)), 'the open-questions tick stays').toBe(true);
  expect(await screen.review.ticked(TEXT.ack.data), 'the data tick stays').toBe(true);
  expect(await screen.review.finishDisabled(), 'Finish Discovery stays unavailable until the review is ticked again').toBe(true);
  await screen.review.tick(TEXT.ack.reviewed(given.revision + 1));
  expect(await screen.review.finishDisabled(), 'Finish Discovery is available after the review is ticked again').toBe(false);
  expect(await screen.review.backVisible(), 'Back to the chat is available after the save').toBe(true);
  expect(await screen.review.buttonCount('rewrite'), 'no rewrite control').toBe(0);
  expect(await screen.review.buttonCount('regenerate'), 'no regenerate control').toBe(0);
  await screen.review.back();
  expect(await screen.usage.text(), 'the edit consumes no turn or fuel').toBe(usageBefore);
  expect(await screen.modelCalls(), 'the edit makes no model call').toEqual([]);
}

export async function expectReviewFits(screen: DiscoveryPage, given: (typeof GIVEN)['finish-open']): Promise<void> {
  await screen.review.ready();
  expect(await screen.review.jumpVisible(), 'Go to Finish Discovery is on screen before the card is in view').toBe(true);
  await expectFullyVisible(screen, 'Back to the chat', await screen.review.backBox());
  await expectFullyVisible(screen, 'Use the suggestion', await screen.review.suggestionBox());
  await expectFullyVisible(screen, 'Answer in the chat', await screen.review.answerBox());
  await expectFullyVisible(screen, 'Go to Finish Discovery', await screen.review.jumpBox());
  await screen.review.goToFinish();
  await expectFullyVisible(screen, 'Finish Discovery', await screen.review.finishBox());
  await expectFullyVisible(screen, 'the review tick', await screen.review.checkBox(TEXT.ack.reviewed(given.revision)));
  await expectFullyVisible(screen, 'the open-questions tick', await screen.review.checkBox(TEXT.ack.gaps(given.open.length)));
  await expectFullyVisible(screen, 'the data tick', await screen.review.checkBox(TEXT.ack.data));
  await screen.review.edit('The need');
  await expectFullyVisible(screen, 'the edit box', await screen.review.editBox('The need'));
  await expectFullyVisible(screen, 'Cancel', await screen.review.cancelBox('The need'));
  await expectFullyVisible(screen, 'Save', await screen.review.saveBox('The need'));
}
