import type { DiscoveryModelRequest } from './discovery-turn.ts';

/**
 * The Responses API request. Some served models accept only `auto` tool choice, so a forced tool is asked for in the
 * instructions, and their strict mode demands every property be required, which the reply tool's optional fields are not.
 */
export function responsesBody(request: DiscoveryModelRequest, stream: boolean, model: string, effort: string): Record<string, unknown> {
  const system = request.system.map((block) => block.text).join('\n\n');
  const forced = request.toolChoice ? `\n\nAnswer with exactly one call to the ${request.toolChoice.name} tool and nothing else.` : '';
  return {
    model,
    instructions: system + forced,
    input: request.messages.map((message, index) => index === request.messages.length - 1 && request.images?.length
      ? { role: message.role, content: [
          { type: 'input_text', text: message.content },
          ...request.images.map((image) => ({ type: 'input_image', image_url: `data:${image.mediaType};base64,${image.data}` })),
        ] }
      : { role: message.role, content: message.content }),
    max_output_tokens: request.maxTokens,
    tools: request.tools.map((tool) => ({
      type: 'function', name: tool.name, description: tool.description, parameters: tool.input_schema, strict: false,
    })),
    ...(request.toolChoice ? { tool_choice: 'auto' } : {}),
    reasoning: { effort },
    stream,
  };
}

/** A stable id for one conversation: its system prompt head and first message do not change between turns. */
export async function conversationId(request: DiscoveryModelRequest): Promise<string> {
  const seed = `${request.system[0]?.text ?? ''}\n${request.messages[0]?.content ?? ''}`;
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(seed)));
  return [...digest.slice(0, 16)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}
