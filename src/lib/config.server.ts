import process from "node:process";

// On Cloudflare Workers, env binds at REQUEST time. Module-scope reads
// (e.g. `const x = process.env.X`) resolve to undefined — always read
// process.env INSIDE a function or handler.

export function getServerConfig() {
  return {
    nodeEnv: process.env.NODE_ENV,
  };
}
