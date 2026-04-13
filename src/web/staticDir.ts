import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

/** Static assets live under dist/web/static when running the bundled CLI. */
export function webStaticAssetsDir(): string {
  return join(dirname(fileURLToPath(import.meta.url)), 'web', 'static')
}
