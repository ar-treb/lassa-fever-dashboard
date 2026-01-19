"use client"

import { useState } from "react"
import { Download, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"

type PeriodMode = "week" | "month" | "quarter" | "year"

interface DownloadDataButtonProps {
  year: string
  periodMode: PeriodMode
  selectedWeek?: string
  selectedMonth?: string
  selectedQuarter?: string
  weeksInPeriod: string[]
  state: string
  periodLabel: string
}

export function DownloadDataButton({
  year,
  periodMode,
  selectedWeek,
  selectedMonth,
  selectedQuarter,
  weeksInPeriod,
  state,
  periodLabel,
}: DownloadDataButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false)

  const handleDownload = async () => {
    if (!year || weeksInPeriod.length === 0) return

    try {
      setIsDownloading(true)

      const response = await fetch("/api/data/download", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          year,
          weeks: weeksInPeriod,
          state,
          periodMode,
          selectedWeek,
          selectedMonth,
          selectedQuarter,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to download CSV")
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url

      const timestamp = new Date().toISOString().split("T")[0]
      const stateSlug = state.replace(/\s+/g, "-").toLowerCase()
      const periodSlug = periodLabel.replace(/\s+/g, "-").toLowerCase()
      link.download = `lassa-fever-data-${periodSlug}-${stateSlug}-${timestamp}.csv`

      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Failed to download CSV:", error)
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <Button
      onClick={handleDownload}
      disabled={isDownloading || !year || weeksInPeriod.length === 0}
      variant="outline"
      size="sm"
    >
      {isDownloading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Preparing CSV...
        </>
      ) : (
        <>
          <Download className="mr-2 h-4 w-4" />
          Download Data
        </>
      )}
    </Button>
  )
}

