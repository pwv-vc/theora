/** @jsxImportSource hono/jsx */

export function CompilePage() {
  return (
    <div class="space-y-8">
      <section class="console-panel overflow-hidden">
        <div class="console-grid p-6 sm:grid-cols-[minmax(0,1.5fr)_minmax(18rem,1fr)] sm:p-8">
          <div class="space-y-5">
            <div class="console-kicker">Pipeline Control</div>
            <div>
              <h1 class="console-heading">Compile</h1>
              <p class="mt-4 max-w-2xl text-base leading-7 text-[var(--text-secondary)]">
                Process raw sources into sources, concepts, and index updates without dropping out of the branded shell.
              </p>
            </div>
          </div>
          <div class="console-card">
            <div class="console-muted mb-3">Operator note</div>
            <p class="text-sm leading-6 text-[var(--text-secondary)]">
              Use force only when you need a full rebuild. The console keeps progress visible while the pipeline runs.
            </p>
          </div>
        </div>
      </section>

      <div class="console-card space-y-5">
        <div class="space-y-3">
          <label class="flex items-center gap-3 cursor-pointer group">
            <input
              type="checkbox"
              id="opt-force"
              class="h-4 w-4 rounded border-[var(--border-subtle)] bg-[var(--bg-panel)] text-[var(--accent-primary)]"
            />
            <div>
              <div class="text-sm text-[var(--text-primary)] group-hover:text-white transition-colors">Force recompile</div>
              <div class="text-xs text-[var(--text-muted)]">Delete existing articles and reprocess everything from scratch</div>
            </div>
          </label>

          <label class="flex items-center gap-3 cursor-pointer group">
            <input
              type="checkbox"
              id="opt-sources-only"
              class="h-4 w-4 rounded border-[var(--border-subtle)] bg-[var(--bg-panel)] text-[var(--accent-primary)]"
            />
            <div>
              <div class="text-sm text-[var(--text-primary)] group-hover:text-white transition-colors">Sources only</div>
              <div class="text-xs text-[var(--text-muted)]">Skip concept extraction after compiling sources</div>
            </div>
          </label>

          <label class="flex items-center gap-3 cursor-pointer group">
            <input
              type="checkbox"
              id="opt-concepts-only"
              class="h-4 w-4 rounded border-[var(--border-subtle)] bg-[var(--bg-panel)] text-[var(--accent-primary)]"
            />
            <div>
              <div class="text-sm text-[var(--text-primary)] group-hover:text-white transition-colors">Concepts only</div>
              <div class="text-xs text-[var(--text-muted)]">Regenerate all concept articles from existing compiled sources</div>
            </div>
          </label>
        </div>

        <button
          id="compile-btn"
          onclick="runCompile()"
          class="console-button"
        >
          Run Compile
        </button>
      </div>

      <div id="progress-wrapper" class="hidden">
        <div class="flex items-center justify-between mb-3">
          <div class="console-muted">Progress</div>
          <div id="compile-status" class="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
            <span id="status-dot" class="inline-block h-1.5 w-1.5 rounded-full bg-[var(--accent-primary)] animate-pulse" />
            <span>Running...</span>
          </div>
        </div>
        <pre
          id="progress-log"
          class="console-card max-h-96 overflow-auto whitespace-pre-wrap font-[var(--font-mono)] text-xs leading-relaxed text-[var(--text-secondary)]"
        />
      </div>

      <script dangerouslySetInnerHTML={{ __html: `
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
          compileStatus.innerHTML = '<span id="status-dot" class="inline-block h-1.5 w-1.5 rounded-full bg-[var(--accent-primary)] animate-pulse"></span><span>Running...</span>';

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
                  compileStatus.innerHTML = '<span class="text-[var(--accent-secondary)]">Complete</span>';
                  return;
                } else if (line.startsWith('event: error')) {
                  btn.disabled = false;
                  compileStatus.innerHTML = '<span class="text-[var(--accent-primary)]">Error</span>';
                  return;
                }
              }

              return reader.read().then(processChunk);
            }

            return reader.read().then(processChunk);
          }).catch(err => {
            log.textContent += 'Error: ' + err.message + '\\n';
            btn.disabled = false;
            compileStatus.innerHTML = '<span class="text-[var(--accent-primary)]">Failed</span>';
          });
        }
      ` }} />
    </div>
  )
}
