import type { LassaSummary } from "../reports"
import { formatNumber } from "../utils"

export interface ReportPromptOptions {
  rangeLabel: string
  additionalContext?: string
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

export function buildReportPrompt(summary: LassaSummary, { rangeLabel, additionalContext }: ReportPromptOptions): ReportPromptPayload {
  const { totals, averages, deltas } = summary

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
- Reporting window: ${rangeLabel}
- Confirmed cases: ${formatNumber(totals.confirmed)} (change ${formatPercentDelta(deltas.confirmed)})
- Suspected cases: ${formatNumber(totals.suspected)} (change ${formatPercentDelta(deltas.suspected)})
- Deaths: ${formatNumber(totals.deaths)} (change ${formatPercentDelta(deltas.deaths)})
- Average confirmed per week: ${formatNumber(averages.confirmed, { maximumFractionDigits: 2 })}
- Average suspected per week: ${formatNumber(averages.suspected, { maximumFractionDigits: 2 })}
- Average deaths per week: ${formatNumber(averages.deaths, { maximumFractionDigits: 2 })}

${additionalContext ? `Additional context: ${additionalContext}\n` : ""}
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


