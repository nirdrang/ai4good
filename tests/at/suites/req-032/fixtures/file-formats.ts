export type FormatFixture = {
  format: string;
  file: string;
  mediaType: string;
  kitchen: string;
  volunteers: number;
  shift: string;
};

export const FILE_FORMATS: readonly FormatFixture[] = [
  { format: 'PDF', file: 'rota-pdf.pdf', mediaType: 'application/pdf', kitchen: 'Harbor', volunteers: 17, shift: 'Saturday mornings' },
  { format: 'PNG image', file: 'rota-image.png', mediaType: 'image/png', kitchen: 'Lantern', volunteers: 23, shift: 'Sunday evenings' },
  { format: 'scanned PDF', file: 'rota-scan.pdf', mediaType: 'application/pdf', kitchen: 'Willow', volunteers: 26, shift: 'Monday afternoons' },
];

export const sentence = (fixture: FormatFixture) =>
  `The ${fixture.kitchen} kitchen needs ${fixture.volunteers} volunteers on ${fixture.shift}.`;

export const fixtureUrl = (fixture: FormatFixture) => new URL(fixture.file, import.meta.url);
