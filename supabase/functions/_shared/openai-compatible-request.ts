import type { DiscoveryModelRequest } from './discovery-turn.ts';

/** The provider request, preserving the forced tool's schema settings. */
export function requestBody(request: DiscoveryModelRequest, stream: boolean, model: string, effort: string): Record<string, unknown> {
  return {
    model,
    messages: [
      { role: 'system', content: request.system.map((block) => block.text).join('\n\n') },
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
    ...(request.toolChoice ? { tool_choice: { type: 'function', function: { name: request.toolChoice.name } } } : {}),
    reasoning_effort: effort,
    ...(stream ? { stream: true, stream_options: { include_usage: true } } : {}),
  };
}
