"use client"

import { useState } from "react"
import { Download, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"

interface DownloadCSVButtonProps {
  startDate?: string
  endDate?: string
  states: string[]
  statesLabel: string
}

export function DownloadCSVButton({ startDate, endDate, states, statesLabel }: DownloadCSVButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false)

  const handleDownload = async () => {
    if (!startDate || !endDate) return

    try {
      setIsDownloading(true)

      const response = await fetch("/api/report/raw", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          startDate,
          endDate,
          states,
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
      const stateSlug = statesLabel.replace(/\s+/g, "-").toLowerCase()
      link.download = `lassa-fever-report-data-${stateSlug}-${timestamp}.csv`

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
    <Button onClick={handleDownload} disabled={isDownloading || !startDate || !endDate} variant="outline" size="sm">
      {isDownloading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Preparing CSV...
        </>
      ) : (
        <>
          <Download className="mr-2 h-4 w-4" />
          Download CSV
        </>
      )}
    </Button>
  )
}


