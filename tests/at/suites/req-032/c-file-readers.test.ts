import { expect } from 'vitest';
import { atTest, AtPending } from './_bind.ts';
import { authPost, functionPostRaw, sqlClient, stackFromEnv, type Stack } from '../../harness/live-stack.ts';
import { seedFileProject, uploadFile } from './_files.ts';

const PASSWORD = 'correct horse battery staple';

async function provisionReader(stack: Stack, sql: ReturnType<typeof sqlClient>, email: string, accountType: 'volunteer' | 'platform_admin') {
  const created = await fetch(`${stack.apiUrl}/auth/v1/admin/users`, {
    method: 'POST',
    headers: { apikey: stack.serviceRoleKey, Authorization: `Bearer ${stack.serviceRoleKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: PASSWORD, email_confirm: true }),
  });
  expect(created.status, `provisioning ${email}`).toBeLessThan(400);
  const accountId = String(((await created.json()) as { id?: string }).id);
  await sql`insert into public.accounts (id, account_type) values (${accountId}::uuid, ${accountType}::public.account_type)`;
  const login = await authPost(stack, '/auth/v1/token?grant_type=password', { email, password: PASSWORD });
  expect(login.status, `sign-in for ${email}`).toBe(200);
  return { accountId, bearer: String(login.json.access_token) };
}

atTest('AT-032.04', 'attachment actor access matrix', { timeoutMs: { integration: 180_000 } }, {
  integration: async ({ open }) => {
    const { w, sut } = await open();
    const stack = stackFromEnv();
    const seed = await seedFileProject(stack, sut, w.email('readers-owner'));
    try {
      const sentinel = `reader sentinel ${crypto.randomUUID()}\n`;
      const added = await uploadFile(stack, seed.bearer, seed.ngo.organizationId, seed.projectId, 'rota.txt', sentinel);
      expect(added, JSON.stringify(added)).toMatchObject({ status: 200, body: { ok: true } });
      const fileId = String((added.body.file as { id: string }).id);

      const otherEmail = w.email('readers-other-ngo');
      await sut.provisionNgo(otherEmail, { emailVerified: true });
      const otherLogin = await authPost(stack, '/auth/v1/token?grant_type=password', { email: otherEmail, password: PASSWORD });
      expect(otherLogin.status).toBe(200);
      const assigned = await provisionReader(stack, seed.sql, w.email('readers-assigned'), 'volunteer');
      const unassigned = await provisionReader(stack, seed.sql, w.email('readers-unassigned'), 'volunteer');
      const admin = await provisionReader(stack, seed.sql, w.email('readers-admin'), 'platform_admin');
      await seed.sql`update public.projects set assigned_volunteer_id = ${assigned.accountId}::uuid where id = ${seed.projectId}::uuid`;

      const request = (bearer: string | null) => fetch(`${stack.apiUrl}/functions/v1/project-file`, {
        method: 'POST',
        headers: { apikey: stack.anonKey, 'Content-Type': 'application/json', ...(bearer === null ? {} : { Authorization: `Bearer ${bearer}` }) },
        body: JSON.stringify({ fileId }),
      }).then(async (response) => ({ status: response.status, text: await response.text() }));

      for (const [who, bearer] of [['the project NGO', seed.bearer], ['the assigned volunteer', assigned.bearer], ['the platform admin', admin.bearer]] as const) {
        expect(await request(bearer), `${who} reads the file`).toEqual({ status: 200, text: sentinel });
      }
      for (const [who, bearer] of [['a different NGO', String(otherLogin.json.access_token)], ['an unassigned volunteer', unassigned.bearer]] as const) {
        const refused = await request(bearer);
        expect(refused.status, `${who} is refused`).toBe(404);
        expect(refused.text, `${who} sees none of the file`).not.toContain(sentinel.trim());
      }
      const anonymous = await functionPostRaw(stack, 'project-file', { fileId }, null);
      expect(anonymous.status, 'a request with only the public key is refused').toBe(401);
      expect((await request(null)).status, 'a request with no bearer is refused').toBe(401);

      await seed.sql`update public.projects set assigned_volunteer_id = null where id = ${seed.projectId}::uuid`;
      expect((await request(assigned.bearer)).status, 'a released volunteer is refused').toBe(404);
    } finally { await seed.sql.close(); }
  },
  default: async () => { throw new AtPending('AT-032.04', 'sut-missing', 'The loop tier has no stack to read files from.'); },
});
