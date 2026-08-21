import { getDb } from "../../../../lib/cloudflare";

interface IncidentRow {
  id: string;
  resource_id: string;
  endpoint_id: string;
  resource_name: string;
  started_at: string;
  ended_at: string | null;
  classification: string;
  first_error: string;
  last_error: string;
  probe_count: number;
  recovery_observation: string | null;
}

export async function GET() {
  const db = getDb();

  const { results = [] } = await db
    .prepare(`
      SELECT
        i.id,
        i.resource_id,
        i.endpoint_id,
        r.name AS resource_name,
        i.started_at,
        i.ended_at,
        i.classification,
        i.first_error,
        i.last_error,
        i.probe_count,
        i.recovery_observation
      FROM incidents i
      INNER JOIN resources r
        ON r.id = i.resource_id
      ORDER BY i.started_at DESC
      LIMIT 100
    `)
    .all<IncidentRow>();

  return Response.json({
    data: results.map((incident) => ({
      id: incident.id,
      resource_id: incident.resource_id,
      endpoint_id: incident.endpoint_id,
      resource_name: incident.resource_name,
      state: incident.ended_at === null ? "open" : "resolved",
      classification: incident.classification,
      started_at: incident.started_at,
      ended_at: incident.ended_at,
      first_error: incident.first_error,
      last_error: incident.last_error,
      probe_count: incident.probe_count,
      recovery_observation: incident.recovery_observation,
    })),
    total: results.length,
    open: results.filter((incident) => incident.ended_at === null).length,
    resolved: results.filter((incident) => incident.ended_at !== null).length,
    note:
      results.length === 0
        ? "No observed incidents have met the production incident threshold."
        : "Incidents are derived exclusively from production observations.",
  });
}
