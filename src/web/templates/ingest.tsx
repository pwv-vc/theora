/** @jsxImportSource hono/jsx */
import type { TagWithCount } from "../../lib/wiki.js";
import type { KbConfig } from "../../lib/config.js";
import {
  Input,
  PageHeader,
  Panel,
  PrimaryButton,
  SectionLabel,
  TagSelectorBar,
} from "./ui/index.js";

const VALID_EXTS_LIST =
  ".md .mdx .txt .html .json .csv .xml .yaml .yml .pdf .png .jpg .jpeg .gif .webp .mp3 .wav .ogg .flac .m4a .mp4 .mov .avi .mkv .webm";
const VALID_EXTS_ACCEPT =
  ".md,.mdx,.txt,.html,.json,.csv,.xml,.yaml,.yml,.pdf,.png,.jpg,.jpeg,.gif,.webp,.mp3,.wav,.ogg,.flac,.m4a,.mp4,.mov,.avi,.mkv,.webm";

interface IngestPageProps {
  tagsWithCounts?: TagWithCount[];
  config: KbConfig;
}

export function IngestPage({ tagsWithCounts = [], config }: IngestPageProps) {
  const mediaMaxBytes = config.mediaMaxFileBytes ?? 50 * 1024 * 1024;
  const videoMaxBytes = config.videoMaxFileBytes ?? 100 * 1024 * 1024;
  const maxMbMedia = Math.round(mediaMaxBytes / (1024 * 1024));
  const maxMbVideo = Math.round(videoMaxBytes / (1024 * 1024));

  return (
    <div>
      <PageHeader
        title="Upload"
        subtitle={`Add files to the ${config.name} wiki.`}
      />

      <Panel class="mb-6">
        {/* Drop zone */}
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
                <div class="text-zinc-600 text-xs mt-1">{VALID_EXTS_LIST}</div>
                <div class="text-zinc-700 text-xs mt-0.5">
                  Max ~{maxMbMedia} MB per file (~{maxMbVideo} MB for video);
                  see `mediaMaxFileBytes` and `videoMaxFileBytes` in
                  `.theora/config.json`
                </div>
              </div>
            </div>
            <input
              type="file"
              id="file-input"
              multiple
              accept={VALID_EXTS_ACCEPT}
              class="hidden"
              onchange="handleFileInput(this.files)"
            />
          </div>
        </div>

        {/* Selected files list */}
        <div id="file-list" class="hidden mb-5">
          <div class="flex items-center justify-between mb-2">
            <SectionLabel>Selected files</SectionLabel>
            <button
              type="button"
              onclick="clearAllFiles()"
              class="text-zinc-600 hover:text-zinc-400 text-xs transition-colors"
            >
              Clear all
            </button>
          </div>
          <div id="file-list-items" class="space-y-1.5" />
        </div>

        {/* URL input */}
        <div class="mb-5">
          <label class="block mb-2">
            <SectionLabel>URLs</SectionLabel>
            <span class="text-zinc-600 text-xs ml-2">one per line</span>
          </label>
          <textarea
            id="url-input"
            rows={3}
            placeholder={
              "https://example.com/article\nhttps://arxiv.org/abs/..."
            }
            class="w-full bg-zinc-900 border border-zinc-700 text-zinc-100 placeholder-zinc-700 px-4 py-2.5 rounded-lg text-sm focus:border-red-600 focus:outline-none transition-colors font-mono resize-none"
          />
        </div>

        {/* Tag selector */}
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

        {/* Error list */}
        <div
          id="error-list"
          class="hidden mb-5 bg-red-950 border border-red-900 rounded-lg p-4 no-scanline"
          style="position: relative; z-index: 10001;"
        >
          <div class="text-red-400 text-xs font-bold mb-2 uppercase tracking-wider">
            Validation errors
          </div>
          <div id="error-items" class="space-y-1" />
        </div>

        {/* Submit */}
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
      </Panel>

      <script
        dangerouslySetInnerHTML={{
          __html: `
        const VALID_EXTS = new Set(['.md','.mdx','.txt','.html','.json','.csv','.xml','.yaml','.yml','.pdf','.png','.jpg','.jpeg','.gif','.webp','.mp3','.wav','.ogg','.flac','.m4a','.mp4','.mov','.avi','.mkv','.webm']);
        const VIDEO_EXTS = new Set(['.mp4','.mov','.avi','.mkv','.webm']);
        const MAX_MEDIA_SIZE = ${mediaMaxBytes};
        const MAX_VIDEO_SIZE = ${videoMaxBytes};
        let selectedFiles = [];

        function formatBytes(bytes) {
          if (bytes < 1024) return bytes + ' B';
          if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
          return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
        }

        function getExt(name) {
          const idx = name.lastIndexOf('.');
          return idx >= 0 ? name.slice(idx).toLowerCase() : '';
        }

        function addFiles(fileList) {
          const errors = [];
          for (const f of Array.from(fileList)) {
            const ext = getExt(f.name);
            if (!VALID_EXTS.has(ext)) {
              errors.push(f.name + ': unsupported file type (' + ext + ')');
              continue;
            }
            const maxSize = VIDEO_EXTS.has(ext) ? MAX_VIDEO_SIZE : MAX_MEDIA_SIZE;
            if (f.size > maxSize) {
              errors.push(f.name + ': exceeds max size (' + formatBytes(f.size) + ' > ' + formatBytes(maxSize) + ')');
              continue;
            }
            if (!selectedFiles.find(x => x.name === f.name)) {
              selectedFiles.push(f);
            }
          }
          renderFileList();
          if (errors.length) renderErrors(errors);
        }

        function handleFileInput(fileList) {
          addFiles(fileList);
          document.getElementById('file-input').value = '';
        }

        function removeFile(name) {
          selectedFiles = selectedFiles.filter(f => f.name !== name);
          renderFileList();
        }

        function clearAllFiles() {
          selectedFiles = [];
          renderFileList();
        }

        function renderFileList() {
          const container = document.getElementById('file-list');
          const items = document.getElementById('file-list-items');
          if (selectedFiles.length === 0) {
            container.classList.add('hidden');
            return;
          }
          container.classList.remove('hidden');
          items.innerHTML = selectedFiles.map(f => {
            const ext = getExt(f.name);
            return '<div class="flex items-center justify-between bg-zinc-800 border border-zinc-700 rounded px-3 py-2 no-scanline" style="position:relative;z-index:10001">' +
              '<div class="flex items-center gap-2 min-w-0">' +
                '<span class="text-red-500 text-xs font-mono shrink-0">' + ext + '</span>' +
                '<span class="text-zinc-200 text-xs truncate">' + f.name + '</span>' +
              '</div>' +
              '<div class="flex items-center gap-3 shrink-0 ml-3">' +
                '<span class="text-zinc-600 text-xs">' + formatBytes(f.size) + '</span>' +
                '<button type="button" onclick="removeFile(' + JSON.stringify(f.name) + ')" class="text-zinc-600 hover:text-red-400 transition-colors text-xs leading-none">' +
                  '<svg xmlns=\\"http://www.w3.org/2000/svg\\" width=\\"12\\" height=\\"12\\" viewBox=\\"0 0 24 24\\" fill=\\"none\\" stroke=\\"currentColor\\" stroke-width=\\"2\\" stroke-linecap=\\"round\\" stroke-linejoin=\\"round\\"><line x1=\\"18\\" y1=\\"6\\" x2=\\"6\\" y2=\\"18\\"/><line x1=\\"6\\" y1=\\"6\\" x2=\\"18\\" y2=\\"18\\"/></svg>' +
                '</button>' +
              '</div>' +
            '</div>';
          }).join('');
        }

        function renderErrors(errors) {
          if (!errors || errors.length === 0) {
            document.getElementById('error-list').classList.add('hidden');
            return;
          }
          document.getElementById('error-list').classList.remove('hidden');
          document.getElementById('error-items').innerHTML = errors.map(e =>
            '<div class="text-red-300 text-xs font-mono">' + e + '</div>'
          ).join('');
        }

        function clearErrors() {
          document.getElementById('error-list').classList.add('hidden');
          document.getElementById('error-items').innerHTML = '';
        }

        // Drag and drop
        const dropZone = document.getElementById('drop-zone');

        dropZone.addEventListener('dragover', function(e) {
          e.preventDefault();
          e.stopPropagation();
          dropZone.classList.add('drop-zone-active');
        });

        dropZone.addEventListener('dragleave', function(e) {
          e.preventDefault();
          e.stopPropagation();
          dropZone.classList.remove('drop-zone-active');
        });

        dropZone.addEventListener('drop', function(e) {
          e.preventDefault();
          e.stopPropagation();
          dropZone.classList.remove('drop-zone-active');
          if (e.dataTransfer && e.dataTransfer.files.length > 0) {
            addFiles(e.dataTransfer.files);
          }
        });

        async function runIngest() {
          clearErrors();

          const urlInput = document.getElementById('url-input').value.trim();
          const urls = urlInput ? urlInput.split('\\n').map(u => u.trim()).filter(u => u.startsWith('http')) : [];

          if (selectedFiles.length === 0 && urls.length === 0) {
            renderErrors(['Add at least one file or URL to ingest.']);
            return;
          }

          const btn = document.getElementById('ingest-btn');
          const status = document.getElementById('ingest-status');
          btn.disabled = true;
          status.classList.remove('hidden');
          status.textContent = 'Uploading…';

          const formData = new FormData();
          for (const f of selectedFiles) {
            formData.append('files', f);
          }
          if (urlInput) {
            formData.append('urls', urlInput);
          }
          const tag = document.getElementById('tag-input').value.trim();
          if (tag) {
            formData.append('tag', tag);
          }

          try {
            const res = await fetch('/ingest/upload', { method: 'POST', body: formData });
            const data = await res.json();

            if (data.errors && data.errors.length > 0) {
              renderErrors(data.errors);
            }

            if (data.ingested > 0) {
              const params = new URLSearchParams({
                ingested: String(data.ingested),
                files: data.files.join(','),
              });
              window.location.href = '/compile?' + params.toString();
            } else {
              btn.disabled = false;
              status.classList.add('hidden');
              if (!data.errors || data.errors.length === 0) {
                renderErrors(['No new files were ingested. They may already exist in the knowledge base.']);
              }
            }
          } catch (err) {
            btn.disabled = false;
            status.classList.add('hidden');
            renderErrors(['Upload failed: ' + err.message]);
          }
        }

        function syncTagFromInput(value) {
          const hiddenInput = document.getElementById('ingest-tag-input');
          const chip = document.getElementById('ingest-tag-chip');
          if (hiddenInput) hiddenInput.value = value;
          if (chip) {
            const chipText = chip.querySelector('[data-chip-text]');
            if (chipText) chipText.textContent = value ? '#' + value : '';
            if (value) chip.classList.remove('hidden');
            else chip.classList.add('hidden');
          }
          // Clear visual selection from TagSelectorBar buttons
          const popoverId = 'tag-selector-ingest-tag-input';
          document.querySelectorAll('#' + popoverId + '-list button').forEach(function(b) {
            b.classList.remove('bg-red-900/30', 'border-red-700', 'text-red-400');
          });
        }
      `,
        }}
      />
    </div>
  );
}
