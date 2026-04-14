/** @jsxImportSource hono/jsx */
import type { SearchResult } from "../../../lib/search.js";
import { Card, Pill } from "../ui/index.js";

interface SearchResultsProps {
  results: SearchResult[];
  q: string;
  tag?: string;
  entity?: string;
  suggestedQuery?: string;
}

function classifySearchResult(result: SearchResult): {
  typeLabel: string;
  badgeClass: string;
} {
  const isOutput = result.relativePath.startsWith("output/");
  const isSource = result.relativePath.startsWith("wiki/sources/");
  const isConcept = result.relativePath.startsWith("wiki/concepts/");

  if (isSource) {
    return {
      typeLabel: "Source",
      badgeClass:
        "border border-emerald-800/50 bg-emerald-950/40 text-emerald-300",
    };
  }
  if (isConcept) {
    return {
      typeLabel: "Concept",
      badgeClass:
        "border border-fuchsia-900/50 bg-fuchsia-950/35 text-fuchsia-300",
    };
  }
  if (isOutput) {
    const dt = result.docType ?? "query";
    if (dt === "mind-map") {
      return {
        typeLabel: "Mind map",
        badgeClass:
          "border border-amber-900/50 bg-amber-950/40 text-amber-200",
      };
    }
    return {
      typeLabel: "Previous answer",
      badgeClass:
        "border border-yellow-900/45 bg-yellow-950/30 text-yellow-200",
    };
  }
  return {
    typeLabel: "Article",
    badgeClass: "border border-zinc-700 bg-zinc-800/80 text-zinc-400",
  };
}

function formatRelevanceScore(score: number): string {
  if (!Number.isFinite(score)) return "—";
  if (score === 0) return "0";
  if (score >= 10) return score.toFixed(1);
  if (score >= 1) return score.toFixed(2);
  return score.toFixed(3);
}

function EmptyState({ q, tag, entity, suggestedQuery }: { q: string; tag?: string; entity?: string; suggestedQuery?: string }) {
  const suggestDiffers =
    suggestedQuery &&
    suggestedQuery.trim().toLowerCase() !== q.trim().toLowerCase();
  const suggestHref = suggestDiffers
    ? `/search?q=${encodeURIComponent(suggestedQuery!)}${tag ? `&tag=${encodeURIComponent(tag)}` : ""}${entity ? `&entity=${encodeURIComponent(entity)}` : ""}`
    : undefined;

  return (
    <div class="text-zinc-600 text-sm py-4 space-y-2">
      <div>
        {q ? (
          <>
            No results for <span class="text-zinc-400">"{q}"</span>
            {tag ? (
              <>
                {" "}
                in <span class="text-zinc-400">#{tag}</span>
              </>
            ) : (
              ""
            )}
            {entity ? (
              <>
                {" "}
                with entity <span class="text-zinc-400">{entity}</span>
              </>
            ) : (
              ""
            )}
          </>
        ) : entity ? (
          <>
            No articles with entity <span class="text-zinc-400">{entity}</span>
          </>
        ) : (
          <>
            No articles tagged <span class="text-zinc-400">#{tag}</span>
          </>
        )}
      </div>
      {suggestDiffers && suggestHref && (
        <div>
          <span class="text-zinc-500">Did you mean </span>
          <a
            href={suggestHref}
            class="text-red-500 hover:underline"
          >
            {suggestedQuery!}
          </a>
          ?
        </div>
      )}
    </div>
  );
}

function SearchResultCard({ result }: { result: SearchResult }) {
  const slug = result.path.split("/").pop()?.replace(".md", "") ?? "";
  const isOutput = result.relativePath.startsWith("output/");
  const isSource = result.relativePath.startsWith("wiki/sources/");
  const isConcept = result.relativePath.startsWith("wiki/concepts/");

  const href = isOutput
    ? `/output/${slug}`
    : isSource
      ? `/wiki/sources/${slug}`
      : isConcept
        ? `/wiki/concepts/${slug}`
        : "#";

  const { typeLabel, badgeClass } = classifySearchResult(result);

  return (
    <Card href={href}>
      <div class="flex flex-wrap items-start justify-between gap-3 gap-y-2 mb-2">
        <div class="flex flex-wrap items-center gap-2 min-w-0">
          <span
            class={`inline-flex items-center rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider no-scanline ${badgeClass}`}
            style="position: relative; z-index: 10001;"
            title="Article type in this wiki"
          >
            {typeLabel}
          </span>
        </div>
        <div
          class="flex flex-col items-end gap-0.5 shrink-0 rounded border border-zinc-700/80 bg-zinc-950/60 px-2.5 py-1.5 no-scanline"
          style="position: relative; z-index: 10001;"
          title="BM25 relevance (higher = stronger match)"
        >
          <span class="text-zinc-500 text-[9px] uppercase tracking-widest leading-none">
            Relevance
          </span>
          <span class="text-zinc-100 text-sm font-mono tabular-nums leading-tight font-semibold">
            {formatRelevanceScore(result.score)}
          </span>
        </div>
      </div>
      <div class="text-zinc-100 text-sm font-bold group-hover:text-red-500 leading-snug mb-1.5">
        {result.title}
      </div>
      {result.snippet && (
        <p class="text-zinc-500 text-xs leading-relaxed line-clamp-2">
          {result.snippet}
        </p>
      )}
      {result.tags.length > 0 && (
        <div class="flex flex-wrap gap-1 mt-2">
          {result.tags.slice(0, 5).map((tag) => (
            <Pill key={tag}>#{tag}</Pill>
          ))}
        </div>
      )}
    </Card>
  );
}

export function SearchResults({
  results,
  q,
  tag,
  entity,
  suggestedQuery,
}: SearchResultsProps) {
  if (results.length === 0) {
    return (
      <EmptyState 
        q={q} 
        tag={tag} 
        entity={entity} 
        suggestedQuery={suggestedQuery} 
      />
    );
  }

  let countLabel: string
  if (q && tag) {
    countLabel = `${results.length} result${results.length !== 1 ? "s" : ""} for "${q}" in #${tag}${entity ? ` with entity ${entity}` : ""}`
  } else if (q && entity) {
    countLabel = `${results.length} result${results.length !== 1 ? "s" : ""} for "${q}" with entity ${entity}`
  } else if (q) {
    countLabel = `${results.length} result${results.length !== 1 ? "s" : ""} for "${q}"`
  } else if (tag) {
    countLabel = `${results.length} article${results.length !== 1 ? "s" : ""} tagged #${tag}`
  } else if (entity) {
    countLabel = `${results.length} article${results.length !== 1 ? "s" : ""} with entity ${entity}`
  } else {
    countLabel = `${results.length} result${results.length !== 1 ? "s" : ""}`
  }

  const suggestHref =
    suggestedQuery && suggestedQuery.trim().toLowerCase() !== q.trim().toLowerCase()
      ? `/search?q=${encodeURIComponent(suggestedQuery)}${tag ? `&tag=${encodeURIComponent(tag)}` : ""}`
      : undefined;

  return (
    <div class="space-y-3">
      <div class="text-zinc-600 text-xs mb-4">{countLabel}</div>
      {suggestedQuery && suggestHref && (
        <div class="text-zinc-500 text-xs mb-2">
          Did you mean{" "}
          <a href={suggestHref} class="text-red-500 hover:underline">
            {suggestedQuery}
          </a>
          ?
        </div>
      )}
      {results.map((result) => (
        <SearchResultCard key={result.path} result={result} />
      ))}
    </div>
  );
}
