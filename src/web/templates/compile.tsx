/** @jsxImportSource hono/jsx */

export function CompilePage() {
  return (
    <div>
      <div class="mb-6">
        <h1 class="text-xl font-bold text-zinc-100 mb-1">Compile</h1>
        <p class="text-zinc-500 text-sm">Process raw sources into the wiki.</p>
      </div>

      <div class="border border-zinc-800 rounded-lg p-5 mb-6">
        <div class="space-y-3 mb-5">
          <label class="flex items-center gap-3 cursor-pointer group">
            <input
              type="checkbox"
              id="opt-force"
              class="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-red-600 focus:ring-red-600 focus:ring-offset-zinc-950"
            />
            <div>
              <div class="text-zinc-200 text-sm group-hover:text-white transition-colors">Force recompile</div>
              <div class="text-zinc-600 text-xs">Delete existing articles and reprocess everything from scratch</div>
            </div>
          </label>

          <label class="flex items-center gap-3 cursor-pointer group">
            <input
              type="checkbox"
              id="opt-sources-only"
              class="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-red-600 focus:ring-red-600 focus:ring-offset-zinc-950"
            />
            <div>
              <div class="text-zinc-200 text-sm group-hover:text-white transition-colors">Sources only</div>
              <div class="text-zinc-600 text-xs">Skip concept extraction after compiling sources</div>
            </div>
          </label>

          <label class="flex items-center gap-3 cursor-pointer group">
            <input
              type="checkbox"
              id="opt-concepts-only"
              class="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-red-600 focus:ring-red-600 focus:ring-offset-zinc-950"
            />
            <div>
              <div class="text-zinc-200 text-sm group-hover:text-white transition-colors">Concepts only</div>
              <div class="text-zinc-600 text-xs">Regenerate all concept articles from existing compiled sources</div>
            </div>
          </label>
        </div>

        <button
          id="compile-btn"
          onclick="runCompile()"
          class="bg-red-700 hover:bg-red-600 disabled:bg-zinc-800 disabled:text-zinc-600 text-white text-sm px-5 py-2.5 rounded-lg transition-colors font-medium"
        >
          Run Compile
        </button>
      </div>

      <div id="progress-wrapper" class="hidden">
        <div class="flex items-center justify-between mb-3">
          <div class="text-zinc-600 text-xs uppercase tracking-wider">Progress</div>
          <div id="compile-status" class="flex items-center gap-2 text-zinc-500 text-xs">
            <span id="status-dot" class="inline-block w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            <span>Running...</span>
          </div>
        </div>
        <pre
          id="progress-log"
          class="bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-zinc-400 text-xs leading-relaxed font-mono overflow-auto max-h-96 whitespace-pre-wrap"
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
      ` }} />
    </div>
  )
}
