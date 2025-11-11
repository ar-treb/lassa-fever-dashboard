import type { LassaSummary } from "../reports"
import { formatNumber } from "../utils"

export const DEFAULT_REPORT_SCHEMA_VERSION = 2

export interface ReportPromptMetrics {
  totals: {
    confirmed: number
    suspected: number
    deaths: number
  }
  averages: {
    confirmed: number
    suspected: number
    deaths: number
  }
  deltas: {
    confirmed: number
    suspected: number
    deaths: number
  }
  weeksReported?: number
  totalWeeks?: number
  coverageRatio?: number
  missingWeeks?: string[]
  topContributors?: Array<{
    state: string
    shareOfConfirmed?: number
    confirmed?: number
  }>
  fastestGrowers?: Array<{
    state: string
    weekOverWeekChange: number
    week?: string
  }>
  alertFlags?: Record<string, boolean>
  notableSignals?: string[]
  comparisonPeriodLabel?: string
}

export interface ReportPromptOptions {
  rangeLabel: string
  additionalContext?: string
  coverageWeeks?: string[]
  schemaVersion?: number
  focusLabel?: string
  metrics?: Partial<ReportPromptMetrics>
}

export interface ReportSections {
  schemaVersion?: number
  overview: string
  keyFindings: string[]
  trends: string[]
  recommendations: string[]
  dataQuality?: string[]
  hotspots?: string[]
  risks?: string[]
}

export interface ReportPromptPayload {
  prompt: string
  expectedStructure: ReportSections
  schemaVersion: number
}

export function buildReportPrompt(
  summary: LassaSummary,
  { rangeLabel, additionalContext, coverageWeeks, schemaVersion, focusLabel, metrics }: ReportPromptOptions
): ReportPromptPayload {
  const activeSchemaVersion = schemaVersion ?? DEFAULT_REPORT_SCHEMA_VERSION
  const { totals, averages, deltas } = summary
  const periodLengthWeeks = calculatePeriodLengthWeeks(summary.periodStart, summary.periodEnd)
  const periodLengthDays = calculatePeriodLengthDays(summary.periodStart, summary.periodEnd)
  const comparisonPeriodLabel = describeComparisonPeriod(periodLengthDays, periodLengthWeeks)
  const weeksCount = periodLengthWeeks ? Math.max(1, Math.ceil(periodLengthWeeks)) : null
  const weeksLabel =
    weeksCount != null
      ? `${formatNumber(weeksCount, { maximumFractionDigits: 0 })} week${weeksCount === 1 ? "" : "s"}`
      : null
  const weeksReportedFromCoverage = Array.isArray(coverageWeeks) ? coverageWeeks.length : null

  const defaults: ReportPromptMetrics = {
    totals: {
      confirmed: totals.confirmed,
      suspected: totals.suspected,
      deaths: totals.deaths,
    },
    averages: {
      confirmed: averages.confirmed,
      suspected: averages.suspected,
      deaths: averages.deaths,
    },
    deltas: {
      confirmed: deltas.confirmed,
      suspected: deltas.suspected,
      deaths: deltas.deaths,
    },
    weeksReported: weeksReportedFromCoverage ?? undefined,
    totalWeeks: weeksCount ?? undefined,
    coverageRatio:
      weeksReportedFromCoverage != null && weeksCount
        ? Number((weeksReportedFromCoverage / weeksCount).toFixed(3))
        : undefined,
    missingWeeks: undefined,
    topContributors: undefined,
    fastestGrowers: undefined,
    alertFlags: undefined,
    notableSignals: undefined,
    comparisonPeriodLabel,
  }

  const mergedMetrics: ReportPromptMetrics = {
    ...defaults,
    ...metrics,
    totals: {
      ...defaults.totals,
      ...(metrics?.totals ?? {}),
    },
    averages: {
      ...defaults.averages,
      ...(metrics?.averages ?? {}),
    },
    deltas: {
      ...defaults.deltas,
      ...(metrics?.deltas ?? {}),
    },
  }

  const metricsBlock = stringifyForPrompt(mergedMetrics)
  const publishedLabel =
    mergedMetrics.weeksReported != null ? `${formatNumber(mergedMetrics.weeksReported, { maximumFractionDigits: 0 })}` : null

  const expectedStructure: ReportSections = {
    schemaVersion: activeSchemaVersion,
    overview: "",
    keyFindings: [],
    trends: [],
    recommendations: [],
    dataQuality: [],
    hotspots: [],
    risks: [],
  }

  const focusLine = additionalContext
    ? `Focus instructions: ${additionalContext}`
    : focusLabel
      ? `Focus instructions: ${focusLabel}`
      : ""

  const prompt = `You are an epidemiologist writing a structured surveillance summary about Lassa fever cases.

Respond **only** with valid JSON that matches schema version ${activeSchemaVersion}:
{
  "schemaVersion": ${activeSchemaVersion},
  "overview": string,
  "keyFindings": string[],
  "trends": string[],
  "recommendations": string[],
  "dataQuality": string[],
  "hotspots": string[],
  "risks": string[]
}

Rules:
- Do not add extra keys, comments, or markdown. Ensure every array contains 1 to 4 concise sentences.
- Anchor every statement to the metrics JSON provided; do not invent numbers, time frames, or locations.
- Mention the count of published weeks (if supplied) and acknowledge reporting limitations in the overview.
- Explicitly note that percentage deltas compare to the ${comparisonPeriodLabel}, ideally in the overview or trends.
- Avoid causal claims or new rate calculations beyond what metrics explicitly provide.
- Keep recommendations action-oriented and pair them with an observation from metrics.
- Use neutral, professional tone; avoid sensational adjectives.
- If dataQuality items are not warranted, return an empty array rather than omitting the key.

${focusLine ? `${focusLine}\n` : ""}Dataset descriptor:
- Geography: ${summary.state}
- Reporting window: ${rangeLabel}${weeksLabel ? ` (${weeksLabel})` : ""}
- Published reports within window: ${publishedLabel ?? "Unknown"}${weeksLabel && publishedLabel ? ` (out of ${weeksLabel})` : ""}
 - Comparison baseline for percentage changes: ${comparisonPeriodLabel}

Metrics JSON (authoritative source for all statements):
${metricsBlock}

Example output (use your own wording, respect the data):
{
  "schemaVersion": ${activeSchemaVersion},
  "overview": "Surveillance overview referencing published weeks and data caveats.",
  "keyFindings": [
    "Specific observation grounded in totals or notableSignals."
  ],
  "trends": [
    "Describe increases or decreases using deltas or alertFlags."
  ],
  "recommendations": [
    "Action tied to a finding (e.g., reinforce case management where deaths increased)."
  ],
  "dataQuality": [
    "Highlight completeness or missing weeks when coverageRatio is below 1."
  ],
  "hotspots": [
    "State or region with rationale (e.g., shareOfConfirmed)."
  ],
  "risks": [
    "Summarize operational or clinical risks implied by alertFlags or notableSignals."
  ]
}`

  return {
    prompt,
    expectedStructure,
    schemaVersion: activeSchemaVersion,
  }
}

