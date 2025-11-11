import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { ReportApiSuccess } from "@/lib/types/reports"
import { MetricCard } from "./metric-card"
import { SectionList } from "./section-list"

interface ReportResultCardProps {
  result: ReportApiSuccess & { coverageLabel?: string | null }
}

export function ReportResultCard({ result }: ReportResultCardProps) {
  const { summary, rangeLabel, report } = result

  return (
    <div className="space-y-6 pb-10">
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-col gap-1">
            <span>Summary metrics</span>
            <span className="text-sm font-normal text-muted-foreground">
              {summary.state} · {rangeLabel}
            </span>
            {result.coverageLabel ? (
              <span className="text-xs font-normal text-muted-foreground">{result.coverageLabel}</span>
            ) : null}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <MetricCard
              label="Confirmed cases"
              value={summary.totals.confirmed}
              delta={summary.deltas.confirmed}
              average={summary.averages.confirmed}
            />
            <MetricCard
              label="Suspected cases"
              value={summary.totals.suspected}
              delta={summary.deltas.suspected}
              average={summary.averages.suspected}
            />
            <MetricCard
              label="Deaths"
              value={summary.totals.deaths}
              delta={summary.deltas.deaths}
              average={summary.averages.deaths}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center justify-between gap-2">
            <span>Generated narrative</span>
            <span className="text-sm font-normal text-muted-foreground">Generated with: {report.provider}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <section className="space-y-2">
            <h3 className="text-lg font-semibold">Overview</h3>
            <p className="text-muted-foreground leading-relaxed">{report.sections.overview}</p>
          </section>

          <SectionList title="Key findings" items={report.sections.keyFindings} />
          <SectionList title="Trends" items={report.sections.trends} />
          <SectionList title="Recommendations" items={report.sections.recommendations} />
        </CardContent>
      </Card>
    </div>
  )
}

