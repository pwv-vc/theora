/** @jsxImportSource hono/jsx */
/** @jsxImportSource hono/jsx */
import type { KbConfig } from "../../lib/config.js";
import {
  CheckboxField,
  LogPanel,
  PageHeader,
  Panel,
  PrimaryButton,
  SectionLabel,
  StatusDot,
} from "./ui/index.js";

interface CompilePageProps {
  ingestedCount?: number;
  ingestedFiles?: string;
  config: KbConfig;
}

export function CompilePage({
  ingestedCount = 0,
  ingestedFiles = "",
  config,
}: CompilePageProps) {
  const fileNames = ingestedFiles
    ? ingestedFiles.split(",").filter(Boolean)
    : [];

  return (
    <div>
      <PageHeader
        title="Compile"
        subtitle={`Compile new found sources into the ${config.name} wiki to discover concepts.`}
      />

      {ingestedCount > 0 && (
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
      )}

      <Panel class="mb-6">
        <div class="space-y-3 mb-5">
          <CheckboxField
            id="opt-force"
            label="Force recompile"
            description="Delete existing articles and reprocess everything from scratch"
          />
          <CheckboxField
            id="opt-sources-only"
            label="Sources only"
            description="Skip concept extraction after compiling sources"
          />
          <CheckboxField
            id="opt-concepts-only"
            label="Concepts only"
            description="Regenerate all concept articles from existing compiled sources"
          />
        </div>
        <PrimaryButton id="compile-btn" onclick="runCompile()">
          Run Compile
        </PrimaryButton>
      </Panel>

      <div id="progress-wrapper" class="hidden">
        <div class="flex items-center justify-between mb-3">
          <SectionLabel>Progress</SectionLabel>
          <div
            id="compile-status"
            class="flex items-center gap-2 text-zinc-500 text-xs"
          >
            <StatusDot id="status-dot" />
            <span>Running...</span>
          </div>
        </div>
        <LogPanel id="progress-log" />
      </div>

      <script
        dangerouslySetInnerHTML={{
          __html: `
        let compileSource = null;

        function runCompile() {
          const btn = document.getElementById('compile-btn');
          const wrapper = document.getElementById('progress-wrapper');
          const log = document.getElementById('progress-log');
          const statusDot = document.getElementById('status-dot');
          const compileStatus = document.getElementById('compile-status');

          if (compileSource) {
            compileSource.close();
            compileSource = null;
          }

          const force = document.getElementById('opt-force').checked;
          const sourcesOnly = document.getElementById('opt-sources-only').checked;
          const conceptsOnly = document.getElementById('opt-concepts-only').checked;

          log.textContent = '';
          wrapper.classList.remove('hidden');
          btn.disabled = true;
          statusDot.classList.add('animate-pulse');
          compileStatus.innerHTML = '<span id="status-dot" class="inline-block w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span><span>Running...</span>';

          fetch('/compile/run', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ force, sourcesOnly, conceptsOnly }),
          }).then(response => {
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            function processChunk({ done, value }) {
              if (done) return;

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\\n');
              buffer = lines.pop() || '';

              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const data = line.slice(6);
                  log.textContent += data + '\\n';
                  log.scrollTop = log.scrollHeight;
                } else if (line.startsWith('event: done')) {
                  btn.disabled = false;
                  compileStatus.innerHTML = '<span class="text-green-500">✓ Complete</span>';
                  return;
                } else if (line.startsWith('event: error')) {
                  btn.disabled = false;
                  compileStatus.innerHTML = '<span class="text-red-400">✗ Error</span>';
                  return;
                }
              }

              return reader.read().then(processChunk);
            }

            return reader.read().then(processChunk);
          }).catch(err => {
            log.textContent += 'Error: ' + err.message + '\\n';
            btn.disabled = false;
            compileStatus.innerHTML = '<span class="text-red-400">✗ Failed</span>';
          });
        }
      `,
        }}
      />
    </div>
  );
}
