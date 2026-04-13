/** @jsxImportSource hono/jsx */
import { Layout } from './layout.js'

export interface ErrorMeta {
  headline: string
  message: string
}

export function errorMeta(status: number): ErrorMeta {
  switch (status) {
    case 400:
      return {
        headline: 'Bad request',
        message: 'The request could not be understood. Check the URL or form data and try again.',
      }
    case 401:
      return {
        headline: 'Unauthorized',
        message: 'Authentication is required to access this resource.',
      }
    case 403:
      return {
        headline: 'Forbidden',
        message: 'You do not have permission to access this resource.',
      }
    case 404:
      return {
        headline: 'Not found',
        message: 'That page, article, or file is not in this knowledge base. It may have moved or never existed.',
      }
    case 405:
      return {
        headline: 'Method not allowed',
        message: 'This action is not supported for the requested resource.',
      }
    case 408:
      return {
        headline: 'Request timeout',
        message: 'The server waited too long for the request to complete. Try again in a moment.',
      }
    case 409:
      return {
        headline: 'Conflict',
        message: 'The request conflicts with the current state of the resource.',
      }
    case 413:
      return {
        headline: 'Payload too large',
        message: 'The uploaded or submitted data exceeds the allowed size.',
      }
    case 429:
      return {
        headline: 'Too many requests',
        message: 'Slow down — rate limits are in effect. Wait briefly and try again.',
      }
    case 500:
      return {
        headline: 'Internal error',
        message: 'Something went wrong on the server. If this keeps happening, check the logs or restart the app.',
      }
    case 502:
      return {
        headline: 'Bad gateway',
        message: 'An upstream service failed to respond correctly.',
      }
    case 503:
      return {
        headline: 'Service unavailable',
        message: 'The service is temporarily overloaded or down for maintenance. Try again shortly.',
      }
    default:
      if (status >= 500) {
        return {
          headline: 'Server error',
          message: 'An unexpected error occurred while processing your request.',
        }
      }
      if (status >= 400) {
        return {
          headline: 'Request error',
          message: 'The request could not be completed as sent.',
        }
      }
      return {
        headline: 'Error',
        message: 'Something went wrong.',
      }
  }
}

export function ErrorPageBody({
  status,
  path,
}: {
  status: number
  path?: string
}) {
  const { headline, message } = errorMeta(status)
  const showPath = Boolean(path && status === 404)

  return (
    <div class="flex flex-col items-center justify-center min-h-[48vh] px-2">
      <div
        class="w-full max-w-lg rounded-xl border border-zinc-800 bg-zinc-900 no-scanline relative overflow-hidden"
        style="z-index: 10001; box-shadow: 0 0 0 1px color-mix(in srgb, var(--color-zinc-800) 80%, transparent), 0 24px 48px -12px rgba(0,0,0,0.45);"
      >
        <div
          class="absolute inset-x-0 top-0 h-px opacity-90"
          style="background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--color-red-500) 55%, transparent), transparent);"
        />
        <div class="absolute left-0 top-0 bottom-0 w-px opacity-60 bg-red-500/30" aria-hidden="true" />
        <div class="p-8 md:p-10 pl-9 md:pl-11">
          <div class="flex flex-wrap items-end gap-x-4 gap-y-2 mb-6">
            <span
              class="text-5xl md:text-6xl font-bold tabular-nums text-red-500 leading-none tracking-tight"
              style="text-shadow: 0 0 28px color-mix(in srgb, var(--color-red-500) 40%, transparent);"
            >
              {status}
            </span>
            <span class="text-zinc-500 text-[10px] uppercase tracking-[0.25em] pb-1">signal lost</span>
          </div>
          <h1 class="text-base md:text-lg font-bold text-zinc-100 mb-2">{headline}</h1>
          <p class="text-zinc-400 text-sm leading-relaxed mb-6">{message}</p>
          {showPath && (
            <div class="mb-6 rounded-lg border border-zinc-800 bg-zinc-950/80 px-3 py-2">
              <div class="text-zinc-600 text-[10px] uppercase tracking-wider mb-1">Requested path</div>
              <code class="text-zinc-300 text-xs break-all font-mono">{path}</code>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function errorPageHtml(status: number, path?: string): string {
  const { headline } = errorMeta(status)
  return Layout({
    title: `${status} — ${headline}`,
    active: 'error',
    children: ErrorPageBody({ status, path }),
  }).toString()
}
