import { NextResponse } from "next/server"

const ALLOWED_ORIGIN = "https://ncdc.gov.ng"
const ALLOWED_PREFIX = "/themes/common/files/sitreps/"

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
    const response = await fetch(target)

    if (!response.ok) {
      return NextResponse.json({ error: "Failed to fetch PDF" }, { status: 502 })
    }

    const contentType = response.headers.get("content-type") ?? "application/pdf"
    const arrayBuffer = await response.arrayBuffer()

    return new Response(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
      },
    })
  } catch (error) {
    console.error("PDF proxy error:", error)
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 })
  }
}
