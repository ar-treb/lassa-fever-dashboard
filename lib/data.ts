import { createSupabaseClient } from "./supabase"

export interface LassaFeverData {
  id: string
  year: number
  week: number
  week_formatted: string
  state: string
  suspected: number
  confirmed: number
  deaths: number
}

export async function fetchLassaFeverData(year?: string, week?: string, state?: string): Promise<LassaFeverData[]> {
  const supabase = createSupabaseClient()

  let query = supabase
    .from("lassa_data")
    .select("id, year, full_year, week, states, suspected, confirmed, deaths")

  if (year) {
    const numericYear = toInteger(year)
    if (numericYear !== null) {
      query = query.eq("full_year", numericYear)
    }
  }

  if (week) {
    const parsedWeek = parseWeekKey(week)
    if (parsedWeek) {
      query = query.eq("full_year", parsedWeek.fullYear).eq("week", parsedWeek.week)
    }
  }

  if (state && state !== "All States") {
    query = query.eq("states", state)
  }
  // Exclude 'Total' rows from every query
  query = query.neq("states", "Total")

  const { data, error } = await query

  if (error) {
    console.error("Error fetching data:", error)
    return []
  }

  return (data ?? [])
    .map((item: any) => {
      const fullYear = item.full_year ?? item.year
      const weekNumber = item.week ?? null
      const weekLabel = formatWeekLabel(fullYear, weekNumber)

      if (!weekLabel) return null

      return {
        id: String(item.id),
        year: typeof fullYear === "number" ? fullYear : toInteger(fullYear) ?? 0,
        week: typeof weekNumber === "number" ? weekNumber : toInteger(weekNumber) ?? 0,
        week_formatted: weekLabel,
        state: item.states ?? "Unknown",
        suspected: toNumber(item.suspected),
        confirmed: toNumber(item.confirmed),
        deaths: toNumber(item.deaths),
      }
    })
    .filter((item): item is LassaFeverData => item !== null)
}

export async function fetchAvailableYears(): Promise<string[]> {
  const supabase = createSupabaseClient()

  const { data, error } = await supabase.rpc("get_distinct_lassa_full_years")

  if (error) {
    console.error("Error fetching years:", error)
    return []
  }

  const years = (data ?? [])
    .map((item: { full_year: number | null }) => item.full_year)
    .filter((value): value is number => typeof value === "number")

  return years.map(String)
}

export async function fetchAvailableWeeks(year?: string): Promise<string[]> {
  const supabase = createSupabaseClient()

  const numericYear = year ? toInteger(year) : null

  const { data, error } = await supabase.rpc("get_distinct_lassa_weeks", {
    selected_year: numericYear,
  })

  if (error) {
    console.error("Error fetching weeks:", error)
    return []
  }

  return (data ?? [])
    .map((item: { week_key: string | null }) => item.week_key)
    .filter((key): key is string => typeof key === "string")
}

export async function fetchAvailableStates(): Promise<string[]> {
  const supabase = createSupabaseClient()

  const { data, error } = await supabase.rpc("get_distinct_lassa_states")

  if (error) {
    console.error("Error fetching states:", error)
    return []
  }

  return (data ?? [])
    .map((item: { state: string | null }) => (item.state ? String(item.state) : null))
    .filter((state): state is string => !!state)
}

function formatWeekLabel(fullYear: number | string | null, week: number | string | null): string | null {
  const safeYear = toInteger(fullYear)
  const safeWeek = toInteger(week)

  if (safeYear === null || safeWeek === null) {
    return null
  }

  return `${safeYear}-W${safeWeek.toString().padStart(2, "0")}`
}

function parseWeekKey(key: string): { fullYear: number; week: number } | null {
  const match = key.match(/^(\d{4})-W(\d{2})$/)
  if (!match) return null

  const fullYear = Number(match[1])
  const week = Number(match[2])

  if (Number.isNaN(fullYear) || Number.isNaN(week)) return null

  return { fullYear, week }
}

function toInteger(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value)
    return Number.isNaN(parsed) ? null : parsed
  }
  return null
}

function toNumber(value: unknown): number {
  const numeric = toInteger(value)
  return numeric ?? 0
}
