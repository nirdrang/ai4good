# GitHub setup for the PRD in git (founder steps)

Decision d101 puts each project's PRD in a GitHub repository that the platform creates. The tests run against a real GitHub test organization. These steps create that organization and the platform's GitHub App for it. They need your GitHub account, so the lead cannot do them. They take about fifteen minutes.

Do not paste any key or secret into the chat. Put them only in the file named in step 6.

## 1. Create the test organization

1. On GitHub, open your profile menu, then **Your organizations**, then **New organization**.
2. Choose the **Free** plan.
3. Give it a name, for example `ai4good-prd-test`. Remember it: this is `PRD_GITHUB_ORG`.

## 2. Create the GitHub App, owned by that organization

1. Open the organization's **Settings**, then **Developer settings**, then **GitHub Apps**, then **New GitHub App**.
2. Name: for example `ai4good-prd-test-app`. Homepage URL: any URL, for example the repository's GitHub page.
3. Webhook:
   - Leave **Active** ticked.
   - Webhook URL: enter `https://example.com/prd-github-hook` for now. The lead replaces it with the tunnel address when the webhook case runs.
   - Webhook secret: make up a long random string and keep it. This is `GITHUB_WEBHOOK_SECRET`.
4. Repository permissions:
   - **Administration: Read and write**, so the App can create repositories.
   - **Contents: Read and write**, so it can write the PRD files and tags.
   - **Metadata: Read-only**, which GitHub sets by itself.

   These permission names are the lead's understanding of GitHub's App settings, not checked against your screen. If a name differs, tell the lead before you save.
5. Subscribe to events: tick **Push**.
6. "Where can this GitHub App be installed?": **Only on this account**.
7. Select **Create GitHub App**. On the page that opens, note the **App ID**. This is `GITHUB_APP_ID`.

## 3. Generate the private key

On the App's page, under **Private keys**, select **Generate a private key**. Your browser downloads a `.pem` file. Keep it, and never commit it.

## 4. Install the App on the organization

On the App's page, select **Install App**, choose the test organization, and select **All repositories**.

## 5. Allow the run to clean up (optional)

Each test run creates repositories in the test organization, named with a run prefix. Tell the lead whether the run may delete the repositories it created. Until you say so, they stay.

## 6. Put the values where the stack reads them

Open `supabase/functions/.env` in the item worktree. It is gitignored, so it is never committed. Add these four lines:

```
PRD_GITHUB_ORG=ai4good-prd-test
GITHUB_APP_ID=123456
GITHUB_WEBHOOK_SECRET=the-secret-from-step-2
GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"
```

For the private key, put the whole `.pem` content on one line, with `\n` where each line break was. Then tell the lead "GitHub is set up". The lead restarts the stack and checks that the App can mint a token, without printing any secret.

## Later, for CI

The same four values go into the GitHub repository's Actions secrets, under the same names, so the integration tier runs there too. The lead names the step when the first CI run needs it.
