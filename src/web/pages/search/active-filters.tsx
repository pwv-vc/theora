/** @jsxImportSource hono/jsx */

interface ActiveFiltersProps {
  tag?: string;
  entity?: string;
}

export function ActiveFilters({ tag, entity }: ActiveFiltersProps) {
  if (!tag && !entity) return null;

  return (
    <div class="mb-4 flex flex-wrap items-center gap-2">
      {tag && (
        <span class="inline-flex items-center gap-1.5 bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs px-2.5 py-1 rounded">
          <span>Tag: #{tag}</span>
          <a
            href={entity ? `/search?entity=${encodeURIComponent(entity)}` : "/search"}
            class="text-zinc-500 hover:text-zinc-300"
            title="Remove tag filter"
          >
            ×
          </a>
        </span>
      )}
      {entity && (
        <span class="inline-flex items-center gap-1.5 bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs px-2.5 py-1 rounded">
          <span>Entity: {entity}</span>
          <a
            href={tag ? `/search?tag=${encodeURIComponent(tag)}` : "/search"}
            class="text-zinc-500 hover:text-zinc-300"
            title="Remove entity filter"
          >
            ×
          </a>
        </span>
      )}
    </div>
  );
}
