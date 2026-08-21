import { getDb } from "../../lib/cloudflare";
import { PageHeader, SiteShell } from "../../components/SiteShell";

export const dynamic = "force-dynamic";

interface LatestMeasurement {
  resource_id: string;
  resource_name: string;
  endpoint_id: string;
  success: number;
  http_status: number | null;
  latency_ms: number | null;
  observed_at: string;
  error_class: string | null;
}

interface Summary {
  measurements: number;
  successes: number;
}

export default async function Page() {
  const db = getDb();

  const { results = [] } = await db.prepare(`
    WITH ranked AS (
      SELECT
        r.id AS resource_id,
        r.name AS resource_name,
        e.id AS endpoint_id,
        m.success,
        m.http_status,
        m.latency_ms,
        m.observed_at,
        m.error_class,
        ROW_NUMBER() OVER (
          PARTITION BY e.id
          ORDER BY m.observed_at DESC
        ) AS rn
      FROM endpoints e
      INNER JOIN resources r ON r.id = e.resource_id
      INNER JOIN measurements m ON m.endpoint_id = e.id
      WHERE
        e.enabled = 1
        AND r.ecosystem_universe = 'public-infrastructure'
    )
    SELECT *
    FROM ranked
    WHERE rn = 1
    ORDER BY resource_name
  `).all<LatestMeasurement>();

  const summary = await db.prepare(`
    SELECT
      COUNT(*) AS measurements,
      SUM(CASE WHEN m.success = 1 THEN 1 ELSE 0 END) AS successes
    FROM measurements m
    INNER JOIN endpoints e ON e.id = m.endpoint_id
    INNER JOIN resources r ON r.id = e.resource_id
    WHERE
      e.enabled = 1
      AND r.ecosystem_universe = 'public-infrastructure'
      AND datetime(m.observed_at) >= datetime('now', '-30 days')
  `).first<Summary>();

  const incidentRow = await db.prepare(`
    SELECT COUNT(*) AS count
    FROM incidents
    WHERE ended_at IS NULL
  `).first<{ count: number }>();

  const operational = results.filter((row) => row.success === 1).length;
  const down = results.filter((row) => row.success !== 1).length;
  const sampleSize = Number(summary?.measurements ?? 0);
  const successes = Number(summary?.successes ?? 0);
  const availability =
    sampleSize > 0
      ? Math.round((successes / sampleSize) * 10000) / 100
      : null;

  return (
    <SiteShell>
      <PageHeader
        eyebrow="OBSERVABILITY"
        title="National API Pulse"
        description="Live transport observations for monitored South African public data infrastructure."
      />

      <div className="page-wrap">
        <section className="summary public-summary">
          <div className="metrics">
            <div>
              <strong>{results.length}</strong>
              <span>Observed resources</span>
            </div>
            <div>
              <strong>{operational}</strong>
              <span>Operational</span>
            </div>
            <div>
              <strong>{down}</strong>
              <span>Currently failing</span>
            </div>
            <div>
              <strong>{Number(incidentRow?.count ?? 0)}</strong>
              <span>Active incidents</span>
            </div>
            <div>
              <strong>
                {availability === null ? "—" : `${availability}%`}
              </strong>
              <span>30d observed availability</span>
            </div>
            <div>
              <strong>{sampleSize}</strong>
              <span>Measurements</span>
            </div>
          </div>
        </section>

        <section className="home-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">LATEST OBSERVATION</p>
              <h2>Public infrastructure</h2>
            </div>
          </div>

          <div className="resource-grid">
            {results.map((row) => (
              <article className="resource-card" key={row.endpoint_id}>
                <div>
                  <p className="eyebrow">
                    {row.success === 1 ? "OPERATIONAL" : "FAILING"}
                  </p>
                  <h3>{row.resource_name}</h3>
                  <p><code>{row.endpoint_id}</code></p>
                </div>

                <dl>
                  <div>
                    <dt>HTTP</dt>
                    <dd>{row.http_status ?? "—"}</dd>
                  </div>
                  <div>
                    <dt>Latency</dt>
                    <dd>
                      {row.latency_ms === null
                        ? "—"
                        : `${Math.round(row.latency_ms)} ms`}
                    </dd>
                  </div>
                  <div>
                    <dt>Error</dt>
                    <dd>{row.error_class ?? "None"}</dd>
                  </div>
                  <div>
                    <dt>Observed</dt>
                    <dd>
                      {new Date(row.observed_at).toLocaleString("en-ZA", {
                        timeZone: "Africa/Johannesburg",
                      })}
                    </dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        </section>

        <section className="prose-panel">
          <h2>Interpretation</h2>
          <p>
            Individual measurements are append-only observations. A failing
            measurement does not automatically constitute an incident. Three
            consecutive outage-eligible failures are required before an incident
            opens.
          </p>
        </section>
      </div>
    </SiteShell>
  );
}
