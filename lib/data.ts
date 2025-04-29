import { createSupabaseClient } from "./supabase"

export interface LassaFeverData {
  id: number
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

  let query = supabase.from("lassa_fever_data").select("*")

  if (year) {
    query = query.eq("year", year)
  }

  if (week) {
    query = query.eq("week_formatted", week)
  }

  if (state && state !== "All States") {
    query = query.eq("state", state)
  }
  // Exclude 'Total' rows from every query
  query = query.neq("state", "Total")

  const { data, error } = await query

  if (error) {
    console.error("Error fetching data:", error)
    return []
  }

  return data as LassaFeverData[]
}

export async function fetchAvailableYears(): Promise<string[]> {
  const supabase = createSupabaseClient()

  // Fetch all years (no limit)
  const { data, error } = await supabase
    .from("lassa_fever_data")
    .select("year")
    .order("year", { ascending: true })
    .range(0, 9999)

  if (error) {
    console.error("Error fetching years:", error)
    return []
  }

  // Extract unique years and sort
  const years = data.map((item: { year: number }) => item.year)
  const uniqueYears = Array.from(new Set(years)).sort((a, b) => a - b)
  return uniqueYears.map((year) => year.toString())
}

export async function fetchAvailableWeeks(year?: string): Promise<string[]> {
  const supabase = createSupabaseClient()

  let query = supabase.from("lassa_fever_data").select("week_formatted").order("week_formatted")

  if (year) {
    query = query.like("week_formatted", `${year}-%`)
  }

  const { data, error } = await query

  if (error) {
    console.error("Error fetching weeks:", error)
    return []
  }

  // Extract unique weeks
  const uniqueWeeks = [...new Set(data.map((item) => item.week_formatted))]
  return uniqueWeeks
}

export async function fetchAvailableStates(): Promise<string[]> {
  const supabase = createSupabaseClient()

  const { data, error } = await supabase.from("lassa_fever_data").select("state").order("state")

  if (error) {
    console.error("Error fetching states:", error)
    return []
  }

  // Extract unique states
  const uniqueStates = [...new Set(data.map((item) => item.state))].filter((s) => s !== 'Total')
  return uniqueStates
}
