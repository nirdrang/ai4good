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
  startSmall: 'Start small.',
  ownership: 'The NGO owns the code.',
} as const;
