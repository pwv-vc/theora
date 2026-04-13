# Charts

`theora ask` can generate matplotlib charts directly from your wiki data using `--output chart`. The LLM reads the relevant wiki articles, extracts the data, and writes a Python script that renders a PNG.

## Setup

```bash
pip3 install matplotlib
```

Python 3 must be available in your PATH.

## Generate charts

```bash
theora ask "line chart of revenue by month" --output chart
theora ask "pie chart of customer segments" --output chart
theora ask "bar chart of user signups over time" --output chart
theora ask "scatter plot of price vs volume" --output chart
```

This produces two files in `output/`:

- `<slug>.png` — the rendered chart
- `<slug>.py` — the Python source (always kept)

A markdown note referencing the PNG is also filed back into `output/` so the chart compounds into the knowledge base.

## How it works

The LLM reads the wiki, extracts relevant numbers and categories as inline Python data, and generates a complete self-contained matplotlib script. No pandas, no CSV files — just Python literals derived from your wiki content. The chart type is chosen automatically based on the data and your question.

If rendering fails, the `.py` source is saved and you can fix and re-run it manually:

```bash
python3 output/my-chart.py
```

## Good chart prompts

```bash
# Good — specific chart type and data
theora ask "line chart of monthly revenue for the last year" --output chart
theora ask "horizontal bar chart comparing feature adoption rates" --output chart
theora ask "pie chart breaking down revenue by product category" --output chart

# Less good — too vague
theora ask "show me the data" --output chart
```
