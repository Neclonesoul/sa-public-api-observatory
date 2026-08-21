import { env } from "cloudflare:workers";

export function getDb(): D1Database {
  return env.DB as D1Database;
}
