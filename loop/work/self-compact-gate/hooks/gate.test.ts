import { expect, test } from 'claude-code/testing'

const OPTIONS = [{ label: 'Continue' }, { label: 'Run /compact' }, { label: 'Fast compact' }]

function wake(id: string, index: number) {
  return `<wake reason="decision-chosen"><system-note>decision_id=${id}</system-note>\n<system-note>option_index=${index}</system-note></wake>`
}

test('a fast compact answer on a gate card tells the lead to end the turn', async ($, on) => {
  on('tool.call', () => ({ result: '{"message_id":"cmsg_GATE1","note":"Card posted"}' }))
  const seen: (readonly string[] | undefined)[] = []
  on('prompt.submit', (_, e) => {
    seen.push(e.context)
    return { text: e.text }
  })
  await $.tool.call({ tool: 'mcp__hearthbot__request_decision', question: 'Unit 1 landed.', options: OPTIONS })
  await $.prompt.submit({ text: wake('cmsg_GATE1', 2) })
  expect(seen[0]?.some((c) => c.startsWith('The fast compact gate compacts'))).toBe(true)
})

test('a continue answer passes through untouched', async ($, on) => {
  on('tool.call', () => ({ result: '{"message_id":"cmsg_GATE2"}' }))
  const seen: (readonly string[] | undefined)[] = []
  on('prompt.submit', (_, e) => {
    seen.push(e.context)
    return { text: e.text }
  })
  await $.tool.call({ tool: 'mcp__hearthbot__request_decision', question: 'Unit 1 landed.', options: OPTIONS })
  await $.prompt.submit({ text: wake('cmsg_GATE2', 0) })
  expect(seen[0]?.length ?? 0).toBe(0)
})
