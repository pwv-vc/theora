/** @jsxImportSource hono/jsx */
import type { WikiMapGraph } from '../../lib/wikiMap/index.js'
import { PageHeader } from './ui.js'

const MARKMAP_D3 = {
  src: 'https://cdn.jsdelivr.net/npm/d3@7.9.0/dist/d3.min.js',
  integrity: 'sha384-CjloA8y00+1SDAUkjs099PVfnY2KmDC2BZnws9kh8D/lX1s46w6EPhpXdqMfjK6i',
} as const
const MARKMAP_LIB = {
  src: 'https://cdn.jsdelivr.net/npm/markmap-lib@0.18.12/dist/browser/index.iife.js',
  integrity: 'sha384-ZlXKtR0wcZqxEYI8i3TPFFiOJR1MEdIzdVvnhSOonCrPsBup4dnkRw49FeYhfsHF',
} as const
const MARKMAP_VIEW = {
  src: 'https://cdn.jsdelivr.net/npm/markmap-view@0.18.12/dist/browser/index.js',
  integrity: 'sha384-p+gyhsDIg0RmvIKRr9BBGSyJ9NDDkiFsbilRwdZd20Q8mUL2v7e8+orY4pvTV52w',
} as const

function escapeJsonPayload(json: string): string {
  return json.replace(/</g, '\\u003c')
}

export interface MapPageProps {
  config: Record<string, unknown>
  graph: WikiMapGraph | null
  error: string
  around: string
  tag: string
  entity: string
  ontology: string
  depth: number
  maxNodes: number
  bridgeCap: number
}

export function MapPage({
  config,
  graph,
  error,
  around,
  tag,
  entity,
  ontology,
  depth,
  maxNodes,
  bridgeCap,
}: MapPageProps) {
  const kbName = String(config.name ?? 'Knowledge Base')
  const graphJson = graph ? JSON.stringify(graph) : 'null'

  return (
    <div>
      <PageHeader
        title={`${kbName} Mind Map`}
        subtitle="Explore concepts, sources, tags, and entities. Click a node to dive in, double-click to open the article, or scroll to zoom."
      />

      <div class="relative w-full no-scanline" style="height: calc(100vh - 10rem)">
        {/* Map canvas */}
        <div
          id="wiki-map-container"
          class="w-full h-full rounded-xl border border-zinc-700 bg-white shadow-lg shadow-black/20 overflow-hidden"
        >
          {error && (
            <div class="flex items-center justify-center h-full">
              <div class="rounded-lg border border-red-300 bg-red-50 px-6 py-4 text-red-700 text-sm max-w-md">
                {error}
              </div>
            </div>
          )}
          {!error && (
            <svg id="wiki-map-svg" class="w-full h-full" />
          )}
        </div>

        {/* HUD: Breadcrumb trail (top-left) */}
        <div
          id="wiki-map-breadcrumb"
          class="absolute top-3 left-3 flex items-center gap-1 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-1.5 text-xs font-mono text-zinc-600 z-10 max-w-[70%] overflow-x-auto shadow-sm border border-zinc-200"
        >
          <button
            type="button"
            class="text-zinc-500 hover:text-zinc-900 transition-colors shrink-0"
            data-action="home"
            title="Back to overview"
          >
            overview
          </button>
        </div>

        {/* HUD: Zoom controls (top-right) */}
        <div class="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-lg px-1.5 py-1.5 z-10 flex items-center gap-1 shadow-sm border border-zinc-200">
          <button
            type="button"
            id="map-ctrl-zoom-in"
            class="text-zinc-500 hover:text-zinc-900 transition-colors text-sm w-6 h-6 flex items-center justify-center rounded border border-zinc-300 hover:border-zinc-400 bg-white font-mono leading-none"
            title="Zoom in"
          >+</button>
          <span
            id="map-zoom-level"
            class="text-zinc-400 text-[10px] font-mono w-8 text-center select-none"
            title="Current zoom level"
          >1x</span>
          <button
            type="button"
            id="map-ctrl-zoom-out"
            class="text-zinc-500 hover:text-zinc-900 transition-colors text-sm w-6 h-6 flex items-center justify-center rounded border border-zinc-300 hover:border-zinc-400 bg-white font-mono leading-none"
            title="Zoom out"
          >&minus;</button>
          <button
            type="button"
            id="map-ctrl-fit"
            class="text-zinc-500 hover:text-zinc-900 transition-colors text-[10px] px-1.5 h-6 flex items-center justify-center rounded border border-zinc-300 hover:border-zinc-400 bg-white font-mono"
            title="Fit to viewport"
          >fit</button>
        </div>

        {/* HUD: Legend + interaction hints (bottom) */}
        <div class="absolute bottom-3 left-3 right-3 flex items-center justify-between bg-white/90 backdrop-blur-sm rounded-lg px-4 py-1.5 z-10 text-[10px] font-mono shadow-sm border border-zinc-200">
          <div class="flex items-center gap-3">
            <span class="flex items-center gap-1"><span style="color:#0ea5e9">&#9670;</span> <span class="text-zinc-500">concept</span></span>
            <span class="flex items-center gap-1"><span style="color:#10b981">&#9632;</span> <span class="text-zinc-500">source</span></span>
            <span class="flex items-center gap-1"><span style="color:#6366f1">&#9632;</span> <span class="text-zinc-500">query</span></span>
            <span class="flex items-center gap-1"><span style="color:#22c55e">&#9679;</span> <span class="text-zinc-500">tag</span></span>
            <span class="flex items-center gap-1"><span style="color:#a855f7">&#9670;</span> <span class="text-zinc-500">entity</span></span>
            <span class="flex items-center gap-1"><span style="color:#8b5cf6">&#9650;</span> <span class="text-zinc-500">ontology</span></span>
          </div>
          <div class="text-zinc-400 shrink-0 ml-4">
            click: dive in &middot; double-click: open &middot; scroll: zoom
          </div>
        </div>
      </div>

      {/* Graph data payload */}
      <script
        type="application/json"
        id="wiki-map-graph-data"
        dangerouslySetInnerHTML={{ __html: escapeJsonPayload(graphJson) }}
      />
      <script
        type="application/json"
        id="wiki-map-init-state"
        dangerouslySetInnerHTML={{ __html: escapeJsonPayload(JSON.stringify({
          around,
          tag,
          entity,
          ontology,
          depth,
          maxNodes,
          bridgeCap,
        })) }}
      />

      {/* CDN scripts */}
      <script src={MARKMAP_D3.src} integrity={MARKMAP_D3.integrity} crossorigin="anonymous" />
      <script src={MARKMAP_LIB.src} integrity={MARKMAP_LIB.integrity} crossorigin="anonymous" />
      <script src={MARKMAP_VIEW.src} integrity={MARKMAP_VIEW.integrity} crossorigin="anonymous" />

      {/* Map engine */}
      <script dangerouslySetInnerHTML={{ __html: MAP_ENGINE_JS }} />
    </div>
  )
}

