export const DATE_DISPLAY_FORMAT = "MMM d, yyyy"

export const REPORT_FOCUS_OPTIONS = [
  {
    value: "general",
    label: "General situational overview",
    description: "Balanced readout of confirmed, suspected, and deaths without extra emphasis.",
    prompt:
      "Provide a balanced situational overview of confirmed, suspected, and fatal cases without focusing on a single state or metric.",
  },
  {
    value: "escalation",
    label: "Escalating activity focus",
    description: "Stress detection of rapid increases and highlight emerging hotspots.",
    prompt:
      "Prioritize identifying rapidly increasing case counts or emerging hotspots. Flag any weeks or states that show sharp growth or require urgent monitoring.",
  },
  {
    value: "severity",
    label: "Severity and outcomes focus",
    description: "Emphasize deaths and severe outcomes, connecting to care readiness.",
    prompt:
      "Concentrate on severe outcomes and deaths. Discuss mortality patterns, care capacity implications, and readiness for case management.",
  },
  {
    value: "data-quality",
    label: "Data quality & completeness focus",
    description: "Call out reporting gaps or volatility that may hinder interpretation.",
    prompt:
      "Evaluate data quality, completeness, and volatility. Highlight where reporting gaps or inconsistencies could limit interpretation and recommend follow-up.",
  },
] as const

