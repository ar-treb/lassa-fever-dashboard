import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

function loadEnvFile(relativePath) {
  const __dirname = path.dirname(fileURLToPath(import.meta.url))
  const projectRoot = path.resolve(__dirname, "..")
  const envPath = path.resolve(projectRoot, relativePath)

  if (!fs.existsSync(envPath)) {
    return
  }

  const contents = fs.readFileSync(envPath, "utf8")

  contents.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim()

    if (!trimmed || trimmed.startsWith("#")) {
      return
    }

    const [key, ...rest] = trimmed.split("=")
    if (!key || rest.length === 0) {
      return
    }

    const value = rest.join("=").trim().replace(/^['"]|['"]$/g, "")

    if (!process.env[key]) {
      process.env[key] = value
    }
  })
}

async function main() {
  loadEnvFile(".env")
  loadEnvFile(".env.local")

  const apiKey = process.env.GEMINI_API_KEY

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set. Please add it to your environment or .env.local file.")
  }

  const url = new URL("https://generativelanguage.googleapis.com/v1beta/models")
  url.searchParams.set("key", apiKey)
  url.searchParams.set("pageSize", "50")

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Failed to fetch models (${response.status}): ${text}`)
  }

  const payload = await response.json()
  const models = payload.models ?? []

  if (models.length === 0) {
    console.log("No models returned. Check that your API key has the necessary access.")
    return
  }

  console.log("Available Gemini models:\n")
  models.forEach((model) => {
    const id = model.name?.split("/").pop() ?? "<unknown>"
    const displayName = model.displayName ? ` (${model.displayName})` : ""
    console.log(`- ${id}${displayName}`)
  })
}

main().catch((error) => {
  console.error("Failed to list Gemini models:", error)
  process.exitCode = 1
})