const KIND_COLORS: Record<string, string> = {
  focal: '#991155',
  concept: '#0ea5e9',
  source: '#10b981',
  query: '#6366f1',
  tag: '#22c55e',
  entity: '#a855f7',
  ontology: '#8b5cf6',
}

const KIND_MARKERS: Record<string, string> = {
  concept: '\u25C6',
  source: '\u25A0',
  query: '\u25A0',
  tag: '\u25CF',
  entity: '\u25C6',
  ontology: '\u25B2',
}

const MAP_ENGINE_JS = `
(function() {
  var KIND_COLORS = ${JSON.stringify(KIND_COLORS)};
  var KIND_MARKERS = ${JSON.stringify(KIND_MARKERS)};

  var mm = null;
  var breadcrumb = [];
  var currentState = {};


  function esc(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function graphToTree(graph) {
    if (!graph || !graph.nodes || graph.nodes.length === 0) return null;

    var byKey = {};
    graph.nodes.forEach(function(n) { byKey[n.key] = n; });
    var focal = graph.nodes.find(function(n) { return n.kind === 'focal'; });
    if (!focal) focal = graph.nodes[0];

    var adj = {};
    graph.nodes.forEach(function(n) { adj[n.key] = []; });
    graph.edges.forEach(function(e) {
      if (adj[e.fromKey]) adj[e.fromKey].push(e.toKey);
      if (adj[e.toKey]) adj[e.toKey].push(e.fromKey);
    });

    var visited = {};
    visited[focal.key] = true;
    var parentMap = {};
    var queue = [focal.key];
    while (queue.length > 0) {
      var u = queue.shift();
      var neighbors = adj[u] || [];
      for (var i = 0; i < neighbors.length; i++) {
        var v = neighbors[i];
        if (visited[v]) continue;
        visited[v] = true;
        parentMap[v] = u;
        queue.push(v);
      }
    }

    var childrenMap = {};
    Object.keys(parentMap).forEach(function(child) {
      var par = parentMap[child];
      if (!childrenMap[par]) childrenMap[par] = [];
      childrenMap[par].push(child);
    });
    Object.keys(childrenMap).forEach(function(par) {
      childrenMap[par].sort(function(a, b) {
        return (byKey[a]?.label || '').localeCompare(byKey[b]?.label || '');
      });
    });

    function buildNode(key) {
      var node = byKey[key];
      if (!node) return null;
      var kind = node.kind;
      var color = KIND_COLORS[kind] || '#71717a';
      var marker = KIND_MARKERS[kind] || '';
      var label = esc(node.label);
      var dataAttrs = ' data-node-key="' + esc(key) + '"'
        + ' data-kind="' + kind + '"'
        + ' data-label="' + label + '"'
        + (node.slug ? ' data-slug="' + esc(node.slug) + '"' : '')
        + (node.webUrl ? ' data-web-url="' + esc(node.webUrl) + '"' : '')
        + (kind === 'tag' ? ' data-tag="' + esc(node.label.replace(/^#/,'')) + '"' : '');

      var content;
      if (kind === 'focal') {
        content = '<b style="font-size:1.1em;cursor:default"' + dataAttrs + '>' + label + '</b>';
      } else if (kind === 'concept' || kind === 'source' || kind === 'query') {
        content = '<span style="color:' + color + '">' + marker + '</span> '
          + '<span style="color:#18181b;cursor:pointer;border-bottom:1px dotted ' + color + '"'
          + dataAttrs + '>' + label + '</span>';
      } else if (kind === 'tag') {
        content = '<span style="color:' + color + '">' + marker + '</span> '
          + '<span style="color:#52525b;cursor:pointer;font-style:italic"'
          + dataAttrs + '>' + label + '</span>';
      } else if (kind === 'entity') {
        content = '<span style="color:' + color + '">' + marker + '</span> '
          + '<code style="color:#52525b;font-size:0.85em;cursor:pointer"'
          + dataAttrs + '>' + label + '</code>';
      } else if (kind === 'ontology') {
        content = '<span style="color:' + color + '">' + marker + '</span> '
          + '<em style="color:#6366f1;cursor:pointer"'
          + dataAttrs + '>' + label + '</em>';
      } else {
        content = '<span style="color:#52525b"' + dataAttrs + '>' + label + '</span>';
      }

      var children = (childrenMap[key] || []).map(buildNode).filter(Boolean);
      var result = { content: content, children: children };
      result.payload = {
        key: key, kind: kind,
        slug: node.slug || '',
        webUrl: node.webUrl || '',
        label: node.label,
        tag: kind === 'tag' ? node.label.replace(/^#/,'') : '',
      };
      return result;
    }

    return buildNode(focal.key);
  }

  function colorForNode(node) {
    var p = node.payload;
    if (!p) return '#a1a1aa';
    return KIND_COLORS[p.kind] || '#a1a1aa';
  }

  var focalWebUrl = '';
  var focalLabel = '';

  function renderMap(graph) {
    var svg = document.getElementById('wiki-map-svg');
    if (!svg || !window.markmap) return;

    var root = graphToTree(graph);
    if (!root) return;

    var focalNode = graph.nodes.find(function(n) { return n.kind === 'focal'; });
    focalWebUrl = (focalNode && focalNode.webUrl) || '';
    focalLabel = (focalNode && focalNode.label) || '';

    var Markmap = window.markmap.Markmap;
    if (!Markmap) return;

    function zoomToRoot() {
      if (!mm) return;
      mm.fit();
      setTimeout(function() {
        if (!mm || !mm.svg || !svg) return;
        var d3sel = window.d3;
        if (!d3sel || !d3sel.zoomTransform || !d3sel.zoomIdentity) return;
        try {
          var cur = d3sel.zoomTransform(svg);
          var scale = 0.66;
          var w = svg.clientWidth || svg.getBoundingClientRect().width;
          var h = svg.clientHeight || svg.getBoundingClientRect().height;
          var t = d3sel.zoomIdentity
            .translate(w * 0.1, h / 2)
            .scale(scale);
          mm.svg.transition().duration(400).call(mm.zoom.transform, t);
        } catch(e) { console.warn('zoomToRoot:', e); }
      }, 100);
    }

    if (mm) {
      mm.setData(root, {
        color: colorForNode,
        duration: 350,
      });
      setTimeout(zoomToRoot, 400);
      return;
    }

    mm = Markmap.create(svg, {
      zoom: true,
      pan: true,
      scrollForPan: true,
      spacingHorizontal: 80,
      spacingVertical: 8,
      maxWidth: 350,
      duration: 350,
      initialExpandLevel: -1,
      autoFit: false,
      color: colorForNode,
    }, root);

    setTimeout(zoomToRoot, 500);

    var clickTimer = null;
    svg.addEventListener('click', function(e) {
      var target = e.target;
      var nodeEl = target.closest ? target.closest('[data-node-key]') : null;
      if (!nodeEl) return;
      var kind = nodeEl.dataset.kind || '';
      if (kind === 'focal') return;

      if (clickTimer) { clearTimeout(clickTimer); clickTimer = null; return; }
      clickTimer = setTimeout(function() {
        clickTimer = null;
        var slug = nodeEl.dataset.slug || '';
        var tag = nodeEl.dataset.tag || '';

        if (slug && (kind === 'concept' || kind === 'source' || kind === 'query')) {
          refocus({ around: slug, tag: '' });
        } else if (tag || kind === 'tag') {
          var tagVal = tag || (nodeEl.dataset.label || '').replace(/^#/,'');
          refocus({ around: '', tag: tagVal });
        } else if (kind === 'entity') {
          var lbl = nodeEl.dataset.label || nodeEl.textContent || '';
          var entityKey = lbl.replace('/', ':');
          refocus({ around: '', tag: '', entity: entityKey });
        }
      }, 250);
    });

    svg.addEventListener('dblclick', function(e) {
      if (clickTimer) { clearTimeout(clickTimer); clickTimer = null; }
      var target = e.target;
      var nodeEl = target.closest ? target.closest('[data-node-key]') : null;
      if (!nodeEl) return;
      var webUrl = nodeEl.dataset.webUrl || '';
      var kind = nodeEl.dataset.kind || '';
      var tag = nodeEl.dataset.tag || '';
      var label = nodeEl.dataset.label || nodeEl.textContent || '';

      if (webUrl) {
        window.open(webUrl, '_blank');
      } else if (tag || kind === 'tag') {
        window.open('/search?tag=' + encodeURIComponent(tag || label.replace(/^#/,'')), '_blank');
      } else if (kind === 'entity') {
        window.open('/search?q=' + encodeURIComponent(label.replace(/\\//g, ' ')), '_blank');
      }
    });
  }

  function updateBreadcrumb() {
    var el = document.getElementById('wiki-map-breadcrumb');
    if (!el) return;
    var html = '<button type="button" class="text-zinc-500 hover:text-zinc-900 transition-colors shrink-0" data-action="home" title="Back to overview">overview</button>';

    var current = '';
    if (currentState.around) current = currentState.around;
    else if (currentState.tag) current = '#' + currentState.tag;
    else if (currentState.entity) current = currentState.entity.replace(':', '/');

    breadcrumb.forEach(function(crumb, i) {
      html += ' <span class="text-zinc-300">&rsaquo;</span> ';
      html += '<button type="button" class="text-zinc-500 hover:text-zinc-900 transition-colors truncate max-w-32" data-crumb-idx="' + i + '" title="' + esc(crumb.label) + '">' + esc(crumb.label) + '</button>';
    });

    if (current) {
      html += ' <span class="text-zinc-300">&rsaquo;</span> ';
      html += '<span class="truncate max-w-40 font-bold" style="color:#09090b">' + esc(current) + '</span>';
    }

    if (focalWebUrl) {
      html += ' <a href="' + esc(focalWebUrl) + '" class="ml-2 text-cyan-600 hover:text-cyan-800 text-[10px] transition-colors" title="Open ' + esc(focalLabel) + '">open &rarr;</a>';
    }

    el.innerHTML = html;

    el.querySelectorAll('[data-action="home"]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        breadcrumb = [];
        currentState.around = '';
        currentState.tag = '';
        currentState.entity = '';
        fetchAndRender();
      });
    });
    el.querySelectorAll('[data-crumb-idx]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var idx = parseInt(btn.dataset.crumbIdx, 10);
        var crumb = breadcrumb[idx];
        breadcrumb = breadcrumb.slice(0, idx);
        currentState.around = crumb.around || '';
        currentState.tag = crumb.tag || '';
        currentState.entity = crumb.entity || '';
        fetchAndRender();
      });
    });
  }

  function refocus(opts) {
    var currentLabel = '';
    if (currentState.around) currentLabel = currentState.around;
    else if (currentState.tag) currentLabel = '#' + currentState.tag;
    else if (currentState.entity) currentLabel = currentState.entity;

    if (currentState.around || currentState.tag || currentState.entity) {
      breadcrumb.push({ around: currentState.around, tag: currentState.tag, entity: currentState.entity, label: currentLabel });
    }
    currentState.around = opts.around || '';
    currentState.tag = opts.tag || '';
    currentState.entity = opts.entity || '';
    fetchAndRender();

    var url = '/wiki/map';
    var params = [];
    if (currentState.around) params.push('around=' + encodeURIComponent(currentState.around));
    if (currentState.tag) params.push('tag=' + encodeURIComponent(currentState.tag));
    if (currentState.entity) params.push('entity=' + encodeURIComponent(currentState.entity));
    if (params.length) url += '?' + params.join('&');
    history.pushState(null, '', url);
  }

  function fetchAndRender() {
    var params = [];
    if (currentState.around) params.push('around=' + encodeURIComponent(currentState.around));
    if (currentState.tag) params.push('tag=' + encodeURIComponent(currentState.tag));
    if (currentState.entity) params.push('entity=' + encodeURIComponent(currentState.entity));
    if (currentState.ontology) params.push('ontology=' + encodeURIComponent(currentState.ontology));
    params.push('depth=' + (currentState.depth || 3));
    params.push('maxNodes=' + (currentState.maxNodes || 200));
    params.push('bridgeCap=' + (currentState.bridgeCap || 10));

    var url = '/wiki/map/graph.json?' + params.join('&');
    fetch(url)
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (data.error) {
          console.warn('Map graph error:', data.error);
          return;
        }
        renderMap(data.graph);
        updateBreadcrumb();
      })
      .catch(function(err) { console.error('Map fetch error:', err); });
  }

  function init() {
    var dataEl = document.getElementById('wiki-map-graph-data');
    var stateEl = document.getElementById('wiki-map-init-state');
    if (!dataEl || !window.markmap) return;

    var graph;
    try { graph = JSON.parse(dataEl.textContent || 'null'); } catch(e) { return; }
    try { currentState = JSON.parse(stateEl?.textContent || '{}'); } catch(e) { currentState = {}; }

    if (graph) {
      renderMap(graph);
      updateBreadcrumb();
    }

    function updateZoomLabel() {
      var el = document.getElementById('map-zoom-level');
      var svgEl = document.getElementById('wiki-map-svg');
      if (!el || !svgEl) return;
      var d3sel = window.d3;
      if (!d3sel || !d3sel.zoomTransform) return;
      try {
        var t = d3sel.zoomTransform(svgEl);
        var pct = Math.round(t.k * 100);
        el.textContent = pct + '%';
      } catch(e) {}
    }

    var svgEl = document.getElementById('wiki-map-svg');
    if (svgEl) {
      svgEl.addEventListener('wheel', function() { setTimeout(updateZoomLabel, 50); });
      svgEl.addEventListener('mouseup', function() { setTimeout(updateZoomLabel, 50); });
      svgEl.addEventListener('touchend', function() { setTimeout(updateZoomLabel, 50); });
    }

    function stepZoom(factor) {
      if (!mm || !mm.svg) return;
      var s = document.getElementById('wiki-map-svg');
      if (!s) return;
      try {
        var w = s.clientWidth || s.getBoundingClientRect().width;
        var h = s.clientHeight || s.getBoundingClientRect().height;
        var pt = [w * 0.25, h / 2];
        mm.svg.transition().duration(200).call(mm.zoom.scaleBy, factor, pt);
        setTimeout(updateZoomLabel, 250);
      } catch(e) { console.warn('stepZoom:', e); }
    }

    var zoomInBtn = document.getElementById('map-ctrl-zoom-in');
    if (zoomInBtn) {
      zoomInBtn.addEventListener('click', function() { stepZoom(1.4); });
    }
    var zoomOutBtn = document.getElementById('map-ctrl-zoom-out');
    if (zoomOutBtn) {
      zoomOutBtn.addEventListener('click', function() { stepZoom(1 / 1.4); });
    }
    var fitBtn = document.getElementById('map-ctrl-fit');
    if (fitBtn) {
      fitBtn.addEventListener('click', function() {
        if (mm && typeof mm.fit === 'function') mm.fit();
        setTimeout(updateZoomLabel, 400);
      });
    }

    setTimeout(updateZoomLabel, 800);

    window.addEventListener('popstate', function() {
      var params = new URLSearchParams(window.location.search);
      currentState.around = params.get('around') || '';
      currentState.tag = params.get('tag') || '';
      currentState.entity = params.get('entity') || '';
      fetchAndRender();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
`
