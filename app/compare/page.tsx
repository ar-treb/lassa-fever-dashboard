"use client"

import { useEffect, useMemo, useState } from "react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { ExtractedDataTable } from "@/components/compare/extracted-data-table"
import { PdfViewer } from "@/components/compare/pdf-viewer"
import { fetchAvailableReportWeeks, fetchAvailableReportYears, fetchReportComparison } from "@/lib/data"
import type { ReportComparisonResult } from "@/lib/data"

function formatYearLabel(year: number) {
  return year >= 100 ? String(year) : String(2000 + year)
}

function formatWeekLabel(week: number) {
  return `W${week.toString().padStart(2, "0")}`
}

const emptyComparison: ReportComparisonResult = { pdfUrl: null, extractedData: [] }

export default function ComparePage() {
  const [availableYears, setAvailableYears] = useState<number[]>([])
  const [availableWeeks, setAvailableWeeks] = useState<number[]>([])
  const [selectedYear, setSelectedYear] = useState<number | null>(null)
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null)
  const [comparison, setComparison] = useState<ReportComparisonResult>(emptyComparison)
  const [isLoadingYears, setIsLoadingYears] = useState(true)
  const [isLoadingWeeks, setIsLoadingWeeks] = useState(false)
  const [isLoadingReport, setIsLoadingReport] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    let isActive = true

    async function loadYears() {
      setIsLoadingYears(true)
      setError("")
      const years = await fetchAvailableReportYears()

      if (!isActive) return
      setAvailableYears(years)
      setSelectedYear(years[0] ?? null)
      setIsLoadingYears(false)
    }

    void loadYears()
    return () => {
      isActive = false
    }
  }, [])

  useEffect(() => {
    let isActive = true

    async function loadWeeks() {
      if (selectedYear === null) {
        setAvailableWeeks([])
        setSelectedWeek(null)
        return
      }

      setIsLoadingWeeks(true)
      const weeks = await fetchAvailableReportWeeks(selectedYear)

      if (!isActive) return
      setAvailableWeeks(weeks)
      setSelectedWeek((previous) => (previous && weeks.includes(previous) ? previous : weeks[0] ?? null))
      setIsLoadingWeeks(false)
    }

    void loadWeeks()
    return () => {
      isActive = false
    }
  }, [selectedYear])

  useEffect(() => {
    let isActive = true

    async function loadComparison() {
      if (selectedYear === null || selectedWeek === null) {
        setComparison(emptyComparison)
        return
      }

      setIsLoadingReport(true)
      setError("")
      const data = await fetchReportComparison(selectedYear, selectedWeek)

      if (!isActive) return
      setComparison(data)
      setIsLoadingReport(false)
    }

    void loadComparison()
    return () => {
      isActive = false
    }
  }, [selectedYear, selectedWeek])

  const reportLabel = useMemo(() => {
    if (selectedYear === null || selectedWeek === null) {
      return "Select a report"
    }

    return `${formatYearLabel(selectedYear)} - ${formatWeekLabel(selectedWeek)}`
  }, [selectedWeek, selectedYear])

  return (
    <div className="container mx-auto space-y-8 py-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Report Comparison</h1>
        <p className="text-muted-foreground">
          Compare NCDC PDF reports against the extracted data captured in Supabase.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Select a year and week to load the report.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-6">
            <div className="space-y-2 w-[260px]">
              <Label htmlFor="compare-year">Year</Label>
              {isLoadingYears ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <Select
                  value={selectedYear !== null ? String(selectedYear) : undefined}
                  onValueChange={(value) => setSelectedYear(Number(value))}
                >
                  <SelectTrigger id="compare-year">
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableYears.map((year) => (
                      <SelectItem key={year} value={String(year)}>
                        {formatYearLabel(year)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2 w-[260px]">
              <Label htmlFor="compare-week">Week</Label>
              {isLoadingWeeks ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <Select
                  value={selectedWeek !== null ? String(selectedWeek) : undefined}
                  onValueChange={(value) => setSelectedWeek(Number(value))}
                  disabled={availableWeeks.length === 0}
                >
                  <SelectTrigger id="compare-week">
                    <SelectValue placeholder="Select week" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableWeeks.map((week) => (
                      <SelectItem key={week} value={String(week)}>
                        {formatWeekLabel(week)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
          {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="min-h-[640px]">
          <CardHeader>
            <CardTitle>Report PDF</CardTitle>
            <CardDescription className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span>{reportLabel}</span>
              <a
                href="https://ncdc.gov.ng/diseases/sitreps/?cat=5&name=An%20update%20of%20Lassa%20fever%20outbreak%20in%20Nigeria"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-primary underline underline-offset-4"
              >
                View NCDC report archive
              </a>
            </CardDescription>
          </CardHeader>
          <CardContent className="min-h-[720px]">
            {isLoadingReport ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <PdfViewer pdfUrl={comparison.pdfUrl} className="h-full" />
            )}
          </CardContent>
        </Card>

        <Card className="min-h-[640px]">
          <CardHeader>
            <CardTitle>Extracted Data</CardTitle>
            <CardDescription>{reportLabel}</CardDescription>
          </CardHeader>
          <CardContent className="min-h-[560px]">
            {isLoadingReport ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <ExtractedDataTable rows={comparison.extractedData} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
