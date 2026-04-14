/** @jsxImportSource hono/jsx */
import type { KbConfig } from "../../lib/config.js";
import { PageHeader, Panel } from "./ui/index.js";
import { IngestSuccessBanner, CompileOptions, ProgressPanel } from "./compile/index.js";

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
        <IngestSuccessBanner ingestedCount={ingestedCount} fileNames={fileNames} />
      )}

      <Panel class="mb-6">
        <CompileOptions />
      </Panel>

      <ProgressPanel />

      <script
        dangerouslySetInnerHTML={{
          __html: getClientScript(),
        }}
      />
    </div>
  );
}

function getClientScript(): string {
  return `
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
  `;
}
