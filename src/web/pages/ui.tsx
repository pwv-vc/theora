/** @jsxImportSource hono/jsx */
import type { Child, JSX } from 'hono/jsx'

// ─────────────────────────────────────────────────────────────
// Layout / Structure
// ─────────────────────────────────────────────────────────────

export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div class="mb-6">
      <h1 class="text-xl font-bold text-zinc-100 mb-1">{title}</h1>
      {subtitle && <p class="text-zinc-500 text-sm">{subtitle}</p>}
    </div>
  )
}

export function SectionHeader({ title, count }: { title: string; count: number }) {
  return (
    <div class="flex items-center gap-3 mb-4">
      <h2 class="text-zinc-100 font-bold text-sm uppercase tracking-wider">{title}</h2>
      <span class="text-zinc-600 text-xs">{count}</span>
    </div>
  )
}

export function SectionLabel({ children }: { children: Child }) {
  return (
    <div class="text-zinc-600 text-xs uppercase tracking-wider">{children}</div>
  )
}

export function EmptyState({ children }: { children: Child }) {
  return (
    <div class="border border-zinc-800 rounded-lg p-8 text-center">
      {children}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Cards
// ─────────────────────────────────────────────────────────────

export function Card({ href, children }: { href: string; children: Child }) {
  return (
    <a href={href} class="block group">
      <div class="border border-zinc-800 rounded-lg p-4 hover:border-zinc-600 hover:bg-zinc-900/50 transition-all">
        {children}
      </div>
    </a>
  )
}

export function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div class="border border-zinc-800 rounded-lg p-4">
      <div class="text-zinc-500 text-xs uppercase tracking-wider mb-1">{label}</div>
      <div class="text-zinc-100 text-lg font-bold">{value}</div>
    </div>
  )
}

export function Panel({ children, class: cls }: { children: Child; class?: string }) {
  return (
    <div class={`border border-zinc-800 rounded-lg p-5 ${cls ?? ''}`}>
      {children}
    </div>
  )
}

export function LogPanel({ id, class: cls }: { id: string; class?: string }) {
  return (
    <pre
      id={id}
      class={`bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-zinc-400 text-xs leading-relaxed font-mono overflow-auto max-h-96 whitespace-pre-wrap ${cls ?? ''}`}
    />
  )
}

// ─────────────────────────────────────────────────────────────
// Badges / Pills
// ─────────────────────────────────────────────────────────────

type PillVariant = 'default' | 'type' | 'ontology'

const pillStyles: Record<PillVariant, string> = {
  default:  'bg-zinc-800 text-zinc-400 text-xs px-1.5 py-0.5 rounded',
  type:     'bg-zinc-800 text-zinc-400 text-xs px-2 py-0.5 rounded uppercase tracking-wider',
  ontology: 'bg-zinc-900 border border-zinc-700 text-zinc-500 text-xs px-2 py-0.5 rounded',
}

export function Pill({ children, variant = 'default' }: { children: Child; variant?: PillVariant }) {
  return <span class={pillStyles[variant]}>{children}</span>
}

type TagLinkVariant = 'card' | 'page'

const tagLinkStyles: Record<TagLinkVariant, string> = {
  card: 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 text-xs px-2 py-0.5 rounded transition-colors',
  page: 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 text-xs px-2 py-1 rounded transition-colors',
}

export function TagLink({ tag, href, variant = 'card' }: { tag: string; href: string; variant?: TagLinkVariant }) {
  return (
    <a href={href} class={tagLinkStyles[variant]}>#{tag}</a>
  )
}

export function TagFilterLink({ label, href, active }: { label: string; href: string; active: boolean }) {
  return (
    <a
      href={href}
      class={`text-xs px-2.5 py-1 rounded border transition-colors ${
        active
          ? 'bg-red-900/30 border-red-700 text-red-400'
          : 'bg-zinc-900 border-zinc-700 text-zinc-500 hover:border-zinc-500 hover:text-zinc-300'
      }`}
    >
      {label}
    </a>
  )
}

const TOP_TAGS = 10

