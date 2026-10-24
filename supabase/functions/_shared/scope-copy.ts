export const SCOPE_COPY = {
  maintenance:
    'The NGO evolves the tool by chat, pays Lovable directly about 25 dollars a month, and owns the code.',
  lovablePricingUrl: 'https://lovable.dev/pricing',
  dataTier: {
    tier0: 'This tool has no personal-data restriction.',
    tier1: 'This tool handles ordinary personal data. Minimise what you collect. The NGO owns the exposure risk.',
    tier2:
      'This tool handles special-category or high-volume personal data. Use synthetic or anonymised fixtures only during the build. The NGO connects real data itself after completion. Real tier-2 data never reaches Anthropic, Lovable, or the volunteer.',
  },
  startSmall: 'Start small. Build the least the NGO needs first, then grow it by chat.',
  offTopicNotice:
    'This conversation was flagged because several messages were not about scoping this software need. You can keep talking. A person can see this conversation.',
  regenerationExhausted:
    'Scope regeneration is exhausted. A person will review this case.',
} as const;

export const DECLINE_COPY = {
  developerMaintenance:
    'ai4good cannot take on this need. It would need a developer to keep it running after the volunteer leaves, and ai4good only builds tools your staff can maintain by chat.',
  confidentialCodebase:
    'ai4good cannot take on this need. It needs a confidential codebase, and ai4good only builds in public.',
  oversight: 'A person at ai4good reads every decline and will contact you if it was wrong.',
} as const;
