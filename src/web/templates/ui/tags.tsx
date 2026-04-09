/** @jsxImportSource hono/jsx */
import { TagFilterLink } from './badges.js'

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
        class="absolute left-0 top-full mt-1 z-50 w-80 bg-zinc-950 border border-zinc-700 rounded-lg shadow-xl no-scanline"
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
  const popoverId = `tag-popover-${hrefBase.replace(/\//g, '') || 'home'}`

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
                class={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded border transition-colors no-scanline ${
                  activeTag === tag
                    ? 'bg-red-900/30 border-red-700 text-red-400'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200'
                }`}
                style="position: relative; z-index: 10001;"
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

  const chipClass = () =>
    `inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded border transition-colors bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200`

  return (
    <div>
      <div class="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onclick={`document.getElementById('${inputId}').value='';document.getElementById('${chipId}').classList.add('hidden');document.querySelectorAll('#${popoverId}-list button').forEach(function(b){b.classList.remove('bg-red-900/30','border-red-700','text-red-400')})`}
          class="text-xs px-2.5 py-1 rounded border border-zinc-700 bg-zinc-900 text-zinc-500 hover:border-zinc-500 hover:text-zinc-300 transition-colors no-scanline"
          style="position: relative; z-index: 10001;"
        >
          all
        </button>
        {topTags.map(({ tag }) => (
          <button
            key={tag}
            type="button"
            data-tag={tag}
            onclick={selectScript(tag)}
            class="text-xs px-2.5 py-1 rounded border border-zinc-700 bg-zinc-900 text-zinc-500 hover:border-zinc-500 hover:text-zinc-300 transition-colors no-scanline"
            style="position: relative; z-index: 10001;"
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
                class={`${chipClass()} no-scanline`}
                style="position: relative; z-index: 10001;"
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
