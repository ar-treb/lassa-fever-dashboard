"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import TimeSeriesChart from "@/components/time-series-chart"
import WeeklySummary from "@/components/weekly-summary"
import StateMap from "@/components/state-map"
import { fetchLassaFeverData, fetchAvailableYears, fetchAvailableWeeks, fetchAvailableStates } from "@/lib/data"
import type { LassaFeverData } from "@/lib/data"
import { Skeleton } from "@/components/ui/skeleton"

export default function Dashboard() {
  const [selectedYear, setSelectedYear] = useState<string>("")
  const [selectedWeek, setSelectedWeek] = useState<string>("")
  const [selectedState, setSelectedState] = useState<string>("All States")

  const [availableYears, setAvailableYears] = useState<string[]>([])
  const [availableWeeks, setAvailableWeeks] = useState<string[]>([])
  const [availableStates, setAvailableStates] = useState<string[]>([])

  const [timeSeriesData, setTimeSeriesData] = useState<LassaFeverData[]>([])
  const [weeklyData, setWeeklyData] = useState<LassaFeverData[]>([])

  const [loading, setLoading] = useState<boolean>(true)

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

  // Fetch weekly data when week changes
  useEffect(() => {
    async function fetchWeeklyData() {
      if (!selectedWeek) return

      setLoading(true)
      try {
        const data = await fetchLassaFeverData(undefined, selectedWeek, selectedState)
        setWeeklyData(data)
      } catch (error) {
        console.error("Error fetching weekly data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchWeeklyData()
  }, [selectedWeek, selectedState])

  // Update available weeks when year changes
  useEffect(() => {
    async function updateWeeks() {
      if (!selectedYear) return

      try {
        const weeks = await fetchAvailableWeeks(selectedYear)
        setAvailableWeeks(weeks)

        if (weeks.length > 0 && (!selectedWeek || !weeks.includes(selectedWeek))) {
          setSelectedWeek(weeks[weeks.length - 1])
        }
      } catch (error) {
        console.error("Error updating weeks:", error)
      }
    }

    updateWeeks()
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Year</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedYear} onValueChange={setSelectedYear} disabled={availableYears.length === 0}>
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
            <CardTitle className="text-lg">Week</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedWeek} onValueChange={setSelectedWeek} disabled={availableWeeks.length === 0}>
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">State</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedState} onValueChange={setSelectedState}>
              <SelectTrigger>
                <SelectValue placeholder="Select state" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All States">All States</SelectItem>
                {availableStates.map((state) => (
                  <SelectItem key={state} value={state}>
                    {state}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="time-series" className="space-y-4">
        <TabsList>
          <TabsTrigger value="time-series">Time Series</TabsTrigger>
          <TabsTrigger value="weekly-summary">Weekly Summary</TabsTrigger>
          <TabsTrigger value="state-map">State Map</TabsTrigger>
        </TabsList>

        <TabsContent value="time-series" className="space-y-4">
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
            <TimeSeriesChart data={aggregatedTimeSeriesData} />
          )}
        </TabsContent>

        <TabsContent value="weekly-summary" className="space-y-4">
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
            <WeeklySummary data={weeklyData} week={selectedWeek} selectedState={selectedState} />
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
            <StateMap data={weeklyData} />
          )}
        </TabsContent>
      </Tabs>
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
