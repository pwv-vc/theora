export const CHART_SYSTEM = `You are a data visualization expert. Generate clean, correct, self-contained matplotlib Python code. Return ONLY the Python code — no markdown fences, no explanation, no commentary.`

export function buildChartPrompt(question: string, index: string, context: string, pngPath: string): string {
  return `Question: ${question}

Generate a matplotlib chart that answers this using data from the wiki articles below.

Wiki Index:
${index}

Relevant Articles:
${context}

Write a complete, self-contained Python script. Follow this structure exactly:

\`\`\`
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
from datetime import datetime

# Style — with fallback
try:
    plt.style.use('seaborn-v0_8-whitegrid')
except OSError:
    plt.style.use('ggplot')

plt.figure(figsize=(12, 6))
ax = plt.gca()

# --- your chart code here ---

plt.tight_layout()
plt.savefig("${pngPath}", dpi=150, bbox_inches='tight')
\`\`\`

Rules:
- Import only matplotlib, numpy (if needed for grouped bars), datetime, and stdlib — no pandas, no external files
- All data must be defined inline as Python literals extracted from the wiki content above
- Use exact names from the wiki for series labels, axis labels, and the title
- Do NOT call plt.show()
- Always plot data in chronological order — sort by date before plotting

Multi-series rules:
- If data covers multiple companies, topics, or concepts, plot each as a SEPARATE series
- Line charts: one plt.plot() call per series with distinct color and label
- Bar charts: grouped bars using np.arange for x positions, offset by bar width — import numpy as np
- Always call plt.legend() when there are multiple series

Date axis rules:
- Use datetime objects for date/month x-axes: datetime(year, month, day)
- Format with: ax.xaxis.set_major_formatter(mdates.DateFormatter('%b %Y'))
- Call plt.gcf().autofmt_xdate() to rotate labels
- Always sort data chronologically before plotting`
}
