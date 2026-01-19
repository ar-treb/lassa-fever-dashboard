"use client"

import { useEffect, useMemo, useState } from "react"
import { format, subWeeks } from "date-fns"
import type { DateRange } from "react-day-picker"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

import { fetchAvailableStates } from "@/lib/data"
import { formatCoverageLabel, calculateWeeksCount } from "@/lib/utils"
import { DATE_DISPLAY_FORMAT, REPORT_FOCUS_OPTIONS } from "@/lib/constants/report-focus"
import type { ReportApiSuccess, ReportApiResponse, StateMode } from "@/lib/types/reports"

import TimeSeriesChart from "@/components/time-series-chart"
import { AlertCard } from "@/components/reports/alert-card"
import { StateMultiSelect } from "@/components/reports/state-multi-select"
import { DateRangePicker } from "@/components/reports/date-range-picker"
import { DownloadCSVButton } from "@/components/reports/download-csv-button"
import { DownloadPDFButton } from "@/components/reports/download-pdf-button"
import { ReportResultCard } from "@/components/reports/report-result-card"

export default function ReportsPage() {
  const today = useMemo(() => new Date(), [])
  const initialTo = useMemo(() => today, [today])
  const initialFrom = useMemo(() => subWeeks(initialTo, 4), [initialTo])

  const [availableStates, setAvailableStates] = useState<string[]>([])
  const [stateMode, setStateMode] = useState<StateMode>("all")
  const [selectedState, setSelectedState] = useState<string>("")
  const [selectedStates, setSelectedStates] = useState<string[]>([])
  const [dateRange, setDateRange] = useState<DateRange | undefined>({ from: initialFrom, to: initialTo })
  const [selectedFocus, setSelectedFocus] = useState<(typeof REPORT_FOCUS_OPTIONS)[number]["value"]>("general")
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false)

  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [isFetchingStates, setIsFetchingStates] = useState<boolean>(true)
  const [error, setError] = useState<string>("")
  const [infoMessage, setInfoMessage] = useState<string>("")
  const [result, setResult] = useState<(ReportApiSuccess & { coverageLabel?: string | null }) | null>(null)
  const [timeSeries, setTimeSeries] = useState<
    Array<{ week: string; week_formatted: string; suspected: number; confirmed: number; deaths: number }>
  >([])

  useEffect(() => {
    async function loadStates() {
      try {
        setIsFetchingStates(true)
        const states = await fetchAvailableStates()
        setAvailableStates(states)
        if (states.length > 0) {
          setSelectedState(states[0])
        }
      } catch (loadError) {
        console.error("Failed to load states", loadError)
        setError("Could not load states. Please refresh and try again.")
      } finally {
        setIsFetchingStates(false)
      }
    }

    void loadStates()
  }, [])

  useEffect(() => {
    // Reset selections when switching modes
    if (stateMode === "all") {
      setSelectedStates([])
    } else if (stateMode === "single" && availableStates.length > 0 && !selectedState) {
      setSelectedState(availableStates[0])
    }
  }, [stateMode, availableStates, selectedState])

  const hasValidDateRange = typeof dateRange?.from !== "undefined" && typeof dateRange?.to !== "undefined"
  const startDateISO = hasValidDateRange ? (dateRange?.from as Date).toISOString().slice(0, 10) : null
  const endDateISO = hasValidDateRange ? (dateRange?.to as Date).toISOString().slice(0, 10) : null

  const statesPayload = useMemo(() => {
    if (stateMode === "all") {
      return ["All States"]
    }

    if (stateMode === "single" && selectedState) {
      return [selectedState]
    }

    if (stateMode === "multi" && selectedStates.length > 0) {
      return selectedStates
    }

    return ["All States"]
  }, [selectedState, selectedStates, stateMode])

  const displayDateRange = hasValidDateRange
    ? `${format(dateRange.from as Date, DATE_DISPLAY_FORMAT)} – ${format(dateRange.to as Date, DATE_DISPLAY_FORMAT)}`
    : "Select date range"

  const selectedStatesLabel = useMemo(() => {
    if (stateMode === "all") {
      return "All States"
    }

    if (stateMode === "single") {
      return selectedState || "Select state"
    }

    if (selectedStates.length === 0) {
      return "Select states"
    }

    if (selectedStates.length === 1) {
      return selectedStates[0]
    }

    return `${selectedStates.length} states selected`
  }, [selectedState, selectedStates, stateMode])

  const activeFocus = useMemo(
    () => REPORT_FOCUS_OPTIONS.find((option) => option.value === selectedFocus) ?? REPORT_FOCUS_OPTIONS[0],
    [selectedFocus]
  )

  async function handleGenerateReport() {
    if (!hasValidDateRange) {
      setError("Please select a start and end date.")
      return
    }

    const startDate = startDateISO as string
    const endDate = endDateISO as string

    setIsLoading(true)
    setError("")
    setInfoMessage("")
    setResult(null)
    setTimeSeries([])

    try {
      const response = await fetch("/api/report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          startDate,
          endDate,
          states: statesPayload,
          focus: activeFocus?.prompt,
          focusLabel: activeFocus?.label,
        }),
      })

      const data: ReportApiResponse = await response.json()

      if (!response.ok) {
        const errorMessage = "error" in data ? data.error : "Failed to generate report"
        setError(errorMessage)
        return
      }

      if ("summary" in data && data.summary === null) {
        setInfoMessage(data.message ?? "No data available for the selected filters")
        return
      }

      const success = data as ReportApiSuccess
      const totalWeeks = success.summary.periodStart && success.summary.periodEnd
        ? calculateWeeksCount(success.summary.periodStart, success.summary.periodEnd)
        : null
      const publishedWeeks = success.coverage?.availableWeekLabels?.length ?? null
      const label = formatCoverageLabel(publishedWeeks, totalWeeks)

      setResult({ ...success, coverageLabel: label })
      setTimeSeries(success.coverage?.weeklySeries ?? [])
    } catch (fetchError) {
      console.error("Report generation failed", fetchError)
      setError("Unexpected error generating report. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto max-w-6xl space-y-8 py-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">LLM-Generated Reports</h1>
        <p className="text-muted-foreground">
          Produce narrative situational updates using the aggregated Lassa fever surveillance data and the configured LLM provider.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="date-range">Date range</Label>
              <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    id="date-range"
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !hasValidDateRange && "text-muted-foreground"
                    )}
                  >
                    {displayDateRange}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <DateRangePicker
                    value={dateRange}
                    onChange={setDateRange}
                    maxDate={today}
                    onComplete={() => setIsDatePickerOpen(false)}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>State selection</Label>
              <RadioGroup
                value={stateMode}
                onValueChange={(value) => setStateMode(value as StateMode)}
                className="flex flex-wrap gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="all" id="state-mode-all" />
                  <Label htmlFor="state-mode-all">All states</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="single" id="state-mode-single" />
                  <Label htmlFor="state-mode-single">Single state</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="multi" id="state-mode-multi" />
                  <Label htmlFor="state-mode-multi">Multiple states</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label>States</Label>
              {stateMode === "single" ? (
                <Select value={selectedState} onValueChange={setSelectedState} disabled={isFetchingStates}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableStates.map((state) => (
                      <SelectItem key={state} value={state}>
                        {state}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : stateMode === "multi" ? (
                <StateMultiSelect
                  states={availableStates}
                  value={selectedStates}
                  onChange={setSelectedStates}
                  disabled={isFetchingStates}
                  label={selectedStatesLabel}
                />
              ) : (
                <Input value="All States" readOnly className="bg-muted" />
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="report-focus">Report focus</Label>
            <Select
              value={selectedFocus}
              onValueChange={(value) =>
                setSelectedFocus(value as (typeof REPORT_FOCUS_OPTIONS)[number]["value"])
              }
            >
              <SelectTrigger id="report-focus">
                <SelectValue placeholder="Choose a focus" />
              </SelectTrigger>
              <SelectContent>
                {REPORT_FOCUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground leading-relaxed">{activeFocus.description}</p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="text-sm text-muted-foreground">
              Reports use the configured provider and current dataset. Multi-state requests aggregate the selected states before generating the narrative.
            </div>
            <Button onClick={handleGenerateReport} disabled={isLoading || isFetchingStates}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating…
                </>
              ) : (
                "Generate report"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {isFetchingStates ? (
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-1/3" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-2/3" />
          </CardContent>
        </Card>
      ) : null}

      {error && (
        <AlertCard title="Generation failed" description={error} variant="destructive" />
      )}

      {infoMessage && !result && !error ? (
        <AlertCard title="No data" description={infoMessage} variant="default" />
      ) : null}

      {result ? (
        <div className="space-y-4">
          <div className="flex flex-wrap justify-end gap-2">
            <DownloadCSVButton
              startDate={startDateISO ?? undefined}
              endDate={endDateISO ?? undefined}
              states={statesPayload}
              statesLabel={selectedStatesLabel}
            />
            <DownloadPDFButton
              result={result}
              dateRange={displayDateRange}
              statesLabel={selectedStatesLabel}
              focusLabel={activeFocus.label}
            />
          </div>
          <ReportResultCard result={result} />
        </div>
      ) : null}

      {timeSeries.length > 0 ? (
        <div id="report-chart">
          <TimeSeriesChart data={timeSeries} selectedState={selectedStatesLabel} />
        </div>
      ) : null}
    </div>
  )
}
