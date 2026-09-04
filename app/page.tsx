import Link from "next/link";

import { ResourceCard } from "../components/ResourceCard";
import { SiteShell } from "../components/SiteShell";
import { getDb } from "../lib/cloudflare";
import { resources } from "../packages/catalogue/src/catalogue";

export const dynamic = "force-dynamic";

const publicResources = resources.filter(
  (resource) => resource.universe === "public-infrastructure",
);

interface LatestRow {
  resource_id: string;
  resource_slug: string;
  resource_name: string;
  success: number;
  http_status: number | null;
  latency_ms: number | null;
  observed_at: string;
}

interface SummaryRow {
  measurements: number;
  successes: number;
}

interface FreshnessRow {
  resource_id: string;
  state: "fresh" | "due" | "late" | "stale" | "unknown";
}

interface IncidentRow {
  id: string;
  resource_id: string;
  resource_slug: string;
  resource_name: string;
  started_at: string;
  classification: string;
  last_error: string;
  probe_count: number;
}

interface ChangeRow {
  id: string;
  resource_slug: string;
  resource_name: string;
  observed_at: string;
  change_type: string;
}

interface AvailabilityRow {
  resource_id: string;
  resource_slug: string;
  resource_name: string;
  samples: number;
  availability: number;
}

interface DailyRow {
  day: string;
  measurements: number;
  successes: number;
  availability: number;
}

function pct(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "—";
  return `${value.toFixed(2)}%`;
}

function formatObservation(value: string | null) {
  if (!value) return "Awaiting observation";

  return new Date(value).toLocaleString("en-ZA", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Johannesburg",
  });
}

function formatIncidentTime(value: string) {
  return new Date(value).toLocaleString("en-ZA", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Johannesburg",
  });
}

function dayLabel(value: string) {
  return new Date(`${value}T12:00:00Z`).toLocaleDateString("en-ZA", {
    weekday: "short",
    timeZone: "Africa/Johannesburg",
  });
}

function transportClass(row: LatestRow) {
  if (row.http_status === 401 || row.http_status === 403) return "restricted";
  if (row.http_status === 429) return "limited";
  return row.success === 1 ? "operational" : "down";
}

function transportLabel(row: LatestRow) {
  if (row.http_status === 401 || row.http_status === 403) {
    return "Auth required";
  }

  if (row.http_status === 429) return "Rate limited";
  return row.success === 1 ? "Operational" : "Down";
}

