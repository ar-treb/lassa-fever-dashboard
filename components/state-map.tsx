"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { NigeriaMap } from "@/components/NigeriaMap"
import type { LassaFeverData } from "@/lib/data"

interface StateMapProps {
  data: LassaFeverData[]
  isFullYear?: boolean
  selectedYear?: string
  selectedState?: string
}

export default function StateMap({ data, isFullYear = false, selectedYear, selectedState = 'All States' }: StateMapProps) {
  const [hoveredState, setHoveredState] = useState<string | null>(null)

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
            <NigeriaMap 
              data={data} 
              onStateHover={setHoveredState}
              isFullYear={isFullYear}
              selectedYear={selectedYear}
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
