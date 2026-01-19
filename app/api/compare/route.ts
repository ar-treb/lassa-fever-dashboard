import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

import { createSupabaseClient } from "@/lib/supabase"

type ComparisonRow = {
  state: string
  suspected: number | null
  confirmed: number | null
  probable: number | null
  hcw: number | null
  deaths: number | null
}

function toInteger(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value)
    return Number.isNaN(parsed) ? null : parsed
  }
  return null
}

function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function normalizeYear(value: unknown) {
  const rawYear = toInteger(value)
  if (rawYear === null) return null
  const fullYear = rawYear >= 100 ? rawYear : 2000 + rawYear
  const shortYear = rawYear >= 100 ? rawYear % 100 : rawYear
  return { fullYear, shortYear }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const normalized = normalizeYear(body.year)
    const week = toInteger(body.week)

    if (!normalized || week === null) {
      return NextResponse.json({ error: "year and week are required" }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE ?? null
    const supabase =
      supabaseUrl && serviceRoleKey
        ? createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })
        : createSupabaseClient()

    const { data: websiteRows, error: websiteError } = await supabase
      .from("website_data")
      .select("id, link, year, week")
      .eq("year", normalized.shortYear)
      .eq("week", week)
      .order("id", { ascending: true })
      .limit(1)

    if (websiteError) {
      console.error("Error fetching report metadata:", websiteError)
      return NextResponse.json({ error: "Failed to fetch report metadata" }, { status: 500 })
    }

    const reportMeta = websiteRows?.[0] ?? null
    const reportId = reportMeta?.id ?? null
    const pdfUrl = reportMeta?.link ?? null

    let lassaQuery = supabase
      .from("lassa_data")
      .select("states, suspected, confirmed, probable, hcw, deaths, report_id, full_year, week")
      .neq("states", "Total")

    if (reportId) {
      lassaQuery = lassaQuery.eq("report_id", reportId)
    } else {
      lassaQuery = lassaQuery.eq("full_year", normalized.fullYear).eq("week", week)
    }

    const { data: lassaRows, error: lassaError } = await lassaQuery.order("states", { ascending: true })

    if (lassaError) {
      console.error("Error fetching extracted data:", lassaError)
      return NextResponse.json({ error: "Failed to fetch extracted data" }, { status: 500 })
    }

    const extractedData: ComparisonRow[] = (lassaRows ?? []).map((row) => ({
      state: row.states ?? "Unknown",
      suspected: toNullableNumber(row.suspected),
      confirmed: toNullableNumber(row.confirmed),
      probable: toNullableNumber(row.probable),
      hcw: toNullableNumber(row.hcw),
      deaths: toNullableNumber(row.deaths),
    }))

    return NextResponse.json({ pdfUrl, extractedData })
  } catch (error) {
    console.error("Unexpected error loading comparison data:", error)
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 })
  }
}
