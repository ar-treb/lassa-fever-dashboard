"use client"

import { useCallback, useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import type { LassaFeverData } from '@/lib/data'

interface NigeriaMapProps {
  data: LassaFeverData[]
  onStateHover?: (state: string | null) => void
  isAggregatedPeriod?: boolean
  periodLabel?: string
  colorMetric?: 'suspected' | 'confirmed' | 'deaths'
}

export function NigeriaMap({
  data,
  onStateHover,
  isAggregatedPeriod = false,
  periodLabel,
  colorMetric = 'suspected',
}: NigeriaMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const [hoveredState, setHoveredState] = useState<string | null>(null)
  const [hoverPosition, setHoverPosition] = useState<{ x: number; y: number } | null>(null)
  const [mapSize, setMapSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 })
  const [mapData, setMapData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  
  // Process data for aggregated periods (month/quarter/year) if needed
  const processedData = isAggregatedPeriod
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
    : data
  
  const getMetricValue = (item: LassaFeverData) => item[colorMetric]

  // Find the state with the maximum metric value to normalize colors
  const maxMetricValue = Math.max(...processedData.map((item) => getMetricValue(item)), 1)
  
  // Get data for a specific state
  const getStateData = (stateName: string) => {
    return processedData.find((item) => item.state === stateName) || {
      state: stateName,
      suspected: 0,
      confirmed: 0,
      deaths: 0,
    }
  }

  const getStateIntensity = (stateName: string) => {
    const stateData = getStateData(stateName)
    return getMetricValue(stateData) / maxMetricValue
  }
  
  // Calculate color intensity based on suspected cases
  const getStateColor = (stateName: string) => {
    const intensity = getStateIntensity(stateName)
    const lightness = Math.max(35, 92 - intensity * 55)
    return `hsl(0, 72%, ${lightness}%)`
  }

  const getLabelColor = (stateName: string) => {
    const intensity = getStateIntensity(stateName)
    return intensity > 0.55 ? '#ffffff' : '#1f2937'
  }

  const getHoverPosition = useCallback((event: MouseEvent) => {
    const containerBounds = containerRef.current?.getBoundingClientRect()
    if (!containerBounds) return null

    const offsetX = event.clientX - containerBounds.left
    const offsetY = event.clientY - containerBounds.top

    return {
      x: Math.max(12, Math.min(containerBounds.width - 12, offsetX + 12)),
      y: Math.max(12, Math.min(containerBounds.height - 12, offsetY + 12)),
    }
  }, [])
  
  useEffect(() => {
    if (!containerRef.current) return

    const updateSize = () => {
      const bounds = containerRef.current?.getBoundingClientRect()
      if (!bounds) return
      setMapSize({ width: bounds.width, height: bounds.height })
    }

    updateSize()

    const observer = new ResizeObserver(() => {
      updateSize()
    })

    observer.observe(containerRef.current)

    return () => {
      observer.disconnect()
    }
  }, [])

  useEffect(() => {
    // Fetch and parse GeoJSON data
    const fetchMapData = async () => {
      try {
        const response = await fetch('/assets/maps/nigeria_states.geojson')
        
        if (!response.ok) {
          throw new Error(`Failed to load map data: ${response.status}`)
        }
        
        const geoData = await response.json()
        setMapData(geoData)
      } catch (err) {
        console.error('Error loading map data:', err)
        setError('Failed to load Nigeria map data')
      }
    }
    
    fetchMapData()
  }, [])
  
  useEffect(() => {
    if (!mapData || !svgRef.current) return
    
    // Clear any existing content
    d3.select(svgRef.current).selectAll('*').remove()
    
    const svg = d3.select(svgRef.current)
    const width = mapSize.width || 800
    const height = mapSize.height || 800
    const padding = 16

    svg.attr('viewBox', `0 0 ${width} ${height}`)
    
    // Create a projection that fits Nigeria in our SVG viewbox
    const projection = d3.geoMercator()
      .fitExtent([[padding, padding], [width - padding, height - padding]], mapData)
    
    // Create a path generator using the projection
    const pathGenerator = d3.geoPath().projection(projection)
    
    // Add state boundaries to the map
    svg.selectAll('path')
      .data(mapData.features)
      .enter()
      .append('path')
      .attr('d', pathGenerator)
      .attr('fill', (d: any) => {
        // Match state name in GeoJSON to our data
        const stateName = d.properties.NAME_1
        return getStateColor(stateName)
      })
      .attr('stroke', 'hsl(var(--muted-foreground))')
      .attr('stroke-width', 0.8)
      .attr('class', 'state-path')
      .attr('data-state', (d: any) => d.properties.NAME_1)
      .on('mouseenter', function(this: SVGPathElement, event: MouseEvent, d: any) {
        const stateName = d.properties.NAME_1
        setHoveredState(stateName)
        setHoverPosition(getHoverPosition(event))
        if (onStateHover) onStateHover(stateName)
        
        d3.select(this)
          .attr('stroke', 'hsl(var(--muted-foreground))')
          .attr('stroke-width', 1.6)
      })
      .on('mousemove', function(this: SVGPathElement, event: MouseEvent) {
        setHoverPosition(getHoverPosition(event))
      })
      .on('mouseleave', function(this: SVGPathElement) {
        setHoveredState(null)
        setHoverPosition(null)
        if (onStateHover) onStateHover(null)
        
        d3.select(this)
          .attr('stroke', 'hsl(var(--muted-foreground))')
          .attr('stroke-width', 0.8)
      })
    
    // Add state labels with selected metric numbers
    svg.selectAll('text.state-label')
      .data(mapData.features)
      .enter()
      .append('text')
      .attr('class', 'state-label')
      .attr('transform', (d: any) => `translate(${pathGenerator.centroid(d)})`)
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .attr('font-weight', 'bold')
      .attr('fill', (d: any) => {
        const stateName = d.properties.NAME_1
        return getLabelColor(stateName)
      })
      .attr('pointer-events', 'none')
      .text((d: any) => {
        const stateName = d.properties.NAME_1
        const stateData = getStateData(stateName)

        return `${getMetricValue(stateData)}`
      })
      
    // Add a subtle shadow to make text more readable
    svg.selectAll('text.state-label')
      .each(function(this: SVGTextElement) {
        const text = d3.select(this)
        const shadow = text.clone()
          .attr('stroke', 'hsl(var(--foreground))')
          .attr('stroke-opacity', 0.8)
          .attr('stroke-width', 3)
          .attr('stroke-linejoin', 'round')
          .attr('paint-order', 'stroke')
        
        // Insert shadow before the text (underneath)
        this.parentNode?.insertBefore(shadow.node() as Node, this)
      })
    
  }, [mapData, mapSize, data, maxMetricValue, onStateHover, getHoverPosition, colorMetric])
  
  const renderTooltip = (stateName: string) => {
    const stateData = getStateData(stateName)
    
    return (
      <div className="space-y-1">
        <p className="font-medium">{stateName}</p>
        <div className="text-sm">
          {isAggregatedPeriod && periodLabel && (
            <div className="font-medium text-muted-foreground mb-1">{periodLabel}</div>
          )}
          <div>Suspected: {stateData.suspected}</div>
          <div>Confirmed: {stateData.confirmed}</div>
          <div>Deaths: {stateData.deaths}</div>
        </div>
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="flex items-center justify-center h-[400px] text-red-500">
        <p>{error}</p>
      </div>
    )
  }
  
  if (!mapData) {
    return (
      <div className="flex items-center justify-center h-[400px] text-muted-foreground">
        <p>Loading map data...</p>
      </div>
    )
  }
  
  return (
    <div ref={containerRef} className="relative w-full h-[600px]">
      {hoveredState && hoverPosition && (
        <div
          className="absolute z-10 rounded-md border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md"
          style={{ left: hoverPosition.x, top: hoverPosition.y }}
        >
          {renderTooltip(hoveredState)}
        </div>
      )}
      <svg
        ref={svgRef}
        className="w-full h-full"
        preserveAspectRatio="xMidYMid meet"
      />
    </div>
  )
}
