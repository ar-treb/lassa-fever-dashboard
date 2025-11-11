import { addDays, addWeeks, getISOWeek, getISOWeekYear, isAfter, isBefore, startOfISOWeek } from "date-fns"

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

type LassaDataRow = {
  id: string | number | null
  year: number | null
  full_year: number | null
  week: number | null
  states: string | null
  suspected: number | null
  confirmed: number | null
  deaths: number | null
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
    .map((item: LassaDataRow) => {
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

type CoverageRow = {
  full_year: number | null
  week: number | null
  states: string | null
  suspected: number | null
  confirmed: number | null
  deaths: number | null
}

export async function fetchWeeklyCoverage(
  startISO: string,
  endISO: string,
  states?: string[]
): Promise<{
  availableWeekLabels: string[]
  weeklySeries: Array<{
    week: string
    week_formatted: string
    suspected: number
    confirmed: number
    deaths: number
  }>
  missingWeekLabels: string[]
  coverageRatio: number | null
  totalWeeks: number | null
  topContributors: Array<{
    state: string
    confirmed: number
    suspected: number
    deaths: number
    shareOfConfirmed?: number
  }>
  fastestGrowers: Array<{
    state: string
    week?: string
    weekOverWeekChange: number
  }>
  alertFlags: Record<string, boolean>
  notableSignals: string[]
}> {
  const supabase = createSupabaseClient()

  const startDate = new Date(startISO)
  const endDate = new Date(endISO)

  const emptyResult = {
    availableWeekLabels: [],
    weeklySeries: [],
    missingWeekLabels: [],
    coverageRatio: null,
    totalWeeks: null,
    topContributors: [],
    fastestGrowers: [],
    alertFlags: {},
    notableSignals: [],
  }

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || isAfter(startDate, endDate)) {
    return emptyResult
  }

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

  const stateFilters = (states ?? []).filter((state) => state && state !== "All States")

  if (stateFilters.length > 0) {
    query = query.in("states", stateFilters)
  }

  const { data, error } = await query

  if (error) {
    console.error("Error fetching weekly coverage:", error)
    return emptyResult
  }

  const availableWeeks = new Set<string>()
  const weeklyTotals = new Map<string, { suspected: number; confirmed: number; deaths: number }>()
  const stateTotals = new Map<string, { suspected: number; confirmed: number; deaths: number }>()
  const stateWeeklyTotals = new Map<string, Map<string, { suspected: number; confirmed: number; deaths: number }>>()

  for (const row of (data ?? []) as CoverageRow[]) {
    const year = toInteger(row.full_year)
    const week = toInteger(row.week)

    if (year === null || week === null) {
      continue
    }

    const weekStart = getIsoWeekStart(year, week)
    const weekEnd = addDays(weekStart, 6)

    if (isBefore(weekEnd, startDate) || isAfter(weekStart, endDate)) {
      continue
    }

    const weekKey = `${year}-W${week.toString().padStart(2, "0")}`
    availableWeeks.add(weekKey)

    const existing = weeklyTotals.get(weekKey) ?? { suspected: 0, confirmed: 0, deaths: 0 }
    existing.suspected += toNumber(row.suspected)
    existing.confirmed += toNumber(row.confirmed)
    existing.deaths += toNumber(row.deaths)
    weeklyTotals.set(weekKey, existing)

    const stateName = row.states ?? "Unknown"
    const stateAggregate = stateTotals.get(stateName) ?? { suspected: 0, confirmed: 0, deaths: 0 }
    stateAggregate.suspected += toNumber(row.suspected)
    stateAggregate.confirmed += toNumber(row.confirmed)
    stateAggregate.deaths += toNumber(row.deaths)
    stateTotals.set(stateName, stateAggregate)

    const stateWeekMap = stateWeeklyTotals.get(stateName) ?? new Map<string, { suspected: number; confirmed: number; deaths: number }>()
    const stateWeekTotals = stateWeekMap.get(weekKey) ?? { suspected: 0, confirmed: 0, deaths: 0 }
    stateWeekTotals.suspected += toNumber(row.suspected)
    stateWeekTotals.confirmed += toNumber(row.confirmed)
    stateWeekTotals.deaths += toNumber(row.deaths)
    stateWeekMap.set(weekKey, stateWeekTotals)
    stateWeeklyTotals.set(stateName, stateWeekMap)
  }

  const availableWeekLabels = Array.from(availableWeeks).sort((a, b) => a.localeCompare(b))
  const weeklySeries = Array.from(weeklyTotals.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([weekKey, totals]) => ({
      week: weekKey,
      week_formatted: weekKey,
      suspected: totals.suspected,
      confirmed: totals.confirmed,
      deaths: totals.deaths,
    }))

  // Derive total week keys for coverage calculations
  const allWeekKeys: string[] = []
  let coverageCursor = startOfISOWeek(startDate)
  while (!isAfter(coverageCursor, endDate)) {
    const year = getISOWeekYear(coverageCursor)
    const isoWeek = getISOWeek(coverageCursor)
    const weekKey = `${year}-W${isoWeek.toString().padStart(2, "0")}`
    if (!allWeekKeys.includes(weekKey)) {
      allWeekKeys.push(weekKey)
    }
    coverageCursor = addWeeks(coverageCursor, 1)
  }

  const missingWeekLabels = allWeekKeys.filter((week) => !availableWeeks.has(week))
  const totalWeeks = allWeekKeys.length > 0 ? allWeekKeys.length : null
  const coverageRatio =
    totalWeeks && totalWeeks > 0 ? Number((availableWeekLabels.length / totalWeeks).toFixed(3)) : null

  // Aggregate by state
  const stateTotalsArray = Array.from(stateTotals.entries()).map(([state, totals]) => ({
    state,
    suspected: totals.suspected,
    confirmed: totals.confirmed,
    deaths: totals.deaths,
  }))

  const totalConfirmedAllStates = stateTotalsArray.reduce((acc, item) => acc + item.confirmed, 0)

  const topContributors = stateTotalsArray
    .filter((item) => item.confirmed > 0)
    .sort((a, b) => b.confirmed - a.confirmed)
    .slice(0, 3)
    .map((item) => ({
      ...item,
      shareOfConfirmed:
        totalConfirmedAllStates > 0 ? Number((item.confirmed / totalConfirmedAllStates).toFixed(3)) : undefined,
    }))

  const fastestGrowers = Array.from(stateWeeklyTotals.entries())
    .map(([state, weeksMap]) => {
      const sortedWeeks = Array.from(weeksMap.entries()).sort((a, b) => a[0].localeCompare(b[0]))
      let maxDelta = Number.NEGATIVE_INFINITY
      let targetWeek: string | undefined

      for (let i = 1; i < sortedWeeks.length; i += 1) {
        const current = sortedWeeks[i]
        const previous = sortedWeeks[i - 1]
        const delta = current[1].confirmed - previous[1].confirmed
        if (delta > maxDelta) {
          maxDelta = delta
          targetWeek = current[0]
        }
      }

      return { state, weekOverWeekChange: maxDelta, week: targetWeek }
    })
    .filter((item) => Number.isFinite(item.weekOverWeekChange) && item.weekOverWeekChange > 0)
    .sort((a, b) => b.weekOverWeekChange - a.weekOverWeekChange)
    .slice(0, 3)

  const alertFlags: Record<string, boolean> = {}
  const notableSignals: string[] = []

  if (coverageRatio !== null && coverageRatio < 0.75) {
    alertFlags.incompleteReporting = true
  }
  if (missingWeekLabels.length > 0) {
    notableSignals.push(`Missing weekly reports: ${missingWeekLabels.join(", ")}`)
  }

  if (weeklySeries.length > 1) {
    let consecutiveGrowth = 0
    let maxIncrease = { delta: Number.NEGATIVE_INFINITY, currentWeek: "", previousWeek: "" }
    let maxDecrease = { delta: Number.POSITIVE_INFINITY, currentWeek: "", previousWeek: "" }

    for (let i = 1; i < weeklySeries.length; i += 1) {
      const current = weeklySeries[i]
      const previous = weeklySeries[i - 1]
      const delta = current.confirmed - previous.confirmed

      if (delta > 0) {
        consecutiveGrowth += 1
        if (consecutiveGrowth >= 2) {
          alertFlags.sustainedGrowth = true
        }
        if (delta > maxIncrease.delta) {
          maxIncrease = { delta, currentWeek: current.week, previousWeek: previous.week }
        }
      } else {
        if (delta < maxDecrease.delta) {
          maxDecrease = { delta, currentWeek: current.week, previousWeek: previous.week }
        }
        consecutiveGrowth = 0
      }
    }

    if (maxIncrease.delta > 0) {
      notableSignals.push(
        `Largest confirmed increase: +${maxIncrease.delta} between ${maxIncrease.previousWeek} and ${maxIncrease.currentWeek}`
      )
      if (maxIncrease.delta >= 25) {
        alertFlags.sharpSpike = true
      }
    }

    if (maxDecrease.delta < 0) {
      notableSignals.push(
        `Steepest confirmed decline: ${maxDecrease.delta} between ${maxDecrease.previousWeek} and ${maxDecrease.currentWeek}`
      )
    }

    if (consecutiveGrowth >= 2) {
      alertFlags.sustainedGrowth = true
    }
  }

  if (weeklySeries.some((entry) => entry.deaths >= 5)) {
    alertFlags.elevatedDeaths = true
  }

  return {
    availableWeekLabels,
    weeklySeries,
    missingWeekLabels,
    coverageRatio,
    totalWeeks,
    topContributors,
    fastestGrowers,
    alertFlags,
    notableSignals,
  }
}

function getIsoWeekStart(year: number, week: number) {
  const firstThursday = new Date(year, 0, 4)
  const firstWeekStart = startOfISOWeek(firstThursday)
  return addWeeks(firstWeekStart, week - 1)
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
