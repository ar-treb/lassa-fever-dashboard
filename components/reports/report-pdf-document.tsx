import { Document, Page, Text, View, StyleSheet, Font, Image } from "@react-pdf/renderer"
import type { ReportApiSuccess } from "@/lib/types/reports"
import { formatNumber, formatDelta } from "@/lib/utils"

interface ReportPDFDocumentProps {
  result: ReportApiSuccess & { coverageLabel?: string | null }
  dateRange: string
  statesLabel: string
  focusLabel: string
  chartImage?: string
}

// Define styles for PDF
const styles = StyleSheet.create({
  page: {
    padding: 35,
    fontSize: 8,
    fontFamily: "Helvetica",
    lineHeight: 1.3,
  },
  header: {
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    borderBottomStyle: "solid",
    paddingBottom: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 3,
    color: "#111827",
  },
  subtitle: {
    fontSize: 8,
    color: "#6b7280",
    marginBottom: 2,
  },
  section: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: "bold",
    marginBottom: 5,
    color: "#374151",
  },
  filtersGrid: {
    display: "flex",
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
    paddingTop: 6,
    paddingBottom: 6,
    backgroundColor: "#f9fafb",
    padding: 8,
    borderRadius: 3,
  },
  filterItem: {
    flex: 1,
  },
  filterLabel: {
    fontSize: 7,
    color: "#6b7280",
    marginBottom: 2,
    textTransform: "uppercase",
    fontWeight: "bold",
  },
  filterValue: {
    fontSize: 8,
    color: "#111827",
  },
  metricsGrid: {
    display: "flex",
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  metricCard: {
    flex: 1,
    padding: 8,
    backgroundColor: "#f9fafb",
    borderRadius: 3,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderStyle: "solid",
  },
  metricLabel: {
    fontSize: 7,
    color: "#6b7280",
    marginBottom: 3,
    textTransform: "uppercase",
    fontWeight: "bold",
  },
  metricValue: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 3,
  },
  metricDetails: {
    fontSize: 7,
    color: "#6b7280",
    marginTop: 1,
  },
  narrativeSection: {
    marginBottom: 6,
  },
  narrativeTitle: {
    fontSize: 9,
    fontWeight: "bold",
    marginBottom: 3,
    color: "#374151",
  },
  narrativeText: {
    fontSize: 8,
    color: "#4b5563",
    lineHeight: 1.3,
    marginBottom: 5,
  },
  listItem: {
    fontSize: 8,
    color: "#4b5563",
    marginBottom: 1.5,
    paddingLeft: 10,
    lineHeight: 1.2,
  },
  bulletPoint: {
    position: "absolute",
    left: 0,
  },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 45,
    right: 45,
    fontSize: 7.5,
    color: "#9ca3af",
    textAlign: "center",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    borderTopStyle: "solid",
    paddingTop: 6,
  },
  providerBadge: {
    fontSize: 7,
    color: "#6b7280",
    marginTop: 2,
    marginBottom: 4,
  },
  chartImage: {
    width: "100%",
    height: 200,
    marginTop: 6,
    marginBottom: 8,
    objectFit: "contain",
  },
})

export function ReportPDFDocument({ result, dateRange, statesLabel, focusLabel, chartImage }: ReportPDFDocumentProps) {
  const { summary, rangeLabel, report } = result

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Lassa Fever Surveillance Report</Text>
          <Text style={styles.subtitle}>
            {summary.state} · {rangeLabel}
          </Text>
          {result.coverageLabel && <Text style={styles.subtitle}>{result.coverageLabel}</Text>}
        </View>

        {/* Filters Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Report Parameters</Text>
          <View style={styles.filtersGrid}>
            <View style={styles.filterItem}>
              <Text style={styles.filterLabel}>Date Range</Text>
              <Text style={styles.filterValue}>{dateRange}</Text>
            </View>
            <View style={styles.filterItem}>
              <Text style={styles.filterLabel}>Location</Text>
              <Text style={styles.filterValue}>{statesLabel}</Text>
            </View>
            <View style={styles.filterItem}>
              <Text style={styles.filterLabel}>Focus</Text>
              <Text style={styles.filterValue}>{focusLabel}</Text>
            </View>
          </View>
        </View>

        {/* Summary Metrics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Summary Metrics</Text>
          <View style={styles.metricsGrid}>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Confirmed Cases</Text>
              <Text style={styles.metricValue}>{formatNumber(summary.totals.confirmed)}</Text>
              <Text style={styles.metricDetails}>
                Week-over-week: {formatDelta(summary.deltas.confirmed)}
              </Text>
              <Text style={styles.metricDetails}>
                Avg per week: {formatNumber(summary.averages.confirmed)}
              </Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Suspected Cases</Text>
              <Text style={styles.metricValue}>{formatNumber(summary.totals.suspected)}</Text>
              <Text style={styles.metricDetails}>
                Week-over-week: {formatDelta(summary.deltas.suspected)}
              </Text>
              <Text style={styles.metricDetails}>
                Avg per week: {formatNumber(summary.averages.suspected)}
              </Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Deaths</Text>
              <Text style={styles.metricValue}>{formatNumber(summary.totals.deaths)}</Text>
              <Text style={styles.metricDetails}>
                Week-over-week: {formatDelta(summary.deltas.deaths)}
              </Text>
              <Text style={styles.metricDetails}>
                Avg per week: {formatNumber(summary.averages.deaths)}
              </Text>
            </View>
          </View>
        </View>

        {/* Generated Narrative */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Generated Narrative</Text>
          <Text style={styles.providerBadge}>Provider: {report.provider}</Text>

          {/* Overview */}
          <View style={styles.narrativeSection}>
            <Text style={styles.narrativeTitle}>Overview</Text>
            <Text style={styles.narrativeText}>{report.sections.overview}</Text>
          </View>

          {/* Key Findings */}
          {report.sections.keyFindings && report.sections.keyFindings.length > 0 && (
            <View style={styles.narrativeSection}>
              <Text style={styles.narrativeTitle}>Key Findings</Text>
              {report.sections.keyFindings.map((finding, index) => (
                <View key={index} style={{ position: "relative", marginBottom: 4 }}>
                  <Text style={styles.listItem}>• {finding}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Trends */}
          {report.sections.trends && report.sections.trends.length > 0 && (
            <View style={styles.narrativeSection}>
              <Text style={styles.narrativeTitle}>Trends</Text>
              {report.sections.trends.map((trend, index) => (
                <View key={index} style={{ position: "relative", marginBottom: 4 }}>
                  <Text style={styles.listItem}>• {trend}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Recommendations */}
          {report.sections.recommendations && report.sections.recommendations.length > 0 && (
            <View style={styles.narrativeSection}>
              <Text style={styles.narrativeTitle}>Recommendations</Text>
              {report.sections.recommendations.map((recommendation, index) => (
                <View key={index} style={{ position: "relative", marginBottom: 4 }}>
                  <Text style={styles.listItem}>• {recommendation}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Chart */}
        {chartImage && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Weekly Case Trend</Text>
            <Image src={chartImage} style={styles.chartImage} />
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text>
            Generated on {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()} · Lassa Fever
            Dashboard
          </Text>
        </View>
      </Page>
    </Document>
  )
}