function TagPopoverShell({
  popoverId,
  totalCount,
  activeTag,
  tagsWithCounts,
  listItems,
  clearHref,
  filterSelector,
}: {
  popoverId: string
  totalCount: number
  activeTag: string
  tagsWithCounts: { tag: string; count: number }[]
  listItems: unknown
  clearHref: string
  filterSelector: string
}) {
  return (
    <div class="relative" id={`${popoverId}-container`}>
      <button
        type="button"
        onclick={`(function(btn){var p=document.getElementById('${popoverId}');p.toggleAttribute('hidden');if(!p.hidden){document.getElementById('${popoverId}-input').focus();document.addEventListener('click',function h(e){if(!btn.closest('#${popoverId}-container').contains(e.target)){p.setAttribute('hidden','');document.removeEventListener('click',h)}},{once:false,capture:true})}})(this)`}
        class={`text-xs px-2.5 py-1 rounded border transition-colors whitespace-nowrap ${
          activeTag
            ? 'bg-red-900/30 border-red-700 text-red-400'
            : 'border-zinc-700 bg-zinc-900 text-zinc-500 hover:border-zinc-500 hover:text-zinc-300'
        }`}
      >
        {activeTag ? `#${activeTag}` : `Browse ${totalCount} tags`}
      </button>
      <div
        id={popoverId}
        hidden
        class="absolute left-0 top-full mt-1 z-50 w-80 bg-zinc-950 border border-zinc-700 rounded-lg shadow-xl"
      >
        <div class="p-2 border-b border-zinc-800">
          <input
            id={`${popoverId}-input`}
            type="text"
            placeholder="Filter tags..."
            class="w-full bg-zinc-900 border border-zinc-700 text-zinc-100 placeholder-zinc-600 px-3 py-1.5 rounded text-xs focus:border-red-600 focus:outline-none"
            oninput={`var q=this.value.toLowerCase();document.querySelectorAll('${filterSelector}').forEach(function(el){el.style.display=el.dataset.tag.includes(q)?'':'none'})`}
          />
        </div>
        <div id={`${popoverId}-list`} class="flex flex-wrap gap-1.5 p-3 max-h-64 overflow-y-auto">
          {listItems}
        </div>
        <div class="px-3 py-2 border-t border-zinc-800">
          <a href={clearHref} class="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">clear filter</a>
        </div>
      </div>
    </div>
  )
}

