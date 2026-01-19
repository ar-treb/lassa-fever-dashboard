"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { NigeriaMap } from "@/components/NigeriaMap"
import type { LassaFeverData } from "@/lib/data"

type PeriodMode = "week" | "month" | "quarter" | "year"
type MapMetric = "suspected" | "confirmed" | "deaths"

interface StateMapProps {
  data: LassaFeverData[]
  periodMode?: PeriodMode
  periodLabel?: string
  selectedState?: string
}

export default function StateMap({ data, periodMode = 'week', periodLabel, selectedState = 'All States' }: StateMapProps) {
  const isAggregatedPeriod = periodMode !== 'week'
  const [mapMetric, setMapMetric] = useState<MapMetric>('suspected')

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nigeria State Map{selectedState !== 'All States' ? ` - ${selectedState}` : ''}</CardTitle>
        <CardDescription>Geographical distribution of Lassa fever cases{selectedState !== 'All States' ? ` in ${selectedState}` : ' across Nigeria'}</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex items-center justify-center h-[400px] text-muted-foreground">
            No data available for the selected week
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <div className="mb-4 flex w-full items-center justify-end gap-2">
              <Button
                type="button"
                size="sm"
                variant={mapMetric === 'suspected' ? 'default' : 'outline'}
                onClick={() => setMapMetric('suspected')}
              >
                Suspected
              </Button>
              <Button
                type="button"
                size="sm"
                variant={mapMetric === 'confirmed' ? 'default' : 'outline'}
                onClick={() => setMapMetric('confirmed')}
              >
                Confirmed
              </Button>
              <Button
                type="button"
                size="sm"
                variant={mapMetric === 'deaths' ? 'default' : 'outline'}
                onClick={() => setMapMetric('deaths')}
              >
                Deaths
              </Button>
            </div>
            <NigeriaMap 
              data={data} 
              isAggregatedPeriod={isAggregatedPeriod}
              periodLabel={periodLabel}
              colorMetric={mapMetric}
            />
            
            <div className="mt-4 flex justify-center">
              <div className="flex items-center space-x-8">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-red-100"></div>
                  <span className="text-sm">Low</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-red-300"></div>
                  <span className="text-sm">Medium</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-red-500"></div>
                  <span className="text-sm">High</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-red-700"></div>
                  <span className="text-sm">Very High</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
