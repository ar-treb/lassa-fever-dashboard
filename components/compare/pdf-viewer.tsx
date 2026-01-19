import { cn } from "@/lib/utils"

type PdfViewerProps = {
  pdfUrl: string | null
  title?: string
  className?: string
}

export function PdfViewer({ pdfUrl, title = "NCDC report PDF", className }: PdfViewerProps) {
  if (!pdfUrl) {
    return (
      <div className={cn("flex h-full items-center justify-center text-sm text-muted-foreground", className)}>
        No PDF available for the selected report.
      </div>
    )
  }

  const proxiedUrl = `/api/pdf?url=${encodeURIComponent(pdfUrl)}`
  const viewerUrl = `${proxiedUrl}#page=4&navpanes=0&toolbar=0`

  return (
    <div className={cn("flex h-full flex-col gap-2", className)}>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Source PDF</span>
        <a href={pdfUrl} target="_blank" rel="noreferrer" className="underline underline-offset-4">
          Open in new tab
        </a>
      </div>
      <iframe title={title} src={viewerUrl} className="h-full min-h-[640px] w-full rounded-md border" />
    </div>
  )
}
