import Link from "next/link";
import { notFound } from "next/navigation";

import { SiteShell } from "../../../components/SiteShell";
import {
  StateBadge,
  UniverseBadge,
} from "../../../components/ResourceCard";
import { getDb } from "../../../lib/cloudflare";
import {
  organisationById,
  resourceBySlug,
  resources,
} from "../../../packages/catalogue/src/catalogue";

export const dynamic = "force-dynamic";

interface LatestMeasurement {
  endpoint_id: string;
  observed_at: string;
  success: number;
  http_status: number | null;
  latency_ms: number | null;
  validation_result: string;
  error_class: string | null;
}

interface AvailabilityRow {
  measurements: number;
  successes: number;
}

interface FreshnessRow {
  observed_at: string;
  state: "fresh" | "due" | "late" | "stale" | "unknown";
  extracted_timestamp: string | null;
  strategy: string;
}

interface IncidentRow {
  id: string;
  endpoint_id: string;
  started_at: string;
  ended_at: string | null;
  classification: string;
  first_error: string;
  last_error: string;
  probe_count: number;
  recovery_observation: string | null;
}

export function generateStaticParams() {
  return resources.map((resource) => ({
    slug: resource.slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const resource = resourceBySlug[slug];

  return resource
    ? {
        title: resource.name,
        description: resource.description,
      }
    : {
        title: "Resource not found",
      };
}

function formatDate(value: string | null) {
  if (!value) return "—";

  return new Date(value).toLocaleDateString("en-ZA", {
    dateStyle: "medium",
    timeZone: "Africa/Johannesburg",
  });
}

function formatDateTime(value: string | null) {
  if (!value) return "—";

  return new Date(value).toLocaleString("en-ZA", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Johannesburg",
  });
}

function duration(startedAt: string, endedAt: string | null) {
  const start = new Date(startedAt).getTime();
  const end = endedAt ? new Date(endedAt).getTime() : Date.now();

  const minutes = Math.max(
    0,
    Math.floor((end - start) / 60_000),
  );

  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;

  if (hours < 24) {
    return remainder
      ? `${hours}h ${remainder}m`
      : `${hours}h`;
  }

  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;

  return remainingHours
    ? `${days}d ${remainingHours}h`
    : `${days}d`;
}

function freshnessLabel(state: string | undefined) {
  switch (state) {
    case "fresh":
      return "Fresh";
    case "due":
      return "Due";
    case "late":
      return "Late";
    case "stale":
      return "Stale";
    default:
      return "Freshness unknown";
  }
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const resource = resourceBySlug[slug];
  if (!resource) notFound();

  const organisation = organisationById[resource.organisationId];
  const db = getDb();

  const latest = await db
    .prepare(`
      SELECT
        ces.endpoint_id,
        ces.observed_at,
        ces.success,
        ces.http_status,
        ces.latency_ms,
        ces.validation_result,
        ces.error_class

      FROM current_endpoint_state ces

      INNER JOIN endpoints e
        ON e.id = ces.endpoint_id

      WHERE
        ces.resource_id = ?
        AND e.enabled = 1

      ORDER BY ces.observed_at DESC

      LIMIT 1
    `)
    .bind(resource.id)
    .first<LatestMeasurement>();

  const availability = await db
    .prepare(`
      SELECT
        COALESCE(SUM(ds.measurements), 0) AS measurements,
        COALESCE(SUM(ds.successes), 0) AS successes

      FROM daily_endpoint_stats ds

      INNER JOIN endpoints e
        ON e.id = ds.endpoint_id

      WHERE
        ds.resource_id = ?
        AND e.enabled = 1
        AND ds.day >= date('now', '-29 days')
    `)
    .bind(resource.id)
    .first<AvailabilityRow>();

  const freshness = await db
    .prepare(`
      SELECT
        observed_at,
        state,
        extracted_timestamp,
        strategy
      FROM freshness_observations
      WHERE resource_id = ?
      ORDER BY observed_at DESC
      LIMIT 1
    `)
    .bind(resource.id)
    .first<FreshnessRow>();

  const { results: incidents = [] } = await db
    .prepare(`
      SELECT
        id,
        endpoint_id,
        started_at,
        ended_at,
        classification,
        first_error,
        last_error,
        probe_count,
        recovery_observation
      FROM incidents
      WHERE resource_id = ?
      ORDER BY
        CASE WHEN ended_at IS NULL THEN 0 ELSE 1 END,
        started_at DESC
      LIMIT 10
    `)
    .bind(resource.id)
    .all<IncidentRow>();

  const sampleSize = Number(
    availability?.measurements ?? 0,
  );

  const successes = Number(
    availability?.successes ?? 0,
  );

  const availability30d =
    sampleSize > 0
      ? Math.round((successes / sampleSize) * 10000) / 100
      : null;

  const operationalState =
    latest === null
      ? "unknown"
      : latest.http_status === 401 ||
          latest.http_status === 403
        ? "auth-required"
        : latest.http_status === 429
          ? "rate-limited"
          : latest.success === 1
            ? "operational"
            : "down";

  const activeIncidents = incidents.filter(
    (incident) => incident.ended_at === null,
  );

  return (
    <SiteShell>
      <section className="page-header">
        <UniverseBadge universe={resource.universe} />
        <h1>{resource.name}</h1>
        <p>{resource.description}</p>
      </section>

      <div className="page-wrap detail-layout">
        <div className="detail-main">
          <section>
            <h2>Current health</h2>

            <div className="detail-grid">
              <div className="fact">
                <span>Transport</span>
                <strong>
                  <StateBadge state={operationalState} />
                </strong>
              </div>

              <div className="fact">
                <span>Data freshness</span>
                <strong>
                  {freshnessLabel(freshness?.state)}
                </strong>
              </div>

              <div className="fact">
                <span>30-day availability</span>
                <strong>
                  {availability30d === null
                    ? "Not yet observed"
                    : `${availability30d}%`}
                </strong>
              </div>

              <div className="fact">
                <span>Active incidents</span>
                <strong>{activeIncidents.length}</strong>
              </div>
            </div>
          </section>

          <section>
            <h2>Latest transport observation</h2>

            {latest ? (
              <div className="detail-grid">
                <div className="fact">
                  <span>Observed</span>
                  <strong>
                    {formatDateTime(latest.observed_at)}
                  </strong>
                </div>

                <div className="fact">
                  <span>Endpoint</span>
                  <strong>
                    <code>{latest.endpoint_id}</code>
                  </strong>
                </div>

                <div className="fact">
                  <span>HTTP status</span>
                  <strong>
                    {latest.http_status ?? "—"}
                  </strong>
                </div>

                <div className="fact">
                  <span>Latency</span>
                  <strong>
                    {latest.latency_ms === null
                      ? "—"
                      : `${Math.round(latest.latency_ms)} ms`}
                  </strong>
                </div>

                <div className="fact">
                  <span>Validation</span>
                  <strong>
                    {latest.validation_result}
                  </strong>
                </div>

                <div className="fact">
                  <span>Error</span>
                  <strong>
                    {latest.error_class ?? "None"}
                  </strong>
                </div>
              </div>
            ) : (
              <div className="empty-state">
                No production transport observation exists for
                this resource yet.
              </div>
            )}
          </section>

          <section>
            <h2>Freshness observation</h2>

            {freshness ? (
              <div className="detail-grid">
                <div className="fact">
                  <span>State</span>
                  <strong>
                    {freshnessLabel(freshness.state)}
                  </strong>
                </div>

                <div className="fact">
                  <span>Published data date</span>
                  <strong>
                    {formatDate(
                      freshness.extracted_timestamp,
                    )}
                  </strong>
                </div>

                <div className="fact">
                  <span>Observed</span>
                  <strong>
                    {formatDateTime(
                      freshness.observed_at,
                    )}
                  </strong>
                </div>

                <div className="fact">
                  <span>Strategy</span>
                  <strong>
                    {freshness.strategy}
                  </strong>
                </div>
              </div>
            ) : (
              <div className="empty-state">
                No defensible freshness timestamp strategy has
                produced an observation for this resource.
                Freshness therefore remains unknown.
              </div>
            )}
          </section>

          <section>
            <h2>Incident history</h2>

            {incidents.length === 0 ? (
              <div className="empty-state">
                No observed incident has met the production
                incident threshold for this resource.
              </div>
            ) : (
              <div className="resource-grid">
                {incidents.map((incident) => (
                  <article
                    className="resource-card"
                    key={incident.id}
                  >
                    <p className="eyebrow">
                      {incident.ended_at === null
                        ? "ACTIVE INCIDENT"
                        : "RESOLVED"}
                    </p>

                    <h3>{incident.classification}</h3>

                    <dl>
                      <div>
                        <dt>Started</dt>
                        <dd>
                          {formatDateTime(
                            incident.started_at,
                          )}
                        </dd>
                      </div>

                      <div>
                        <dt>Ended</dt>
                        <dd>
                          {incident.ended_at
                            ? formatDateTime(
                                incident.ended_at,
                              )
                            : "Ongoing"}
                        </dd>
                      </div>

                      <div>
                        <dt>Duration</dt>
                        <dd>
                          {duration(
                            incident.started_at,
                            incident.ended_at,
                          )}
                        </dd>
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
                ))}
              </div>
            )}
          </section>

          <section>
            <h2>Endpoint</h2>

            {resource.baseUrl ? (
              <div className="endpoint">
                {resource.baseUrl}
              </div>
            ) : (
              <p>
                No canonical probe endpoint is configured for
                this collection.
              </p>
            )}

            <div
              className="detail-grid"
              style={{ marginTop: 20 }}
            >
              <div className="fact">
                <span>Authentication</span>
                <strong>{resource.authentication}</strong>
              </div>

              <div className="fact">
                <span>Formats</span>
                <strong>
                  {resource.formats.join(", ")}
                </strong>
              </div>

              <div className="fact">
                <span>HTTPS</span>
                <strong>
                  {resource.https ? "Yes" : "No"}
                </strong>
              </div>

              <div className="fact">
                <span>CORS</span>
                <strong>{resource.cors}</strong>
              </div>
            </div>
          </section>

          <section>
            <h2>Technical information</h2>

            <div className="detail-grid">
              <div className="fact">
                <span>Resource type</span>
                <strong>{resource.resourceType}</strong>
              </div>

              <div className="fact">
                <span>Access class</span>
                <strong>{resource.accessClass}</strong>
              </div>

              <div className="fact">
                <span>Standards</span>
                <strong>
                  {resource.standards.join(", ") ||
                    "None verified"}
                </strong>
              </div>

              <div className="fact">
                <span>Licence</span>
                <strong>{resource.licence}</strong>
              </div>
            </div>
          </section>

          <section>
            <h2>Discovery provenance</h2>

            {resource.discovery.map((source, index) => (
              <div
                className="provenance-item"
                key={index}
              >
                <strong>{source.name}</strong>

                <p>
                  {source.type} · discovered{" "}
                  {new Date(
                    source.discoveredAt,
                  ).toLocaleDateString("en-ZA")}
                </p>

                <a href={source.url}>
                  Open source evidence ↗
                </a>
              </div>
            ))}
          </section>
        </div>

        <aside className="detail-side">
          <section>
            <p className="eyebrow">PUBLISHER</p>

            <h2>
              <Link
                href={`/organisations/${organisation.slug}`}
              >
                {organisation.name}
              </Link>
            </h2>

            <p>
              {resource.publisherClass.replaceAll(
                "-",
                " ",
              )}
            </p>

            <a href={organisation.website}>
              Official website ↗
            </a>
          </section>

          <section>
            <p className="eyebrow">VERIFICATION</p>

            <strong>
              {resource.verification.status}
            </strong>

            <p>
              Independently checked{" "}
              {new Date(
                resource.verification.verifiedAt,
              ).toLocaleDateString("en-ZA")}
            </p>

            <a href={resource.documentationUrl}>
              Official documentation ↗
            </a>
          </section>

          <section>
            <p className="eyebrow">OBSERVATION EVIDENCE</p>

            <p>
              <strong>{sampleSize}</strong>
              <br />
              transport measurements in the current
              30-day observation window
            </p>

            <p>
              Freshness:{" "}
              <strong>
                {freshnessLabel(freshness?.state)}
              </strong>
            </p>

            <Link href="/status">
              National API Pulse →
            </Link>

            <br />

            <Link href="/incidents">
              Incident history →
            </Link>
          </section>

          <section>
            <p className="eyebrow">MACHINE ACCESS</p>

            <a href={`/api/v1/resources/${resource.id}`}>
              Resource JSON
            </a>

            <br />

            <a href="/openapi.json">
              Observatory OpenAPI
            </a>
          </section>
        </aside>
      </div>
    </SiteShell>
  );
}
