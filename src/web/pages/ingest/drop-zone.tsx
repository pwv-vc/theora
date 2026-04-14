/** @jsxImportSource hono/jsx */
import { SectionLabel } from "../ui/index.js";

interface DropZoneProps {
  validExtsList: string;
  validExtsAccept: string;
  maxMbMedia: number;
  maxMbVideo: number;
}

export function DropZone({
  validExtsList,
  validExtsAccept,
  maxMbMedia,
  maxMbVideo,
}: DropZoneProps) {
  return (
    <div class="mb-5">
      <SectionLabel>Files</SectionLabel>
      <div
        id="drop-zone"
        class="mt-2 border-2 border-dashed border-zinc-700 rounded-lg p-10 text-center cursor-pointer hover:border-zinc-500 transition-all"
        onclick="document.getElementById('file-input').click()"
      >
        <div class="flex flex-col items-center gap-3 pointer-events-none">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="36"
            height="36"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="text-zinc-600"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <div>
            <div class="text-zinc-300 text-sm font-medium">
              Drop files here or click to browse
            </div>
            <div class="text-zinc-600 text-xs mt-1">{validExtsList}</div>
            <div class="text-zinc-700 text-xs mt-0.5">
              Max ~{maxMbMedia} MB per file (~{maxMbVideo} MB for video)
            </div>
          </div>
        </div>
        <input
          type="file"
          id="file-input"
          multiple
          accept={validExtsAccept}
          class="hidden"
          onchange="handleFileInput(this.files)"
        />
      </div>
    </div>
  );
}
