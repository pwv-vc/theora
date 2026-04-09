/** @jsxImportSource hono/jsx */

export function AskPage() {
  return (
    <div>
      <div class="mb-6">
        <h1 class="text-xl font-bold text-zinc-100 mb-1">Ask</h1>
        <p class="text-zinc-500 text-sm">Ask a question against the compiled wiki.</p>
      </div>

      <div class="mb-6">
        <div class="flex gap-3">
          <input
            id="question-input"
            type="text"
            placeholder="What are the key themes in this research?"
            class="flex-1 bg-zinc-900 border border-zinc-700 text-zinc-100 placeholder-zinc-600 px-4 py-2.5 rounded-lg text-sm focus:border-red-600 focus:outline-none transition-colors"
            onkeydown="if(event.key==='Enter')askQuestion()"
          />
          <button
            onclick="askQuestion()"
            id="ask-btn"
            class="bg-red-700 hover:bg-red-600 disabled:bg-zinc-800 disabled:text-zinc-600 text-white text-sm px-5 py-2.5 rounded-lg transition-colors font-medium"
          >
            Ask
          </button>
        </div>
        <div class="flex items-center gap-2 mt-2">
          <label class="text-zinc-600 text-xs">Tag filter:</label>
          <input
            id="tag-filter"
            type="text"
            placeholder="optional tag"
            class="bg-zinc-900 border border-zinc-800 text-zinc-400 placeholder-zinc-700 px-2 py-1 rounded text-xs focus:border-zinc-600 focus:outline-none w-32"
          />
        </div>
      </div>

      <div id="status" class="hidden mb-4">
        <div class="flex items-center gap-2 text-zinc-500 text-xs">
          <span id="status-dot" class="inline-block w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
          <span id="status-text">Thinking...</span>
        </div>
      </div>

      <div id="answer-wrapper" class="hidden">
        <div class="border-t border-zinc-800 pt-6">
          <div class="flex items-center justify-between mb-4">
            <div class="text-zinc-600 text-xs uppercase tracking-wider">Answer</div>
            <button
              onclick="clearAnswer()"
              class="text-zinc-700 hover:text-zinc-500 text-xs transition-colors"
            >
              clear
            </button>
          </div>
          <pre
            id="answer"
            class="text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap font-mono"
          />
        </div>
      </div>

      <script dangerouslySetInnerHTML={{ __html: `
        let currentSource = null;

        function askQuestion() {
          const input = document.getElementById('question-input');
          const question = input.value.trim();
          if (!question) return;

          const tag = document.getElementById('tag-filter').value.trim();
          const answerEl = document.getElementById('answer');
          const wrapper = document.getElementById('answer-wrapper');
          const status = document.getElementById('status');
          const statusText = document.getElementById('status-text');
          const btn = document.getElementById('ask-btn');

          if (currentSource) {
            currentSource.close();
            currentSource = null;
          }

          answerEl.textContent = '';
          wrapper.classList.add('hidden');
          status.classList.remove('hidden');
          statusText.textContent = 'Thinking...';
          btn.disabled = true;

          let url = '/ask/stream?q=' + encodeURIComponent(question);
          if (tag) url += '&tag=' + encodeURIComponent(tag);

          const source = new EventSource(url);
          currentSource = source;

          source.onmessage = (e) => {
            wrapper.classList.remove('hidden');
            answerEl.textContent += e.data;
            statusText.textContent = 'Streaming...';
          };

          source.addEventListener('done', (e) => {
            source.close();
            currentSource = null;
            status.classList.add('hidden');
            btn.disabled = false;
          });

          source.addEventListener('error', (e) => {
            source.close();
            currentSource = null;
            status.classList.add('hidden');
            btn.disabled = false;
            if (e.data) {
              answerEl.textContent += '\\n\\nError: ' + e.data;
            }
          });

          source.onerror = () => {
            if (source.readyState === EventSource.CLOSED) {
              status.classList.add('hidden');
              btn.disabled = false;
            }
          };
        }

        function clearAnswer() {
          if (currentSource) {
            currentSource.close();
            currentSource = null;
          }
          document.getElementById('answer').textContent = '';
          document.getElementById('answer-wrapper').classList.add('hidden');
          document.getElementById('status').classList.add('hidden');
          document.getElementById('ask-btn').disabled = false;
        }
      ` }} />
    </div>
  )
}
