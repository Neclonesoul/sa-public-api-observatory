import { assertSafeProbeUrl } from "../../../packages/monitor-core/src/url-safety";
import { shouldOpenIncident } from "../../../packages/monitor-core/src/status";

interface Env { DB: D1Database; MONITOR_LIMIT?: string }
interface Endpoint { id:string; resource_id:string; url:string; method:string; timeout_ms:number }

function classifyError(error:unknown){const m=error instanceof Error?error.message.toLowerCase():"";if(m.includes("timeout"))return"timeout";if(m.includes("tls"))return"tls";if(m.includes("dns"))return"dns";return"connection"}
async function sha256(value:string){const bytes=new TextEncoder().encode(value);const hash=await crypto.subtle.digest("SHA-256",bytes);return[...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,"0")).join("")}
function structuralShape(value:unknown):unknown{if(Array.isArray(value))return value.length?[structuralShape(value[0])]:[];if(value&&typeof value==="object")return Object.fromEntries(Object.entries(value as Record<string,unknown>).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>[k,structuralShape(v)]));return typeof value}

function resolveProbeUrl(endpoint: Endpoint): string {
  if (endpoint.id !== "ep-etenders-ocds") {
    return endpoint.url;
  }

  const today = new Date();
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

  const format = (value: Date) => value.toISOString().slice(0, 10);

  const url = new URL(endpoint.url);
  url.searchParams.set("dateFrom", format(yesterday));
  url.searchParams.set("dateTo", format(today));
  url.searchParams.set("PageNumber", "1");
  url.searchParams.set("PageSize", "1");

  return url.toString();
}


interface FreshnessResult {
  timestamp: string;
  state: "fresh" | "due" | "late" | "stale";
  strategy: string;
}

function classifyDailyFreshness(timestamp: string): FreshnessResult["state"] {
  const ageMs = Date.now() - new Date(timestamp).getTime();
  const ageDays = ageMs / 86_400_000;

  if (ageDays <= 2) return "fresh";
  if (ageDays <= 3) return "due";
  if (ageDays <= 7) return "late";
  return "stale";
}

function newestTimestamp(values: unknown[]): string | null {
  const timestamps = values
    .filter((value): value is string => typeof value === "string")
    .map((value) => new Date(value))
    .filter((value) => !Number.isNaN(value.getTime()))
    .sort((a, b) => b.getTime() - a.getTime());

  return timestamps[0]?.toISOString() ?? null;
}

function extractFreshness(
  endpoint: Endpoint,
  payload: unknown,
): FreshnessResult | null {
  if (endpoint.id === "ep-etenders-ocds") {
    if (!payload || typeof payload !== "object") return null;

    const releases = (payload as { releases?: unknown }).releases;
    if (!Array.isArray(releases)) return null;

    const timestamp = newestTimestamp(
      releases.map((release) =>
        release && typeof release === "object"
          ? (release as { date?: unknown }).date
          : null,
      ),
    );

    if (!timestamp) return null;

    return {
      timestamp,
      state: classifyDailyFreshness(timestamp),
      strategy: "ocds-release-date",
    };
  }

  if (
    endpoint.id === "ep-sarb-market-rates" ||
    endpoint.id === "ep-sarb-statistical-query"
  ) {
    if (!Array.isArray(payload)) return null;

    const timestamp = newestTimestamp(
      payload.map((item) =>
        item && typeof item === "object"
          ? (item as { Date?: unknown }).Date
          : null,
      ),
    );

    if (!timestamp) return null;

    return {
      timestamp,
      state: classifyDailyFreshness(timestamp),
      strategy: "sarb-indicator-date",
    };
  }

  return null;
}

