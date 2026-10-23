import { handle, upstash } from './_handler'

// The Vercel Marketplace "Upstash for Redis" integration injects KV_REST_API_*;
// a manually created Upstash database uses UPSTASH_REDIS_REST_*. Accept either.
const redis = upstash(
  process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL,
  process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN,
)

export const GET = (req: Request) => handle(req, redis)
export const PUT = (req: Request) => handle(req, redis)
