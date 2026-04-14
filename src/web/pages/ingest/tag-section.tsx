/** @jsxImportSource hono/jsx */
import type { TagWithCount } from "../../../lib/wiki.js";
import { Input, SectionLabel, TagSelectorBar } from "../ui/index.js";

interface TagSectionProps {
  tagsWithCounts: TagWithCount[];
}

export function TagSection({ tagsWithCounts }: TagSectionProps) {
  return (
    <div class="mb-5">
      <label class="block mb-2">
        <SectionLabel>Tag</SectionLabel>
        <span class="text-zinc-600 text-xs ml-2">
          optional — tags all ingested sources with selected or new tag
        </span>
      </label>
      {tagsWithCounts.length > 0 && (
        <TagSelectorBar
          tagsWithCounts={tagsWithCounts}
          inputId="ingest-tag-input"
          chipId="ingest-tag-chip"
        />
      )}
      <div class="mt-3">
        <Input
          id="tag-input"
          type="text"
          placeholder={tagsWithCounts.length > 0 ? "New tag ..." : ""}
          oninput="syncTagFromInput(this.value)"
        />
      </div>
      <input type="hidden" id="ingest-tag-input" name="tag" value="" />
    </div>
  );
}
