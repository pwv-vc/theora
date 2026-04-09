/** @jsxImportSource hono/jsx */
import { TagLink, TagPicker } from './ui.js'

interface AskPageProps {
  tags: string[]
  selectedTags: string[]
}

export function AskPage({ tags, selectedTags }: AskPageProps) {
  const searchHref = selectedTags.length > 0
    ? `/search?${selectedTags.map(tag => `tag=${encodeURIComponent(tag)}`).join('&')}`
    : '/search'

  return (
    <div class="page-stack">
      <section class="page-stack">
        <div class="space-y-2">
          <div class="flex flex-wrap items-center gap-2">
            <span class="console-chip console-chip-active">Ask</span>
            <span class="console-chip">question first</span>
          </div>
          <p class="max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
            Ask the knowledge base directly. Tags are optional scope, and search stays close when you want to inspect sources first.
          </p>
        </div>

        <section class="search-panel space-y-5">
          <div class="space-y-3">
            <label for="question-input" class="console-muted">Question</label>
            <textarea
              id="question-input"
              placeholder="What changed across these sources, what concepts repeat, and what should I investigate next?"
              class="console-input min-h-36 resize-y"
            />
          </div>

          <div class="flex flex-wrap gap-3">
            <button
              onclick="askQuestion()"
              id="ask-btn"
              class="console-button"
            >
              Ask
            </button>
            <a href={searchHref} class="console-button-secondary">Search</a>
            <button
              type="button"
              onclick="clearAnswer()"
              class="console-chip hover:text-[var(--text-primary)]"
            >
              Clear
            </button>
          </div>

          <TagPicker
            allTags={tags}
            selectedTags={selectedTags}
            pickerId="ask-tag-picker"
            label="Context"
            emptyLabel="No tags are available yet"
          />

          {selectedTags.length > 0 && (
            <div class="inline-pivots">
              <span class="console-muted">Scoped to</span>
              <div class="flex flex-wrap gap-2">
                {selectedTags.map(tag => (
                  <TagLink key={tag} tag={tag} href={searchHref} active />
                ))}
              </div>
            </div>
          )}
        </section>
      </section>

      <div id="status" class="hidden console-card">
        <div class="flex items-center gap-3 text-sm text-[var(--text-secondary)]">
          <span id="status-dot" class="inline-block h-2 w-2 rounded-full bg-[var(--accent-primary)] animate-pulse" />
          <span id="status-text">Thinking…</span>
        </div>
      </div>

      <section id="answer-wrapper" class="hidden console-card">
        <div class="mb-4 flex items-center justify-between gap-3">
          <div class="space-y-1">
            <div class="console-muted">Answer</div>
            <a href={searchHref} class="text-sm text-[var(--accent-secondary)]">Browse related sources</a>
          </div>
        </div>
        <pre
          id="answer"
          class="overflow-x-auto whitespace-pre-wrap font-[var(--font-mono)] text-sm leading-7 text-[var(--text-secondary)]"
        />
      </section>

      <script dangerouslySetInnerHTML={{ __html: `
        let currentSource = null;

        function getSelectedTags() {
          return Array.from(document.querySelectorAll('#ask-tag-picker input[name="tag"]:checked')).map((input) => input.value);
        }

        function askQuestion() {
          const input = document.getElementById('question-input');
          const question = input.value.trim();
          if (!question) return;

          const tags = getSelectedTags();
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
          statusText.textContent = 'Thinking…';
          btn.disabled = true;

          const params = new URLSearchParams();
          params.set('q', question);
          tags.forEach((tag) => params.append('tag', tag));

          const source = new EventSource('/ask/stream?' + params.toString());
          currentSource = source;

          source.onmessage = (event) => {
            wrapper.classList.remove('hidden');
            answerEl.textContent += event.data;
            statusText.textContent = 'Streaming…';
          };

          source.addEventListener('done', () => {
            source.close();
            currentSource = null;
            status.classList.add('hidden');
            btn.disabled = false;
          });

          source.addEventListener('error', (event) => {
            source.close();
            currentSource = null;
            status.classList.add('hidden');
            btn.disabled = false;
            if (event.data) answerEl.textContent += '\\n\\nError: ' + event.data;
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
          document.getElementById('question-input').focus();
        }
      ` }} />
    </div>
  )
}
