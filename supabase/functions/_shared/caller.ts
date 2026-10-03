import { extractGithubHandle } from './github.ts';
import { emailVerifiedFromUser } from './verification.ts';

export type Caller = {
  id: string;
  githubHandle: string | null;
  emailVerified: boolean;
};

function isSuccessStatus(status: number): boolean {
  return status >= 200 && status <= 299;
}

export function callerFromAuthAnswer(status: number, user: unknown): Caller | null {
  if (!isSuccessStatus(status)) return null;
  if (typeof user !== 'object' || user === null) return null;
  const id = (user as { id?: unknown }).id;
  if (typeof id !== 'string') return null;
  return { id, githubHandle: extractGithubHandle(user), emailVerified: emailVerifiedFromUser(user) };
}
