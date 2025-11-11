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
