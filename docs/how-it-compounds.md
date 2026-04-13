# How It Compounds

A typical session:

1. Ingest 10 papers on a topic
2. `theora compile` produces 10 source summaries + 5 concept articles + an index
3. Ask "what are the main themes?" — answer filed back
4. Ask "where do the authors disagree?" — answer filed back, now cross-referencing the previous answer
5. Ask "what's missing from this research?" — the LLM now has your previous analysis to build on
6. `theora lint --suggest` finds gaps and suggests new articles
7. Ingest more sources, compile again — the wiki grows

Each cycle makes the next one better. The wiki isn't a snapshot — it's a living document that gets smarter every time you interact with it.

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
