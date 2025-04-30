"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Legend, ResponsiveContainer } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { LassaFeverData } from "@/lib/data"

interface SummaryProps {
  data: LassaFeverData[]
  week: string
  selectedState?: string
  isFullYear?: boolean
}

export default function Summary({ data, week, selectedState = 'All States', isFullYear = false }: SummaryProps) {
  // Aggregate totals
  const totals = data.reduce(
    (acc, item) => {
      acc.suspected += item.suspected
      acc.confirmed += item.confirmed
      acc.deaths += item.deaths
      return acc
    },
    { suspected: 0, confirmed: 0, deaths: 0 },
  )

  // Prepare data for bar chart
  const topStates = (() => {
    // If full year data needs to be aggregated by state first to avoid duplicates
    let processedData = isFullYear
      ? Object.values(
          data.reduce((acc, item) => {
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
      : [...data]

    // Then apply sorting and filtering based on state selection
    return selectedState === 'All States'
      ? processedData
          .filter(item => item.suspected > 0) // Only include states with Suspected cases > 0
          .sort((a, b) => b.suspected - a.suspected) // Sort by Suspected cases
          .slice(0, 6)
          .map((item) => ({
            state: item.state,
            suspected: item.suspected,
            confirmed: item.confirmed,
            deaths: item.deaths,
          }))
      : processedData
          .sort((a, b) => b.confirmed - a.confirmed)
          .slice(0, 6)
          .map((item) => ({
            state: item.state,
            suspected: item.suspected,
            confirmed: item.confirmed,
            deaths: item.deaths,
          }))
  })()

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>{isFullYear ? 'Yearly Summary: ' : 'Weekly Summary: '}{week}</CardTitle>
          <CardDescription>
            Overview of Lassa fever cases for the {isFullYear ? 'selected year' : 'selected week'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.length === 0 ? (
            <div className="flex items-center justify-center h-[200px] text-muted-foreground">
              No data available for the selected week
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-4">
                <div className="flex flex-col items-center justify-center p-4 bg-muted rounded-lg">
                  <span className="text-3xl font-bold text-amber-500">{totals.suspected}</span>
                  <span className="text-sm text-muted-foreground">Suspected</span>
                </div>
                <div className="flex flex-col items-center justify-center p-4 bg-muted rounded-lg">
                  <span className="text-3xl font-bold text-red-500">{totals.confirmed}</span>
                  <span className="text-sm text-muted-foreground">Confirmed</span>
                </div>
                <div className="flex flex-col items-center justify-center p-4 bg-muted rounded-lg">
                  <span className="text-3xl font-bold text-gray-700">{totals.deaths}</span>
                  <span className="text-sm text-muted-foreground">Deaths</span>
                </div>
              </div>

              <div className="mt-6">
                <h3 className="text-lg font-medium mb-2">Case Fatality Rate</h3>
                <div className="text-2xl font-bold">
                  {totals.confirmed > 0 ? `${((totals.deaths / totals.confirmed) * 100).toFixed(1)}%` : "N/A"}
                </div>
                <p className="text-sm text-muted-foreground mt-1">Deaths as a percentage of confirmed cases</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {selectedState === 'All States' ? 'Top States by Suspected Cases' : 'Top States by Confirmed Cases'}
          </CardTitle>
          <CardDescription>
            States with highest Lassa fever burden for the {isFullYear ? 'selected year' : 'selected week'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {topStates.length === 0 ? (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
              No data available for the selected week
            </div>
          ) : (
            <ChartContainer
              config={{
                suspected: {
                  label: "Suspected Cases",
                  color: "hsl(var(--chart-1))",
                },
                confirmed: {
                  label: "Confirmed Cases",
                  color: "hsl(var(--chart-2))",
                },
                deaths: {
                  label: "Deaths",
                  color: "hsl(var(--chart-3))",
                },
              }}
              className="min-h-[240px] flex items-center justify-center"
            >
              <ResponsiveContainer width="100%" height={Math.max(300, topStates.length * 40)}>
                <BarChart
                  data={topStates}
                  layout="vertical"
                  margin={{ top: topStates.length < 5 ? 40 : 10, right: 30, left: 15, bottom: topStates.length < 5 ? 40 : 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={(value) => Math.round(value).toString()} />
                  <YAxis type="category" dataKey="state" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend />
                  <Bar dataKey="suspected" fill="var(--color-suspected)" />
                  <Bar dataKey="confirmed" fill="var(--color-confirmed)" />
                  <Bar dataKey="deaths" fill="var(--color-deaths)" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Detailed State Breakdown</CardTitle>
          <CardDescription>
            Complete breakdown of Lassa fever cases by state for the {isFullYear ? 'selected year' : 'selected week'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.length === 0 ? (
            <div className="flex items-center justify-center h-[200px] text-muted-foreground">
              No data available for the selected week
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
                  {isFullYear 
                    // For full year view, group by state to avoid duplicates
                    ? Object.values(
                        data.reduce((acc, item) => {
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
                      ))
                    // For weekly view, no need to group since entries are unique
                    : data.map((item, index) => (
                        <TableRow key={`${item.state}-${index}`}>
                          <TableCell className="font-medium">{item.state}</TableCell>
                          <TableCell className="text-right">{item.suspected}</TableCell>
                          <TableCell className="text-right">{item.confirmed}</TableCell>
                          <TableCell className="text-right">{item.deaths}</TableCell>
                          <TableCell className="text-right">
                            {item.confirmed > 0 ? `${((item.deaths / item.confirmed) * 100).toFixed(1)}%` : "N/A"}
                          </TableCell>
                        </TableRow>
                      ))
                  }
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
