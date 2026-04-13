/** @jsxImportSource hono/jsx */
import type { Child } from "hono/jsx";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  baseUrl: string;
  activeTag?: string;
  activeSourceType?: string;
  activeSort?: string;
}

function PaginationButton({
  href,
  disabled,
  children,
  isActive,
}: {
  href: string;
  disabled?: boolean;
  children: Child;
  isActive?: boolean;
}) {
  const baseClasses =
    "px-3 py-1.5 text-sm rounded border transition-colors no-scanline";
  const activeClasses = isActive
    ? "bg-red-600 border-red-600 text-white"
    : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200";
  const disabledClasses =
    "bg-zinc-900/50 border-zinc-800/50 text-zinc-600 cursor-not-allowed";

  if (disabled) {
    return (
      <span class={`${baseClasses} ${disabledClasses}`}>{children}</span>
    );
  }

  return (
    <a href={href} class={`${baseClasses} ${activeClasses}`}>
      {children}
    </a>
  );
}

function buildPageUrl(
  baseUrl: string,
  page: number,
  activeTag?: string,
  activeSourceType?: string,
  activeSort?: string,
): string {
  const params = new URLSearchParams();
  if (page > 1) params.set("page", String(page));
  if (activeTag) params.set("tag", activeTag);
  if (activeSourceType) params.set("sourceType", activeSourceType);
  if (activeSort) params.set("sort", activeSort);
  const queryString = params.toString();
  return queryString ? `${baseUrl}?${queryString}` : baseUrl;
}

function getPageNumbers(current: number, total: number): (number | string)[] {
  const pages: (number | string)[] = [];

  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i);
    return pages;
  }

  // Always show first page
  pages.push(1);

  if (current <= 3) {
    // Near start: show 2, 3, 4, 5, then ellipsis, last
    pages.push(2, 3, 4, 5, "...", total);
  } else if (current >= total - 2) {
    // Near end: show ellipsis, then last-4, last-3, last-2, last-1, last
    pages.push("...", total - 4, total - 3, total - 2, total - 1, total);
  } else {
    // Middle: show ellipsis, current-1, current, current+1, ellipsis, last
    pages.push("...", current - 1, current, current + 1, "...", total);
  }

  return pages;
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  baseUrl,
  activeTag,
  activeSourceType,
  activeSort,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);
  const pageNumbers = getPageNumbers(currentPage, totalPages);

  return (
    <div class="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 pt-6 border-t border-zinc-800 no-scanline">
      <div class="text-zinc-500 text-sm">
        Showing{" "}
        <span class="text-zinc-300">
          {startItem}-{endItem}
        </span>{" "}
        of <span class="text-zinc-300">{totalItems}</span>
      </div>

      <div class="flex items-center gap-1">
        <PaginationButton
          href={buildPageUrl(baseUrl, currentPage - 1, activeTag, activeSourceType, activeSort)}
          disabled={currentPage <= 1}
        >
          <svg
            class="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </PaginationButton>

        {pageNumbers.map((page) =>
          page === "..." ? (
            <span class="px-2 text-zinc-600">...</span>
          ) : (
            <PaginationButton
              href={buildPageUrl(baseUrl, page as number, activeTag, activeSourceType, activeSort)}
              isActive={page === currentPage}
            >
              {page}
            </PaginationButton>
          )
        )}

        <PaginationButton
          href={buildPageUrl(baseUrl, currentPage + 1, activeTag, activeSourceType, activeSort)}
          disabled={currentPage >= totalPages}
        >
          <svg
            class="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 5l7 7-7 7"
            />
          </svg>
        </PaginationButton>
      </div>
    </div>
  );
}
