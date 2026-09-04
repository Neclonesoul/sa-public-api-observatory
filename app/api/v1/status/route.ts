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
          ces.resource_id,
          r.ecosystem_universe AS universe,
          ces.success,
          ces.http_status,
          ces.observed_at,

          ROW_NUMBER() OVER (
            PARTITION BY ces.resource_id
            ORDER BY ces.observed_at DESC
          ) AS rn

        FROM current_endpoint_state ces

        INNER JOIN endpoints e
          ON e.id = ces.endpoint_id

        INNER JOIN resources r
          ON r.id = ces.resource_id

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

        SUM(ds.measurements) AS sample_size,
        SUM(ds.successes) AS successes

      FROM daily_endpoint_stats ds

      INNER JOIN endpoints e
        ON e.id = ds.endpoint_id

      INNER JOIN resources r
        ON r.id = ds.resource_id

      WHERE
        e.enabled = 1
        AND ds.day >= date('now', '-29 days')

      GROUP BY r.ecosystem_universe
    `)
    .all<AvailabilityRow>();

  const latestFreshness = await db
    .prepare(`
      SELECT
        f.resource_id,
        r.ecosystem_universe AS universe,
        f.state,
        f.extracted_timestamp,
        f.observed_at,
        f.strategy

      FROM freshness_observations f

      INNER JOIN resources r
        ON r.id = f.resource_id

      WHERE
        f.id = (
          SELECT f2.id

          FROM freshness_observations f2

          WHERE f2.resource_id = f.resource_id

          ORDER BY f2.observed_at DESC

          LIMIT 1
        )
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
  }, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control":
        "public, max-age=60, s-maxage=120, stale-while-revalidate=60",
    },
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
