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
  ownership: 'The NGO owns the code.',
  offTopicNotice:
    'This conversation was flagged because several messages were not about scoping this software need. You can keep talking. A person can see this conversation.',
} as const;
