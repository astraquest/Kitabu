const HIDDEN_HEADING = /^(?:clarifying your choice(?:\s*&| and) next step|.{1,80}\s+starter)[.!:]?$/i;
const LIST_MARKER = String.raw`(?:(?:-|\*|\u2022)\s*)?`;
const CHOICE_ANALYSIS = new RegExp(`^${LIST_MARKER}your choice analysis\\s*:`, 'i');
const YOUR_TURN = new RegExp(`^${LIST_MARKER}your turn\\b`, 'i');
const VISIBLE_LABEL = new RegExp(
  `^${LIST_MARKER}(?:hint(?: for engagement)?|question|focused question(?: to strengthen understanding)?|next step)\\s*:\\s*`,
  'i',
);
const SCAFFOLD_LABEL = new RegExp(
  `^${LIST_MARKER}(?:hint(?: for engagement)?|question|focused question(?: to strengthen understanding)?|next step)\\s*:`,
  'i',
);

export function sanitizeTutorResponseForDisplay(text: string) {
  const normalized = text
    .replace(/\r\n/g, '\n')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/^\s{0,3}#{1,6}\s*/gm, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
    .replace(/[ \t]+\n/g, '\n')
    .trim();

  const metadataLine = /^(question acknowledged|subject|grade level adaptation|grade level|student level|student name|active subject|active strand|active sub-strand|curriculum scope)\b/i;
  const visibleLines: string[] = [];
  let skippingChoiceAnalysis = false;

  for (const rawLine of normalized.split('\n')) {
    const line = rawLine.trim();
    if (!line) {
      skippingChoiceAnalysis = false;
      continue;
    }

    if (CHOICE_ANALYSIS.test(line)) {
      skippingChoiceAnalysis = true;
      continue;
    }

    if (skippingChoiceAnalysis && !SCAFFOLD_LABEL.test(line)) {
      continue;
    }
    skippingChoiceAnalysis = false;

    if (metadataLine.test(line) || HIDDEN_HEADING.test(line) || YOUR_TURN.test(line)) {
      continue;
    }

    const withoutScaffoldLabel = line.replace(VISIBLE_LABEL, '').trim();
    if (withoutScaffoldLabel) {
      visibleLines.push(withoutScaffoldLabel);
    }
  }

  return visibleLines.join('\n').trim();
}
