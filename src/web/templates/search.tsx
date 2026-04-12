/** @jsxImportSource hono/jsx */
import type { SearchResult } from "../../lib/search.js";
import type { TagWithCount } from "../../lib/wiki.js";
import type { KbConfig } from "../../lib/config.js";
import { Card, Input, PageHeader, Pill, TagFilterBar } from "./ui/index.js";

type SearchPageConfig = Pick<KbConfig, "name">;

interface SearchPageProps {
  q: string;
  tag: string;
  tagsWithCounts: TagWithCount[];
  config: SearchPageConfig;
}

interface SearchResultsProps {
  results: SearchResult[];
  q: string;
  tag?: string;
  suggestedQuery?: string;
}

export function SearchPage({
  q,
  tag,
  tagsWithCounts,
  config,
}: SearchPageProps) {
  const clearHref = q ? `/search?q=${encodeURIComponent(q)}` : "/search";
  const extraParams = q ? `q=${encodeURIComponent(q)}` : undefined;

  return (
    <div>
      <PageHeader
        title="Search"
        subtitle={`Find sources, concepts, and queries in the compiled ${config.name} wiki.`}
      />
      <div class="mb-6">
        <div class="flex gap-3">
          <Input
            inputSize="md"
            class="flex-1"
            type="text"
            name="q"
            value={q}
            placeholder="Search the wiki..."
            autofocus
            hx-get="/search/results"
            hx-trigger="input changed delay:300ms, keyup[key=='Enter']"
            hx-target="#results"
            hx-include="[name='tag']"
          />
          <input type="hidden" name="tag" value={tag} />
        </div>
      </div>

      {tagsWithCounts.length > 0 && (
        <div class="mb-6">
          <TagFilterBar
            tagsWithCounts={tagsWithCounts}
            activeTag={tag}
            hrefBase="/search"
            extraParams={extraParams}
            clearHref={clearHref}
          />
        </div>
      )}

      <div id="results">
        {(q || tag) && <SearchResultsInner q={q} tag={tag} />}
      </div>
    </div>
  );
}

function SearchResultsInner({ q, tag }: { q: string; tag: string }) {
  return (
    <div
      hx-get={`/search/results?q=${encodeURIComponent(q)}${tag ? `&tag=${encodeURIComponent(tag)}` : ""}`}
      hx-trigger="load"
      hx-target="#results"
    />
  );
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

export function SearchResults({
  results,
  q,
  tag,
  suggestedQuery,
}: SearchResultsProps) {
  if (results.length === 0) {
    const suggestDiffers =
      suggestedQuery &&
      suggestedQuery.trim().toLowerCase() !== q.trim().toLowerCase();
    const suggestHref = suggestDiffers
      ? `/search?q=${encodeURIComponent(suggestedQuery!)}${tag ? `&tag=${encodeURIComponent(tag)}` : ""}`
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

  const countLabel = q
    ? `${results.length} result${results.length !== 1 ? "s" : ""} for "${q}"${tag ? ` in #${tag}` : ""}`
    : `${results.length} article${results.length !== 1 ? "s" : ""} tagged #${tag}`;

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
      {results.map((result) => {
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
          <Card key={result.path} href={href}>
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
      })}
    </div>
  );
}
