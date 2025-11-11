import type { ReportSections } from "@/lib/llm/report_template"
import type { LassaSummary } from "@/lib/reports"

export type ReportProvider = "openai" | "gemini"

export interface ReportApiSuccess {
  summary: LassaSummary
  rangeLabel: string
  report: {
    provider: ReportProvider
    sections: ReportSections
    rawText: string
  }
  coverage?: {
    availableWeekLabels: string[]
    missingWeekLabels?: string[]
    weeklySeries?: Array<{ week: string; week_formatted: string; suspected: number; confirmed: number; deaths: number }>
    coverageRatio?: number | null
    totalWeeks?: number | null
    topContributors?: Array<{
      state: string
      confirmed: number
      suspected: number
      deaths: number
      shareOfConfirmed?: number
    }>
    fastestGrowers?: Array<{
      state: string
      week?: string
      weekOverWeekChange: number
    }>
    alertFlags?: Record<string, boolean>
    notableSignals?: string[]
  }
}

export interface ReportApiError {
  error: string
}

export type ReportApiResponse = ReportApiSuccess | ReportApiError | { summary: null; message: string; report: null }

export type StateMode = "all" | "single" | "multi"

