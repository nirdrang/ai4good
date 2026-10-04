import { expect, it } from 'vitest';
import { JsonTextFieldDecoder } from '../../../supabase/functions/_shared/json-text-decoder.ts';

function decode(chunks: readonly string[]): string {
  const decoder = new JsonTextFieldDecoder('text');
  return chunks.map((chunk) => decoder.push(chunk)).join('');
}

it('reads a text field that is not the first property', () => {
  const json = '{"agreed":[{"topicId":"priority","answer":"see text"}],"text":"Yes, that one."}';
  expect(decode([json])).toBe('Yes, that one.');
  expect(decode([json.slice(0, 40), json.slice(40)])).toBe('Yes, that one.');
});

it('reads an empty text field', () => {
  expect(decode(['{"questions":[],"text":""}'])).toBe('');
  expect(decode(['{"text":', '""}'])).toBe('');
});

it('joins escapes and unicode that are split across chunks', () => {
  const decoder = new JsonTextFieldDecoder('text');
  expect(decoder.push('{"note":"say \\"text\\": later","text":"A\\')).toBe('A');
  expect(decoder.push('nB\\u00')).toBe('\nB');
  expect(decoder.push('41\\uD83D\\u')).toBe('A');
  expect(decoder.push('DE00"')).toBe('😀');
  expect(decoder.text()).toBe('A\nBA😀');
  expect(decoder.done()).toBe(true);
});

it('does not treat a nested text key as the reply', () => {
  expect(decode(['{"wrap":{"text":"inner"},"text":"outer"}'])).toBe('outer');
});
