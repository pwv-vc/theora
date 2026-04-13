import { stdin as stdinStream } from "node:process";
import { Command } from "commander";
import pc from "picocolors";
import { formatCliOneLinePreview, stderrSpinner } from "../lib/cli-feedback.js";
import { kbPaths, requireKbRoot } from "../lib/paths.js";
import { generateChart } from "../lib/chart.js";
import { saveSlides } from "../lib/slides.js";
import { streamAsk, buildAskContext } from "../lib/ask.js";
import { SLIDES_SYSTEM, buildSlidesUserPrompt } from "../lib/prompts/index.js";
import { llmStream } from "../lib/llm.js";

type OutputFormat = "md" | "slides" | "chart";

async function readStdinUtf8(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of stdinStream) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8").trimEnd();
}

export const askCommand = new Command("ask")
  .description("Ask a question against the wiki")
  .argument(
    "[question...]",
    "your question (omit when using --stdin; otherwise quote in zsh/bash if needed for globs: ?, *, [)",
  )
  .option("--no-file", "do not file the answer back into the wiki")
  .option("--output <format>", "output format: md, slides, chart", "md")
  .option("--tag <tag>", "filter wiki articles by tag")
  .option(
    "--stdin",
    "read the question from stdin (avoids shell glob expansion on ?, *, [)",
  )
  .option("--debug", "show ranking details and articles used for context")
  .option("--max-context <n>", "max wiki articles to include in context (default: 20)")
  .action(
    async (
      questionParts: string[],
      options: { file: boolean; output: string; tag?: string; stdin?: boolean; debug?: boolean; maxContext?: string },
    ) => {
      const root = requireKbRoot();
      const paths = kbPaths(root);
      const argvQuestion = questionParts ?? [];

      let question: string;
      if (options.stdin) {
        if (argvQuestion.length > 0) {
          console.error(
            pc.red(
              "Cannot combine --stdin with a positional question. Use one or the other.",
            ),
          );
          process.exitCode = 1;
          return;
        }
        question = await readStdinUtf8();
        if (!question.trim()) {
          console.error(pc.red("No question read from stdin."));
          process.exitCode = 1;
          return;
        }
      } else {
        question = argvQuestion.join(" ");
        if (!question.trim()) {
          console.error(
            pc.red(
              "Missing question. Pass arguments or use --stdin (see theora ask --help).",
            ),
          );
          process.exitCode = 1;
          return;
        }
      }
      const format = options.output as OutputFormat;

      if (format === "md") {
        console.error(
          `${pc.bold(pc.magenta("Q"))} ${pc.gray(formatCliOneLinePreview(question))}`,
        );

        const spinner = stderrSpinner("Gathering context").start();
        let contextReady = false;

        try {
          const maxContext = options.maxContext ? parseInt(options.maxContext, 10) : undefined;
          const { filedPath, rankedInfo } = await streamAsk(question, {
            tag: options.tag,
            file: options.file,
            debug: options.debug,
            maxContext,
            onContextBuilt: () => {
              contextReady = true;
              spinner.text = "Generating answer";
            },
            onFirstAnswerChunk: () => {
              spinner.stop();
              process.stdout.write("\n");
            },
            onChunk: (text) => process.stdout.write(text),
          });

          // Debug output
          if (options.debug && rankedInfo) {
            console.error("\n" + pc.bold(pc.cyan("=== Debug: Context Articles ===")));
            if (rankedInfo.tagFilter) {
              console.error(pc.gray(`Tag filter: ${rankedInfo.tagFilter}`));
            }
            console.error(pc.gray(`Wiki articles considered: ${rankedInfo.totalWikiConsidered}`));
            console.error(pc.bold(pc.green(`Wiki articles selected (${rankedInfo.wikiArticles.length}):`)));
            for (const article of rankedInfo.wikiArticles) {
              const rankStr = article.rank ? pc.gray(`[#${article.rank}]`) : '';
              console.error(`  ${rankStr} ${article.title} ${pc.gray(article.path)}`);
            }
            if (rankedInfo.outputArticles.length > 0) {
              console.error(pc.bold(pc.yellow(`Output articles included (${rankedInfo.outputArticles.length}):`)));
              for (const article of rankedInfo.outputArticles) {
                console.error(`  ${article.title} ${pc.gray(article.path)}`);
              }
            }
            console.error(pc.bold(pc.cyan("=== End Debug ===")) + "\n");
          }

          console.log("\n");
          if (filedPath) {
            console.log(
              pc.gray(`Filed to: output/${filedPath.split("/output/")[1]}`),
            );
          }
        } catch (err) {
          if (!contextReady) spinner.fail("Could not prepare context");
          else spinner.fail("Answer failed");
          throw err;
        } finally {
          if (spinner.isSpinning) spinner.stop();
        }
        return;
      }

      console.error(
        `${pc.bold(pc.magenta("Q"))} ${pc.gray(formatCliOneLinePreview(question))}`,
      );
      const spinner = stderrSpinner("Gathering context").start();
      let index: string;
      let context: string;
      try {
        ({ index, context } = await buildAskContext(question, options.tag));
      } catch (err) {
        spinner.fail("Could not prepare context");
        throw err;
      }

      if (format === "chart") {
        spinner.stop();
        await generateChart(question, index, context, paths, options.file);
        return;
      }

      console.log();
      spinner.text = "Generating slide deck";
      let firstSlideChunk = true;
      try {
        const rawAnswer = await llmStream(
          buildSlidesUserPrompt(question, index, context),
          { system: SLIDES_SYSTEM, maxTokens: 8192, action: "slides" },
          (text) => {
            if (firstSlideChunk) {
              firstSlideChunk = false;
              spinner.stop();
            }
            process.stdout.write(text);
          },
        );
        if (firstSlideChunk) spinner.stop();
        console.log("\n");
        saveSlides(rawAnswer, question, paths);
      } catch (err) {
        if (spinner.isSpinning) spinner.fail("Slide generation failed");
        throw err;
      } finally {
        if (spinner.isSpinning) spinner.stop();
      }
    },
  );