export function TagFilterBar({
  tagsWithCounts,
  activeTag,
  hrefBase,
  extraParams,
  clearHref,
}: {
  tagsWithCounts: { tag: string; count: number }[]
  activeTag: string
  hrefBase: string
  extraParams?: string
  clearHref: string
}) {
  const topTags = tagsWithCounts.slice(0, TOP_TAGS)
  const remainingCount = tagsWithCounts.length - TOP_TAGS
  const popoverId = `tag-popover-${hrefBase.replace(/\//g, '')  || 'home'}`

  const buildHref = (tag: string) => {
    const params = [`tag=${encodeURIComponent(tag)}`, ...(extraParams ? [extraParams] : [])].join('&')
    return `${hrefBase}?${params}`
  }

  return (
    <div>
      <div class="flex flex-wrap items-center gap-2">
        <TagFilterLink label="all" href={clearHref} active={!activeTag} />
        {topTags.map(({ tag }) => (
          <TagFilterLink
            key={tag}
            label={`#${tag}`}
            href={buildHref(tag)}
            active={activeTag === tag}
          />
        ))}
        {remainingCount > 0 && (
          <TagPopoverShell
            popoverId={popoverId}
            totalCount={tagsWithCounts.length}
            activeTag={topTags.some(t => t.tag === activeTag) ? '' : activeTag}
            tagsWithCounts={tagsWithCounts}
            clearHref={clearHref}
            filterSelector={`#${popoverId}-list a`}
            listItems={tagsWithCounts.map(({ tag, count }) => (
              <a
                key={tag}
                href={buildHref(tag)}
                data-tag={tag.toLowerCase()}
                class={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded border transition-colors ${
                  activeTag === tag
                    ? 'bg-red-900/30 border-red-700 text-red-400'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200'
                }`}
              >
                <span>#{tag}</span>
                <span class="text-zinc-600">{count}</span>
              </a>
            ))}
          />
        )}
      </div>
      {activeTag && (
        <div class="mt-3 flex items-center gap-2">
          <span class="text-zinc-500 text-xs">Filtered by</span>
          <span class="text-xs px-2 py-0.5 rounded border border-red-700 bg-red-900/30 text-red-400">#{activeTag}</span>
          <a href={clearHref} class="text-zinc-600 text-xs hover:text-zinc-400 transition-colors">× clear</a>
        </div>
      )}
    </div>
  )
}

export function TagSelectorBar({
  tagsWithCounts,
  inputId,
  chipId,
}: {
  tagsWithCounts: { tag: string; count: number }[]
  inputId: string
  chipId: string
}) {
  const popoverId = `tag-selector-${inputId}`
  const topTags = tagsWithCounts.slice(0, TOP_TAGS)
  const remainingCount = tagsWithCounts.length - TOP_TAGS

  const selectScript = (tag: string) =>
    `(function(){document.getElementById('${inputId}').value='${tag.replace(/'/g, "\\'")}';var c=document.getElementById('${chipId}');c.textContent='#${tag.replace(/'/g, "\\'")}';c.classList.remove('hidden');document.getElementById('${popoverId}').setAttribute('hidden','');document.querySelectorAll('#${popoverId}-list button').forEach(function(b){b.classList.toggle('bg-red-900/30',b.dataset.tag==='${tag.replace(/'/g, "\\'")}');b.classList.toggle('border-red-700',b.dataset.tag==='${tag.replace(/'/g, "\\'")}');b.classList.toggle('text-red-400',b.dataset.tag==='${tag.replace(/'/g, "\\'")}')});})()`

  const chipClass = (tag: string) =>
    `inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded border transition-colors bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200`

  return (
    <div>
      <div class="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onclick={`document.getElementById('${inputId}').value='';document.getElementById('${chipId}').classList.add('hidden');document.querySelectorAll('#${popoverId}-list button').forEach(function(b){b.classList.remove('bg-red-900/30','border-red-700','text-red-400')})`}
          class="text-xs px-2.5 py-1 rounded border border-zinc-700 bg-zinc-900 text-zinc-500 hover:border-zinc-500 hover:text-zinc-300 transition-colors"
        >
          all
        </button>
        {topTags.map(({ tag }) => (
          <button
            key={tag}
            type="button"
            data-tag={tag}
            onclick={selectScript(tag)}
            class="text-xs px-2.5 py-1 rounded border border-zinc-700 bg-zinc-900 text-zinc-500 hover:border-zinc-500 hover:text-zinc-300 transition-colors"
          >
            #{tag}
          </button>
        ))}
        {remainingCount > 0 && (
          <TagPopoverShell
            popoverId={popoverId}
            totalCount={tagsWithCounts.length}
            activeTag=""
            tagsWithCounts={tagsWithCounts}
            clearHref="#"
            filterSelector={`#${popoverId}-list button`}
            listItems={tagsWithCounts.map(({ tag, count }) => (
              <button
                key={tag}
                type="button"
                data-tag={tag.toLowerCase()}
                onclick={selectScript(tag)}
                class={chipClass(tag)}
              >
                <span>#{tag}</span>
                <span class="text-zinc-600">{count}</span>
              </button>
            ))}
          />
        )}
      </div>
      <input type="hidden" id={inputId} name="tag" value="" />
      <div class="mt-3 flex items-center gap-2 hidden" id={chipId}>
        <span class="text-zinc-500 text-xs">Filtered by</span>
        <span class="text-xs px-2 py-0.5 rounded border border-red-700 bg-red-900/30 text-red-400"></span>
        <button
          type="button"
          onclick={`document.getElementById('${inputId}').value='';document.getElementById('${chipId}').classList.add('hidden')`}
          class="text-zinc-600 text-xs hover:text-zinc-400 transition-colors"
        >
          × clear
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Forms
// ─────────────────────────────────────────────────────────────

type InputSize = 'md' | 'sm'

const inputStyles: Record<InputSize, string> = {
  md: 'bg-zinc-900 border border-zinc-700 text-zinc-100 placeholder-zinc-600 px-4 py-2.5 rounded-lg text-sm focus:border-red-600 focus:outline-none transition-colors',
  sm: 'bg-zinc-900 border border-zinc-800 text-zinc-400 placeholder-zinc-700 px-2 py-1 rounded text-xs focus:border-zinc-600 focus:outline-none',
}

type InputProps = Omit<JSX.IntrinsicElements['input'], 'size'> & { inputSize?: InputSize }

export function Input({ inputSize = 'md', class: cls, ...props }: InputProps) {
  return (
    <input class={`${inputStyles[inputSize]} ${cls ?? ''}`} {...props} />
  )
}

type ButtonProps = Omit<JSX.IntrinsicElements['button'], 'class'> & { children: Child; class?: string }

export function PrimaryButton({ children, class: cls, ...props }: ButtonProps) {
  return (
    <button
      class={`bg-red-700 hover:bg-red-600 disabled:bg-zinc-800 disabled:text-zinc-600 text-white text-sm px-5 py-2.5 rounded-lg transition-colors font-medium ${cls ?? ''}`}
      {...props}
    >
      {children}
    </button>
  )
}

export function GhostButton({ children, class: cls, ...props }: ButtonProps) {
  return (
    <button
      class={`text-zinc-700 hover:text-zinc-500 text-xs transition-colors ${cls ?? ''}`}
      {...props}
    >
      {children}
    </button>
  )
}

export function CheckboxField({ id, label, description }: { id: string; label: string; description: string }) {
  return (
    <label class="flex items-center gap-3 cursor-pointer group">
      <input
        type="checkbox"
        id={id}
        class="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-red-600 focus:ring-red-600 focus:ring-offset-zinc-950"
      />
      <div>
        <div class="text-zinc-200 text-sm group-hover:text-white transition-colors">{label}</div>
        <div class="text-zinc-600 text-xs">{description}</div>
      </div>
    </label>
  )
}

// ─────────────────────────────────────────────────────────────
// Indicators
// ─────────────────────────────────────────────────────────────

export function StatusDot({ id }: { id?: string }) {
  return (
    <span
      id={id}
      class="inline-block w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"
    />
  )
}

// ─────────────────────────────────────────────────────────────
// Content
// ─────────────────────────────────────────────────────────────

export function Prose({ html }: { html: string }) {
  return (
    <div
      class="prose prose-invert prose-zinc max-w-none prose-headings:font-mono prose-headings:text-zinc-100 prose-p:text-zinc-300 prose-a:text-red-400 prose-a:no-underline hover:prose-a:text-red-300 prose-code:text-zinc-300 prose-code:bg-zinc-800 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-pre:bg-zinc-900 prose-pre:border prose-pre:border-zinc-800 prose-strong:text-zinc-100 prose-li:text-zinc-300 prose-blockquote:border-red-800 prose-blockquote:text-zinc-400"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
