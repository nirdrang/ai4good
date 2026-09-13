export const REFERENCE_FILE_DISCLOSURE = {
  base: {
    heading: 'Redacted or sample data only.',
    body: 'Redacted or sample data only. Files here are seen by ai4good and by your volunteer once matched. Never upload real names, contact details, case notes or anything you would not hand to a stranger — make a copy with sample rows instead.',
  },
  tier2Hardened: {
    heading: 'This project handles sensitive data — fixtures only',
    body: 'Discovery classified this project Tier 2: the finished tool will touch personal or sensitive records. That changes what may be uploaded here, permanently. What Tier 2 means for files: Nothing real, ever: no genuine names, addresses, health notes, case records or identifying details — not even “just one row to show the format”. Upload fixtures: made-up records in the real structure. The build and all testing run on fixtures; real data only ever enters the finished tool, inside your own accounts, after completion. ai4good and your volunteer see everything you upload here, and every project’s repository is public.',
    acknowledgment: 'I understand: only made-up sample records (fixtures) will be uploaded to this project — never real personal or sensitive data, in any form.',
  },
} as const;
