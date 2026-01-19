"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Line, LineChart, CartesianGrid, XAxis, YAxis, Legend } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

interface TimeSeriesChartProps {
  data: any[]
  selectedState?: string
  selectedYear?: string
}

export default function TimeSeriesChart({ data, selectedState = 'All States', selectedYear }: TimeSeriesChartProps) {
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
        <CardTitle>Weekly Lassa Fever Cases{selectedState !== 'All States' ? ` in ${selectedState}` : ' in Nigeria'}{selectedYear ? ` (${selectedYear})` : ''}</CardTitle>
        <CardDescription>Trend of suspected cases, confirmed cases, and deaths{selectedState !== 'All States' ? ` in ${selectedState}` : ' in Nigeria'} over time</CardDescription>
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
            className="h-[320px] md:h-[380px]"
          >
            <LineChart data={formattedData} margin={{ top: 8, right: 16, left: 16, bottom: 16 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="weekLabel" interval="preserveStartEnd" minTickGap={24} />
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
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
