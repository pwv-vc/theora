/** @jsxImportSource hono/jsx */
import { PageHeader } from './ui/index.js'

interface AboutPageProps {
  config: Record<string, unknown>
}

export function AboutPage({ config }: AboutPageProps) {
  const kbName = String(config.name ?? 'Knowledge Base')

  return (
    <div>
      <PageHeader
        title="About Theora"
        subtitle={`The LLM-powered knowledge base behind ${kbName}.`}
      />

      <div class="prose prose-invert prose-zinc max-w-none">
        <div class="mb-8">
          <p class="text-zinc-300 text-base leading-relaxed">
            <strong class="text-zinc-100">Theora</strong> is an LLM-powered knowledge base that turns raw research into a living wiki. Dump research into a folder. Let the model organise it into a wiki. Ask questions. The answers get filed back in. Every query makes the wiki smarter.
          </p>
        </div>

        <div class="mb-8">
          <h2 class="text-zinc-100 text-lg font-bold mb-3">The Name</h2>
          <p class="text-zinc-300 text-sm leading-relaxed mb-3">
            <strong>Theora</strong> is named after Theora Jones — network controller and systems operator at Network 23 in <em>Max Headroom: 20 Minutes into the Future</em>. While others exploit the media landscape around her, Theora is the one who understands the infrastructure, keeps things running, and bridges systems and people.
          </p>
          <p class="text-zinc-300 text-sm leading-relaxed">
            It's also short for <strong>the oracle</strong> — a knowledge base that doesn't just store what you put in, but synthesises, connects, and answers. The more you feed it, the more it knows.
          </p>
        </div>

        <div class="mb-8">
          <h2 class="text-zinc-100 text-lg font-bold mb-3">Why This Works</h2>
          <p class="text-zinc-300 text-sm leading-relaxed mb-4">
            Most tools treat knowledge as static — you write notes, they sit there. Theora flips this. The LLM writes and maintains everything. You just steer.
          </p>

          <h3 class="text-zinc-200 text-sm font-bold mb-2">Core Features</h3>
          <ul class="space-y-2 text-zinc-300 text-sm">
            <li class="flex gap-2">
              <span class="text-red-500">→</span>
              <span><strong>Ingest</strong> — Drop articles, papers, images, PDFs, or URLs into the pipeline. Theora handles the rest.</span>
            </li>
            <li class="flex gap-2">
              <span class="text-red-500">→</span>
              <span><strong>Compile</strong> — The LLM reads every source, writes summaries, extracts key concepts into linked articles, and rebuilds the master index.</span>
            </li>
            <li class="flex gap-2">
              <span class="text-red-500">→</span>
              <span><strong>Ask</strong> — Ask questions against your wiki. Answers get filed back in, so every query compounds the knowledge base.</span>
            </li>
          </ul>
        </div>

        <div class="mb-8">
          <h2 class="text-zinc-100 text-lg font-bold mb-3">Search</h2>
          <p class="text-zinc-300 text-sm leading-relaxed mb-3">
            Full-text search across every compiled wiki article — sources, concepts, and queries. Results are ranked by relevance using term frequency scoring with bonuses for title matches and tag matches.
          </p>
          <p class="text-zinc-300 text-sm leading-relaxed">
            Use the search bar to quickly find articles by content, or filter by tags to narrow results to specific topics. The search index updates automatically as you compile new sources.
          </p>
        </div>

        <div class="mb-8">
          <h2 class="text-zinc-100 text-lg font-bold mb-3">Tags</h2>
          <p class="text-zinc-300 text-sm leading-relaxed mb-3">
            Tags are how you organize and navigate your knowledge base. They work at two levels:
          </p>
          <ul class="space-y-2 text-zinc-300 text-sm mb-3">
            <li class="flex gap-2">
              <span class="text-red-500">→</span>
              <span><strong>User tags</strong> — You tag sources at ingest time (e.g., <code>--tag transformers</code>). These seed the categorization.</span>
            </li>
            <li class="flex gap-2">
              <span class="text-red-500">→</span>
              <span><strong>LLM tags</strong> — The model adds tags based on content analysis, expanding your initial categorization.</span>
            </li>
          </ul>
          <p class="text-zinc-300 text-sm leading-relaxed">
            Tags enable cross-cutting navigation — filter search results, browse by topic, and see related articles across sources and concepts.
          </p>
        </div>

        <div class="border-t border-zinc-800 pt-6">
          <p class="text-zinc-500 text-xs">
            Built with <a href="https://commandcode.ai" target="_blank" rel="noopener noreferrer" class="text-zinc-400 hover:text-[var(--color-accent)] transition-colors">CommandCode</a>.
          </p>
        </div>
      </div>
    </div>
  )
}
