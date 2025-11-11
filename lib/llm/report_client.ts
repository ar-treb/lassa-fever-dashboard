import type { LassaSummary } from "../reports"
import {
  buildReportPrompt,
  DEFAULT_REPORT_SCHEMA_VERSION,
  type ReportPromptOptions,
  type ReportSections,
} from "./report_template"

export type ReportLLMProvider = "openai" | "gemini"

export interface GenerateReportResult {
  provider: ReportLLMProvider
  sections: ReportSections
  rawText: string
}

export class ReportGenerationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ReportGenerationError"
  }
}

export function resolveProviderFromEnv(): ReportLLMProvider {
  const provider = process.env.REPORT_LLM_PROVIDER?.toLowerCase()

  if (provider === "gemini" || provider === "openai") {
    return provider
  }

  return "openai"
}

function getOpenAIConfig() {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new ReportGenerationError("OPENAI_API_KEY is not configured")
  }

  return {
    apiKey,
    model: process.env.REPORT_OPENAI_MODEL ?? "gpt-5-mini",
  }
}

function getGeminiConfig() {
  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_GEMINI_API_KEY
  if (!apiKey) {
    throw new ReportGenerationError("GEMINI_API_KEY is not configured")
  }

  return {
    apiKey,
    model: process.env.REPORT_GEMINI_MODEL ?? "gemini-2.5-flash",
  }
}

function parseSections(raw: string, fallback: ReportSections): ReportSections {
  try {
    const parsed = JSON.parse(raw)

    if (
      typeof parsed === "object" &&
      parsed !== null &&
      typeof parsed.overview === "string"
    ) {
      return {
        schemaVersion:
          typeof parsed.schemaVersion === "number" ? parsed.schemaVersion : fallback.schemaVersion ?? DEFAULT_REPORT_SCHEMA_VERSION,
        overview: parsed.overview,
        keyFindings: normalizeStringArray(parsed.keyFindings, fallback.keyFindings),
        trends: normalizeStringArray(parsed.trends, fallback.trends),
        recommendations: normalizeStringArray(parsed.recommendations, fallback.recommendations),
        dataQuality: normalizeStringArray(parsed.dataQuality, fallback.dataQuality ?? []),
        hotspots: normalizeStringArray(parsed.hotspots, fallback.hotspots ?? []),
        risks: normalizeStringArray(parsed.risks, fallback.risks ?? []),
      }
    }
  } catch (_error) {
    throw new ReportGenerationError("Model response could not be parsed as structured JSON")
  }

  throw new ReportGenerationError("Model response is missing required fields")
}

async function generateWithOpenAI(prompt: string) {
  const { apiKey, model } = getOpenAIConfig()
  const { OpenAI } = await import("openai")

  const client = new OpenAI({ apiKey })
  const response = await (client as any).responses.create({
    model,
    input: prompt,
    temperature: 0.2,
    max_output_tokens: 1200,
    response_format: { type: "json_object" },
  })

  const rawText = response.output_text?.trim()

  if (!rawText) {
    throw new ReportGenerationError("OpenAI returned an empty response")
  }

  return rawText
}

async function generateWithGemini(prompt: string) {
  const { apiKey, model } = getGeminiConfig()
  const { GoogleGenerativeAI } = await import("@google/generative-ai")

  const genAI = new GoogleGenerativeAI(apiKey)
  const generativeModel = genAI.getGenerativeModel({
    model,
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 4096,
      responseMimeType: "application/json",
    },
  })

  const result = await generativeModel.generateContent(prompt)
  const candidateFragments: string[] =
    result.response?.candidates?.map((candidate) => {
      const content = Array.isArray(candidate.content)
        ? candidate.content
        : candidate.content
          ? [candidate.content]
          : []

      return content
        .map((part: unknown) => {
          if (typeof part === "string") return part
          if (typeof part === "object" && part !== null && "text" in part) {
            const textValue = (part as { text?: unknown }).text
            return typeof textValue === "string" ? textValue : ""
          }
          return ""
        })
        .join("")
    }) ?? []

  const fallbackText = candidateFragments.join("").trim()

  const rawText = result.response?.text()?.trim() ?? fallbackText

  if (!rawText) {
    const finishReason = result.response?.candidates?.[0]?.finishReason ?? "unknown"
    throw new ReportGenerationError(`Gemini returned an empty response (finish reason: ${finishReason})`)
  }

  return rawText
}

export async function generateStructuredReport(
  summary: LassaSummary,
  options: ReportPromptOptions
): Promise<GenerateReportResult> {
  const provider = resolveProviderFromEnv()
  const { prompt, expectedStructure, schemaVersion } = buildReportPrompt(summary, options)

  let rawText: string

  if (provider === "openai") {
    rawText = await generateWithOpenAI(prompt)
  } else {
    rawText = await generateWithGemini(prompt)
  }

  const sections = parseSections(rawText, expectedStructure)

  return {
    provider,
    sections: {
      schemaVersion: sections.schemaVersion ?? schemaVersion,
      overview: sections.overview || expectedStructure.overview,
      keyFindings: sections.keyFindings?.length ? sections.keyFindings : expectedStructure.keyFindings,
      trends: sections.trends?.length ? sections.trends : expectedStructure.trends,
      recommendations: sections.recommendations?.length
        ? sections.recommendations
        : expectedStructure.recommendations,
      dataQuality: sections.dataQuality ?? expectedStructure.dataQuality,
      hotspots: sections.hotspots ?? expectedStructure.hotspots,
      risks: sections.risks ?? expectedStructure.risks,
    },
    rawText,
  }
}

function normalizeStringArray(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) {
    return fallback
  }

  const result = value
    .map((item) => (typeof item === "string" ? item.trim() : String(item ?? "")))
    .filter((item) => item.length > 0)

  return result.length > 0 ? result : fallback
}