function stringifyForPrompt(value: unknown) {
  try {
    return JSON.stringify(value, null, 2)
  } catch (_error) {
    return "{}"
  }
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

function calculatePeriodLengthDays(start: string, end: string) {
  if (!start || !end) return null

  const startDate = new Date(start)
  const endDate = new Date(end)

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return null
  }

  const diffMs = Math.abs(endDate.getTime() - startDate.getTime())
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))

  return diffDays > 0 ? diffDays : null
}

function describeComparisonPeriod(days: number | null, weeks: number | null) {
  if (days == null && weeks == null) {
    return "previous period of similar length"
  }

  if (days != null) {
    if (days >= 350 && days <= 380) {
      return "previous year"
    }
    if (days >= 80 && days <= 110) {
      return "previous quarter"
    }
    if (days >= 27 && days <= 35) {
      return "previous month"
    }
    if (days >= 13 && days <= 15) {
      return "previous two-week period"
    }
    if (days >= 6 && days <= 8) {
      return "previous week"
    }
  }

  if (weeks != null && Number.isFinite(weeks)) {
    const roundedWeeks = Math.max(1, Math.round(weeks))
    if (roundedWeeks === 12 || roundedWeeks === 13) {
      return "previous quarter"
    }
    if (roundedWeeks === 4) {
      return "previous month"
    }
    if (roundedWeeks === 52 || roundedWeeks === 53) {
      return "previous year"
    }
    if (roundedWeeks === 1) {
      return "previous week"
    }
    if (roundedWeeks === 2) {
      return "previous two-week period"
    }

    return `previous ${roundedWeeks}-week period`
  }

  if (days != null && Number.isFinite(days)) {
    const roundedDays = Math.max(1, Math.round(days))
    return `previous ${roundedDays}-day period`
  }

  return "previous period of similar length"
}
