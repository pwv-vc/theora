# documentation

- Write thorough docs that explain not just how to use features, but why they're useful and when to use them. Confidence: 0.75
- Always update the docs after implementing each new feature or feature update — include what the feature does, how to use it, and a usage example. User explicitly stated "always" and consistently requests this after every addition. Confidence: 0.95
- Document configuration defaults in README using clear tables that map settings to their default values — users find this format very helpful for understanding out-of-the-box behavior. Confidence: 0.80
- Ensure the init command sets sensible, cost-optimized defaults for all configuration options so users get optimal behavior without manual configuration. Confidence: 0.75
- Add Mermaid diagrams to the docs to explain system flows, data pipelines, and how components interact — use diagrams to show how information moves through the system (e.g., ingest → compile → wiki → ask loop). Confidence: 0.70
- In Mermaid diagrams, do not use `\n` for line breaks inside node labels — it renders as literal text ("]n"). Use actual newlines or avoid multi-line labels. Confidence: 0.80
