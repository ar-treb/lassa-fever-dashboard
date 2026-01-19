import { createSupabaseClient } from "./supabase"
import { calculatePercentageChange } from "./utils"

export interface SummaryQueryParams {
  startDate?: string
  endDate?: string
  states?: string[]
}

export interface LassaSummary {
  state: string
  periodStart: string
  periodEnd: string
  totals: {
    confirmed: number
    suspected: number
    deaths: number
  }
  previousTotals: {
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
  previousAverages?: {
    confirmed: number
    suspected: number
    deaths: number
  }
}

interface SupabaseSummaryRow {
  state: string | null
  period_start: string | null
  period_end: string | null
  total_confirmed: number | null
  total_suspected: number | null
  total_deaths: number | null
  avg_confirmed: number | null
  avg_suspected: number | null
  avg_deaths: number | null
  previous_confirmed: number | null
  previous_suspected: number | null
  previous_deaths: number | null
}

export async function fetchLassaSummary({ startDate, endDate, states }: SummaryQueryParams): Promise<LassaSummary | null> {
  const supabase = createSupabaseClient()

  const { data, error } = await supabase.rpc<SupabaseSummaryRow>("get_lassa_summary", {
    range_start: startDate ?? null,
    range_end: endDate ?? null,
    state_filters: states ?? null,
  })

  if (error) {
    console.error("Error fetching summary:", error)
    return null
  }

  const row = Array.isArray(data) ? data[0] : null

  if (!row) {
    return null
  }

  const totals = {
    confirmed: row.total_confirmed ?? 0,
    suspected: row.total_suspected ?? 0,
    deaths: row.total_deaths ?? 0,
  }

  const previous = {
    confirmed: row.previous_confirmed ?? 0,
    suspected: row.previous_suspected ?? 0,
    deaths: row.previous_deaths ?? 0,
  }

  return {
    state: row.state ?? "All States",
    periodStart: row.period_start ?? "",
    periodEnd: row.period_end ?? "",
    totals,
    previousTotals: previous,
    averages: {
      confirmed: row.avg_confirmed ?? 0,
      suspected: row.avg_suspected ?? 0,
      deaths: row.avg_deaths ?? 0,
    },
    deltas: {
      confirmed: calculatePercentageChange(totals.confirmed, previous.confirmed),
      suspected: calculatePercentageChange(totals.suspected, previous.suspected),
      deaths: calculatePercentageChange(totals.deaths, previous.deaths),
    },
  }
}


