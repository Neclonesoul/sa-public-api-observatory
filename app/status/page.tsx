import { getDb } from "../../lib/cloudflare";
import { resources } from "../../packages/catalogue/src/catalogue";
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

interface FreshnessRow {
  resource_id: string;
  state: "fresh" | "due" | "late" | "stale" | "unknown";
  extracted_timestamp: string | null;
  observed_at: string;
  strategy: string;
}

interface SummaryRow {
  measurements: number;
  successes: number;
}

function formatDate(value: string | null) {
  if (!value) return "—";

  return new Date(value).toLocaleString("en-ZA", {
    dateStyle: "medium",
    timeZone: "Africa/Johannesburg",
  });
}

function formatObservation(value: string) {
  return new Date(value).toLocaleString("en-ZA", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Johannesburg",
  });
}

function freshnessLabel(state: string) {
  switch (state) {
    case "fresh":
      return "FRESH";
    case "due":
      return "DUE";
    case "late":
      return "LATE";
    case "stale":
      return "STALE";
    default:
      return "UNKNOWN";
  }
}

export default async function Page() {
  const db = getDb();

  const { results = [] } = await db
    .prepare(`
      WITH ranked AS (
        SELECT
          ces.resource_id,
          r.name AS resource_name,
          ces.endpoint_id,
          ces.success,
          ces.http_status,
          ces.latency_ms,
          ces.observed_at,
          ces.error_class,

          ROW_NUMBER() OVER (
            PARTITION BY ces.resource_id
            ORDER BY ces.observed_at DESC
          ) AS rn

        FROM current_endpoint_state ces

        INNER JOIN endpoints e
          ON e.id = ces.endpoint_id

        INNER JOIN resources r
          ON r.id = ces.resource_id

        WHERE
          e.enabled = 1
          AND r.ecosystem_universe = 'public-infrastructure'
      )

      SELECT
        resource_id,
        resource_name,
        endpoint_id,
        success,
        http_status,
        latency_ms,
        observed_at,
        error_class

      FROM ranked

      WHERE rn = 1

      ORDER BY resource_name
    `)
    .all<LatestMeasurement>();

  const { results: freshnessResults = [] } = await db
    .prepare(`
      SELECT
        f.resource_id,
        f.state,
        f.extracted_timestamp,
        f.observed_at,
        f.strategy

      FROM freshness_observations f

      INNER JOIN resources r
        ON r.id = f.resource_id

      WHERE
        r.ecosystem_universe = 'public-infrastructure'

        AND f.id = (
          SELECT f2.id

          FROM freshness_observations f2

          WHERE f2.resource_id = f.resource_id

          ORDER BY f2.observed_at DESC

          LIMIT 1
        )
    `)
    .all<FreshnessRow>();

  const summary = await db
    .prepare(`
      SELECT
        COALESCE(SUM(ds.measurements), 0) AS measurements,
        COALESCE(SUM(ds.successes), 0) AS successes

      FROM daily_endpoint_stats ds

      INNER JOIN endpoints e
        ON e.id = ds.endpoint_id

      INNER JOIN resources r
        ON r.id = ds.resource_id

      WHERE
        e.enabled = 1
        AND r.ecosystem_universe = 'public-infrastructure'
        AND ds.day >= date('now', '-29 days')
    `)
    .first<SummaryRow>();

  const incidentRow = await db
    .prepare(`
      SELECT COUNT(*) AS count
      FROM incidents
      WHERE ended_at IS NULL
    `)
    .first<{ count: number }>();

  const publicResources = resources.filter(
    (resource) => resource.universe === "public-infrastructure",
  );

  const operational = results.filter(
    (row) => row.success === 1,
  ).length;

  const failing = results.filter(
    (row) => row.success !== 1,
  ).length;

  const sampleSize = Number(summary?.measurements ?? 0);
  const successes = Number(summary?.successes ?? 0);

  const availability =
    sampleSize > 0
      ? Math.round((successes / sampleSize) * 10000) / 100
      : null;

  const freshnessByResource = new Map(
    freshnessResults.map((row) => [row.resource_id, row]),
  );

  const freshnessFresh = freshnessResults.filter(
    (row) => row.state === "fresh",
  ).length;

  const freshnessDue = freshnessResults.filter(
    (row) => row.state === "due",
  ).length;

  const freshnessLate = freshnessResults.filter(
    (row) => row.state === "late",
  ).length;

  const freshnessStale = freshnessResults.filter(
    (row) => row.state === "stale",
  ).length;

  const freshnessUnknown = Math.max(
    0,
    publicResources.length - freshnessResults.length,
  );

  return (
    <SiteShell>
      <PageHeader
        eyebrow="OBSERVABILITY"
        title="National API Pulse"
        description="Independent live transport and freshness observations for South African public data infrastructure."
      />

      <div className="page-wrap">
        <section className="summary public-summary">
          <p className="eyebrow">TRANSPORT</p>

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
              <strong>{failing}</strong>
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

        <section className="summary public-summary">
          <p className="eyebrow">FRESHNESS</p>

          <div className="metrics">
            <div>
              <strong>{freshnessResults.length}</strong>
              <span>Freshness observed</span>
            </div>

            <div>
              <strong>{freshnessFresh}</strong>
              <span>Fresh</span>
            </div>

            <div>
              <strong>{freshnessDue}</strong>
              <span>Due</span>
            </div>

            <div>
              <strong>{freshnessLate}</strong>
              <span>Late</span>
            </div>

            <div>
              <strong>{freshnessStale}</strong>
              <span>Stale</span>
            </div>

            <div>
              <strong>{freshnessUnknown}</strong>
              <span>Unknown</span>
            </div>
          </div>
        </section>

        <section className="home-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">LATEST OBSERVATIONS</p>
              <h2>Public infrastructure</h2>
            </div>
          </div>

          <div className="resource-grid">
            {results.map((row) => {
              const freshness = freshnessByResource.get(row.resource_id);
              const freshnessState = freshness?.state ?? "unknown";

              return (
                <article
                  className="resource-card"
                  key={row.resource_id}
                >
                  <div>
                    <p className="eyebrow">
                      {row.success === 1
                        ? "TRANSPORT · OPERATIONAL"
                        : "TRANSPORT · FAILING"}
                    </p>

                    <h3>{row.resource_name}</h3>

                    <p>
                      <code>{row.endpoint_id}</code>
                    </p>
                  </div>

                  <dl>
                    <div>
                      <dt>Transport</dt>
                      <dd>
                        {row.success === 1
                          ? "Operational"
                          : "Failing"}
                      </dd>
                    </div>

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
                      <dt>Transport error</dt>
                      <dd>{row.error_class ?? "None"}</dd>
                    </div>

                    <div>
                      <dt>Freshness</dt>
                      <dd>{freshnessLabel(freshnessState)}</dd>
                    </div>

                    <div>
                      <dt>Data date</dt>
                      <dd>
                        {formatDate(
                          freshness?.extracted_timestamp ?? null,
                        )}
                      </dd>
                    </div>

                    <div>
                      <dt>Freshness strategy</dt>
                      <dd>
                        {freshness?.strategy ?? "Not yet observed"}
                      </dd>
                    </div>

                    <div>
                      <dt>Observed</dt>
                      <dd>{formatObservation(row.observed_at)}</dd>
                    </div>
                  </dl>
                </article>
              );
            })}
          </div>
        </section>

        <section className="prose-panel">
          <h2>How to read this page</h2>

          <p>
            Transport and freshness are independent observations.
            An endpoint can be operational while its published data is
            late or stale.
          </p>

          <p>
            Freshness is shown only where the Observatory has a
            defensible publisher-specific timestamp extraction strategy.
            Resources without such evidence remain unknown rather than
            being guessed.
          </p>

          <p>
            Transport incidents require three consecutive
            outage-eligible failed observations. Individual failed
            measurements remain append-only observations and do not
            automatically constitute incidents.
          </p>
        </section>
      </div>
    </SiteShell>
  );
}
