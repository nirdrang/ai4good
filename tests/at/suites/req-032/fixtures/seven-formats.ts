export type FormatFixture = {
  format: string;
  file: string;
  mediaType: string;
  kitchen: string;
  volunteers: number;
  shift: string;
};

export const SEVEN_FORMATS: readonly FormatFixture[] = [
  { format: 'PDF', file: 'rota-pdf.pdf', mediaType: 'application/pdf', kitchen: 'Harbor', volunteers: 17, shift: 'Saturday mornings' },
  { format: 'PNG image', file: 'rota-image.png', mediaType: 'image/png', kitchen: 'Lantern', volunteers: 23, shift: 'Sunday evenings' },
  { format: 'CSV', file: 'rota-csv.csv', mediaType: 'text/csv', kitchen: 'Orchard', volunteers: 31, shift: 'Tuesday lunchtimes' },
  { format: 'TSV', file: 'rota-tsv.tsv', mediaType: 'text/tab-separated-values', kitchen: 'Quarry', volunteers: 14, shift: 'Thursday breakfasts' },
  { format: 'TXT', file: 'rota-txt.txt', mediaType: 'text/plain', kitchen: 'Meadow', volunteers: 42, shift: 'Friday nights' },
  { format: 'DOCX', file: 'rota-docx.docx', mediaType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', kitchen: 'Willow', volunteers: 26, shift: 'Monday afternoons' },
  { format: 'XLSX', file: 'rota-xlsx.xlsx', mediaType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', kitchen: 'Cedar', volunteers: 38, shift: 'Wednesday dinners' },
];

export const sentence = (fixture: FormatFixture) =>
  `The ${fixture.kitchen} kitchen needs ${fixture.volunteers} volunteers on ${fixture.shift}.`;

export const fixtureUrl = (fixture: FormatFixture) => new URL(fixture.file, import.meta.url);
