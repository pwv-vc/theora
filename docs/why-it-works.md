---
title: "Why This Works"
description: "How Theora's compounding knowledge loop creates a self-improving second brain"
date: 2026-04-15
category: concepts
tags: [concepts, compounding, workflow, second-brain]
---

# Why This Works

Most tools treat knowledge as static — you write notes, they sit there. Theora flips this. The LLM writes and maintains everything. You just steer.

The real insight is the loop:

```mermaid
flowchart LR
    S[Sources<br/>files · URLs · images] -->|theora ingest| R[raw/]
    R -->|theora compile| W[wiki/<br/>sources · concepts · index]
    W -->|theora ask| O[output/<br/>answers · slides · charts]
    O -->|filed back| W
    W -->|improves| W
```

Every answer filed back into the wiki makes the next answer better. The wiki compounds.

## The Compile Pipeline

`theora compile` transforms raw sources into a structured wiki in three stages:

```mermaid
flowchart TD
    R[raw/ files] --> C{Classify}
    C -->|text / HTML / PDF| T[LLM summarizes<br/>text content]
    C -->|images| V[LLM vision<br/>describes image]
    T --> SA[wiki/sources/<br/>article.md]
    V --> SA
    SA --> CE[Extract concepts<br/>across all sources]
    CE --> CA[wiki/concepts/<br/>concept.md]
    SA & CA --> IX[Rebuild<br/>wiki/index.md]
```

Each source gets its own article with consistent sections — Summary, Key Points, Named Entities, Notable Details. Concepts are extracted across all sources and linked back. The index ties everything together with tags and a brief overview.

Compiled sources also emit structured **entities** in front matter (slug-style keys such as `people/…`, `actors/…` for performers listed under both, `tv-series/…`, `movies/…`, `music-album/…`, `products/…` for commercial items only, plus organizations, places, events, dates). Musical content gets special handling: bands and record labels go under `organizations/…`, individual musicians under `people/…` (often with `musician` role in concepts), and albums under `music-album/…`. Recompile affected sources after prompt updates so existing articles pick up the new buckets.

## The Ask Loop

`theora ask` is where the compounding happens:

```mermaid
flowchart LR
    Q[Your question] --> RI[Read wiki index]
    RI --> RR[Rank relevant
wiki articles]
    RR --> CTX[Build context:
ranked sources + concepts
+ ALL prior answers]
    CTX --> LLM[LLM synthesizes
answer]
    LLM --> OUT{Output format}
    OUT -->|md| ANS[Markdown answer]
    OUT -->|slides| PDF[Marp PDF deck]
    OUT -->|chart| PNG[matplotlib PNG]
    ANS & PDF & PNG -->|filed back| W[output/]
    W -->|always in context
next question| Q
```

The answer is filed back into `output/` and becomes part of the knowledge base. Prior answers are **always** included in context — they bypass the relevance ranker entirely. Every query adds to the base — your explorations compound.

## How the Wiki Improves Over Time

```mermaid
flowchart TD
    I1[Ingest batch 1] --> C1[Compile<br/>10 source articles<br/>5 concepts]
    C1 --> A1[Ask questions<br/>3 answers filed back]
    A1 --> L1[Lint --suggest<br/>new article ideas]
    L1 --> I2[Ingest batch 2<br/>new sources]
    I2 --> C2[Compile<br/>+8 source articles<br/>+4 concepts]
    C2 --> A2[Ask deeper questions<br/>LLM now has prior answers]
    A2 --> A3[Wiki is denser<br/>more connected<br/>more useful]
```

When you ask a question, the LLM researches your wiki, synthesizes an answer, and **files that answer back into the knowledge base**. The next question benefits from every previous answer. Your explorations compound. The wiki gets denser, more connected, more useful — not because you're writing, but because you're asking.

This is a second brain that builds itself.

The bigger implication: agents that own their own knowledge layer don't need infinite context windows. They need good file organization and the ability to read their own indexes. Way cheaper, way more scalable, and way more inspectable than stuffing everything into one giant prompt.
