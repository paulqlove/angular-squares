/** A small label and value list for a page header (dates, kickoff, venue). Facts that carry information, not decoration. */
export function pageFacts(rows: [label: string, value: string][]): string {
  return `<dl class="divide-y divide-qs-line border-y border-qs-line">${rows.map(([label, value]) =>
    `<div class="grid grid-cols-[7rem_1fr] gap-4 py-3.5"><dt class="qs-label text-qs-muted">${label}</dt><dd class="text-[0.9375rem] leading-snug text-qs-ink">${value}</dd></div>`).join('')}</dl>`;
}
