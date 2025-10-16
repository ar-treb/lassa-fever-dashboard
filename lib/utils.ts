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
