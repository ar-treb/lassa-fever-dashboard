import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatNumber(value: number | null | undefined, options: Intl.NumberFormatOptions = {}) {
  const formatter = new Intl.NumberFormat("en-NG", {
    maximumFractionDigits: 1,
    ...options,
  })

  return formatter.format(value ?? 0)
}

export function formatDateRange(start: Date | null, end: Date | null) {
  if (!start || !end) return ""

  const formatter = new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })

  return `${formatter.format(start)} – ${formatter.format(end)}`
}

export function calculatePercentageChange(current: number | null | undefined, previous: number | null | undefined) {
  const currentValue = current ?? 0
  const previousValue = previous ?? 0

  if (previousValue === 0) {
    return currentValue === 0 ? 0 : 100
  }

  return ((currentValue - previousValue) / Math.abs(previousValue)) * 100
}

export function formatCoverageLabel(publishedWeeks: number | null | undefined, totalWeeks: number | null | undefined) {
  if (!publishedWeeks || publishedWeeks <= 0) {
    return null
  }

  if (!totalWeeks || totalWeeks <= 0) {
    return `${formatNumber(publishedWeeks, { maximumFractionDigits: 0 })} published week${
      publishedWeeks === 1 ? "" : "s"
    }`
  }

  return `${formatNumber(publishedWeeks, { maximumFractionDigits: 0 })} of ${formatNumber(totalWeeks, {
    maximumFractionDigits: 0,
  })} weeks reported`
}

export function formatDelta(value: number) {
  if (!Number.isFinite(value)) {
    return "0%"
  }

  const rounded = Math.round(value * 10) / 10

  if (rounded === 0) return "0%"
  if (rounded > 0) return `+${rounded}%`
  return `${rounded}%`
}

export function calculateWeeksCount(startISO: string, endISO: string) {
  if (!startISO || !endISO) return null

  const start = new Date(startISO)
  const end = new Date(endISO)

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return null
  }

  const diffMs = end.getTime() - start.getTime()

  if (!Number.isFinite(diffMs) || diffMs < 0) {
    return null
  }

  const msPerDay = 1000 * 60 * 60 * 24
  const days = diffMs / msPerDay + 1

  if (!Number.isFinite(days) || days <= 0) {
    return null
  }

  return Math.max(1, Math.ceil(days / 7))
}

/**
 * Parse a week key like "2025-W01" and return the approximate month (1-12).
 * Week 1 maps to Jan, week 5-8 to Feb, etc.
 */
export function getMonthFromWeek(weekKey: string): number | null {
  const match = weekKey.match(/^(\d{4})-W(\d{2})$/)
  if (!match) return null

  const week = Number(match[2])
  if (Number.isNaN(week)) return null

  // Approximate: each month has ~4.33 weeks
  // Week 1-4 → Jan (1), Week 5-8 → Feb (2), etc.
  return Math.min(12, Math.ceil(week / 4.33))
}

/**
 * Parse a week key like "2025-W01" and return the quarter (1-4).
 */
export function getQuarterFromWeek(weekKey: string): number | null {
  const match = weekKey.match(/^(\d{4})-W(\d{2})$/)
  if (!match) return null

  const week = Number(match[2])
  if (Number.isNaN(week)) return null

  // Q1: W1-W13, Q2: W14-W26, Q3: W27-W39, Q4: W40-W52/53
  if (week <= 13) return 1
  if (week <= 26) return 2
  if (week <= 39) return 3
  return 4
}

/**
 * Get year from week key like "2025-W01" → 2025
 */
export function getYearFromWeek(weekKey: string): number | null {
  const match = weekKey.match(/^(\d{4})-W(\d{2})$/)
  if (!match) return null
  return Number(match[1])
}

/**
 * Given available week keys, derive available months for a year.
 * Returns array like ["2025-01", "2025-02", ...]
 */
export function deriveAvailableMonths(weekKeys: string[], year: string): string[] {
  const months = new Set<string>()

  for (const weekKey of weekKeys) {
    const weekYear = getYearFromWeek(weekKey)
    if (weekYear !== Number(year)) continue

    const month = getMonthFromWeek(weekKey)
    if (month !== null) {
      months.add(`${year}-${month.toString().padStart(2, "0")}`)
    }
  }

  return Array.from(months).sort()
}

/**
 * Given available week keys, derive available quarters for a year.
 * Returns array like ["2025-Q1", "2025-Q2", ...]
 */
export function deriveAvailableQuarters(weekKeys: string[], year: string): string[] {
  const quarters = new Set<string>()

  for (const weekKey of weekKeys) {
    const weekYear = getYearFromWeek(weekKey)
    if (weekYear !== Number(year)) continue

    const quarter = getQuarterFromWeek(weekKey)
    if (quarter !== null) {
      quarters.add(`${year}-Q${quarter}`)
    }
  }

  return Array.from(quarters).sort()
}

/**
 * Filter week keys that fall within a given month (e.g., "2025-01").
 */
export function filterWeeksByMonth(weekKeys: string[], monthKey: string): string[] {
  const match = monthKey.match(/^(\d{4})-(\d{2})$/)
  if (!match) return []

  const targetYear = Number(match[1])
  const targetMonth = Number(match[2])

  return weekKeys.filter((weekKey) => {
    const weekYear = getYearFromWeek(weekKey)
    const weekMonth = getMonthFromWeek(weekKey)
    return weekYear === targetYear && weekMonth === targetMonth
  })
}

/**
 * Filter week keys that fall within a given quarter (e.g., "2025-Q1").
 */
export function filterWeeksByQuarter(weekKeys: string[], quarterKey: string): string[] {
  const match = quarterKey.match(/^(\d{4})-Q(\d)$/)
  if (!match) return []

  const targetYear = Number(match[1])
  const targetQuarter = Number(match[2])

  return weekKeys.filter((weekKey) => {
    const weekYear = getYearFromWeek(weekKey)
    const weekQuarter = getQuarterFromWeek(weekKey)
    return weekYear === targetYear && weekQuarter === targetQuarter
  })
}

/**
 * Format month key for display (e.g., "2025-01" → "January 2025")
 */
export function formatMonthLabel(monthKey: string): string {
  const match = monthKey.match(/^(\d{4})-(\d{2})$/)
  if (!match) return monthKey

  const year = match[1]
  const month = Number(match[2])

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ]

  return `${monthNames[month - 1] ?? "Unknown"} ${year}`
}

/**
 * Format quarter key for display (e.g., "2025-Q1" → "Q1 2025")
 */
export function formatQuarterLabel(quarterKey: string): string {
  const match = quarterKey.match(/^(\d{4})-Q(\d)$/)
  if (!match) return quarterKey
  return `Q${match[2]} ${match[1]}`
}
