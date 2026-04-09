# Goal

Redesign the Theora web UI to get users to content immediately, with substantially less chrome, explanation, and panel density than the current "research console" presentation.

# Summary

The current web experience prioritizes framing, status, taxonomy mechanics, and instructional copy before users reach actual articles or search results. The primary change is to invert that priority: content and content-finding become the first screen, while system explanation, secondary actions, and advanced filtering move behind lighter-weight controls or lower-emphasis areas.

This redesign is not a visual cleanup only. It changes the information hierarchy, page entry points, and interaction defaults so the fastest path is: open app -> search or browse content -> open article -> continue exploring.

The scope for the first pass is cross-app. Home, search, ask, article, and shared header patterns should converge on one simplified interaction model instead of preserving separate "console dashboard" and "search console" layouts.

The interface should be understandable without guides, posture text, cue lists, or sidecar explanations. If a control needs a paragraph to explain it, the control should be redesigned or removed.

Terminology and voice should draw from the README language: a living wiki, compiled sources, concepts, answers, and a knowledge base that gets smarter as users explore. Avoid labels that sound like operator dashboards, training overlays, or abstract UX jargon.

# Definition Of Done

- The default search and browse experience presents content or content entry points in the first viewport without requiring users to parse descriptive panels.
- Search input and active filters are visible and usable without a large form container or separate explanatory cards.
- Navigation and page chrome are reduced so the top of each page emphasizes the current task and nearby content, not branding or operational status.
- Supporting guidance is limited to concise labels, placeholders, and short empty-state recovery copy only where strictly necessary.
- Tags remain usable, but the UI no longer lets tag management dominate the page.
- The resulting flows are consistent enough that home, search, and ask feel like one simplified product rather than three differently decorated consoles.
- The shipped pages contain no persistent instructional panels such as "current mode", "search cues", "ask flow", "prompt posture", or similar explain-the-UI blocks.
- Page and control names use README-native vocabulary instead of invented console phrasing.

# Core Flow

The primary entry experience becomes a content-first workspace:

1. User lands on the app and immediately sees a compact global header, a primary search field, and meaningful content below it.
2. If there is a query or active tags, results are shown immediately with minimal metadata and clear relevance cues.
3. If there is no query, the page still shows content-first browse sections such as recent items and a small set of high-signal pivots instead of instructional cards.
4. Filters are available inline near the search field. Active filters stay visible and removable, but the full taxonomy is collapsed behind an explicit control.
5. Opening an article keeps surrounding navigation lightweight so the reading surface stays dominant.
6. Moving from search to ask carries context without requiring extra explanatory UI.

Home route behavior:

1. `/` becomes a search landing rather than a metrics-heavy overview.
2. The first viewport contains compact brand/navigation, the primary search row, and immediate browse content such as recent sources and concept pivots.
3. Counts, telemetry, and system status move out of the primary landing surface or are removed from this pass if they do not help users reach content.
4. Home copy should frame the product as a living wiki or knowledge base, not as a console or control room.

Search route behavior:

1. `/search` and `/` share the same top interaction pattern so switching between them does not feel like moving to a different product area.
2. The search row contains query input, primary submit action, and a single filter trigger that opens the full tag picker in a drawer or expandable tray.
3. Active tags render inline beneath or beside the search row as removable chips.
4. Suggested tags appear as a small inline row near results or browse content, not a separate sidebar card.
5. Results begin directly below the search controls with a compact count and query summary.

Ask route behavior:

1. `/ask` keeps a single dominant question composer and treats tag context as optional secondary scope.
2. The full tag picker uses the same drawer interaction as search.
3. Search remains the main place to inspect content, so ask should link back to source exploration with minimal or no supporting copy.
4. Stream status and answer output remain visible, but container framing and descriptive copy are reduced to the minimum needed for usability.
5. The primary labels should use simple language such as "Ask", "Question", and "Answer" rather than phrases like "guided query" or "prompt posture".

Article route behavior:

1. Article pages prioritize title, lightweight metadata, tags, and body content.
2. Large intro panels and duplicated "context" explanation are removed.
3. Related actions remain available as compact links near the title or after metadata, without a separate side stack dominating the first viewport.

# Important Changes

- Reduce header height and copy so branding does not consume the first content viewport.
- Replace the current sticky header arrangement with a lower-height shared header containing wordmark, compact nav, and palette toggle only.
- Remove large hero sections on home, search, ask, and article pages and replace them with compact intros or no intro copy.
- Remove instructional cards and sidebars entirely from home, search, and ask.
- Make `/` a search/content landing and keep `/search` as the full query route using the same top-level layout.
- Make `/search` the clearest content hub, with one dominant search row and immediate results or browse content below it.
- Replace the current right-rail "suggested tags" and "search cues" cards with lighter inline affordances near the search row or results list.
- Change tag filtering from an always-expanded card workflow to a compact control with visible active selections and a secondary drawer or tray for the full taxonomy.
- Simplify result cards so title, type, matched tags, and snippet are readable at a glance without excess framing text.
- Rework empty and discovery states to show useful content choices instead of mode explanations.
- Align `/`, `/search`, and `/ask` around the same compact interaction model and reduced copy density.
- Reduce or remove operational status blocks, telemetry summaries, and prose-heavy sidebars from user-facing pages in this pass.
- Keep the existing visual tone, typography, and accent colors, but remove heavy panel nesting, duplicate borders, and decorative copy that slows scanning.
- Replace section labels that narrate the interface with direct action language or remove them when the control itself is self-evident.
- Prefer visible affordance over explanation: for example, a clear filter button and removable chips instead of text explaining how tag filtering works.
- Replace current labels such as "Research Console", "Guided Query", "Prompt posture", "Search cues", and "Current mode" with README-aligned language or remove them outright.
- Prefer README terms already grounded in the product model:
  - "Search", "Ask", "Compile"
  - "Sources", "Concepts", "Answers"
  - "Knowledge base", "Living wiki"