export default async function Home() {
  const db = getDb();

  const { results: latestResults = [] } = await db
    .prepare(`
      WITH ranked AS (
        SELECT
          ces.resource_id,
          r.slug AS resource_slug,
          r.name AS resource_name,
          ces.success,
          ces.http_status,
          ces.latency_ms,
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

        WHERE
          e.enabled = 1
          AND r.ecosystem_universe = 'public-infrastructure'
      )

      SELECT
        resource_id,
        resource_slug,
        resource_name,
        success,
        http_status,
        latency_ms,
        observed_at

      FROM ranked
      WHERE rn = 1
      ORDER BY resource_name
    `)
    .all<LatestRow>();

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

  const { results: freshnessResults = [] } = await db
    .prepare(`
      SELECT
        f.resource_id,
        f.state

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

  const { results: activeIncidents = [] } = await db
    .prepare(`
      SELECT
        i.id,
        i.resource_id,
        r.slug AS resource_slug,
        r.name AS resource_name,
        i.started_at,
        i.classification,
        i.last_error,
        i.probe_count
      FROM incidents i
      INNER JOIN resources r
        ON r.id = i.resource_id
      WHERE
        i.ended_at IS NULL
        AND r.ecosystem_universe = 'public-infrastructure'
      ORDER BY i.started_at DESC
      LIMIT 5
    `)
    .all<IncidentRow>();

  const { results: recentChanges = [] } = await db
    .prepare(`
      SELECT
        c.id,
        r.slug AS resource_slug,
        r.name AS resource_name,
        c.observed_at,
        c.change_type
      FROM resource_changes c
      INNER JOIN resources r
        ON r.id = c.resource_id
      WHERE r.ecosystem_universe = 'public-infrastructure'
      ORDER BY c.observed_at DESC
      LIMIT 4
    `)
    .all<ChangeRow>();

  const changeCount = await db
    .prepare(`
      SELECT COUNT(*) AS count
      FROM resource_changes c
      INNER JOIN resources r
        ON r.id = c.resource_id
      WHERE
        r.ecosystem_universe = 'public-infrastructure'
        AND c.observed_at >=
          strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-7 days')
    `)
    .first<{ count: number }>();

  const { results: topAvailability = [] } = await db
    .prepare(`
      SELECT
        r.id AS resource_id,
        r.slug AS resource_slug,
        r.name AS resource_name,

        SUM(ds.measurements) AS samples,

        ROUND(
          SUM(ds.successes) * 100.0
          / NULLIF(SUM(ds.measurements), 0),
          2
        ) AS availability

      FROM daily_endpoint_stats ds

      INNER JOIN endpoints e
        ON e.id = ds.endpoint_id

      INNER JOIN resources r
        ON r.id = ds.resource_id

      WHERE
        e.enabled = 1
        AND r.ecosystem_universe = 'public-infrastructure'
        AND ds.day >= date('now', '-29 days')

      GROUP BY
        r.id,
        r.slug,
        r.name

      HAVING SUM(ds.measurements) > 0

      ORDER BY
        availability DESC,
        samples DESC

      LIMIT 5
    `)
    .all<AvailabilityRow>();

  const { results: dailyAvailability = [] } = await db
    .prepare(`
      SELECT
        ds.day,

        SUM(ds.measurements) AS measurements,
        SUM(ds.successes) AS successes,

        ROUND(
          SUM(ds.successes) * 100.0
          / NULLIF(SUM(ds.measurements), 0),
          2
        ) AS availability

      FROM daily_endpoint_stats ds

      INNER JOIN endpoints e
        ON e.id = ds.endpoint_id

      INNER JOIN resources r
        ON r.id = ds.resource_id

      WHERE
        e.enabled = 1
        AND r.ecosystem_universe = 'public-infrastructure'
        AND ds.day >= date('now', '-6 days')

      GROUP BY ds.day
      ORDER BY ds.day ASC
    `)
    .all<DailyRow>();

  const observed = latestResults;
  const observedCount = observed.length;

  const operationalCount = observed.filter(
    (row) => row.success === 1,
  ).length;

  const restrictedCount = observed.filter(
    (row) =>
      row.success !== 1 &&
      (row.http_status === 401 ||
        row.http_status === 403 ||
        row.http_status === 429),
  ).length;

  const downCount = observed.filter(
    (row) =>
      row.success !== 1 &&
      row.http_status !== 401 &&
      row.http_status !== 403 &&
      row.http_status !== 429,
  ).length;

  const sampleSize = Number(summary?.measurements ?? 0);
  const successes = Number(summary?.successes ?? 0);

  const availability30d =
    sampleSize > 0
      ? Math.round((successes / sampleSize) * 10000) / 100
      : null;

  const operationalPct =
    observedCount > 0
      ? Math.round((operationalCount / observedCount) * 10000) / 100
      : null;

  const freshOrDue = freshnessResults.filter(
    (row) => row.state === "fresh" || row.state === "due",
  ).length;

  const freshnessPct =
    freshnessResults.length > 0
      ? Math.round(
          (freshOrDue / freshnessResults.length) * 10000,
        ) / 100
      : null;

  const latestByResource = new Map(
    observed.map((row) => [row.resource_id, row]),
  );

  const latestObservedAt = observed.reduce<string | null>(
    (latest, row) =>
      latest === null || row.observed_at > latest
        ? row.observed_at
        : latest,
    null,
  );

  return (
    <SiteShell variant="dashboard">
      <div className="observatory-home">
        <section className="obs-hero">
          <div className="obs-hero-copy">
            <div className="obs-live-pill">
              <span className="obs-live-dot" />
              LIVE NATIONAL API PULSE
            </div>

            <p className="obs-kicker">
              SOUTH AFRICA · PUBLIC DATA INFRASTRUCTURE
            </p>

            <h1>
              Public data,
              <br />
              <span>observed.</span>
            </h1>

            <p className="obs-tagline">
              Find the API. See if it works.
              <br />
              See if the data is fresh. Build.
            </p>

            <p className="obs-intro">
              Independent, machine-readable evidence about the availability,
              freshness and structural stability of South Africa&apos;s
              public-data infrastructure.
            </p>

            <div className="obs-actions">
              <Link className="obs-button obs-button-primary" href="/catalogue">
                Explore resources
                <span>→</span>
              </Link>

              <Link className="obs-button obs-button-secondary" href="/status">
                Open live status
              </Link>
            </div>

            <div className="obs-trust-row">
              <span>◎ Independent observations</span>
              <span>⇄ Transport ≠ freshness</span>
              <span>◇ Evidence over claims</span>
            </div>
          </div>

          <div className="obs-console">
            <div className="obs-console-head">
              <div>
                <span className="obs-console-icon">⌁</span>
                <div>
                  <strong>National API Pulse</strong>
                  <small>Latest production observations</small>
                </div>
              </div>

              <span className="obs-console-live">
                ● LIVE
              </span>
            </div>

            <div className="obs-console-summary">
              <span>
                <b>{operationalCount}</b> operational
              </span>
              <span>
                <b>{downCount}</b> down
              </span>
              {restrictedCount > 0 && (
                <span>
                  <b>{restrictedCount}</b> restricted
                </span>
              )}
            </div>

            <div className="obs-signal-list">
              {observed.slice(0, 6).map((row) => (
                <Link
                  href={`/apis/${row.resource_slug}`}
                  className="obs-signal-row"
                  key={row.resource_id}
                >
                  <span
                    className={`obs-state-light ${transportClass(row)}`}
                  />

                  <span className="obs-signal-name">
                    {row.resource_name}
                  </span>

                  <span
                    className={`obs-signal-state ${transportClass(row)}`}
                  >
                    {transportLabel(row)}
                  </span>

                  <span className="obs-latency">
                    {row.latency_ms === null
                      ? "—"
                      : `${Math.round(row.latency_ms)} ms`}
                  </span>
                </Link>
              ))}
            </div>

            <div className="obs-console-foot">
              <span>
                Observed {formatObservation(latestObservedAt)}
              </span>
              <Link href="/status">Full observability →</Link>
            </div>
          </div>
        </section>

        <section
          className="obs-metrics"
          aria-label="National observability summary"
        >
          <article className="obs-metric obs-tone-green">
            <div className="obs-metric-icon">⌁</div>
            <span className="obs-metric-label">
              Public infrastructure
            </span>
            <strong>{pct(availability30d)}</strong>
            <small>
              30-day observed availability · {sampleSize.toLocaleString()} samples
            </small>
          </article>

          <article className="obs-metric obs-tone-blue">
            <div className="obs-metric-icon">✓</div>
            <span className="obs-metric-label">
              Live transport
            </span>
            <strong>{pct(operationalPct)}</strong>
            <small>
              {operationalCount} of {observedCount} observed resources operational
            </small>
          </article>

          <article className="obs-metric obs-tone-red">
            <div className="obs-metric-icon">!</div>
            <span className="obs-metric-label">
              Active incidents
            </span>
            <strong>{activeIncidents.length}</strong>
            <small>
              Sustained failures meeting the incident threshold
            </small>
          </article>

          <article className="obs-metric obs-tone-gold">
            <div className="obs-metric-icon">◷</div>
            <span className="obs-metric-label">
              Fresh / due
            </span>
            <strong>{pct(freshnessPct)}</strong>
            <small>
              {freshOrDue} of {freshnessResults.length} resources with freshness evidence
            </small>
          </article>

          <article className="obs-metric obs-tone-violet">
            <div className="obs-metric-icon">◇</div>
            <span className="obs-metric-label">
              Interface changes
            </span>
            <strong>{Number(changeCount?.count ?? 0)}</strong>
            <small>
              Independently detected structural changes · last 7 days
            </small>
          </article>
        </section>

        <section className="obs-dashboard-grid">
          <article className="obs-panel obs-trend-panel">
            <div className="obs-panel-head">
              <div>
                <p className="obs-panel-kicker">OBSERVED AVAILABILITY</p>
                <h2>Seven-day signal</h2>
              </div>

              <Link href="/status">View status →</Link>
            </div>

            {dailyAvailability.length > 0 ? (
              <div className="obs-chart">
                <div className="obs-chart-scale">
                  <span>100%</span>
                  <span>75%</span>
                  <span>50%</span>
                  <span>25%</span>
                </div>

                <div className="obs-bars">
                  {dailyAvailability.map((row) => (
                    <div className="obs-bar-column" key={row.day}>
                      <div className="obs-bar-track">
                        <div
                          className="obs-bar"
                          style={{
                            height: `${Math.max(
                              5,
                              Math.min(100, Number(row.availability)),
                            )}%`,
                          }}
                          title={`${row.day}: ${row.availability}%`}
                        />
                      </div>

                      <strong>{pct(Number(row.availability))}</strong>
                      <span>{dayLabel(row.day)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="obs-empty">
                Seven-day evidence will appear as observations accumulate.
              </div>
            )}

            <p className="obs-method-note">
              Every point is derived from append-only production
              measurements. No historical uptime is backfilled.
            </p>
          </article>

          <article className="obs-panel">
            <div className="obs-panel-head">
              <div>
                <p className="obs-panel-kicker">30-DAY EVIDENCE</p>
                <h2>Top observed availability</h2>
              </div>
            </div>

            <div className="obs-ranking">
              {topAvailability.map((row) => (
                <Link
                  href={`/apis/${row.resource_slug}`}
                  className="obs-ranking-row"
                  key={row.resource_id}
                >
                  <div className="obs-ranking-name">
                    <span>{row.resource_name}</span>
                    <strong>{pct(Number(row.availability))}</strong>
                  </div>

                  <div className="obs-ranking-track">
                    <span
                      style={{
                        width: `${Math.max(
                          1,
                          Math.min(100, Number(row.availability)),
                        )}%`,
                      }}
                    />
                  </div>

                  <small>
                    {Number(row.samples).toLocaleString()} observations
                  </small>
                </Link>
              ))}
            </div>
          </article>
        </section>

        <section className="obs-dashboard-grid obs-secondary-grid">
          <article className="obs-panel">
            <div className="obs-panel-head">
              <div>
                <p className="obs-panel-kicker">INCIDENT HISTORY</p>
                <h2>Active incidents</h2>
              </div>

              <Link href="/incidents">All incidents →</Link>
            </div>

            {activeIncidents.length === 0 ? (
              <div className="obs-clear-state">
                <span>✓</span>
                <div>
                  <strong>No active incidents</strong>
                  <p>
                    No public-infrastructure endpoint currently meets the
                    sustained-failure threshold.
                  </p>
                </div>
              </div>
            ) : (
              <div className="obs-event-list">
                {activeIncidents.map((incident) => (
                  <Link
                    href={`/apis/${incident.resource_slug}`}
                    className="obs-event obs-event-danger"
                    key={incident.id}
                  >
                    <span className="obs-event-marker" />

                    <div>
                      <strong>{incident.resource_name}</strong>
                      <small>
                        {incident.classification} · {incident.probe_count} failed
                        observations
                      </small>
                    </div>

                    <time>
                      {formatIncidentTime(incident.started_at)}
                    </time>
                  </Link>
                ))}
              </div>
            )}
          </article>

          <article className="obs-panel">
            <div className="obs-panel-head">
              <div>
                <p className="obs-panel-kicker">SCHEMA OBSERVATORY</p>
                <h2>Interface changes</h2>
              </div>

              <Link href="/changes">All changes →</Link>
            </div>

            {recentChanges.length === 0 ? (
              <div className="obs-clear-state obs-clear-neutral">
                <span>◇</span>
                <div>
                  <strong>No structural changes observed yet</strong>
                  <p>
                    This is a real empty history, not synthetic demonstration
                    data.
                  </p>
                </div>
              </div>
            ) : (
              <div className="obs-event-list">
                {recentChanges.map((change) => (
                  <Link
                    href={`/apis/${change.resource_slug}`}
                    className="obs-event"
                    key={change.id}
                  >
                    <span className="obs-event-marker" />

                    <div>
                      <strong>{change.resource_name}</strong>
                      <small>{change.change_type}</small>
                    </div>

                    <time>{formatIncidentTime(change.observed_at)}</time>
                  </Link>
                ))}
              </div>
            )}
          </article>
        </section>

        <section className="obs-principles">
          <article>
            <span className="obs-principle-icon">◎</span>
            <div>
              <strong>Independent observations</strong>
              <p>We measure what the infrastructure actually does.</p>
            </div>
          </article>

          <article>
            <span className="obs-principle-icon">⇄</span>
            <div>
              <strong>Transport ≠ freshness</strong>
              <p>A responding API can still be serving stale data.</p>
            </div>
          </article>

          <article>
            <span className="obs-principle-icon">◇</span>
            <div>
              <strong>Evidence over claims</strong>
              <p>Unknown remains unknown. History is never invented.</p>
            </div>
          </article>

          <article>
            <span className="obs-principle-icon">&lt;/&gt;</span>
            <div>
              <strong>Open & machine-readable</strong>
              <p>API, OpenAPI, schemas and predictable exports.</p>
            </div>
          </article>
        </section>

        <section className="obs-resources">
          <div className="obs-section-heading">
            <div>
              <p className="obs-panel-kicker">DISCOVER</p>
              <h2>High-value public infrastructure</h2>
              <p>
                Verified public-data systems with their latest independent
                transport state.
              </p>
            </div>

            <Link href="/catalogue">
              View all {resources.length} resources →
            </Link>
          </div>

          <div className="resource-grid">
            {publicResources.slice(0, 6).map((resource) => {
              const live = latestByResource.get(resource.id);

              return (
                <ResourceCard
                  key={resource.id}
                  resource={resource}
                  liveState={
                    live
                      ? {
                          operationalState:
                            live.http_status === 401 ||
                            live.http_status === 403
                              ? "auth-required"
                              : live.http_status === 429
                                ? "rate-limited"
                                : live.success === 1
                                  ? "operational"
                                  : "down",
                          observedAt: live.observed_at,
                        }
                      : undefined
                  }
                />
              );
            })}
          </div>
        </section>

        <section className="obs-machine">
          <div>
            <p className="obs-panel-kicker">BUILT FOR MACHINES TOO</p>
            <h2>No scraping required.</h2>
            <p>
              Stable identifiers, provenance, JSON Schema, OpenAPI and hard
              universe boundaries make the Observatory useful to software,
              researchers and autonomous systems.
            </p>

            <div className="obs-machine-links">
              <Link href="/api/v1/resources">Explore API →</Link>
              <Link href="/openapi.json">OpenAPI 3.1 →</Link>
            </div>
          </div>

          <pre>
            <code>{`GET /api/v1/resources
GET /api/v1/status/public-infrastructure
GET /api/v1/incidents
GET /api/v1/changes
GET /catalogue.json`}</code>
          </pre>
        </section>
      </div>
    </SiteShell>
  );
}
