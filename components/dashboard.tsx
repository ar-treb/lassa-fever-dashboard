"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import TimeSeriesChart from "@/components/time-series-chart"
import Summary from "@/components/summary"
import StateMap from "@/components/state-map"
import { DownloadDataButton } from "@/components/download-data-button"
import { fetchLassaFeverData, fetchAvailableYears, fetchAvailableWeeks, fetchAvailableStates } from "@/lib/data"
import type { LassaFeverData } from "@/lib/data"
import { Skeleton } from "@/components/ui/skeleton"
import {
  deriveAvailableMonths,
  deriveAvailableQuarters,
  filterWeeksByMonth,
  filterWeeksByQuarter,
  formatMonthLabel,
  formatQuarterLabel,
} from "@/lib/utils"

type PeriodMode = "week" | "month" | "quarter" | "year"

export default function Dashboard() {
  const [selectedYear, setSelectedYear] = useState<string>("")
  const [selectedWeek, setSelectedWeek] = useState<string>("")
  const [selectedMonth, setSelectedMonth] = useState<string>("")
  const [selectedQuarter, setSelectedQuarter] = useState<string>("")
  const [selectedState, setSelectedState] = useState<string>("All States")
  const [periodMode, setPeriodMode] = useState<PeriodMode>("week")
  const [showAllStates, setShowAllStates] = useState<boolean>(true)

  const [availableYears, setAvailableYears] = useState<string[]>([])
  const [availableWeeks, setAvailableWeeks] = useState<string[]>([])
  const [availableStates, setAvailableStates] = useState<string[]>([])

  const [timeSeriesData, setTimeSeriesData] = useState<LassaFeverData[]>([])
  const [weeklyData, setWeeklyData] = useState<LassaFeverData[]>([])

  const [loading, setLoading] = useState<boolean>(true)

  // Derive available months and quarters from available weeks
  const availableMonths = useMemo(
    () => deriveAvailableMonths(availableWeeks, selectedYear),
    [availableWeeks, selectedYear]
  )
  const availableQuarters = useMemo(
    () => deriveAvailableQuarters(availableWeeks, selectedYear),
    [availableWeeks, selectedYear]
  )

  // Compute which weeks are included in the current period selection
  const weeksInPeriod = useMemo(() => {
    if (periodMode === "week") {
      return selectedWeek ? [selectedWeek] : []
    }
    if (periodMode === "month") {
      return filterWeeksByMonth(availableWeeks, selectedMonth)
    }
    if (periodMode === "quarter") {
      return filterWeeksByQuarter(availableWeeks, selectedQuarter)
    }
    // year mode: all weeks for selected year
    return availableWeeks
  }, [periodMode, selectedWeek, selectedMonth, selectedQuarter, availableWeeks])

  // Compute display label for the current period
  const periodLabel = useMemo(() => {
    if (periodMode === "week") return selectedWeek || "Select week"
    if (periodMode === "month") return formatMonthLabel(selectedMonth)
    if (periodMode === "quarter") return formatQuarterLabel(selectedQuarter)
    return `Full Year ${selectedYear}`
  }, [periodMode, selectedWeek, selectedMonth, selectedQuarter, selectedYear])

  // Fetch available years, weeks, and states on component mount
  useEffect(() => {
    async function fetchFilters() {
      try {
        const years = await fetchAvailableYears()
        setAvailableYears(years)

        if (years.length > 0) {
          const latestYear = years[years.length - 1]
          setSelectedYear(latestYear)

          const weeks = await fetchAvailableWeeks(latestYear)
          setAvailableWeeks(weeks)

          if (weeks.length > 0) {
            setSelectedWeek(weeks[weeks.length - 1])
          }

          // Initialize month and quarter selections
          const months = deriveAvailableMonths(weeks, latestYear)
          if (months.length > 0) {
            setSelectedMonth(months[months.length - 1])
          }
          const quarters = deriveAvailableQuarters(weeks, latestYear)
          if (quarters.length > 0) {
            setSelectedQuarter(quarters[quarters.length - 1])
          }
        }

        const states = await fetchAvailableStates()
        setAvailableStates(states)
      } catch (error) {
        console.error("Error fetching filters:", error)
      }
    }

    fetchFilters()
  }, [])

  // Fetch time series data when year or state changes
  useEffect(() => {
    async function fetchTimeSeriesData() {
      if (!selectedYear) return

      setLoading(true)
      try {
        const data = await fetchLassaFeverData(selectedYear, undefined, selectedState)
        setTimeSeriesData(data)
      } catch (error) {
        console.error("Error fetching time series data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchTimeSeriesData()
  }, [selectedYear, selectedState])

  // Fetch data based on selected period mode
  useEffect(() => {
    async function fetchPeriodData() {
      if (!selectedYear) return

      setLoading(true)
      try {
        if (periodMode === "year") {
          // Fetch all data for the selected year
          const data = await fetchLassaFeverData(selectedYear, undefined, selectedState)
          setWeeklyData(data)
        } else if (periodMode === "week") {
          if (!selectedWeek) return
          const data = await fetchLassaFeverData(undefined, selectedWeek, selectedState)
          setWeeklyData(data)
        } else if (periodMode === "month" || periodMode === "quarter") {
          // Fetch all data for the year, then filter by weeks in the period
          const data = await fetchLassaFeverData(selectedYear, undefined, selectedState)
          const filteredData = data.filter((item) => weeksInPeriod.includes(item.week_formatted))
          setWeeklyData(filteredData)
        }
      } catch (error) {
        console.error("Error fetching period data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchPeriodData()
  }, [selectedWeek, selectedMonth, selectedQuarter, selectedState, selectedYear, periodMode, weeksInPeriod])

  // Update available weeks, months, quarters when year changes
  useEffect(() => {
    async function updatePeriodOptions() {
      if (!selectedYear) return

      try {
        const weeks = await fetchAvailableWeeks(selectedYear)
        setAvailableWeeks(weeks)

        if (weeks.length > 0 && (!selectedWeek || !weeks.includes(selectedWeek))) {
          setSelectedWeek(weeks[weeks.length - 1])
        }

        // Update month selection
        const months = deriveAvailableMonths(weeks, selectedYear)
        if (months.length > 0 && (!selectedMonth || !months.includes(selectedMonth))) {
          setSelectedMonth(months[months.length - 1])
        }

        // Update quarter selection
        const quarters = deriveAvailableQuarters(weeks, selectedYear)
        if (quarters.length > 0 && (!selectedQuarter || !quarters.includes(selectedQuarter))) {
          setSelectedQuarter(quarters[quarters.length - 1])
        }
      } catch (error) {
        console.error("Error updating period options:", error)
      }
    }

    updatePeriodOptions()
  }, [selectedYear])

  // Aggregate data by week for time series
  const aggregatedTimeSeriesData = aggregateByWeek(timeSeriesData)

  return (
    <div className="container mx-auto py-6 space-y-8">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Lassa Fever Dashboard - Nigeria</h1>
        <p className="text-muted-foreground">
          Weekly surveillance data visualization for Lassa fever across Nigerian states (2021-2025)
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Year</CardTitle>
          </CardHeader>
          <CardContent>
            <Select
              value={selectedYear}
              onValueChange={(value) => {
                setSelectedYear(value)
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent>
                {availableYears.map((year) => (
                  <SelectItem key={year} value={year}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Period</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <RadioGroup
                value={periodMode}
                onValueChange={(value) => setPeriodMode(value as PeriodMode)}
                className="flex flex-wrap gap-x-4 gap-y-2"
              >
                <div className="flex items-center space-x-1.5">
                  <RadioGroupItem value="week" id="period-week" />
                  <Label htmlFor="period-week" className="text-sm">Week</Label>
                </div>
                <div className="flex items-center space-x-1.5">
                  <RadioGroupItem value="month" id="period-month" />
                  <Label htmlFor="period-month" className="text-sm">Month</Label>
                </div>
                <div className="flex items-center space-x-1.5">
                  <RadioGroupItem value="quarter" id="period-quarter" />
                  <Label htmlFor="period-quarter" className="text-sm">Quarter</Label>
                </div>
                <div className="flex items-center space-x-1.5">
                  <RadioGroupItem value="year" id="period-year" />
                  <Label htmlFor="period-year" className="text-sm">Year</Label>
                </div>
              </RadioGroup>

              {periodMode === "week" && (
                <Select value={selectedWeek} onValueChange={setSelectedWeek}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select week" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableWeeks.map((week) => (
                      <SelectItem key={week} value={week}>
                        {week}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {periodMode === "month" && (
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select month" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableMonths.map((month) => (
                      <SelectItem key={month} value={month}>
                        {formatMonthLabel(month)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {periodMode === "quarter" && (
                <Select value={selectedQuarter} onValueChange={setSelectedQuarter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select quarter" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableQuarters.map((quarter) => (
                      <SelectItem key={quarter} value={quarter}>
                        {formatQuarterLabel(quarter)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">State</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Label htmlFor="state-mode">Specific</Label>
                  <Switch 
                    id="state-mode" 
                    checked={showAllStates}
                    onCheckedChange={(checked) => {
                      setShowAllStates(checked)
                      if (checked) {
                        // When switching to All States mode
                        setSelectedState("All States")
                      } else if (availableStates.length > 0) {
                        // When switching to specific state mode, set to first state
                        setSelectedState(availableStates[0])
                      }
                    }}
                  />
                  <Label htmlFor="state-mode">All States</Label>
                </div>
              </div>
              
              {!showAllStates && (
                <Select 
                  value={selectedState} 
                  onValueChange={setSelectedState}
                  disabled={showAllStates}
                >
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
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="summary" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <TabsList>
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="state-map">State Map</TabsTrigger>
          </TabsList>
          <DownloadDataButton
            year={selectedYear}
            periodMode={periodMode}
            selectedWeek={selectedWeek}
            selectedMonth={selectedMonth}
            selectedQuarter={selectedQuarter}
            weeksInPeriod={weeksInPeriod}
            state={selectedState}
            periodLabel={periodLabel}
          />
        </div>

        <TabsContent value="summary" className="space-y-4">
          {loading ? (
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <Skeleton className="h-8 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-[200px] w-full" />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <Skeleton className="h-8 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-[200px] w-full" />
                </CardContent>
              </Card>
            </div>
          ) : (
            <Summary
              data={weeklyData}
              week={periodLabel}
              selectedState={selectedState}
              periodMode={periodMode}
            />
          )}
        </TabsContent>

        <TabsContent value="state-map" className="space-y-4">
          {loading ? (
            <Card>
              <CardHeader>
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-[400px] w-full" />
              </CardContent>
            </Card>
          ) : (
            <StateMap
              data={weeklyData}
              periodMode={periodMode}
              periodLabel={periodLabel}
              selectedState={selectedState}
            />
          )}
        </TabsContent>
      </Tabs>

      {loading ? (
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[400px] w-full" />
          </CardContent>
        </Card>
      ) : (
        <TimeSeriesChart data={aggregatedTimeSeriesData} selectedState={selectedState} selectedYear={selectedYear} />
      )}

      <Card>
        <CardHeader>
          <CardTitle>Detailed State Breakdown</CardTitle>
          <CardDescription>
            Complete breakdown of Lassa fever cases{selectedState !== 'All States' ? ` in ${selectedState}` : ' in Nigeria'} for the selected {periodMode === 'week' ? 'week' : periodMode === 'month' ? 'month' : periodMode === 'quarter' ? 'quarter' : 'year'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading || weeklyData.length === 0 ? (
            <div className="flex items-center justify-center h-[200px] text-muted-foreground">
              No data available for the selected period
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>State</TableHead>
                    <TableHead className="text-right">Suspected</TableHead>
                    <TableHead className="text-right">Confirmed</TableHead>
                    <TableHead className="text-right">Deaths</TableHead>
                    <TableHead className="text-right">CFR (%)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(periodMode !== 'week'
                    ? Object.values(
                        weeklyData.reduce((acc, item) => {
                          if (!acc[item.state]) {
                            acc[item.state] = {
                              state: item.state,
                              suspected: 0,
                              confirmed: 0,
                              deaths: 0,
                            }
                          }
                          acc[item.state].suspected += item.suspected
                          acc[item.state].confirmed += item.confirmed
                          acc[item.state].deaths += item.deaths
                          return acc
                        }, {} as Record<string, any>)
                      )
                    : weeklyData
                  ).map((item, index) => (
                    <TableRow key={`${item.state}-${index}`}>
                      <TableCell className="font-medium">{item.state}</TableCell>
                      <TableCell className="text-right">{item.suspected}</TableCell>
                      <TableCell className="text-right">{item.confirmed}</TableCell>
                      <TableCell className="text-right">{item.deaths}</TableCell>
                      <TableCell className="text-right">
                        {item.confirmed > 0 ? `${((item.deaths / item.confirmed) * 100).toFixed(1)}%` : "N/A"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// Helper function to aggregate data by week
function aggregateByWeek(data: LassaFeverData[]) {
  const aggregated: Record<string, any> = {}

  data.forEach((item) => {
    if (!aggregated[item.week_formatted]) {
      aggregated[item.week_formatted] = {
        week: item.week_formatted,
        suspected: 0,
        confirmed: 0,
        deaths: 0,
      }
    }

    aggregated[item.week_formatted].suspected += item.suspected
    aggregated[item.week_formatted].confirmed += item.confirmed
    aggregated[item.week_formatted].deaths += item.deaths
  })

  return Object.values(aggregated).sort((a, b) => a.week.localeCompare(b.week))
}
