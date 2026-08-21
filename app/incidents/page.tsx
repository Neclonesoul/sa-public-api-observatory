import { getDb } from "../../lib/cloudflare";
import { PageHeader, SiteShell } from "../../components/SiteShell";

export const dynamic = "force-dynamic";

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
}

function formatDate(value: string | null) {
  if (!value) return "Ongoing";
  return new Date(value).toLocaleString("en-ZA", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Johannesburg",
  });
}

function duration(startedAt: string, endedAt: string | null) {
  const start = new Date(startedAt).getTime();
  const end = endedAt ? new Date(endedAt).getTime() : Date.now();
  const minutes = Math.max(0, Math.floor((end - start) / 60000));

  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;

  return remaining ? `${hours}h ${remaining}m` : `${hours}h`;
}

export default async function Page() {
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
        i.probe_count
      FROM incidents i
      INNER JOIN resources r
        ON r.id = i.resource_id
      ORDER BY
        CASE WHEN i.ended_at IS NULL THEN 0 ELSE 1 END,
        i.started_at DESC
      LIMIT 100
    `)
    .all<IncidentRow>();

  const open = results.filter((incident) => incident.ended_at === null);
  const resolved = results.filter((incident) => incident.ended_at !== null);

  return (
    <SiteShell>
      <PageHeader
        eyebrow="INCIDENT HISTORY"
        title="Incidents"
        description="Sustained transport failures derived from production observations. Three consecutive failed probes are required before an incident opens."
      />

      <div className="page-wrap">
        <section className="summary public-summary">
          <div className="metrics">
            <div>
              <strong>{open.length}</strong>
              <span>Active incidents</span>
            </div>
            <div>
              <strong>{resolved.length}</strong>
              <span>Resolved incidents</span>
            </div>
            <div>
              <strong>{results.length}</strong>
              <span>Total observed incidents</span>
            </div>
            <div>
              <strong>3</strong>
              <span>Failure threshold</span>
            </div>
          </div>
        </section>

        {results.length === 0 ? (
          <div className="empty-state">
            No incident has met the three-consecutive-failure threshold yet.
            Measurements continue to accumulate every 15 minutes.
          </div>
        ) : (
          <section className="home-section">
            <div className="section-heading">
              <div>
                <p className="eyebrow">LIVE INCIDENT LOG</p>
                <h2>Observed infrastructure incidents</h2>
              </div>
            </div>

            <div className="resource-grid">
              {results.map((incident) => {
                const isOpen = incident.ended_at === null;

                return (
                  <article className="resource-card" key={incident.id}>
                    <div>
                      <p className="eyebrow">
                        {isOpen ? "ACTIVE INCIDENT" : "RESOLVED"}
                      </p>

                      <h3>{incident.resource_name}</h3>

                      <p>
                        <code>{incident.endpoint_id}</code>
                      </p>
                    </div>

                    <dl>
                      <div>
                        <dt>State</dt>
                        <dd>{isOpen ? "Down" : "Recovered"}</dd>
                      </div>

                      <div>
                        <dt>Classification</dt>
                        <dd>{incident.classification}</dd>
                      </div>

                      <div>
                        <dt>Started</dt>
                        <dd>{formatDate(incident.started_at)}</dd>
                      </div>

                      <div>
                        <dt>Ended</dt>
                        <dd>{formatDate(incident.ended_at)}</dd>
                      </div>

                      <div>
                        <dt>Duration</dt>
                        <dd>{duration(incident.started_at, incident.ended_at)}</dd>
                      </div>

                      <div>
                        <dt>Failed observations</dt>
                        <dd>{incident.probe_count}</dd>
                      </div>

                      <div>
                        <dt>First error</dt>
                        <dd>{incident.first_error}</dd>
                      </div>

                      <div>
                        <dt>Latest error</dt>
                        <dd>{incident.last_error}</dd>
                      </div>
                    </dl>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        <section className="prose-panel">
          <h2>Incident methodology</h2>
          <p>
            Individual failed measurements do not immediately become incidents.
            An incident opens only after three consecutive outage-eligible failed
            observations for the same endpoint. Authentication-required and
            rate-limited responses remain measurements but do not open transport
            outage incidents.
          </p>
          <p>
            Recovery is recorded on the first subsequent successful observation.
            Historical measurements are never rewritten.
          </p>
        </section>
      </div>
    </SiteShell>
  );
}
