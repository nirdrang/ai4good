declare const Deno: { env: { get(name: string): string | undefined } };
declare module 'npm:@anthropic-ai/sdk@0.115.0' {
  export { default } from '@anthropic-ai/sdk';
}
