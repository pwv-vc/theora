/** @jsxImportSource hono/jsx */

export function ErrorList() {
  return (
    <div
      id="error-list"
      class="hidden mb-5 bg-red-950 border border-red-900 rounded-lg p-4 no-scanline"
      style="position: relative; z-index: 10001;"
    >
      <div class="text-red-400 text-xs font-bold mb-2 uppercase tracking-wider">
        Validation errors
      </div>
      <div id="error-items" class="space-y-1" />
    </div>
  );
}