async function probe(endpoint: Endpoint) {
  const url = assertSafeProbeUrl(resolveProbeUrl(endpoint));
  const started = performance.now();
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort("timeout"),
    Math.min(endpoint.timeout_ms, 15000),
  );

  try {
    const response = await fetch(url, {
      method: endpoint.method === "HEAD" ? "HEAD" : "GET",
      redirect: "manual",
      signal: controller.signal,
      headers: {
        "User-Agent": "SA-Public-API-Observatory/1.0",
        Accept: "application/json, application/xml, text/csv;q=0.8, */*;q=0.2",
      },
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (location) {
        assertSafeProbeUrl(new URL(location, url).toString());
      }
    }

    const reader = response.body?.getReader();
    let size = 0;
    const chunks: Uint8Array[] = [];

    while (reader) {
      const { done, value } = await reader.read();
      if (done) break;

      size += value.byteLength;

      if (size > 1_000_000) {
        await reader.cancel();
        break;
      }

      chunks.push(value);
    }

    const body = new TextDecoder().decode(
      chunks.reduce((all, chunk) => {
        const next = new Uint8Array(all.length + chunk.length);
        next.set(all);
        next.set(chunk, all.length);
        return next;
      }, new Uint8Array()),
    );

    const contentType = response.headers.get("content-type") ?? "";
    let validPayload = size > 20;
    let schemaHash: string | null = null;
    let freshness: FreshnessResult | null = null;

    if (contentType.includes("json")) {
      try {
        const parsed = JSON.parse(body);

        schemaHash = await sha256(
          JSON.stringify(structuralShape(parsed)),
        );

        freshness = extractFreshness(endpoint, parsed);
      } catch {
        validPayload = false;
      }
    }

    return {
      success: response.ok && validPayload,
      httpStatus: response.status,
      latencyMs: Math.round((performance.now() - started) * 10) / 10,
      responseBytes: size,
      contentType,
      validationResult: validPayload ? "valid" : "invalid-payload",
      errorClass: response.ok
        ? validPayload
          ? null
          : "invalid-payload"
        : `http-${Math.floor(response.status / 100)}xx`,
      payloadHash: await sha256(body),
      schemaHash,
      freshness,
    };
  } catch (error) {
    return {
      success: false,
      httpStatus: null,
      latencyMs: Math.round((performance.now() - started) * 10) / 10,
      responseBytes: null,
      contentType: null,
      validationResult: "request-failed",
      errorClass: classifyError(error),
      payloadHash: null,
      schemaHash: null,
      freshness: null,
    };
  } finally {
    clearTimeout(timer);
  }
}

interface RecentMeasurement {
  id: string;
  observed_at: string;
  success: number;
  http_status: number | null;
  validation_result: string;
  error_class: string | null;
}

interface OpenIncident {
  id: string;
}

function describeFailure(row: RecentMeasurement): string {
  if (row.error_class) return row.error_class;
  if (row.http_status !== null) return `http-${row.http_status}`;
  return row.validation_result || "unknown";
}

function isIncidentEligible(row: RecentMeasurement): boolean {
  // Authentication and rate-limiting are explicit operational states,
  // not transport outages.
  return !(
    row.http_status === 401 ||
    row.http_status === 403 ||
    row.http_status === 429
  );
}

async function updateIncidentLifecycle(
  env: Env,
  endpoint: Endpoint,
  measurementId: string,
) {
  const openIncident = await env.DB
    .prepare(
      "SELECT id FROM incidents WHERE endpoint_id = ? AND ended_at IS NULL ORDER BY started_at DESC LIMIT 1",
    )
    .bind(endpoint.id)
    .first<OpenIncident>();

  const { results = [] } = await env.DB
    .prepare(
      `SELECT
         id,
         observed_at,
         success,
         http_status,
         validation_result,
         error_class
       FROM measurements
       WHERE endpoint_id = ?
       ORDER BY observed_at DESC
       LIMIT 3`,
    )
    .bind(endpoint.id)
    .all<RecentMeasurement>();

  if (!results.length) return;

  const latest = results[0];

  // A genuinely successful probe closes an existing incident.
  if (latest.success === 1) {
    if (openIncident) {
      await env.DB
        .prepare(
          `UPDATE incidents
           SET ended_at = ?,
               recovery_observation = ?
           WHERE id = ?
             AND ended_at IS NULL`,
        )
        .bind(latest.observed_at, measurementId, openIncident.id)
        .run();
    }
    return;
  }

  // Auth-required and rate-limited observations remain measurements,
  // but must not create outage incidents.
  if (!isIncidentEligible(latest)) return;

  const failure = describeFailure(latest);

  // Once an incident is open, keep one incident per endpoint and append
  // the continuing failure state to that incident.
  if (openIncident) {
    await env.DB
      .prepare(
        `UPDATE incidents
         SET last_error = ?,
             probe_count = probe_count + 1
         WHERE id = ?
           AND ended_at IS NULL`,
      )
      .bind(failure, openIncident.id)
      .run();
    return;
  }

  // Convert newest-first database rows into chronological ProbeResults.
  const chronological = [...results].reverse().map((row) => ({
    observedAt: row.observed_at,
    success: row.success === 1,
    httpStatus: row.http_status,
    validPayload: row.validation_result === "valid",
    errorClass: row.error_class,
  }));

  if (!shouldOpenIncident(chronological)) return;

  // All three observations must also be outage-eligible. This prevents
  // authentication/rate-limit responses from becoming outage incidents.
  if (!results.every(isIncidentEligible)) return;

  const oldestFailure = results[results.length - 1];
  const firstError = describeFailure(oldestFailure);

  await env.DB
    .prepare(
      `INSERT INTO incidents (
         id,
         resource_id,
         endpoint_id,
         started_at,
         ended_at,
         classification,
         first_error,
         last_error,
         probe_count,
         recovery_observation
       )
       VALUES (?, ?, ?, ?, NULL, ?, ?, ?, ?, NULL)`,
    )
    .bind(
      crypto.randomUUID(),
      endpoint.resource_id,
      endpoint.id,
      oldestFailure.observed_at,
      "transport-outage",
      firstError,
      failure,
      results.length,
    )
    .run();
}

