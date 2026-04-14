/** @jsxImportSource hono/jsx */
import type { TagWithCount } from "../../lib/wiki.js";
import type { KbConfig } from "../../lib/config.js";
import { VALID_EXTS, VALID_EXTS_LIST, VALID_EXTS_ACCEPT } from "../../lib/ingest.js";
import { PageHeader, Panel } from "./ui/index.js";
import {
  DropZone,
  FileList,
  UrlInput,
  TagSection,
  ErrorList,
  SubmitSection,
} from "./ingest/index.js";

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
        <DropZone
          validExtsList={VALID_EXTS_LIST}
          validExtsAccept={VALID_EXTS_ACCEPT}
          maxMbMedia={maxMbMedia}
          maxMbVideo={maxMbVideo}
        />

        <FileList />

        <UrlInput />

        <TagSection tagsWithCounts={tagsWithCounts} />

        <ErrorList />

        <SubmitSection />
      </Panel>

      <script
        dangerouslySetInnerHTML={{
          __html: getClientScript({
            validExts: [...VALID_EXTS],
            mediaMaxBytes,
            videoMaxBytes,
          }),
        }}
      />
    </div>
  );
}

interface ClientScriptParams {
  validExts: string[];
  mediaMaxBytes: number;
  videoMaxBytes: number;
}

function getClientScript({ validExts, mediaMaxBytes, videoMaxBytes }: ClientScriptParams): string {
  return `
    const VALID_EXTS = new Set(${JSON.stringify(validExts)});
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
  `;
}
