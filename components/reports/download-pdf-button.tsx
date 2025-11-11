"use client"

import { useState } from "react"
import { pdf } from "@react-pdf/renderer"
import { Download, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ReportPDFDocument } from "./report-pdf-document"
import type { ReportApiSuccess } from "@/lib/types/reports"
import html2canvas from "html2canvas"

interface DownloadPDFButtonProps {
  result: ReportApiSuccess & { coverageLabel?: string | null }
  dateRange: string
  statesLabel: string
  focusLabel: string
}

export function DownloadPDFButton({ result, dateRange, statesLabel, focusLabel }: DownloadPDFButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false)

  const handleDownload = async () => {
    try {
      setIsGenerating(true)

      // Capture chart as image
      let chartImage: string | undefined
      const chartElement = document.getElementById("report-chart")
      if (chartElement) {
        try {
          const canvas = await html2canvas(chartElement, {
            backgroundColor: "#ffffff",
            scale: 2, // Higher quality
          })
          chartImage = canvas.toDataURL("image/png")
        } catch (error) {
          console.error("Failed to capture chart:", error)
        }
      }

      // Generate PDF document
      const doc = <ReportPDFDocument result={result} dateRange={dateRange} statesLabel={statesLabel} focusLabel={focusLabel} chartImage={chartImage} />

      // Convert to blob
      const blob = await pdf(doc).toBlob()

      // Create download link
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url

      // Generate filename with date and state
      const timestamp = new Date().toISOString().split("T")[0]
      const stateSlug = statesLabel.replace(/\s+/g, "-").toLowerCase()
      link.download = `lassa-fever-report-${stateSlug}-${timestamp}.pdf`

      // Trigger download
      document.body.appendChild(link)
      link.click()

      // Cleanup
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Failed to generate PDF:", error)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Button onClick={handleDownload} disabled={isGenerating} variant="outline" size="sm">
      {isGenerating ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Generating PDF...
        </>
      ) : (
        <>
          <Download className="mr-2 h-4 w-4" />
          Download PDF
        </>
      )}
    </Button>
  )
}

