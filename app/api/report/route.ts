import { NextResponse } from "next/server"
import { differenceInDays, parseISO } from "date-fns"

import { fetchLassaSummary } from "@/lib/reports"
import { fetchWeeklyCoverage } from "@/lib/data"
import { formatDateRange } from "@/lib/utils"
import { generateStructuredReport, ReportGenerationError } from "@/lib/llm/report_client"

const MAX_RANGE_DAYS = 366 * 2

function safeParseDate(value: unknown) {
  if (typeof value !== "string") return null
  const parsed = parseISO(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const startDate = safeParseDate(body.startDate)
    const endDate = safeParseDate(body.endDate)

    if (!startDate || !endDate) {
      return NextResponse.json({ error: "startDate and endDate are required ISO strings" }, { status: 400 })
    }

    if (endDate < startDate) {
      return NextResponse.json({ error: "endDate must be after startDate" }, { status: 400 })
    }

    const span = differenceInDays(endDate, startDate)
    if (span > MAX_RANGE_DAYS) {
      return NextResponse.json({ error: "Date range must be 2 years or less" }, { status: 400 })
    }

    const rawStates = Array.isArray(body.states)
      ? body.states
      : typeof body.state === "string"
        ? [body.state]
        : []
    const states = rawStates
      .map((value) => (typeof value === "string" ? value.trim() : ""))
      .filter((value) => value.length > 0)
    const stateFilters = states.length ? states : ["All States"]

    const summary = await fetchLassaSummary({
      startDate: startDate.toISOString().slice(0, 10),
      endDate: endDate.toISOString().slice(0, 10),
      states: stateFilters,
    })

    if (!summary) {
      return NextResponse.json({
        summary: null,
        report: null,
        message: "No data available for the selected filters",
      })
    }

    const rangeLabel = formatDateRange(startDate, endDate)

    const coverage = await fetchWeeklyCoverage(
      startDate.toISOString().slice(0, 10),
      endDate.toISOString().slice(0, 10),
      states
    )

    // Compute averages per reported week (prefer actual published weeks; fallback to window length)
    const totalDays = differenceInDays(endDate, startDate) + 1
    const totalWeeksCeil = Math.max(1, Math.ceil(totalDays / 7))
    const weeksReported = (coverage.availableWeekLabels?.length ?? 0) > 0
      ? coverage.availableWeekLabels.length
      : totalWeeksCeil

    const adjustedSummary = {
      ...summary,
      averages: {
        confirmed: summary.totals.confirmed / weeksReported,
        suspected: summary.totals.suspected / weeksReported,
        deaths: summary.totals.deaths / weeksReported,
      },
    }

    const report = await generateStructuredReport(adjustedSummary, {
      rangeLabel,
      additionalContext: body.focus ?? undefined,
      coverageWeeks: coverage.availableWeekLabels,
    })

    return NextResponse.json({
      summary: adjustedSummary,
      rangeLabel,
      report,
      coverage,
    })
  } catch (error) {
    if (error instanceof ReportGenerationError) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (error instanceof Response) {
      return error
    }

    console.error("Report generation failed", error)
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 })
  }
}