- Avoid new marketing taglines in the page chrome. If a short descriptor is needed near the brand, reuse README ideas such as "living wiki" or "knowledge base" in a restrained way.

Implementation approach:

- Update [src/web/templates/layout.tsx](/Users/dthyresson/projects/pwv/theora/src/web/templates/layout.tsx) to produce a shorter header and less dominant main-page framing.
- Replace the current large-format page structures in [src/web/templates/home.tsx](/Users/dthyresson/projects/pwv/theora/src/web/templates/home.tsx), [src/web/templates/search.tsx](/Users/dthyresson/projects/pwv/theora/src/web/templates/search.tsx), [src/web/templates/ask.tsx](/Users/dthyresson/projects/pwv/theora/src/web/templates/ask.tsx), and [src/web/templates/article.tsx](/Users/dthyresson/projects/pwv/theora/src/web/templates/article.tsx) with a shared compact page rhythm.
- Refactor [src/web/templates/ui.tsx](/Users/dthyresson/projects/pwv/theora/src/web/templates/ui.tsx) so `TagPicker` supports drawer-style expansion and a smaller always-visible active-filter summary.
- Adjust the client-side interaction script in [src/web/templates/layout.tsx](/Users/dthyresson/projects/pwv/theora/src/web/templates/layout.tsx) to support the new filter drawer behavior while preserving tag add, remove, and clear interactions.
- Trim or replace CSS utilities and component classes in [src/web/styles/input.css](/Users/dthyresson/projects/pwv/theora/src/web/styles/input.css) and the generated [src/web/static/styles.css](/Users/dthyresson/projects/pwv/theora/src/web/static/styles.css) so the layout relies on fewer large panel variants.

Data and interface expectations:

- Server routes in [src/web/server.ts](/Users/dthyresson/projects/pwv/theora/src/web/server.ts) continue to provide the same search, discovery, and tag data.
- No search scoring or corpus logic changes are required for this pass.
- `SearchPage` continues to accept `q`, `selectedTags`, `tags`, `results`, and `discovery`, but presentation should treat `discovery` as inline browse content rather than a separate mode with explanation cards.
- `TagPicker` should expose an interaction contract with:
  - a compact trigger control
  - an active-tag summary region
  - an expandable or drawer body containing tag search and checkbox options
- Shared page components should assume mobile-first stacking and avoid dedicated right rails unless they contain content-critical elements.
- No template should introduce instructional copy blocks whose primary purpose is explaining the interface rather than the content or action.
- Copy review is part of implementation: every visible label should be checked against README vocabulary before it ships.

# Test Cases And Scenarios

- Opening `/search` with no query shows a usable browse state with recent or high-value content in the initial viewport.
- Opening `/search?q=term` shows results immediately, with no large explanatory region above them.
- Opening `/search` with one or more `tag` params keeps filters visible, removable, and clearly applied.
- Opening `/` shows the same content-first search landing structure rather than the current dashboard/telemetry-heavy overview.
- Opening `/ask` shows the question composer in the first viewport with optional context controls, not a hero plus sidebar explanation pattern.
- Opening an article shows title and readable article body in the initial viewport without a large context panel pushing the content down.
- Narrowing tags to zero results shows a short recovery path with actions to broaden the search.
- Keyboard users can tab from navigation to search to results without traversing long blocks of non-interactive explanatory content.
- Keyboard users can open, search within, and close the filter drawer while preserving checked state and focus order.
- Mobile layout keeps the search action, active filters, and first content items visible without stacked decorative panels overwhelming the screen.
- Moving from search to ask with active tags preserves context in a way that feels secondary to finding content, not equal to it.
- Long tag lists remain manageable because the full taxonomy is hidden until explicitly opened.
- Suggested tags never displace results below the fold on common desktop and mobile viewport sizes.
- A first-time user can understand the primary action on each page without reading more than a label, placeholder, or button caption.

Failure modes and recovery behavior:

- If there are no tags, the filter trigger remains present but opens an empty-state message instead of rendering a large blank filter area.
- If there are no search results, the page shows concise recovery actions: clear filters, remove individual tags, or try a broader query.
- If the knowledge base has little or no compiled content, the landing and search pages still prioritize the next useful action instead of showing decorative empty panels.
- If JavaScript is unavailable, the filter UI should degrade to a standard visible control path that still allows tag selection and form submission.

# Assumptions And Defaults

- Default direction is "content first, controls second, explanation third."
- Home becomes a search/content landing instead of a distinct dashboard.
- Search remains a dedicated route and the primary hub for browsing as well.
- Advanced filtering remains available through a secondary drawer or tray, not a persistent card.
- Existing data sources, search behavior, and tag intersection logic remain unchanged unless a UX change requires small presentation-layer adjustments.
- The redesign should preserve the project's personality, but not at the cost of scanability or speed to content.
- The first pass removes low-value UI density before introducing any new features or navigation destinations.
- Telemetry and system-status information are not primary user tasks for this redesign and should be reduced or deferred.
- Any explanatory text that survives must justify its presence by helping with content, not by teaching the interface.
- README language is the source of truth for naming and tone in this pass.
