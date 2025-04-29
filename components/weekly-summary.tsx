"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Legend, ResponsiveContainer } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { LassaFeverData } from "@/lib/data"

interface WeeklySummaryProps {
  data: LassaFeverData[]
  week: string
}

export default function WeeklySummary({ data, week }: WeeklySummaryProps) {
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

  // Prepare data for bar chart - top 10 states by confirmed cases
  const topStates = [...data]
    .sort((a, b) => b.confirmed - a.confirmed)
    .slice(0, 10)
    .map((item) => ({
      state: item.state,
      suspected: item.suspected,
      confirmed: item.confirmed,
      deaths: item.deaths,
    }))

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Weekly Summary: {week}</CardTitle>
          <CardDescription>Overview of Lassa fever cases for the selected week</CardDescription>
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
          <CardTitle>Top States by Confirmed Cases</CardTitle>
          <CardDescription>States with highest Lassa fever burden for {week}</CardDescription>
        </CardHeader>
        <CardContent>
          {topStates.length === 0 ? (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
              No data available for the selected week
            </div>
          ) : (
            <ChartContainer
              config={{
                confirmed: {
                  label: "Confirmed Cases",
                  color: "hsl(var(--chart-2))",
                },
                deaths: {
                  label: "Deaths",
                  color: "hsl(var(--chart-3))",
                },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topStates} layout="vertical" margin={{ top: 5, right: 30, left: 60, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="state" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend />
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
          <CardDescription>Complete breakdown of Lassa fever cases by state for {week}</CardDescription>
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
                  {data.map((item) => (
                    <TableRow key={item.state}>
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
