type RateLimitInput = {
  key: string
  limit: number
  windowSeconds: number
}

export type RateLimitResult = {
  allowed: boolean
  limit: number
  remaining: number
  resetAt: number
}

const memoryStore = new Map<string, { count: number; resetAt: number }>()

const upstashConfig = {
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
}

type UpstashResult<T> = { result?: T; error?: string }

function isUpstashConfigured() {
  return Boolean(upstashConfig.url && upstashConfig.token)
}

function normalizeKey(key: string) {
  return key.trim().replace(/\s+/g, "")
}

async function upstashRequest<T>(body: unknown): Promise<T> {
  if (!upstashConfig.url || !upstashConfig.token) {
    throw new Error("Upstash credentials are not configured")
  }

  const response = await fetch(upstashConfig.url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${upstashConfig.token}`,
    },
    body: JSON.stringify(body),
  })

  const payload = (await response.json()) as T

  if (!response.ok) {
    throw new Error(`Upstash request failed (${response.status})`)
  }

  return payload
}

async function upstashIncrement(key: string, windowSeconds: number) {
  const pipeline = (await upstashRequest<UpstashResult<number>[]>(
    [
      ["INCR", key],
      ["TTL", key],
    ]
  )) ?? []

  const count = Number(pipeline[0]?.result ?? 0)
  let ttl = Number(pipeline[1]?.result ?? -1)

  if (!Number.isFinite(ttl) || ttl < 0) {
    await upstashRequest<UpstashResult<number>>(["EXPIRE", key, windowSeconds])
    ttl = windowSeconds
  }

  return {
    count: Number.isFinite(count) ? count : 0,
    ttl: Number.isFinite(ttl) ? ttl : windowSeconds,
  }
}

function memoryRateLimit({ key, limit, windowSeconds }: RateLimitInput): RateLimitResult {
  const now = Date.now()
  const normalizedLimit = Math.max(1, Math.floor(limit))
  const windowMs = Math.max(1, Math.floor(windowSeconds * 1000))

  const existing = memoryStore.get(key)
  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowMs
    memoryStore.set(key, { count: 1, resetAt })
    return {
      allowed: true,
      limit: normalizedLimit,
      remaining: Math.max(0, normalizedLimit - 1),
      resetAt,
    }
  }

  const nextCount = existing.count + 1
  existing.count = nextCount

  return {
    allowed: nextCount <= normalizedLimit,
    limit: normalizedLimit,
    remaining: Math.max(0, normalizedLimit - nextCount),
    resetAt: existing.resetAt,
  }
}

export async function rateLimit(input: RateLimitInput): Promise<RateLimitResult> {
  const normalizedLimit = Math.max(1, Math.floor(input.limit))
  const normalizedWindow = Math.max(1, Math.floor(input.windowSeconds))
  const key = normalizeKey(input.key)

  if (isUpstashConfigured()) {
    try {
      const { count, ttl } = await upstashIncrement(key, normalizedWindow)
      const resetAt = Date.now() + ttl * 1000
      return {
        allowed: count <= normalizedLimit,
        limit: normalizedLimit,
        remaining: Math.max(0, normalizedLimit - count),
        resetAt,
      }
    } catch (error) {
      console.warn("Rate limit fallback to memory store:", error)
    }
  }

  return memoryRateLimit({ key, limit: normalizedLimit, windowSeconds: normalizedWindow })
}

export function getRateLimitHeaders(result: RateLimitResult) {
  return {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(Math.max(0, result.remaining)),
    "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
  }
}

export function getClientIp(request: Request) {
  const forwardedFor =
    request.headers.get("x-forwarded-for") ??
    request.headers.get("x-vercel-forwarded-for") ??
    ""
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown"
  }

  return (
    request.headers.get("x-real-ip") ??
    request.headers.get("cf-connecting-ip") ??
    "unknown"
  )
}
