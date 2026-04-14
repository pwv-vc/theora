/** @jsxImportSource hono/jsx */
import type { SearchResult } from "../../lib/search.js";
import type { TagWithCount } from "../../lib/wiki.js";
import type { KbConfig } from "../../lib/config.js";
import { PageHeader, TagFilterBar } from "./ui/index.js";
import { ActiveFilters, SearchInput, SearchResults as SearchResultsComponent } from "./search/index.js";

// Re-export for routes
export { SearchResults } from "./search/index.js";

type SearchPageConfig = Pick<KbConfig, "name">;

interface SearchPageProps {
  q: string;
  tag: string;
  entity: string;
  tagsWithCounts: TagWithCount[];
  config: SearchPageConfig;
}

export function SearchPage({
  q,
  tag,
  entity,
  tagsWithCounts,
  config,
}: SearchPageProps) {
  // Build clear href and extra params based on active filters
  let clearHref = "/search"
  let extraParams = ""
  if (q) {
    clearHref = `/search?q=${encodeURIComponent(q)}`
    extraParams = `q=${encodeURIComponent(q)}`
  }
  if (tag) {
    if (extraParams) extraParams += "&"
    extraParams += `tag=${encodeURIComponent(tag)}`
  }
  if (entity) {
    if (extraParams) extraParams += "&"
    extraParams += `entity=${encodeURIComponent(entity)}`
  }

  return (
    <div>
      <PageHeader
        title="Search"
        subtitle={`Your ${config.name} wiki includes sources, concepts, and queries. Search below to find a match.`}
      />

      <SearchInput q={q} tag={tag} />

      <ActiveFilters tag={tag} entity={entity} />

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
        {(q || tag || entity) && <SearchResultsInner q={q} tag={tag} entity={entity} />}
      </div>
    </div>
  );
}

function SearchResultsInner({ q, tag, entity }: { q: string; tag: string; entity: string }) {
  return (
    <div
      hx-get={`/search/results?q=${encodeURIComponent(q)}${tag ? `&tag=${encodeURIComponent(tag)}` : ""}${entity ? `&entity=${encodeURIComponent(entity)}` : ""}`}
      hx-trigger="load"
      hx-target="#results"
    />
  );
}
