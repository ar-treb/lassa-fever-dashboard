"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import type { LassaFeverData } from "@/lib/data"

interface StateMapProps {
  data: LassaFeverData[]
}

export default function StateMap({ data }: StateMapProps) {
  const [hoveredState, setHoveredState] = useState<string | null>(null)

  // Find the state with the maximum confirmed cases to normalize colors
  const maxConfirmed = Math.max(...data.map((item) => item.confirmed), 1)

  // Get data for a specific state
  const getStateData = (stateName: string) => {
    return (
      data.find((item) => item.state === stateName) || {
        state: stateName,
        suspected: 0,
        confirmed: 0,
        deaths: 0,
      }
    )
  }

  // Calculate color intensity based on confirmed cases
  const getStateColor = (stateName: string) => {
    const stateData = getStateData(stateName)
    const intensity = stateData.confirmed / maxConfirmed
    return `rgba(220, 38, 38, ${Math.max(0.1, intensity)})`
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nigeria State Map</CardTitle>
        <CardDescription>Geographical distribution of Lassa fever cases</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex items-center justify-center h-[400px] text-muted-foreground">
            No data available for the selected week
          </div>
        ) : (
          <div className="flex justify-center">
            <TooltipProvider>
              <div className="relative w-full max-w-xl">
                <svg viewBox="0 0 800 800" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
                  {/* This is a simplified placeholder for the Nigeria map */}
                  {/* In a real implementation, you would use GeoJSON data for Nigeria states */}
                  <rect x="50" y="50" width="700" height="700" fill="#f1f5f9" stroke="#e2e8f0" />
                  <text x="400" y="400" textAnchor="middle" fontSize="24" fill="#64748b">
                    Nigeria Map Placeholder
                  </text>
                  <text x="400" y="440" textAnchor="middle" fontSize="16" fill="#64748b">
                    In a production environment, this would be replaced with an actual SVG map of Nigeria
                  </text>

                  {/* Example state shapes - these would be replaced with actual state boundaries */}
                  {data.map((stateData, index) => {
                    // Calculate position in a grid layout (just for demonstration)
                    const col = index % 6
                    const row = Math.floor(index / 6)
                    const x = 100 + col * 120
                    const y = 100 + row * 80

                    return (
                      <Tooltip key={stateData.state}>
                        <TooltipTrigger asChild>
                          <g
                            onMouseEnter={() => setHoveredState(stateData.state)}
                            onMouseLeave={() => setHoveredState(null)}
                            style={{ cursor: "pointer" }}
                          >
                            <rect
                              x={x}
                              y={y}
                              width="100"
                              height="60"
                              rx="4"
                              fill={getStateColor(stateData.state)}
                              stroke={hoveredState === stateData.state ? "#000" : "#64748b"}
                              strokeWidth={hoveredState === stateData.state ? "2" : "1"}
                            />
                            <text x={x + 50} y={y + 35} textAnchor="middle" fontSize="12" fill="#fff">
                              {stateData.state}
                            </text>
                          </g>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="space-y-1">
                            <p className="font-medium">{stateData.state}</p>
                            <div className="text-sm">
                              <div>Suspected: {stateData.suspected}</div>
                              <div>Confirmed: {stateData.confirmed}</div>
                              <div>Deaths: {stateData.deaths}</div>
                            </div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    )
                  })}
                </svg>

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
            </TooltipProvider>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
