import { NextResponse } from "next/server"

const ALLOWED_ORIGIN = "https://ncdc.gov.ng"
const ALLOWED_PREFIX = "/themes/common/files/sitreps/"
const PDF_FETCH_TIMEOUT_MS = 8000
const MAX_PDF_BYTES = 20 * 1024 * 1024

function isAllowedUrl(rawUrl: string) {
  try {
    const parsed = new URL(rawUrl)
    if (parsed.origin !== ALLOWED_ORIGIN) return false
    if (!parsed.pathname.startsWith(ALLOWED_PREFIX)) return false
    return true
  } catch {
    return false
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const target = searchParams.get("url")

  if (!target || !isAllowedUrl(target)) {
    return NextResponse.json({ error: "Invalid PDF URL" }, { status: 400 })
  }

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), PDF_FETCH_TIMEOUT_MS)
    const response = await fetch(target, { signal: controller.signal })
    clearTimeout(timeoutId)

    if (!response.ok) {
      return NextResponse.json({ error: "Failed to fetch PDF" }, { status: 502 })
    }

    const contentLengthHeader = response.headers.get("content-length")
    if (contentLengthHeader) {
      const contentLength = Number(contentLengthHeader)
      if (Number.isFinite(contentLength) && contentLength > MAX_PDF_BYTES) {
        return NextResponse.json({ error: "PDF is too large" }, { status: 413 })
      }
    }

    const contentType = response.headers.get("content-type") ?? "application/pdf"
    const arrayBuffer = await readWithLimit(response, MAX_PDF_BYTES)

    return new Response(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
      },
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return NextResponse.json({ error: "PDF fetch timed out" }, { status: 504 })
    }
    console.error("PDF proxy error:", error)
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 })
  }
}

async function readWithLimit(response: Response, maxBytes: number) {
  const reader = response.body?.getReader()
  if (!reader) {
    const buffer = await response.arrayBuffer()
    if (buffer.byteLength > maxBytes) {
      throw new Error("PDF exceeds size limit")
    }
    return buffer
  }

  const chunks: Uint8Array[] = []
  let received = 0

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    if (value) {
      received += value.byteLength
      if (received > maxBytes) {
        reader.cancel().catch(() => {})
        throw new Error("PDF exceeds size limit")
      }
      chunks.push(value)
    }
  }

  const buffer = new Uint8Array(received)
  let offset = 0
  for (const chunk of chunks) {
    buffer.set(chunk, offset)
    offset += chunk.byteLength
  }
  return buffer.buffer
}
