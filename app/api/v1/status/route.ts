import { resources } from "../../../../packages/catalogue/src/catalogue";
import { getDb } from "../../../../lib/cloudflare";

interface LatestTransportRow {
  resource_id: string;
  universe: string;
  success: number;
  http_status: number | null;
  observed_at: string;
}

interface AvailabilityRow {
  universe: string;
  sample_size: number;
  successes: number;
}

interface LatestFreshnessRow {
  resource_id: string;
  universe: string;
  state: string;
  extracted_timestamp: string | null;
  observed_at: string;
  strategy: string;
}

export async function GET() {
  const db = getDb();

  const latestTransport = await db
    .prepare(`
      WITH ranked AS (
        SELECT
          e.resource_id,
          r.ecosystem_universe AS universe,
          m.success,
          m.http_status,
          m.observed_at,
          ROW_NUMBER() OVER (
            PARTITION BY e.resource_id
            ORDER BY m.observed_at DESC
          ) AS rn
        FROM endpoints e
        INNER JOIN resources r
          ON r.id = e.resource_id
        INNER JOIN measurements m
          ON m.endpoint_id = e.id
        WHERE e.enabled = 1
      )
      SELECT
        resource_id,
        universe,
        success,
        http_status,
        observed_at
      FROM ranked
      WHERE rn = 1
    `)
    .all<LatestTransportRow>();

  const availability = await db
    .prepare(`
      SELECT
        r.ecosystem_universe AS universe,
        COUNT(*) AS sample_size,
        SUM(
          CASE WHEN m.success = 1 THEN 1 ELSE 0 END
        ) AS successes
      FROM measurements m
      INNER JOIN endpoints e
        ON e.id = m.endpoint_id
      INNER JOIN resources r
        ON r.id = e.resource_id
      WHERE
        e.enabled = 1
        AND datetime(m.observed_at) >= datetime('now', '-30 days')
      GROUP BY r.ecosystem_universe
    `)
    .all<AvailabilityRow>();

  const latestFreshness = await db
    .prepare(`
      WITH ranked AS (
        SELECT
          f.resource_id,
          r.ecosystem_universe AS universe,
          f.state,
          f.extracted_timestamp,
          f.observed_at,
          f.strategy,
          ROW_NUMBER() OVER (
            PARTITION BY f.resource_id
            ORDER BY f.observed_at DESC
          ) AS rn
        FROM freshness_observations f
        INNER JOIN resources r
          ON r.id = f.resource_id
      )
      SELECT
        resource_id,
        universe,
        state,
        extracted_timestamp,
        observed_at,
        strategy
      FROM ranked
      WHERE rn = 1
    `)
    .all<LatestFreshnessRow>();

  return Response.json({
    public_infrastructure: summarise(
      "public-infrastructure",
      latestTransport.results ?? [],
      availability.results ?? [],
      latestFreshness.results ?? [],
    ),

    ecosystem: summarise(
      "za-api-ecosystem",
      latestTransport.results ?? [],
      availability.results ?? [],
      latestFreshness.results ?? [],
    ),

    measurement_notice:
      "Transport and freshness are derived independently from observed production measurements. No historical observations have been invented.",
  });
}

function summarise(
  universe: string,
  latestTransport: LatestTransportRow[],
  availability: AvailabilityRow[],
  latestFreshness: LatestFreshnessRow[],
) {
  const catalogueResources = resources.filter(
    (resource) => resource.universe === universe,
  );

  const observed = latestTransport.filter(
    (row) => row.universe === universe,
  );

  const monitoredResourceIds = new Set(
    observed.map((row) => row.resource_id),
  );

  const operational = observed.filter(
    (row) => row.success === 1,
  ).length;

  const down = observed.filter(
    (row) => row.success !== 1,
  ).length;

  const aggregate = availability.find(
    (row) => row.universe === universe,
  );

  const sampleSize = Number(aggregate?.sample_size ?? 0);
  const successes = Number(aggregate?.successes ?? 0);

  const freshnessRows = latestFreshness.filter(
    (row) => row.universe === universe,
  );

  const freshness = {
    observed: freshnessRows.length,
    fresh: freshnessRows.filter(
      (row) => row.state === "fresh",
    ).length,
    due: freshnessRows.filter(
      (row) => row.state === "due",
    ).length,
    late: freshnessRows.filter(
      (row) => row.state === "late",
    ).length,
    stale: freshnessRows.filter(
      (row) => row.state === "stale",
    ).length,
    unknown: Math.max(
      0,
      catalogueResources.length - freshnessRows.length,
    ),
  };

  return {
    resources: catalogueResources.length,
    monitored: monitoredResourceIds.size,
    operational,
    degraded: 0,
    down,
    unknown: Math.max(
      0,
      catalogueResources.length - monitoredResourceIds.size,
    ),
    availability_30d:
      sampleSize > 0
        ? Math.round((successes / sampleSize) * 10000) / 100
        : null,
    sample_size: sampleSize,
    freshness,
  };
}
