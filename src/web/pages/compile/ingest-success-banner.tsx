/** @jsxImportSource hono/jsx */

interface IngestSuccessBannerProps {
  ingestedCount: number;
  fileNames: string[];
}

export function IngestSuccessBanner({ ingestedCount, fileNames }: IngestSuccessBannerProps) {
  return (
    <div
      class="mb-6 bg-green-950 border border-green-800 rounded-lg p-4 no-scanline"
      style="position: relative; z-index: 10001;"
    >
      <div class="flex items-start gap-3">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="text-green-400 shrink-0 mt-0.5"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
        <div class="min-w-0">
          <div class="text-green-300 text-sm font-bold">
            Added {ingestedCount} file{ingestedCount !== 1 ? "s" : ""} to
            the knowledge base
          </div>
          {fileNames.length > 0 && (
            <div class="text-green-600 text-xs mt-1 font-mono truncate">
              {fileNames.join(" · ")}
            </div>
          )}
          <div class="text-green-700 text-xs mt-2">
            Run compile below to process{" "}
            {ingestedCount === 1 ? "it" : "them"} into the wiki.
          </div>
        </div>
      </div>
    </div>
  );
}
