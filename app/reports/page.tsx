"use client"

import { useEffect, useMemo, useState } from "react"
import {
  endOfMonth,
  endOfQuarter,
  endOfYear,
  format,
  isSameDay,
  startOfMonth,
  startOfQuarter,
  startOfYear,
  subMonths,
  subQuarters,
  subWeeks,
  subYears,
} from "date-fns"
import type { DateRange } from "react-day-picker"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { Calendar } from "@/components/ui/calendar"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

import { fetchAvailableStates, fetchWeeklyCoverage } from "@/lib/data"
import type { LassaSummary } from "@/lib/reports"
import type { ReportSections } from "@/lib/llm/report_template"
import { formatCoverageLabel, formatNumber } from "@/lib/utils"
import TimeSeriesChart from "@/components/time-series-chart"

type ReportProvider = "openai" | "gemini"

interface ReportApiSuccess {
  summary: LassaSummary
  rangeLabel: string
  report: {
    provider: ReportProvider
    sections: ReportSections
    rawText: string
  }
  coverage?: {
    availableWeekLabels: string[]
  }
}

interface ReportApiError {
  error: string
}

type ReportApiResponse = ReportApiSuccess | ReportApiError | { summary: null; message: string; report: null }

type StateMode = "all" | "single" | "multi"

const DATE_DISPLAY_FORMAT = "MMM d, yyyy"

export default function ReportsPage() {
  const today = useMemo(() => new Date(), [])
  const initialTo = useMemo(() => today, [today])
  const initialFrom = useMemo(() => subWeeks(initialTo, 4), [initialTo])

  const [availableStates, setAvailableStates] = useState<string[]>([])
  const [stateMode, setStateMode] = useState<StateMode>("all")
  const [selectedState, setSelectedState] = useState<string>("")
  const [selectedStates, setSelectedStates] = useState<string[]>([])
  const [dateRange, setDateRange] = useState<DateRange | undefined>({ from: initialFrom, to: initialTo })
  const [additionalContext, setAdditionalContext] = useState<string>("")
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

  async function handleGenerateReport() {
    if (!hasValidDateRange) {
      setError("Please select a start and end date.")
      return
    }

    const startDate = (dateRange?.from as Date).toISOString().slice(0, 10)
    const endDate = (dateRange?.to as Date).toISOString().slice(0, 10)

    let statesPayload: string[]

    if (stateMode === "all") {
      statesPayload = ["All States"]
    } else if (stateMode === "single" && selectedState) {
      statesPayload = [selectedState]
    } else if (stateMode === "multi" && selectedStates.length > 0) {
      statesPayload = selectedStates
    } else {
      statesPayload = ["All States"]
    }

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
          focus: additionalContext.trim() || undefined,
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

      const success = data as ReportApiSuccess & {
        coverage?: {
          availableWeekLabels: string[]
          weeklySeries?: Array<{ week: string; week_formatted: string; suspected: number; confirmed: number; deaths: number }>
        }
      }
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
            <Label htmlFor="report-context">Optional focus</Label>
            <Textarea
              id="report-context"
              placeholder="Highlight anything specific you want the LLM to address (e.g., focus on Edo rapid increase)."
              value={additionalContext}
              onChange={(event) => setAdditionalContext(event.target.value)}
              rows={3}
            />
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

      {result ? <ReportResultCard result={result} /> : null}

      {timeSeries.length > 0 ? (
        <TimeSeriesChart data={timeSeries} selectedState={selectedStatesLabel} />
      ) : null}
    </div>
  )
}

interface StateMultiSelectProps {
  states: string[]
  value: string[]
  onChange: (next: string[]) => void
  disabled?: boolean
  label: string
}

