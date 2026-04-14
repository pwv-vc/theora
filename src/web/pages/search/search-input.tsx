/** @jsxImportSource hono/jsx */
import { Input } from "../ui/index.js";

interface SearchInputProps {
  q: string;
  tag: string;
}

export function SearchInput({ q, tag }: SearchInputProps) {
  return (
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
  );
}
