import { resources } from "../../../../packages/catalogue/src/catalogue";
import { getDb } from "../../../../lib/cloudflare";

interface LatestRow {
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

export async function GET() {
  const db = getDb();

  const latest = await db
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
    .all<LatestRow>();

  const availability = await db
    .prepare(`
      SELECT
        r.ecosystem_universe AS universe,
        COUNT(*) AS sample_size,
        SUM(CASE WHEN m.success = 1 THEN 1 ELSE 0 END) AS successes
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

  return Response.json({
    public_infrastructure: summarise(
      "public-infrastructure",
      latest.results ?? [],
      availability.results ?? [],
    ),
    ecosystem: summarise(
      "za-api-ecosystem",
      latest.results ?? [],
      availability.results ?? [],
    ),
    measurement_notice:
      "Status is derived from observed production measurements. No historical measurements have been invented.",
  });
}

function summarise(
  universe: string,
  latest: LatestRow[],
  availability: AvailabilityRow[],
) {
  const catalogueResources = resources.filter(
    (resource) => resource.universe === universe,
  );

  const observed = latest.filter((row) => row.universe === universe);

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
  };
}