function StateMultiSelect({ states, value, onChange, disabled, label }: StateMultiSelectProps) {
  const [open, setOpen] = useState(false)

  const toggleValue = (stateName: string) => {
    onChange(
      value.includes(stateName)
        ? value.filter((item) => item !== stateName)
        : [...value, stateName]
    )
  }

  const clearSelection = () => {
    onChange([])
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between"
        >
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0" align="start">
        <Command>
          <CommandInput placeholder="Search states..." />
          <CommandList>
            <CommandEmpty>No states found.</CommandEmpty>
            <CommandGroup>
              <CommandItem onSelect={clearSelection} className="cursor-pointer font-medium text-primary">
                Clear selection
              </CommandItem>
              <Separator className="my-1" />
              {states.map((state) => {
                const isChecked = value.includes(state)
                return (
                  <CommandItem
                    key={state}
                    onSelect={() => toggleValue(state)}
                    className="flex cursor-pointer items-center gap-2"
                  >
                    <Checkbox checked={isChecked} className="pointer-events-none" />
                    <span>{state}</span>
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

interface AlertCardProps {
  title: string
  description: string
  variant: "default" | "destructive"
}

function AlertCard({ title, description, variant }: AlertCardProps) {
  const isDestructive = variant === "destructive"

  return (
    <Card className={isDestructive ? "border-destructive/50 bg-destructive/10" : undefined}>
      <CardHeader>
        <CardTitle className={isDestructive ? "text-destructive" : undefined}>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className={isDestructive ? "text-destructive" : "text-muted-foreground"}>{description}</p>
      </CardContent>
    </Card>
  )
}

interface ReportResultCardProps {
  result: ReportApiSuccess & { coverageLabel?: string | null }
}

function ReportResultCard({ result }: ReportResultCardProps) {
  const { summary, rangeLabel, report } = result

  return (
    <div className="space-y-6 pb-10">
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-col gap-1">
            <span>Summary metrics</span>
            <span className="text-sm font-normal text-muted-foreground">
              {summary.state} · {rangeLabel}
            </span>
            {result.coverageLabel ? (
              <span className="text-xs font-normal text-muted-foreground">{result.coverageLabel}</span>
            ) : null}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <MetricCard
              label="Confirmed cases"
              value={summary.totals.confirmed}
              delta={summary.deltas.confirmed}
              average={summary.averages.confirmed}
            />
            <MetricCard
              label="Suspected cases"
              value={summary.totals.suspected}
              delta={summary.deltas.suspected}
              average={summary.averages.suspected}
            />
            <MetricCard
              label="Deaths"
              value={summary.totals.deaths}
              delta={summary.deltas.deaths}
              average={summary.averages.deaths}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center justify-between gap-2">
            <span>Generated narrative</span>
            <span className="text-sm font-normal text-muted-foreground">Provider: {report.provider}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <section className="space-y-2">
            <h3 className="text-lg font-semibold">Overview</h3>
            <p className="text-muted-foreground leading-relaxed">{report.sections.overview}</p>
          </section>

          <SectionList title="Key findings" items={report.sections.keyFindings} />
          <SectionList title="Trends" items={report.sections.trends} />
          <SectionList title="Recommendations" items={report.sections.recommendations} />
        </CardContent>
      </Card>
    </div>
  )
}

interface MetricCardProps {
  label: string
  value: number
  delta: number
  average: number
}

function MetricCard({ label, value, delta, average }: MetricCardProps) {
  const deltaLabel = formatDelta(delta)

  return (
    <div className="rounded-lg border bg-muted/40 p-4">
      <div className="space-y-1">
        <h3 className="text-sm font-medium text-muted-foreground">{label}</h3>
        <p className="text-2xl font-semibold">{formatNumber(value)}</p>
        <div className="text-sm text-muted-foreground">Week-over-week change: {deltaLabel}</div>
        <div className="text-sm text-muted-foreground">Average per reported week: {formatNumber(average, { maximumFractionDigits: 2 })}</div>
      </div>
    </div>
  )
}

interface SectionListProps {
  title: string
  items: string[]
}

function SectionList({ title, items }: SectionListProps) {
  if (!items.length) {
    return null
  }

  return (
    <section className="space-y-2">
      <h3 className="text-lg font-semibold">{title}</h3>
      <ul className="space-y-2">
        {items.map((item, index) => (
          <li key={`${title}-${index}`} className="text-muted-foreground">
            • {item}
          </li>
        ))}
      </ul>
    </section>
  )
}

function formatDelta(value: number) {
  if (!Number.isFinite(value)) {
    return "0%"
  }

  const rounded = Math.round(value * 10) / 10

  if (rounded === 0) return "0%"
  if (rounded > 0) return `+${rounded}%`
  return `${rounded}%`
}

function calculateWeeksCount(startISO: string, endISO: string) {
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

interface DateRangePickerProps {
  value: DateRange | undefined
  onChange: (range: DateRange | undefined) => void
  maxDate: Date
  onComplete?: () => void
}

function DateRangePicker({ value, onChange, maxDate, onComplete }: DateRangePickerProps) {
  const months = useMemo(() => {
    const entries: { label: string; range: DateRange }[] = []
    for (let i = 0; i < 12; i += 1) {
      const monthStart = startOfMonth(subMonths(maxDate, i))
      const monthEnd = endOfMonth(monthStart)
      entries.push({
        label: format(monthStart, "MMM yyyy"),
        range: { from: monthStart, to: monthEnd },
      })
    }
    return entries
  }, [maxDate])

  const quarters = useMemo(() => {
    const entries: { label: string; range: DateRange }[] = []
    for (let i = 0; i < 8; i += 1) {
      const quarterStart = startOfQuarter(subQuarters(maxDate, i))
      const quarterEnd = endOfQuarter(quarterStart)
      const quarterNumber = Math.floor(quarterStart.getMonth() / 3) + 1
      entries.push({
        label: `Q${quarterNumber} ${quarterStart.getFullYear()}`,
        range: { from: quarterStart, to: quarterEnd },
      })
    }
    return entries
  }, [maxDate])

  const years = useMemo(() => {
    const entries: { label: string; range: DateRange }[] = []
    for (let i = 0; i < 6; i += 1) {
      const yearStart = startOfYear(subYears(maxDate, i))
      const yearEnd = endOfYear(yearStart)
      entries.push({
        label: `${yearStart.getFullYear()}`,
        range: { from: yearStart, to: yearEnd },
      })
    }
    return entries
  }, [maxDate])

  const isSameRange = (range: DateRange) => {
    if (!value?.from || !value?.to) return false
    return isSameDay(range.from as Date, value.from) && isSameDay(range.to as Date, value.to)
  }

  const applyQuickRange = (range: DateRange) => {
    onChange(range)
    onComplete?.()
  }

  const handleCalendarSelect = (range: DateRange | undefined) => {
    onChange(range)
    if (range?.from && range?.to) {
      onComplete?.()
    }
  }

  return (
    <Tabs defaultValue="custom" className="w-[640px]">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="custom">Custom</TabsTrigger>
        <TabsTrigger value="quick-months">Months</TabsTrigger>
        <TabsTrigger value="quick-ranges">Quarters & Years</TabsTrigger>
      </TabsList>
      <TabsContent value="custom" className="p-4 pt-2">
        <Calendar
          initialFocus
          mode="range"
          numberOfMonths={2}
          selected={value}
          onSelect={handleCalendarSelect}
          disabled={(date) => date > maxDate}
        />
      </TabsContent>
      <TabsContent value="quick-months" className="p-4 pt-2">
        <ScrollArea className="h-[280px] pr-2">
          <div className="grid gap-2">
            {months.map((option) => (
              <button
                key={option.label}
                type="button"
                onClick={() => applyQuickRange(option.range)}
                className={cn(
                  "flex items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition-colors hover:bg-accent",
                  isSameRange(option.range) ? "border-primary bg-primary/10" : "border-border"
                )}
              >
                <span>{option.label}</span>
                <span className="text-muted-foreground text-xs">
                  {format(option.range.from as Date, "MMM d")} – {format(option.range.to as Date, "MMM d")}
                </span>
              </button>
            ))}
          </div>
        </ScrollArea>
      </TabsContent>
      <TabsContent value="quick-ranges" className="p-4 pt-2">
        <div className="space-y-4">
          <section>
            <h4 className="mb-2 text-sm font-semibold text-muted-foreground">Recent quarters</h4>
            <div className="grid gap-2">
              {quarters.map((option) => (
                <button
                  key={option.label}
                  type="button"
                  onClick={() => applyQuickRange(option.range)}
                  className={cn(
                    "flex items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition-colors hover:bg-accent",
                    isSameRange(option.range) ? "border-primary bg-primary/10" : "border-border"
                  )}
                >
                  <span>{option.label}</span>
                  <span className="text-muted-foreground text-xs">
                    {format(option.range.from as Date, "MMM d")} – {format(option.range.to as Date, "MMM d")}
                  </span>
                </button>
              ))}
            </div>
          </section>
          <section>
            <h4 className="mb-2 text-sm font-semibold text-muted-foreground">Recent years</h4>
            <div className="grid gap-2">
              {years.map((option) => (
                <button
                  key={option.label}
                  type="button"
                  onClick={() => applyQuickRange(option.range)}
                  className={cn(
                    "flex items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition-colors hover:bg-accent",
                    isSameRange(option.range) ? "border-primary bg-primary/10" : "border-border"
                  )}
                >
                  <span>{option.label}</span>
                  <span className="text-muted-foreground text-xs">
                    {format(option.range.from as Date, "MMM d yyyy")} – {format(option.range.to as Date, "MMM d yyyy")}
                  </span>
                </button>
              ))}
            </div>
          </section>
        </div>
      </TabsContent>
    </Tabs>
  )
}


