/** @jsxImportSource hono/jsx */
import { getPkgVersion } from "../../../lib/pkg-version.js";
import { GitHubIcon } from "./icons/index.js";

export function Footer() {
  const version = getPkgVersion();
  return (
    <footer class="border-t border-zinc-800 bg-zinc-900 mt-auto relative z-[20000]">
      <div class="max-w-5xl mx-auto px-4 sm:px-6 py-6 flex flex-row items-center justify-between gap-4">
        <span class="text-zinc-500 text-sm tabular-nums">
          theora v{version}
        </span>
        <a
          href="https://github.com/pwv-vc/theora"
          target="_blank"
          rel="noopener noreferrer"
          class="text-zinc-400 hover:text-[var(--color-accent)] transition-colors"
          title="Theora on GitHub"
        >
          <GitHubIcon size={20} />
        </a>
      </div>
    </footer>
  );
}
