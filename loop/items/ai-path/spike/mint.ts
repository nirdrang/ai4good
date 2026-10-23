import { mintGrant } from './grant.ts';

const [secret, project, chat, ttl] = Deno.args;
console.log(await mintGrant(secret, { project, chat, session: chat, exp: Math.floor(Date.now() / 1000) + Number(ttl) }));
