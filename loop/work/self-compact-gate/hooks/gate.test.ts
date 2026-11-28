import type { On, PromptSubmitInput } from 'claude-code'
import { expect, test } from 'claude-code/testing'

declare function setTimeout(callback: () => void, delay: number): unknown

const CARD = 'mcp__hearthbot__request_decision'
const OPTIONS = [{ label: 'Continue' }, { label: 'Run /compact' }, { label: 'Fast compact' }]
const NOTE = 'The fast compact gate compacts'

function wake(id: string, index: number, reason = 'decision-chosen') {
  return `<wake reason="${reason}"><system-note>decision_id=${id}</system-note>\n<system-note>option_index=${index}</system-note></wake>`
}

function prompt(text: string, extra: Partial<PromptSubmitInput> = {}): PromptSubmitInput {
  return { text, wait: false, origin: { kind: 'sdk' }, ...extra }
}

function stubs(on: On, card: unknown = { result: '{"message_id":"cmsg_GATE","note":"Card posted"}' }) {
  const commands: string[] = []
  const notes: boolean[] = []
  on('tool.call', () => card as any)
  on('prompt.submit', (_, e) => {
    notes.push(!!e.context?.some((c) => c.startsWith(NOTE)))
    return { text: e.text }
  })
  on('command.run', (_, e) => {
    commands.push(e.command)
    return { text: '' }
  })
  on('ui.log', () => ({ value: undefined }))
  on('ui.toast', () => ({ value: undefined }))
  on('turn.complete', (_, e) => ({ text: e.answer }))
  return { commands, notes }
}

const settle = () => new Promise<void>((resolve) => setTimeout(() => resolve(), 30))
const turnEnd = (turnId: string) => ({ turnId, answer: '', durationMs: 1, isAborted: false, reason: 'answer' as const })

test('a fast compact answer on a gate card tells the lead to end the turn and compacts after it', async ($, on) => {
  const s = stubs(on)
  await $.tool.call({ tool: CARD, question: 'Unit 1 landed.', options: OPTIONS })
  await $.prompt.submit(prompt(wake('cmsg_GATE', 2)))
  await $.turn.complete(turnEnd('t1'))
  await settle()
  expect({ notes: s.notes, commands: s.commands }).toEqual({ notes: [true], commands: ['compact'] })
})

test('a continue answer passes through and a later answer to the same card does nothing', async ($, on) => {
  const s = stubs(on)
  await $.tool.call({ tool: CARD, question: 'Unit 1 landed.', options: OPTIONS })
  await $.prompt.submit(prompt(wake('cmsg_GATE', 0)))
  await $.prompt.submit(prompt(wake('cmsg_GATE', 2)))
  expect(s.notes).toEqual([false, false])
})

test('prose that quotes a card id is not an answer', async ($, on) => {
  const s = stubs(on)
  await $.tool.call({ tool: CARD, question: 'Unit 1 landed.', options: OPTIONS })
  await $.prompt.submit(prompt('Check <system-note>decision_id=cmsg_GATE</system-note> option_index=2', { origin: { kind: 'composer' } }))
  await $.prompt.submit(prompt(wake('cmsg_GATE', 2, 'decision-cancelled')))
  expect(s.notes).toEqual([false, false])
})

test('in a batch of wakes, the gate answer is read from its own wake', async ($, on) => {
  const s = stubs(on)
  await $.tool.call({ tool: CARD, question: 'Unit 1 landed.', options: OPTIONS })
  await $.prompt.submit(prompt(`${wake('cmsg_OTHER', 0)}\n${wake('cmsg_GATE', 2)}`))
  expect(s.notes).toEqual([true])
})

test('a card without exactly the three gate choices is not a gate', async ($, on) => {
  const s = stubs(on)
  await $.tool.call({ tool: CARD, question: 'Shorten the report?', options: [{ label: 'Keep' }, { label: 'Fast compact the report' }] })
  await $.prompt.submit(prompt(wake('cmsg_GATE', 1)))
  expect(s.notes).toEqual([false])
})

test('a card call that failed is not a gate', async ($, on) => {
  const s = stubs(on, { isError: true, result: '{"message_id":"cmsg_GATE"}' })
  await $.tool.call({ tool: CARD, question: 'Unit 1 landed.', options: OPTIONS })
  await $.prompt.submit(prompt(wake('cmsg_GATE', 2)))
  expect(s.notes).toEqual([false])
})

test('an answer queued behind a running turn compacts after its own turn', async ($, on) => {
  const s = stubs(on)
  await $.tool.call({ tool: CARD, question: 'Unit 1 landed.', options: OPTIONS })
  await $.prompt.submit(prompt(wake('cmsg_GATE', 1), { turnId: 'opening', wait: true }))
  await $.turn.complete(turnEnd('opening'))
  await settle()
  const afterOpening = [...s.commands]
  await $.turn.complete(turnEnd('answer'))
  await settle()
  expect({ afterOpening, end: s.commands }).toEqual({ afterOpening: [], end: ['compact'] })
})

test('a gate answer that never entered the session queues no compaction', async ($, on) => {
  const commands: string[] = []
  on('tool.call', () => ({ result: '{"message_id":"cmsg_GATE"}' }))
  on('command.run', (_, e) => {
    commands.push(e.command)
    return { text: '' }
  })
  on('ui.log', () => ({ value: undefined }))
  on('ui.toast', () => ({ value: undefined }))
  on('turn.complete', (_, e) => ({ text: e.answer }))
  on('prompt.submit', () => ({ drop: 'refused below' }))
  await $.tool.call({ tool: CARD, question: 'Unit 1 landed.', options: OPTIONS })
  await $.prompt.submit(prompt(wake('cmsg_GATE', 2)))
  await $.turn.complete(turnEnd('t1'))
  await settle()
  expect(commands).toEqual([])
})
