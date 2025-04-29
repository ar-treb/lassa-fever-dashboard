"use client"

import { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import type { LassaFeverData } from '@/lib/data'

interface NigeriaMapProps {
  data: LassaFeverData[]
  onStateHover?: (state: string | null) => void
  isFullYear?: boolean
  selectedYear?: string
}

export function NigeriaMap({ data, onStateHover, isFullYear = false, selectedYear }: NigeriaMapProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [hoveredState, setHoveredState] = useState<string | null>(null)
  const [mapData, setMapData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  
  // Process data for full year if needed
  const processedData = isFullYear
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
  
  // Find the state with the maximum suspected cases to normalize colors
  const maxSuspected = Math.max(...processedData.map((item) => item.suspected), 1)
  
  // Get data for a specific state
  const getStateData = (stateName: string) => {
    return processedData.find((item) => item.state === stateName) || {
      state: stateName,
      suspected: 0,
      confirmed: 0,
      deaths: 0,
    }
  }
  
  // Calculate color intensity based on suspected cases
  const getStateColor = (stateName: string) => {
    const stateData = getStateData(stateName)
    const intensity = stateData.suspected / maxSuspected
    return `rgba(220, 38, 38, ${Math.max(0.1, intensity)})`
  }
  
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
    const width = svgRef.current.clientWidth || 800
    const height = svgRef.current.clientHeight || 800
    
    // Create a projection that fits Nigeria in our SVG viewbox
    const projection = d3.geoMercator()
      .fitSize([width, height], mapData)
    
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
      .attr('stroke', '#333')
      .attr('stroke-width', 0.8)
      .attr('class', 'state-path')
      .attr('data-state', (d: any) => d.properties.NAME_1)
      .on('mouseenter', function(this: SVGPathElement, event: MouseEvent, d: any) {
        const stateName = d.properties.NAME_1
        setHoveredState(stateName)
        if (onStateHover) onStateHover(stateName)
        
        d3.select(this)
          .attr('stroke', '#000')
          .attr('stroke-width', 2)
      })
      .on('mouseleave', function(this: SVGPathElement) {
        setHoveredState(null)
        if (onStateHover) onStateHover(null)
        
        d3.select(this)
          .attr('stroke', '#333')
          .attr('stroke-width', 0.8)
      })
    
    // Add state labels with suspected case numbers where count > 0
    svg.selectAll('text.state-label')
      .data(mapData.features)
      .enter()
      .append('text')
      .attr('class', 'state-label')
      .attr('transform', (d: any) => `translate(${pathGenerator.centroid(d)})`)
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .attr('font-weight', 'bold')
      .attr('fill', '#fff')
      .attr('pointer-events', 'none')
      .text((d: any) => {
        const stateName = d.properties.NAME_1
        const stateData = getStateData(stateName)
        
        // Show state name with suspected count if > 0
        if (stateData.suspected > 0) {
          return `${stateData.suspected}`
        }
        return ''
      })
      
    // Add a subtle shadow to make text more readable
    svg.selectAll('text.state-label')
      .each(function(this: SVGTextElement) {
        const text = d3.select(this)
        const shadow = text.clone()
          .attr('stroke', '#000')
          .attr('stroke-width', 2.5)
          .attr('stroke-linejoin', 'round')
          .attr('paint-order', 'stroke')
        
        // Insert shadow before the text (underneath)
        this.parentNode?.insertBefore(shadow.node() as Node, this)
      })
    
  }, [mapData, data, maxSuspected, onStateHover])
  
  const renderTooltip = (stateName: string) => {
    const stateData = getStateData(stateName)
    
    return (
      <div className="space-y-1">
        <p className="font-medium">{stateName}</p>
        <div className="text-sm">
          {isFullYear && selectedYear && (
            <div className="font-medium text-muted-foreground mb-1">{selectedYear}</div>
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
    <TooltipProvider>
      <div className="relative w-full h-[500px]">
        {hoveredState && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="absolute top-0 left-0 w-full h-full pointer-events-none" />
            </TooltipTrigger>
            <TooltipContent>
              {renderTooltip(hoveredState)}
            </TooltipContent>
          </Tooltip>
        )}
        <svg 
          ref={svgRef} 
          viewBox="0 0 800 800" 
          className="w-full h-full"
          preserveAspectRatio="xMidYMid meet"
        />
      </div>
    </TooltipProvider>
  )
}