async function run(env: Env) {
  const limit = Math.min(
    25,
    Math.max(1, Number(env.MONITOR_LIMIT ?? 10)),
  );

  const { results = [] } = await env.DB
    .prepare(
      "SELECT id, resource_id, url, method, timeout_ms FROM endpoints WHERE enabled = 1 ORDER BY id LIMIT ?",
    )
    .bind(limit)
    .all<Endpoint>();

  const concurrency = Math.min(4, Math.max(1, results.length));
  let cursor = 0;
  let completed = 0;

  async function worker() {
    while (true) {
      const index = cursor++;
      if (index >= results.length) return;

      const endpoint = results[index];
      const result = await probe(endpoint);

      const id = crypto.randomUUID();
      const observedAt = new Date().toISOString();

      await env.DB
        .prepare(
          "INSERT INTO measurements (id, endpoint_id, observed_at, success, http_status, latency_ms, response_bytes, content_type, validation_result, error_class, payload_hash, schema_hash, freshness_timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(
          id,
          endpoint.id,
          observedAt,
          result.success ? 1 : 0,
          result.httpStatus,
          result.latencyMs,
          result.responseBytes,
          result.contentType,
          result.validationResult,
          result.errorClass,
          result.payloadHash,
          result.schemaHash,
          result.freshness?.timestamp ?? null,
        )
        .run();

      if (result.success && result.freshness) {
        await env.DB
          .prepare(
            `INSERT INTO freshness_observations (
               id,
               resource_id,
               observed_at,
               state,
               extracted_timestamp,
               strategy
             )
             VALUES (?, ?, ?, ?, ?, ?)`,
          )
          .bind(
            crypto.randomUUID(),
            endpoint.resource_id,
            observedAt,
            result.freshness.state,
            result.freshness.timestamp,
            result.freshness.strategy,
          )
          .run();
      }

      await updateIncidentLifecycle(env, endpoint, id);

      completed++;
    }
  }

  await Promise.all(
    Array.from({ length: concurrency }, () => worker()),
  );

  await env.DB
    .prepare(
      "INSERT INTO system_state (key,value,updated_at) VALUES ('last_monitor_cycle',?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at",
    )
    .bind(
      JSON.stringify({
        completed,
        concurrency,
      }),
      new Date().toISOString(),
    )
    .run();

  return {
    completed,
    concurrency,
  };
}

const monitorWorker={async scheduled(_controller:ScheduledController,env:Env,ctx:ExecutionContext){ctx.waitUntil(run(env))},async fetch(request:Request,env:Env){if(new URL(request.url).pathname!=="/health")return new Response("Not found",{status:404});const row=await env.DB.prepare("SELECT value,updated_at FROM system_state WHERE key='last_monitor_cycle'").first();return Response.json({service:"monitor",last_cycle:row??null})}};
export default monitorWorker;
