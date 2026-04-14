/** @jsxImportSource hono/jsx */
import type { TagWithCount, EntityWithCount } from '../../lib/wiki.js'
import type { KbConfig } from '../../lib/config.js'
import { PageHeader, TagSelectorBar, EntitySelectorBar } from './ui/index.js'
import { QuestionInput, AnswerPanel, StatusIndicator } from './ask/index.js'

interface AskPageProps {
  tagsWithCounts: TagWithCount[]
  entitiesWithCounts: EntityWithCount[]
  config: KbConfig
  placeholderPhrases: string[]
}

export function AskPage({ tagsWithCounts, entitiesWithCounts, config, placeholderPhrases }: AskPageProps) {
  const initialPlaceholder =
    placeholderPhrases[0] ?? 'Tell me about this knowledge base'
  return (
    <div>
      <script src="https://cdn.jsdelivr.net/npm/marked@15.0.12/marked.min.js" integrity="sha384-948ahk4ZmxYVYOc+rxN1H2gM1EJ2Duhp7uHtZ4WSLkV4Vtx5MUqnV+l7u9B+jFv+" crossorigin="anonymous" />
      <script src="https://cdn.jsdelivr.net/npm/dompurify@3.3.3/dist/purify.min.js" integrity="sha384-pcBjnGbkyKeOXaoFkmJiuR9E08/6gkmus6/Strimnxtl3uk0Hx23v345pWyC/MMr" crossorigin="anonymous" />

      <PageHeader title="Ask" subtitle={`Your ${config.name} wiki can answer many kinds of questions. Type one below.`} />

      <div
        id="ask-placeholder-data"
        class="hidden"
        data-phrases={encodeURIComponent(JSON.stringify(placeholderPhrases))}
      />

      <div class="mb-6">
        <QuestionInput initialPlaceholder={initialPlaceholder} />

        {tagsWithCounts.length > 0 && (
          <div class="mb-3">
            <TagSelectorBar
              tagsWithCounts={tagsWithCounts}
              inputId="ask-tag-input"
              chipId="ask-tag-chip"
            />
          </div>
        )}

        {entitiesWithCounts.length > 0 && (
          <EntitySelectorBar
            entitiesWithCounts={entitiesWithCounts}
            inputId="ask-entity-input"
            chipId="ask-entity-chip"
          />
        )}
      </div>

      <StatusIndicator />

      <AnswerPanel />

      <script dangerouslySetInnerHTML={{ __html: getClientScript() }} />
    </div>
  )
}

function getClientScript(): string {
  return `
    (function () {
      const dataEl = document.getElementById('ask-placeholder-data');
      const raw = dataEl && dataEl.dataset.phrases;
      if (!raw) return;
      let phrases;
      try {
        phrases = JSON.parse(decodeURIComponent(raw));
      } catch (e) {
        return;
      }
      if (!Array.isArray(phrases) || phrases.length < 2) return;

      const input = document.getElementById('question-input');
      if (!input) return;

      let idx = 0;
      let timer = null;

      function startRotation() {
        if (timer) clearInterval(timer);
        timer = setInterval(tick, 5000);
      }

      function stopRotation() {
        if (timer) {
          clearInterval(timer);
          timer = null;
        }
      }

      function tick() {
        if (document.activeElement === input || input.value.trim() !== '') return;
        input.classList.add('opacity-40');
        setTimeout(function () {
          idx = (idx + 1) % phrases.length;
          input.placeholder = phrases[idx];
          input.classList.remove('opacity-40');
        }, 200);
      }

      input.addEventListener('focus', stopRotation);
      input.addEventListener('blur', function () {
        if (input.value.trim() === '') startRotation();
      });
      input.addEventListener('input', function () {
        if (input.value.trim() !== '') stopRotation();
        else startRotation();
      });

      startRotation();
    })();

    let currentSource = null;

    function askQuestion() {
      const input = document.getElementById('question-input');
      const question = input.value.trim();
      if (!question) return;

      const tagInput = document.getElementById('ask-tag-input');
      const tag = tagInput ? tagInput.value.trim() : '';
      const entityInput = document.getElementById('ask-entity-input');
      const entity = entityInput ? entityInput.value.trim() : '';
      const streamEl = document.getElementById('answer-stream');
      const renderedEl = document.getElementById('answer-rendered');
      const wrapper = document.getElementById('answer-wrapper');
      const status = document.getElementById('status');
      const statusText = document.getElementById('status-text');
      const btn = document.getElementById('ask-btn');

      if (currentSource) {
        currentSource.close();
        currentSource = null;
      }

      streamEl.textContent = '';
      streamEl.classList.remove('hidden');
      renderedEl.innerHTML = '';
      renderedEl.classList.add('hidden');
      wrapper.classList.add('hidden');
      status.classList.remove('hidden');
      statusText.textContent = 'Thinking...';
      btn.disabled = true;

      let url = '/ask/stream?q=' + encodeURIComponent(question);
      if (tag) url += '&tag=' + encodeURIComponent(tag);
      if (entity) url += '&entity=' + encodeURIComponent(entity);

      const source = new EventSource(url);
      currentSource = source;

      source.onmessage = (e) => {
        wrapper.classList.remove('hidden');
        streamEl.textContent += e.data;
        statusText.textContent = 'Streaming...';
      };

      source.addEventListener('done', (e) => {
        source.close();
        currentSource = null;
        status.classList.add('hidden');
        btn.disabled = false;

        const fullAnswer = e.data;
        if (typeof marked !== 'undefined' && fullAnswer) {
          const rawHtml = marked.parse(fullAnswer);
          renderedEl.innerHTML = typeof DOMPurify !== 'undefined' ? DOMPurify.sanitize(rawHtml) : rawHtml;
          streamEl.classList.add('hidden');
          renderedEl.classList.remove('hidden');
          if (typeof window.renderMermaid === 'function') {
            window.renderMermaid(renderedEl);
          }
        }
      });

      source.addEventListener('error', (e) => {
        source.close();
        currentSource = null;
        status.classList.add('hidden');
        btn.disabled = false;
        if (e.data) {
          streamEl.textContent += '\\n\\nError: ' + e.data;
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
      document.getElementById('answer-stream').textContent = '';
      document.getElementById('answer-rendered').innerHTML = '';
      document.getElementById('answer-rendered').classList.add('hidden');
      document.getElementById('answer-stream').classList.remove('hidden');
      document.getElementById('answer-wrapper').classList.add('hidden');
      document.getElementById('status').classList.add('hidden');
      document.getElementById('ask-btn').disabled = false;
    }
  `;
}
