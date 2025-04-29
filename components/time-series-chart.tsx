"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Line, LineChart, CartesianGrid, XAxis, YAxis, Legend, ResponsiveContainer } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

interface TimeSeriesChartProps {
  data: any[]
}

export default function TimeSeriesChart({ data }: TimeSeriesChartProps) {
  // Format week labels to be more readable
  const formattedData = data.map((item) => {
    // Extract week number from week_formatted (e.g., "2021-W01" -> "W01")
    const weekLabel = item.week?.split("-W")[1] || item.week_formatted?.split("-W")[1] || ""

    return {
      ...item,
      weekLabel: `W${weekLabel}`,
    }
  })

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Weekly Lassa Fever Cases</CardTitle>
        <CardDescription>Trend of suspected cases, confirmed cases, and deaths over time</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex items-center justify-center h-[400px] text-muted-foreground">
            No data available for the selected filters
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
            className="h-[400px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={formattedData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="weekLabel" interval="preserveStartEnd" minTickGap={30} />
                <YAxis tickFormatter={(value) => Math.round(value).toString()} />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      labelFormatter={(label) => {
                        const weekData = formattedData.find((d) => d.weekLabel === label)
                        return weekData ? weekData.week_formatted || weekData.week : label
                      }}
                    />
                  }
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="suspected"
                  stroke="var(--color-suspected)"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="confirmed"
                  stroke="var(--color-confirmed)"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="deaths"
                  stroke="var(--color-deaths)"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
