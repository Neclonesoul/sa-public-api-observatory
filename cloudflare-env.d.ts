interface Fetcher { fetch(request: Request): Promise<Response> }
interface D1Result<T=unknown> { results?: T[]; success?: boolean; meta?: unknown }
interface D1PreparedStatement { bind(...values: unknown[]): D1PreparedStatement; run<T=unknown>(): Promise<D1Result<T>>; all<T=unknown>(): Promise<D1Result<T>>; first<T=Record<string,unknown>>(): Promise<T|null> }
interface D1Database { prepare(query: string): D1PreparedStatement; batch<T=unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]> }
interface ScheduledController { scheduledTime: number; cron: string }
interface ExecutionContext { waitUntil(promise: Promise<unknown>): void; passThroughOnException(): void }
declare module "cloudflare:workers" { export const env: { DB: D1Database; BUCKET?: unknown } }
