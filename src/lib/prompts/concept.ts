import { CONTENT_RULES } from './compile.js'

export const CONCEPT_SYSTEM = `You are a knowledge base compiler writing concept articles. Your articles are read by both humans and future LLM queries — write for clarity, precision, and cross-referenceability. Be thorough and factual.

Pay close attention to:
- Named entities: people, companies, products, locations, and technical terms — capture precisely
- Temporal evolution: many concepts change over time — track how they developed, what changed, and when
- When a concept involves processes, flows, timelines, hierarchies, or relationships, include a Mermaid diagram. Use flowchart, sequence, timeline, or other diagram types as appropriate.`

export function buildConceptPrompt(
  title: string,
  description: string,
  relatedContent: string,
  validTargets: string,
): string {
  const targetList = validTargets
    .split(',')
    .map(t => `- ${t.trim()}`)
    .join('\n')

  return `Write a concept article for: "${title}"
One-line description: ${description}

Related source material:
${relatedContent || 'No specific sources available.'}

Articles you may link to using [[wiki-link]] syntax — ONLY use links from this list:
${targetList}

WIKI-LINK FORMAT (follow exactly):
- Use [[article-filename]] with double square brackets
- The filename is kebab-case (lowercase with hyphens), no .md extension
- Example: If the list shows "concert-1995-08-05", write [[concert-1995-08-05]]
- WRONG: [[sources/concert-1995-08-05.md]], [[wiki/sources/concert-1995-08-05.md]], [[Concert 1995]]
- CORRECT: [[concert-1995-08-05]]

Write a comprehensive wiki article with these exact sections:

## Definition
One precise, quotable sentence defining this concept.

## Overview
Detailed explanation — what it is, why it matters, where it comes from.

## Key Properties / Characteristics
Bullet list of defining attributes, behaviors, or features.

## Timeline
How this concept has evolved over time based on the source material — list key changes, milestones, or data points in chronological order with dates. If the concept has not changed over time, omit this section.

## Examples
Concrete examples from the source material — name specific people, companies, products, or cases. Include dates where relevant.

## Named Entities
People, companies, products, locations, and technical terms central to this concept — with brief notes on each.

## Connections
How this concept relates to others — use [[wiki-link]] syntax ONLY for articles in the list above.

## Mermaid Diagram
Where useful, include a Mermaid diagram to illustrate flows, processes, timelines, or relationships (use \`\`\`mermaid blocks). A timeline diagram is especially useful if this concept has evolved over time. Skip this section if no diagram adds value.

## Open Questions
Unresolved questions, active debates, or areas for further research.

${CONTENT_RULES}`
}
