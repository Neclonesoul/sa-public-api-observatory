import {
  organisationById,
  resourceBySlug,
} from "../../../../../packages/catalogue/src/catalogue";
import { getDb } from "../../../../../lib/cloudflare";

interface LatestMeasurement {
  endpoint_id: string;
  observed_at: string;
  success: number;
  http_status: number | null;
  latency_ms: number | null;
  validation_result: string;
  error_class: string | null;
}

interface AvailabilityRow {
  measurements: number;
  successes: number;
}

interface FreshnessRow {
  observed_at: string;
  state: string;
  extracted_timestamp: string | null;
  strategy: string;
}

interface IncidentRow {
  id: string;
  endpoint_id: string;
  started_at: string;
  ended_at: string | null;
  classification: string;
  first_error: string;
  last_error: string;
  probe_count: number;
  recovery_observation: string | null;
}

export async function GET(
  _: Request,
  {
    params,
  }: {
    params: Promise<{ id: string }>;
  },
) {
  const { id } = await params;
  const resource = resourceBySlug[id];

  if (!resource) {
    return Response.json(
      {
        error: {
          code: "resource_not_found",
          message: "No verified resource has that stable identifier.",
        },
      },
      {
        status: 404,
        headers: {
          "Access-Control-Allow-Origin": "*",
        "Cache-Control":
          "public, max-age=60, s-maxage=120, stale-while-revalidate=60",
        },
      },
    );
  }

  const db = getDb();

  const latestTransport = await db
    .prepare(`
      SELECT
        ces.endpoint_id,
        ces.observed_at,
        ces.success,
        ces.http_status,
        ces.latency_ms,
        ces.validation_result,
        ces.error_class

      FROM current_endpoint_state ces

      INNER JOIN endpoints e
        ON e.id = ces.endpoint_id

      WHERE
        ces.resource_id = ?
        AND e.enabled = 1

      ORDER BY ces.observed_at DESC

      LIMIT 1
    `)
    .bind(resource.id)
    .first<LatestMeasurement>();

  const availability = await db
    .prepare(`
      SELECT
        COALESCE(SUM(ds.measurements), 0) AS measurements,
        COALESCE(SUM(ds.successes), 0) AS successes

      FROM daily_endpoint_stats ds

      INNER JOIN endpoints e
        ON e.id = ds.endpoint_id

      WHERE
        ds.resource_id = ?
        AND e.enabled = 1
        AND ds.day >= date('now', '-29 days')
    `)
    .bind(resource.id)
    .first<AvailabilityRow>();

  const freshness = await db
    .prepare(`
      SELECT
        observed_at,
        state,
        extracted_timestamp,
        strategy
      FROM freshness_observations
      WHERE resource_id = ?
      ORDER BY observed_at DESC
      LIMIT 1
    `)
    .bind(resource.id)
    .first<FreshnessRow>();

  const { results: incidents = [] } = await db
    .prepare(`
      SELECT
        id,
        endpoint_id,
        started_at,
        ended_at,
        classification,
        first_error,
        last_error,
        probe_count,
        recovery_observation
      FROM incidents
      WHERE resource_id = ?
      ORDER BY
        CASE WHEN ended_at IS NULL THEN 0 ELSE 1 END,
        started_at DESC
      LIMIT 20
    `)
    .bind(resource.id)
    .all<IncidentRow>();

  const sampleSize = Number(
    availability?.measurements ?? 0,
  );

  const successes = Number(
    availability?.successes ?? 0,
  );

  const availability30d =
    sampleSize > 0
      ? Math.round((successes / sampleSize) * 10000) / 100
      : null;

  const activeIncidents = incidents.filter(
    (incident) => incident.ended_at === null,
  );

  const observability = {
    latest_transport: latestTransport
      ? {
          endpoint_id: latestTransport.endpoint_id,
          observed_at: latestTransport.observed_at,
          success: latestTransport.success === 1,
          http_status: latestTransport.http_status,
          latency_ms: latestTransport.latency_ms,
          validation_result:
            latestTransport.validation_result,
          error_class: latestTransport.error_class,
        }
      : null,

    availability_30d: availability30d,

    observation_evidence: {
      transport_measurements_30d: sampleSize,
    },

    freshness: freshness
      ? {
          state: freshness.state,
          observed_at: freshness.observed_at,
          extracted_timestamp:
            freshness.extracted_timestamp,
          strategy: freshness.strategy,
        }
      : {
          state: "unknown",
          observed_at: null,
          extracted_timestamp: null,
          strategy: null,
        },

    active_incidents: activeIncidents.length,

    incident_history: incidents.map((incident) => ({
      id: incident.id,
      endpoint_id: incident.endpoint_id,
      state:
        incident.ended_at === null
          ? "open"
          : "resolved",
      classification: incident.classification,
      started_at: incident.started_at,
      ended_at: incident.ended_at,
      first_error: incident.first_error,
      last_error: incident.last_error,
      probe_count: incident.probe_count,
      recovery_observation:
        incident.recovery_observation,
    })),

    note:
      "Transport, freshness, availability and incidents are derived from observed production evidence. Unknown values are not inferred.",
  };

  return Response.json(
    {
      ...resource,
      organisation:
        organisationById[resource.organisationId],
      observability,
    },
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
    },
  );
}
