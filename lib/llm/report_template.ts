import type { LassaSummary } from "../reports"
import { formatNumber } from "../utils"

export interface ReportPromptOptions {
  rangeLabel: string
  additionalContext?: string
  coverageWeeks?: string[]
}

export interface ReportSections {
  overview: string
  keyFindings: string[]
  trends: string[]
  recommendations: string[]
}

export interface ReportPromptPayload {
  prompt: string
  expectedStructure: ReportSections
}

export function buildReportPrompt(
  summary: LassaSummary,
  { rangeLabel, additionalContext, coverageWeeks }: ReportPromptOptions
): ReportPromptPayload {
  const { totals, averages, deltas } = summary
  const periodLengthWeeks = calculatePeriodLengthWeeks(summary.periodStart, summary.periodEnd)
  const weeksCount = periodLengthWeeks ? Math.max(1, Math.ceil(periodLengthWeeks)) : null
  const weeksLabel =
    weeksCount != null
      ? `${formatNumber(weeksCount, { maximumFractionDigits: 0 })} week${weeksCount === 1 ? "" : "s"}`
      : null
  const publishedWeeks = Array.isArray(coverageWeeks) ? coverageWeeks.length : null
  const publishedLabel =
    publishedWeeks != null ? `${formatNumber(publishedWeeks, { maximumFractionDigits: 0 })}` : null

  const expectedStructure: ReportSections = {
    overview: "",
    keyFindings: [],
    trends: [],
    recommendations: [],
  }

const prompt = `You are an epidemiologist writing a short surveillance summary about Lassa fever cases.

Respond **only** with valid JSON that matches this schema:
{
  "overview": string,
  "keyFindings": string[],
  "trends": string[],
  "recommendations": string[]
}

Write concise, bullet-friendly sentences using plain language.

Dataset context:
- Geography: ${summary.state}
- Reporting window: ${rangeLabel}${weeksLabel ? ` (${weeksLabel})` : ""}
- Published reports within window: ${publishedLabel ?? "Unknown"}${
    weeksLabel && publishedLabel
      ? ` (out of ${weeksLabel})`
      : ""
  }
- Confirmed cases: ${formatNumber(totals.confirmed)} (change ${formatPercentDelta(deltas.confirmed)})
- Suspected cases: ${formatNumber(totals.suspected)} (change ${formatPercentDelta(deltas.suspected)})
- Deaths: ${formatNumber(totals.deaths)} (change ${formatPercentDelta(deltas.deaths)})
- Average confirmed per reported week: ${formatNumber(averages.confirmed, { maximumFractionDigits: 2 })}
- Average suspected per reported week: ${formatNumber(averages.suspected, { maximumFractionDigits: 2 })}
- Average deaths per reported week: ${formatNumber(averages.deaths, { maximumFractionDigits: 2 })}

${additionalContext ? `Additional context: ${additionalContext}\n` : ""}

Caution, coverage, and uncertainty requirements:
- Treat this reporting window as potentially short and noisy. In "overview", include one sentence noting results may not reflect broader epidemiology and mention the count of published weeks (e.g., "5 weekly bulletins available").
- Do not infer causality or compute new rates (e.g., case fatality rate, incidence) unless denominators are explicitly provided above. Never compute CFR as deaths/confirmed unless deaths are explicitly among confirmed.
- Avoid labeling counts as "low" or "high" unless recommended tone triggers below apply.
- If published weeks < total weeks, acknowledge possible reporting delays when interpreting trends.

Tone calibration (choose verbs based on context):
- Default cautious tone (use "consider", "evaluate", "monitor") when period length < 4 weeks AND no increasing trends.
- Use a balanced/directive tone for AT LEAST HALF of the recommendations (use "reinforce", "ensure", "deploy", "allocate") when period length ≥ 4 weeks AND any of:
  - confirmed ≥ 25 OR suspected ≥ 200 OR deaths ≥ 5
  - any positive week-over-week change ≥ +25%
- For decreasing trends, still include at least one proactive maintenance action that is NOT gated by "if trend persists" (e.g., reinforce IPC readiness, maintain clinician alerting, refresh stock checks).

When to include data-quality checks:
- Include at most ONE recommendation focused on data-quality/reporting completeness, and only if:
  - confirmed < 15 OR deaths < 3, OR
  - |week-over-week change| ≥ 40%, OR
  - published weeks < total weeks.
- If triggered, keep it concise and tie it to the relevant metric.

Section guidance:
- keyFindings: Only factual observations from the provided metrics; no new calculations or assumptions.
- trends: Describe direction and magnitude; flag sharp changes as warranting validation.
- recommendations: Tie each action to a cited observation or trend (briefly) and avoid overconfidence; ensure recommendation verbs align with tone rules above.

Make sure recommendations focus on surveillance or clinical response actions appropriate to the numbers.`

  return {
    prompt,
    expectedStructure,
  }
}

function formatPercentDelta(value: number) {
  const rounded = Number.isFinite(value) ? Math.round(value * 10) / 10 : 0

  if (rounded === 0) return "0%"
  if (rounded > 0) return `+${rounded}%`
  return `${rounded}%`
}

function calculatePeriodLengthWeeks(start: string, end: string) {
  if (!start || !end) return null

  const startDate = new Date(start)
  const endDate = new Date(end)

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return null
  }

  const diffMs = endDate.getTime() - startDate.getTime()

  if (!Number.isFinite(diffMs) || diffMs < 0) {
    return null
  }

  const msPerDay = 1000 * 60 * 60 * 24
  const days = diffMs / msPerDay + 1

  if (!Number.isFinite(days) || days <= 0) {
    return null
  }

  return days / 7
}


