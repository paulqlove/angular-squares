/** Short labels for squares on phones. Every name on the board gets a different label. */
export function buildInitials(names: string[]): Map<string, string> {
  const taken = new Set<string>();
  const result = new Map<string, string>();
  for (const name of [...new Set(names.map(n => n.trim()).filter(Boolean))].sort()) {
    const words = name.split(/\s+/);
    const first = words[0];
    const last = words[words.length - 1];
    const candidates = [
      words.length > 1 ? first[0] + words[1][0] : first.slice(0, 2),
      words.slice(0, 3).map(w => w[0]).join(''),
      first.slice(0, 2) + last[0],
      first.slice(0, 3) + last[0],
      first.slice(0, 3) + words.slice(1, 4).map(w => w[0]).join('')
    ].map(c => c.toUpperCase());
    let label = candidates.find(c => !taken.has(c));
    for (let n = 2; !label; n++) {
      const numbered = `${candidates[0]}${n}`;
      if (!taken.has(numbered)) label = numbered;
    }
    taken.add(label);
    result.set(name, label);
  }
  return result;
}
