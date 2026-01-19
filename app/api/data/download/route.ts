import { NextResponse } from "next/server"
import { createSupabaseClient } from "@/lib/supabase"

function toInteger(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value)
    return Number.isNaN(parsed) ? null : parsed
  }
  return null
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
  try {
    const body = await request.json()
    const year = typeof body.year === "string" ? body.year : null
    const weeks = Array.isArray(body.weeks) ? body.weeks : []
    const state = typeof body.state === "string" ? body.state : "All States"

    if (!year) {
      return NextResponse.json({ error: "Year is required" }, { status: 400 })
    }

    if (weeks.length === 0) {
      return NextResponse.json({ error: "At least one week is required" }, { status: 400 })
    }

    const supabase = createSupabaseClient()

    // Parse week keys to get year and week numbers
    const weekFilters = weeks
      .map((weekKey) => {
        const match = String(weekKey).match(/^(\d{4})-W(\d{2})$/)
        if (!match) return null
        return {
          full_year: Number(match[1]),
          week: Number(match[2]),
        }
      })
      .filter((w): w is { full_year: number; week: number } => w !== null)

    if (weekFilters.length === 0) {
      return NextResponse.json({ error: "No valid weeks found" }, { status: 400 })
    }

    // Build query
    let query = supabase
      .from("lassa_data")
      .select("full_year, week, states, suspected, confirmed, deaths")
      .neq("states", "Total")

    // Filter by year
    const numericYear = toInteger(year)
    if (numericYear !== null) {
      query = query.eq("full_year", numericYear)
    }

    // Filter by state if not "All States"
    if (state && state !== "All States") {
      query = query.eq("states", state)
    }

    const { data, error } = await query

    if (error) {
      console.error("Error fetching data for download:", error)
      return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 })
    }

    // Filter to only include requested weeks
    const weekSet = new Set(weeks.map((w) => String(w)))
    const filteredData = (data ?? []).filter((row) => {
      const fullYear = toInteger((row as { full_year: unknown }).full_year)
      const week = toInteger((row as { week: unknown }).week)
      if (fullYear === null || week === null) return false

      const weekKey = `${fullYear}-W${week.toString().padStart(2, "0")}`
      return weekSet.has(weekKey)
    })

    // Format data as CSV
    const headers = ["week", "state", "suspected", "confirmed", "deaths"]
    const csvLines = [headers.join(",")]

    for (const row of filteredData) {
      const fullYear = toInteger((row as { full_year: unknown }).full_year)
      const week = toInteger((row as { week: unknown }).week)
      const suspected = toInteger((row as { suspected: unknown }).suspected) ?? 0
      const confirmed = toInteger((row as { confirmed: unknown }).confirmed) ?? 0
      const deaths = toInteger((row as { deaths: unknown }).deaths) ?? 0
      const stateName = (row as { states?: string | null }).states ?? "Unknown"

      if (fullYear === null || week === null) continue

      const weekKey = `${fullYear}-W${week.toString().padStart(2, "0")}`

      csvLines.push(
        [
          escapeCsv(weekKey),
          escapeCsv(stateName),
          escapeCsv(suspected),
          escapeCsv(confirmed),
          escapeCsv(deaths),
        ].join(",")
      )
    }

    const filename = `lassa-data-${year}.csv`

    return new Response(csvLines.join("\n"), {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error("Unexpected error generating data CSV:", error)
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 })
  }
}

