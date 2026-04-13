import { Command } from "commander";
import pc from "picocolors";
import { formatCliOneLinePreview, stderrSpinner } from "../lib/cli-feedback.js";
import { requireKbRoot } from "../lib/paths.js";
import { getAllTags } from "../lib/wiki.js";
import { searchArticles, type SearchResult } from "../lib/search.js";

function formatRelevanceScore(score: number): string {
  if (!Number.isFinite(score)) return "—";
  if (score === 0) return "0";
  if (score >= 10) return score.toFixed(1);
  if (score >= 1) return score.toFixed(2);
  return score.toFixed(3);
}

function classifySearchKind(result: SearchResult): string {
  const rp = result.relativePath;
  if (rp.startsWith("wiki/sources/")) return "source";
  if (rp.startsWith("wiki/concepts/")) return "concept";
  if (rp.startsWith("output/")) {
    if (result.docType === "mind-map") return "mind map";
    return "previous answer";
  }
  return "article";
}

export const searchCommand = new Command("search")
  .description("Search the wiki")
  .argument("<query...>", "search terms")
  .option("-n, --limit <n>", "max results", "10")
  .option("--tag <tag>", "filter results by tag")
  .option("--tags", "list all tags in the wiki")
  .action(
    async (
      queryParts: string[],
      options: { limit: string; tag?: string; tags?: boolean },
    ) => {
      requireKbRoot();

      if (options.tags) {
        const tagSpinner = stderrSpinner("Loading tags").start();
        let tags: string[];
        try {
          tags = getAllTags();
          tagSpinner.succeed("Tags loaded");
        } catch (err) {
          tagSpinner.fail("Could not load tags");
          throw err;
        }

        if (tags.length === 0) {
          console.log(pc.yellow("No tags found. Compile some sources first."));
          return;
        }
        console.log(pc.dim(`Tags (${tags.length})\n`));
        for (const tag of tags) {
          console.log(`  ${tag}`);
        }
        console.log();
        return;
      }

      const query = queryParts.join(" ");
      const limit = parseInt(options.limit, 10);

      console.error(
        `${pc.bold(pc.magenta("S"))} ${pc.gray(formatCliOneLinePreview(query))}`,
      );

      const searchSpinner = stderrSpinner("Searching").start();
      let response: ReturnType<typeof searchArticles>;
      try {
        response = searchArticles(query, options.tag);
        searchSpinner.succeed("Search complete");
      } catch (e) {
        searchSpinner.fail("Search failed");
        console.error(pc.yellow(e instanceof Error ? e.message : String(e)));
        process.exitCode = 1;
        return;
      }

      const { results, suggestedQuery } = response;
      const limited = results.slice(0, limit);

      if (limited.length === 0) {
        console.log(
          pc.yellow(
            `No results found${options.tag ? ` for tag "${options.tag}"` : ""}.`,
          ),
        );
        if (
          suggestedQuery &&
          suggestedQuery.trim().toLowerCase() !== query.trim().toLowerCase()
        ) {
          console.log(pc.dim(`Did you mean: ${suggestedQuery}`));
        }
        return;
      }

      if (
        suggestedQuery &&
        suggestedQuery.trim().toLowerCase() !== query.trim().toLowerCase()
      ) {
        console.log(pc.dim(`Did you mean: ${suggestedQuery}`));
      }

      const tagNote = options.tag ? pc.dim(` · tag #${options.tag}`) : "";
      console.log();
      console.log(
        pc.dim(
          `${limited.length} result${limited.length !== 1 ? "s" : ""} for `,
        ) +
          `"${query}"` +
          tagNote,
      );
      if (limited.some((r) => r.score > 0)) {
        console.log(pc.dim("Scores are BM25 (higher = stronger match)."));
      }
      console.log();

      for (let i = 0; i < limited.length; i++) {
        const result = limited[i]!;
        const n = i + 1;
        const kind = classifySearchKind(result);
        const scoreStr = formatRelevanceScore(result.score);

        console.log(
          `${pc.dim(`[${n}/${limited.length}]`)} ${pc.bold(result.title)} ${pc.dim(`(${kind})`)}`,
        );
        // Absolute path unstyled so terminal path detection (e.g. Cmd+click) still matches.
        console.log(`  ${result.path}`);
        console.log(pc.dim(`  Relevance: ${scoreStr}`));
        if (result.snippet.trim()) {
          console.log(pc.dim(`  ${result.snippet}`));
        }
        if (result.tags.length > 0) {
          console.log(pc.dim(`  ${result.tags.map((t) => `#${t}`).join(" ")}`));
        }
        console.log();
      }
    },
  );
