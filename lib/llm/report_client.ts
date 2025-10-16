import type { LassaSummary } from "../reports"
import { buildReportPrompt, type ReportPromptOptions, type ReportSections } from "./report_template"

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
    model: process.env.REPORT_GEMINI_MODEL ?? "gemini-1.5-flash",
  }
}

function parseSections(raw: string): ReportSections {
  try {
    const parsed = JSON.parse(raw)

    if (
      typeof parsed === "object" &&
      parsed !== null &&
      typeof parsed.overview === "string" &&
      Array.isArray(parsed.keyFindings) &&
      Array.isArray(parsed.trends) &&
      Array.isArray(parsed.recommendations)
    ) {
      return {
        overview: parsed.overview,
        keyFindings: parsed.keyFindings.map(String),
        trends: parsed.trends.map(String),
        recommendations: parsed.recommendations.map(String),
      }
    }
  } catch (error) {
    throw new ReportGenerationError("Model response could not be parsed as structured JSON")
  }

  throw new ReportGenerationError("Model response is missing required fields")
}

async function generateWithOpenAI(prompt: string) {
  const { apiKey, model } = getOpenAIConfig()
  const { OpenAI } = await import("openai")

  const client = new OpenAI({ apiKey })
  const response = await client.responses.create({
    model,
    input: prompt,
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
      responseMimeType: "application/json",
    },
  })

  const result = await generativeModel.generateContent(prompt)
  const rawText = result.response?.text()?.trim()

  if (!rawText) {
    throw new ReportGenerationError("Gemini returned an empty response")
  }

  return rawText
}

export async function generateStructuredReport(
  summary: LassaSummary,
  options: ReportPromptOptions
): Promise<GenerateReportResult> {
  const provider = resolveProviderFromEnv()
  const { prompt, expectedStructure } = buildReportPrompt(summary, options)

  let rawText: string

  if (provider === "openai") {
    rawText = await generateWithOpenAI(prompt)
  } else {
    rawText = await generateWithGemini(prompt)
  }

  const sections = parseSections(rawText)

  return {
    provider,
    sections: {
      overview: sections.overview || expectedStructure.overview,
      keyFindings: sections.keyFindings?.length ? sections.keyFindings : expectedStructure.keyFindings,
      trends: sections.trends?.length ? sections.trends : expectedStructure.trends,
      recommendations: sections.recommendations?.length
        ? sections.recommendations
        : expectedStructure.recommendations,
    },
    rawText,
  }
}


