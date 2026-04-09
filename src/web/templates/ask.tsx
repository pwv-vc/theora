/** @jsxImportSource hono/jsx */
import type { TagWithCount } from '../../lib/wiki.js'
import { GhostButton, Input, PageHeader, PrimaryButton, SectionLabel, StatusDot, TagSelectorBar } from './ui/index.js'

interface AskPageProps {
  tagsWithCounts: TagWithCount[]
}

export function AskPage({ tagsWithCounts }: AskPageProps) {
  return (
    <div>
      <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js" />

      <PageHeader title="Ask" subtitle="Ask a question against the compiled wiki." />

      <div class="mb-6">
        <div class="flex gap-3 mb-4">
          <Input
            inputSize="md"
            class="flex-1"
            id="question-input"
            type="text"
            placeholder="What are the key themes in this research?"
            onkeydown="if(event.key==='Enter')askQuestion()"
          />
          <PrimaryButton onclick="askQuestion()" id="ask-btn">Ask</PrimaryButton>
        </div>

        {tagsWithCounts.length > 0 && (
          <TagSelectorBar
            tagsWithCounts={tagsWithCounts}
            inputId="ask-tag-input"
            chipId="ask-tag-chip"
          />
        )}
      </div>

      <div id="status" class="hidden mb-4">
        <div class="flex items-center gap-2 text-zinc-500 text-xs">
          <StatusDot id="status-dot" />
          <span id="status-text">Thinking...</span>
        </div>
      </div>

      <div id="answer-wrapper" class="hidden">
        <div class="border border-zinc-800 rounded-lg p-5 no-scanline">
          <div class="flex items-center justify-between mb-4">
            <SectionLabel>Answer</SectionLabel>
            <GhostButton onclick="clearAnswer()">clear</GhostButton>
          </div>
          <pre
            id="answer-stream"
            class="text-zinc-400 text-sm leading-relaxed whitespace-pre-wrap font-mono"
          />
          <div
            id="answer-rendered"
            class="hidden prose prose-invert prose-zinc max-w-none prose-headings:font-mono prose-headings:text-zinc-100 prose-p:text-zinc-300 prose-a:text-red-400 prose-a:no-underline hover:prose-a:text-red-300 prose-code:text-zinc-300 prose-code:bg-zinc-800 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-pre:bg-zinc-900 prose-pre:border prose-pre:border-zinc-800 prose-strong:text-zinc-100 prose-li:text-zinc-300 prose-blockquote:border-red-800 prose-blockquote:text-zinc-400"
          />
        </div>
      </div>

      <script dangerouslySetInnerHTML={{ __html: `
        let currentSource = null;

        function askQuestion() {
          const input = document.getElementById('question-input');
          const question = input.value.trim();
          if (!question) return;

          const tagInput = document.getElementById('ask-tag-input');
          const tag = tagInput ? tagInput.value.trim() : '';
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
              renderedEl.innerHTML = marked.parse(fullAnswer);
              streamEl.classList.add('hidden');
              renderedEl.classList.remove('hidden');
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
      ` }} />
    </div>
  )
}
