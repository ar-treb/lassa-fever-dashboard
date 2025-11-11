import { formatNumber, formatDelta } from "@/lib/utils"

interface MetricCardProps {
  label: string
  value: number
  delta: number
  average: number
}

export function MetricCard({ label, value, delta, average }: MetricCardProps) {
  const deltaLabel = formatDelta(delta)

  return (
    <div className="rounded-lg border bg-muted/40 p-4">
      <div className="space-y-1">
        <h3 className="text-sm font-medium text-muted-foreground">{label}</h3>
        <p className="text-2xl font-semibold">{formatNumber(value)}</p>
        <div className="text-sm text-muted-foreground">Week-over-week change: {deltaLabel}</div>
        <div className="text-sm text-muted-foreground">Average per reported week: {formatNumber(average, { maximumFractionDigits: 0 })}</div>
      </div>
    </div>
  )
}

