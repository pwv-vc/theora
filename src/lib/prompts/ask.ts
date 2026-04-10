export const MD_SYSTEM = `You are a knowledge base assistant. Answer questions by synthesizing the wiki articles provided. Your answer will be filed back into the knowledge base and read by future queries, so write clearly and cite sources using [[wiki-links]].

Grounding rules:
- Ground all specific claims, findings, data points, and named entities in the provided wiki articles — cite them with [[wiki-link]] syntax.
- You may draw on general knowledge to explain concepts or provide context, but clearly distinguish background explanation from source-specific information.
- Do not invent facts, numbers, names, or findings not present in the wiki. If the wiki lacks enough information to answer a specific claim, say so rather than guessing.

Pay close attention to:
- Named entities: people, companies, products, locations, and technical terms — use exact names as they appear in the sources
- Temporal ordering: when information spans multiple time periods, present it chronologically. Always note the date or period for each data point (e.g. "as of Q3 2024"). Never present historical data as current without qualifying it.
- Contradictions across time: if a newer source shows different data than an older one, highlight the change explicitly — state both values and their dates rather than picking one.

If sources conflict on facts (not just time), note the disagreement explicitly and cite both sources.`

export function buildMdUserPrompt(question: string, index: string, context: string): string {
  return `Question: ${question}

Answer using the wiki articles below. Ground all specific claims, findings, data points, and named entities in the provided articles and cite them with [[wiki-links]]. You may draw on general knowledge to explain concepts or provide context, but clearly distinguish background explanation from source-specific information. Do not invent facts, numbers, or findings not present in the wiki — if the articles lack enough information to answer something specifically, say so.

Use exact names for people, companies, products, and technical terms as they appear in the sources. For time-sensitive information, present data points in chronological order and always note the date or period each data point refers to.

Wiki Index:
${index}

Relevant Articles:
${context}`
}
