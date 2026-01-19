import { NextResponse } from "next/server"
import { addDays, addWeeks, differenceInDays, getISOWeek, getISOWeekYear, isAfter, isBefore, startOfISOWeek } from "date-fns"

import { createSupabaseClient } from "@/lib/supabase"
import { getClientIp, getRateLimitHeaders, rateLimit } from "@/lib/rate-limit"

const MAX_RANGE_DAYS = 366 * 2
const RAW_REPORT_RATE_LIMIT = {
  limit: 5,
  windowSeconds: 60,
}
const CSV_CACHE_CONTROL = "public, max-age=600, s-maxage=3600"

function safeParseDate(value: unknown) {
  if (typeof value !== "string") return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function toInteger(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value)
    return Number.isNaN(parsed) ? null : parsed
  }
  return null
}

function getIsoWeekStart(year: number, week: number) {
  const firstThursday = new Date(year, 0, 4)
  const firstWeekStart = startOfISOWeek(firstThursday)
  return addWeeks(firstWeekStart, week - 1)
}

function formatISODate(date: Date) {
  return date.toISOString().slice(0, 10)
}

function formatWeekKey(year: number, week: number) {
  return `${year}-W${week.toString().padStart(2, "0")}`
}

function escapeCsv(value: string | number) {
  const str = String(value ?? "")
  if (str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  if (str.includes(",")) {
    return `"${str}"`
  }
  return str
}

export async function POST(request: Request) {
  const clientIp = getClientIp(request)
  const rateLimitResult = await rateLimit({
    key: `api:report:raw:${clientIp}`,
    limit: RAW_REPORT_RATE_LIMIT.limit,
    windowSeconds: RAW_REPORT_RATE_LIMIT.windowSeconds,
  })
  const rateLimitHeaders = getRateLimitHeaders(rateLimitResult)

  if (!rateLimitResult.allowed) {
    const retryAfterSeconds = Math.max(0, Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000))
    return NextResponse.json(
      { error: "Rate limit exceeded. Please try again later." },
      {
        status: 429,
        headers: {
          ...rateLimitHeaders,
          "Retry-After": String(retryAfterSeconds),
        },
      }
    )
  }

  const respondJson = (data: unknown, init?: ResponseInit) =>
    NextResponse.json(data, {
      ...init,
      headers: {
        ...rateLimitHeaders,
        ...(init?.headers ?? {}),
      },
    })

  try {
    const body = await request.json()
    const startDate = safeParseDate(body.startDate)
    const endDate = safeParseDate(body.endDate)

    if (!startDate || !endDate) {
      return respondJson({ error: "startDate and endDate are required ISO strings" }, { status: 400 })
    }

    if (endDate < startDate) {
      return respondJson({ error: "endDate must be after startDate" }, { status: 400 })
    }

    const span = differenceInDays(endDate, startDate)
    if (span > MAX_RANGE_DAYS) {
      return respondJson({ error: "Date range must be 2 years or less" }, { status: 400 })
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

    const supabase = createSupabaseClient()

    const yearsToFetch = new Set<number>()
    let cursor = startOfISOWeek(startDate)
    while (!isAfter(cursor, endDate)) {
      yearsToFetch.add(getISOWeekYear(cursor))
      cursor = addWeeks(cursor, 1)
    }
    yearsToFetch.add(getISOWeekYear(endDate))

    let query = supabase
      .from("lassa_data")
      .select("full_year, week, states, suspected, confirmed, deaths")
      .neq("states", "Total")

    if (yearsToFetch.size > 0) {
      query = query.in("full_year", Array.from(yearsToFetch))
    }

    const filteredStates = stateFilters.filter((state) => state && state !== "All States")
    if (filteredStates.length > 0) {
      query = query.in("states", filteredStates)
    }

    const { data, error } = await query
    if (error) {
      console.error("Error fetching raw report data:", error)
      return respondJson({ error: "Failed to fetch raw report data" }, { status: 500 })
    }

    const rows =
      (data ?? []).flatMap((row) => {
        const year = toInteger((row as { full_year: unknown }).full_year)
        const week = toInteger((row as { week: unknown }).week)
        const suspected = toInteger((row as { suspected: unknown }).suspected) ?? 0
        const confirmed = toInteger((row as { confirmed: unknown }).confirmed) ?? 0
        const deaths = toInteger((row as { deaths: unknown }).deaths) ?? 0
        const state = (row as { states?: string | null }).states ?? "Unknown"

        if (year === null || week === null) {
          return []
        }

        const weekStart = getIsoWeekStart(year, week)
        const weekEnd = addDays(weekStart, 6)

        if (isBefore(weekEnd, startDate) || isAfter(weekStart, endDate)) {
          return []
        }

        const weekKey = formatWeekKey(year, week)

        return [
          {
            week: weekKey,
            week_start: formatISODate(weekStart),
            week_end: formatISODate(weekEnd),
            state,
            suspected,
            confirmed,
            deaths,
          },
        ]
      }) ?? []

    const headers = ["week", "week_start", "week_end", "state", "suspected", "confirmed", "deaths"]
    const csvLines = [headers.join(",")]

    for (const row of rows) {
      csvLines.push(
        [
          escapeCsv(row.week),
          escapeCsv(row.week_start),
          escapeCsv(row.week_end),
          escapeCsv(row.state),
          escapeCsv(row.suspected),
          escapeCsv(row.confirmed),
          escapeCsv(row.deaths),
        ].join(",")
      )
    }

    const filename = `report-data-${formatISODate(startDate)}-${formatISODate(endDate)}.csv`

    return new Response(csvLines.join("\n"), {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": CSV_CACHE_CONTROL,
        ...rateLimitHeaders,
      },
    })
  } catch (error) {
    console.error("Unexpected error generating raw report CSV:", error)
    return respondJson({ error: "Unexpected server error" }, { status: 500 })
  }
}


