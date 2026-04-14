/** @jsxImportSource hono/jsx */
import { PrimaryButton } from "../ui/index.js";

export function SubmitSection() {
  return (
    <div class="flex items-center gap-4">
      <PrimaryButton id="ingest-btn" onclick="runIngest()">
        <span class="flex items-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          Ingest
        </span>
      </PrimaryButton>
      <span id="ingest-status" class="text-xs text-zinc-500 hidden">
        Uploading…
      </span>
    </div>
  );
}
