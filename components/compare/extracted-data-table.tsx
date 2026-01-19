import type { ReportComparisonRow } from "@/lib/data"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

type ExtractedDataTableProps = {
  rows: ReportComparisonRow[]
}

function formatValue(value: number | null) {
  return value === null ? "—" : value
}

export function ExtractedDataTable({ rows }: ExtractedDataTableProps) {
  if (rows.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        No extracted data available for this report.
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table className="table-fixed w-full text-xs">
        <TableHeader>
          <TableRow>
            <TableHead className="w-[140px] px-2 py-2">State</TableHead>
            <TableHead className="w-[80px] px-2 py-2 text-center">Suspected</TableHead>
            <TableHead className="w-[80px] px-2 py-2 text-center">Confirmed</TableHead>
            <TableHead className="w-[80px] px-2 py-2 text-center">Probable</TableHead>
            <TableHead className="w-[70px] px-2 py-2 text-center">HCW</TableHead>
            <TableHead className="w-[70px] px-2 py-2 text-center">Deaths</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, index) => (
            <TableRow key={`${row.state}-${index}`}>
              <TableCell className="px-2 py-2 font-medium leading-snug break-words">{row.state}</TableCell>
              <TableCell className="px-2 py-2 text-center">{formatValue(row.suspected)}</TableCell>
              <TableCell className="px-2 py-2 text-center">{formatValue(row.confirmed)}</TableCell>
              <TableCell className="px-2 py-2 text-center">{formatValue(row.probable)}</TableCell>
              <TableCell className="px-2 py-2 text-center">{formatValue(row.hcw)}</TableCell>
              <TableCell className="px-2 py-2 text-center">{formatValue(row.deaths)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
