import { getDb } from "../../../../lib/cloudflare";

interface ChangeRow {
  id: string;
  resource_id: string;
  resource_name: string;
  endpoint_id: string;
  measurement_id: string;
  observed_at: string;
  change_type: string;
  previous_hash: string | null;
  current_hash: string;
}

export async function GET() {
  const db = getDb();

  const { results = [] } = await db
    .prepare(`
      SELECT
        c.id,
        c.resource_id,
        r.name AS resource_name,
        c.endpoint_id,
        c.measurement_id,
        c.observed_at,
        c.change_type,
        c.previous_hash,
        c.current_hash
      FROM resource_changes c
      INNER JOIN resources r
        ON r.id = c.resource_id
      ORDER BY c.observed_at DESC
      LIMIT 100
    `)
    .all<ChangeRow>();

  return Response.json(
    {
      data: results,
      total: results.length,
      note:
        "Changes are append-only structural observations derived from production schema signatures. Payload contents are not stored.",
    },
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
    },
  );
}
