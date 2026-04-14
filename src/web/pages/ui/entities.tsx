/** @jsxImportSource hono/jsx */
import type { EntityWithCount } from '../../../lib/wiki.js'

const TOP_ENTITIES = 10

interface EntityPopoverShellProps {
  popoverId: string
  totalCount: number
  activeEntity: string
  entitiesWithCounts: EntityWithCount[]
  listItems: unknown
  clearHref: string
  filterSelector: string
}

function EntityPopoverShell({
  popoverId,
  totalCount,
  activeEntity,
  entitiesWithCounts,
  listItems,
  clearHref,
  filterSelector,
}: EntityPopoverShellProps) {
  return (
    <div class="relative" id={`${popoverId}-container`}>
      <button
        type="button"
        onclick={`(function(btn){var p=document.getElementById('${popoverId}');p.toggleAttribute('hidden');if(!p.hidden){document.getElementById('${popoverId}-input').focus();document.addEventListener('click',function h(e){if(!btn.closest('#${popoverId}-container').contains(e.target)){p.setAttribute('hidden','');document.removeEventListener('click',h)}},{once:false,capture:true})}})(this)`}
        class={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded border transition-colors whitespace-nowrap ${
          activeEntity
            ? 'bg-red-900/30 border-red-700 text-red-400'
            : 'border-zinc-800 bg-zinc-950 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300'
        }`}
      >
        {activeEntity ? activeEntity : (
          <>
            <span>Browse {totalCount} entities</span>
          </>
        )}
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
            placeholder="Filter entities..."
            class="w-full bg-zinc-900 border border-zinc-700 text-zinc-100 placeholder-zinc-600 px-3 py-1.5 rounded text-xs focus:border-red-600 focus:outline-none"
            oninput={`var q=this.value.toLowerCase();document.querySelectorAll('${filterSelector}').forEach(function(el){el.style.display=el.dataset.entity.includes(q)?'':'none'})`}
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

interface EntitySelectorBarProps {
  entitiesWithCounts: EntityWithCount[]
  inputId: string
  chipId: string
}

export function EntitySelectorBar({
  entitiesWithCounts,
  inputId,
  chipId,
}: EntitySelectorBarProps) {
  const popoverId = `entity-selector-${inputId}`
  const topEntities = entitiesWithCounts.slice(0, TOP_ENTITIES)
  const remainingCount = entitiesWithCounts.length - TOP_ENTITIES

  const selectScript = (entity: string) =>
    `(function(){document.getElementById('${inputId}').value='${entity.replace(/'/g, "\\'")}';var c=document.getElementById('${chipId}');var ct=c.querySelector('[data-chip-text]');if(ct)ct.textContent='${entity.replace(/'/g, "\\'")}';c.classList.remove('hidden');document.getElementById('${popoverId}').setAttribute('hidden','');document.querySelectorAll('#${popoverId}-list button').forEach(function(b){b.classList.toggle('bg-red-900/30',b.dataset.entity==='${entity.replace(/'/g, "\\'")}');b.classList.toggle('border-red-700',b.dataset.entity==='${entity.replace(/'/g, "\\'")}');b.classList.toggle('text-red-400',b.dataset.entity==='${entity.replace(/'/g, "\\'")}')});})()`

  const chipClass = () =>
    `inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded border transition-colors bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200`

  return (
    <div>
      <div class="flex flex-wrap items-start gap-2">
        <button
          type="button"
          onclick={`document.getElementById('${inputId}').value='';document.getElementById('${chipId}').classList.add('hidden');document.querySelectorAll('#${popoverId}-list button').forEach(function(b){b.classList.remove('bg-red-900/30','border-red-700','text-red-400')})`}
          class="text-xs px-2.5 py-1 rounded border border-zinc-700 bg-zinc-900 text-zinc-500 hover:border-zinc-500 hover:text-zinc-300 transition-colors no-scanline"
          style="position: relative; z-index: 10001;"
        >
          all
        </button>
        {topEntities.map(({ entity, count }) => (
          <button
            key={entity}
            type="button"
            data-entity={entity}
            onclick={selectScript(entity)}
            class="text-xs px-2.5 py-1 rounded border border-zinc-700 bg-zinc-900 text-zinc-500 hover:border-zinc-500 hover:text-zinc-300 transition-colors no-scanline"
            style="position: relative; z-index: 10001;"
            title={`${count} articles`}
          >
            {entity}
          </button>
        ))}
        {remainingCount > 0 && (
          <EntityPopoverShell
            popoverId={popoverId}
            totalCount={entitiesWithCounts.length}
            activeEntity=""
            entitiesWithCounts={entitiesWithCounts}
            clearHref="#"
            filterSelector={`#${popoverId}-list button`}
            listItems={entitiesWithCounts.map(({ entity, count }) => (
              <button
                key={entity}
                type="button"
                data-entity={entity.toLowerCase()}
                onclick={selectScript(entity)}
                class={`${chipClass()} no-scanline`}
                style="position: relative; z-index: 10001;"
              >
                <span>{entity}</span>
                <span class="text-zinc-600">{count}</span>
              </button>
            ))}
          />
        )}
      </div>
      <input type="hidden" id={inputId} name="entity" value="" />
      <div class="mt-3 flex items-center gap-2 hidden" id={chipId}>
        <span class="text-zinc-500 text-xs">Filtered by</span>
        <span class="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-red-600 text-white font-medium" data-chip-text></span>
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