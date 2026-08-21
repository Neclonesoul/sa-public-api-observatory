import { env } from "cloudflare:workers";

export function getDb(): D1Database {
  return env.DB as D1Database;
}

export function getBucket(): R2Bucket {
  return env.BUCKET as R2Bucket;
}
