import { getDb } from "./cloudflare";

export interface LiveResourceState {
  operationalState:
    | "operational"
    | "down"
    | "auth-required"
    | "rate-limited"
    | "unknown";
  observedAt: string | null;
}

interface LatestRow {
  resource_id: string;
  success: number;
  http_status: number | null;
  observed_at: string;
}

export async function getLiveResourceStates() {
  const db = getDb();

  const { results = [] } = await db
    .prepare(`
      WITH ranked AS (
        SELECT
          e.resource_id,
          m.success,
          m.http_status,
          m.observed_at,
          ROW_NUMBER() OVER (
            PARTITION BY e.resource_id
            ORDER BY m.observed_at DESC
          ) AS rn
        FROM endpoints e
        INNER JOIN measurements m
          ON m.endpoint_id = e.id
        WHERE e.enabled = 1
      )
      SELECT
        resource_id,
        success,
        http_status,
        observed_at
      FROM ranked
      WHERE rn = 1
    `)
    .all<LatestRow>();

  return Object.fromEntries(
    results.map((row) => {
      let operationalState: LiveResourceState["operationalState"];

      if (row.http_status === 401 || row.http_status === 403) {
        operationalState = "auth-required";
      } else if (row.http_status === 429) {
        operationalState = "rate-limited";
      } else if (row.success === 1) {
        operationalState = "operational";
      } else {
        operationalState = "down";
      }

      return [
        row.resource_id,
        {
          operationalState,
          observedAt: row.observed_at,
        },
      ];
    }),
  ) as Record<string, LiveResourceState>;
}
