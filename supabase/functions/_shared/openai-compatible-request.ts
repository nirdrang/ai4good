import type { DiscoveryModelRequest } from './discovery-turn.ts';

export function requestBody(request: DiscoveryModelRequest, stream: boolean, model: string, effort: string): Record<string, unknown> {
  const forced = request.toolChoice ? `\n\nAnswer with exactly one call to the ${request.toolChoice.name} tool and nothing else.` : '';
  return {
    model,
    messages: [
      { role: 'system', content: request.system.map((block) => block.text).join('\n\n') + forced },
      ...request.messages.map((message, index) => index === request.messages.length - 1 && request.images?.length
        ? { role: message.role, content: [
            { type: 'text', text: message.content },
            ...request.images.map((image) => ({ type: 'image_url', image_url: { url: `data:${image.mediaType};base64,${image.data}` } })),
          ] }
        : message),
    ],
    max_tokens: request.maxTokens,
    tools: request.tools.map((tool) => ({
      type: 'function',
      function: { name: tool.name, description: tool.description, parameters: tool.input_schema,
        ...(tool.strict === undefined ? {} : { strict: tool.strict }) },
    })),
    ...(request.toolChoice ? { tool_choice: 'auto' } : {}),
    reasoning_effort: effort,
    ...(stream ? { stream: true, stream_options: { include_usage: true } } : {}),
  };
}
