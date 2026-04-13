# Inspiration

![Andrej Karpathy LLM Knowledge Bases post](https://github.com/user-attachments/assets/4c272e32-d912-4eb3-9240-fddd72c648ab)

Theora was directly inspired by two X posts: [@jumperz](https://x.com/jumperz/status/2039826228224430323?s=20) and Andrej Karpathy's viral ["LLM Knowledge Bases"](https://x.com/karpathy/status/2039805659525644595) post.

Karpathy described a shift away from using LLMs primarily to generate code, and toward using them to compile and maintain personal knowledge bases. The idea: dump raw source material — articles, papers, repos, datasets, images — into a `raw/` directory, then have an LLM incrementally "compile" a structured wiki of interlinked markdown files with summaries, backlinks, and concept articles. The LLM writes and maintains everything; you rarely touch the wiki directly. Once the wiki is large enough, you can ask complex questions against it, get synthesized answers, and file those answers back in — so every query compounds the knowledge base. He also described linting passes where the LLM scans for inconsistencies and suggests new articles, and output formats like Marp slides and matplotlib charts. Karpathy noted: "I think there is room here for an incredible new product instead of a hacky collection of scripts." Theora is that product.
