/** @jsxImportSource hono/jsx */
import type { SearchResult } from "../../lib/search.js";
import type { TagWithCount } from "../../lib/wiki.js";
import type { KbConfig } from "../../lib/config.js";
import { Card, Input, PageHeader, Pill, TagFilterBar } from "./ui/index.js";

interface SearchPageProps {
  q: string;
  tag: string;
  tagsWithCounts: TagWithCount[];
  config: KbConfig;
}

interface SearchResultsProps {
  results: SearchResult[];
  q: string;
  tag?: string;
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

export function SearchResults({ results, q, tag }: SearchResultsProps) {
  if (results.length === 0) {
    return (
      <div class="text-zinc-600 text-sm py-4">
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
    );
  }

  const countLabel = q
    ? `${results.length} result${results.length !== 1 ? "s" : ""} for "${q}"${tag ? ` in #${tag}` : ""}`
    : `${results.length} article${results.length !== 1 ? "s" : ""} tagged #${tag}`;

  return (
    <div class="space-y-3">
      <div class="text-zinc-600 text-xs mb-4">{countLabel}</div>
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

        const outputDocType = isOutput ? result.docType ?? "query" : "";
        const typeLabel = isOutput
          ? outputDocType === "mind-map"
            ? "mind map"
            : outputDocType
          : isSource
            ? "source"
            : isConcept
              ? "concept"
              : "";

        return (
          <Card key={result.path} href={href}>
            <div class="flex items-start justify-between gap-3 mb-2">
              <div class="text-zinc-100 text-sm font-bold group-hover:text-red-500">
                {result.title}
              </div>
              <div class="flex items-center gap-2 shrink-0">
                {typeLabel && (
                  <span class="text-zinc-600 text-xs">{typeLabel}</span>
                )}
                <span class="text-zinc-700 text-xs">{result.score}</span>
              </div>
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
