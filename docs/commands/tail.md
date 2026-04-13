# tail

Watch LLM call logs in real-time, similar to `tail -f`:

```bash
theora tail                    # Show last 20 log entries
theora tail -n 50              # Show last 50 entries
theora tail -f                 # Follow mode: watch for new entries
theora tail -f -n 5            # Follow mode, start with last 5 entries
theora tail --json             # Output as JSON
theora tail --compact          # Compact output (no colors)
```

The `tail` command shows a formatted table of LLM calls with timestamp, action, model, tokens, cost, and duration. In follow mode (`-f`), it polls every second for new entries and prints them as they arrive — useful for watching live activity while running compiles or queries.
