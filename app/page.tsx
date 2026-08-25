import Link from "next/link";
import { SiteShell } from "../components/SiteShell";
import { resources } from "../packages/catalogue/src/catalogue";
import { ResourceCard } from "../components/ResourceCard";
import { getDb } from "../lib/cloudflare";

export const dynamic = "force-dynamic";

const publicResources = resources.filter((resource) => resource.universe === "public-infrastructure");
const ecosystemResources = resources.filter((resource) => resource.universe === "za-api-ecosystem");
const monitoredPublic = publicResources.filter((resource) => resource.monitoring.enabled);

export default async function Home() {
  const db = getDb();

  const latest = await db.prepare(`
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
      INNER JOIN measurements m ON m.endpoint_id = e.id
      INNER JOIN resources r ON r.id = e.resource_id
      WHERE
        e.enabled = 1
        AND r.ecosystem_universe = 'public-infrastructure'
    )
    SELECT resource_id, success, http_status, observed_at
    FROM ranked
    WHERE rn = 1
  `).all<{
    resource_id: string;
    success: number;
    http_status: number | null;
    observed_at: string;
  }>();

  const availability = await db.prepare(`
    SELECT
      COUNT(*) AS sample_size,
      SUM(CASE WHEN m.success = 1 THEN 1 ELSE 0 END) AS successes
    FROM measurements m
    INNER JOIN endpoints e ON e.id = m.endpoint_id
    INNER JOIN resources r ON r.id = e.resource_id
    WHERE
      e.enabled = 1
      AND r.ecosystem_universe = 'public-infrastructure'
      AND datetime(m.observed_at) >= datetime('now', '-30 days')
  `).first<{ sample_size: number; successes: number }>();

  const observed = latest.results ?? [];
  const liveMonitored = observed.length;
  const liveOperational = observed.filter((row) => row.success === 1).length;
  const liveDown = observed.filter((row) => row.success !== 1).length;
  const sampleSize = Number(availability?.sample_size ?? 0);
  const successes = Number(availability?.successes ?? 0);
  const availability30d =
    sampleSize > 0
      ? Math.round((successes / sampleSize) * 10000) / 100
      : null;

  const latestByResource = new Map(
    observed.map((row) => [row.resource_id, row]),
  );
  return <SiteShell><section className="hero"><div className="hero-grid"><div><p className="eyebrow">SOUTH AFRICA · PUBLIC DATA INFRASTRUCTURE</p><h1>What public data exists.<br/><span>Whether it works.</span><br/>Whether it&apos;s current.</h1><p className="hero-copy">A public, machine-readable catalogue and independent observatory for South African public data infrastructure and the wider ZA API ecosystem.</p><div className="hero-actions"><Link className="button primary" href="/catalogue">Explore the catalogue</Link><Link className="button secondary" href="/api/v1/resources">Use the API</Link></div></div><div className="instrument" aria-label="Observatory system state"><div className="instrument-head"><span>NATIONAL API PULSE</span><span className="live-indicator">● LIVE · {liveOperational} UP · {liveDown} DOWN</span></div><div className="pulse-preview">{monitoredPublic.slice(0, 9).map((resource) => <div key={resource.id}><span>{resource.name}</span><span className="cells">
  {Array.from({ length: 14 }, (_, cell) => {
    const state = latestByResource.get(resource.id);
    const className = state
      ? state.success === 1
        ? "operational"
        : "down"
      : "unknown";
    return <i key={cell} className={className}>•</i>;
  })}
</span></div>)}</div><p>Live state is derived from append-only production measurements collected every 15 minutes.</p></div></div></section><section className="two-universes"><article className="summary public-summary"><p className="eyebrow">UNIVERSE A</p><h2>Public Data Infrastructure</h2><div className="metrics"><div><strong>{publicResources.length}</strong><span>Verified resources</span></div><div><strong>{liveMonitored}</strong><span>Observed resources</span></div><div><strong>{availability30d === null ? "—" : `${availability30d}%`}</strong><span>30d observed availability</span></div><div><strong>{liveDown}</strong><span>Currently down</span></div></div><p className="data-note">National metrics include only records explicitly classified <code>public-infrastructure</code>. No historical measurements have been invented.</p><Link href="/infrastructure">Open national infrastructure →</Link></article><article className="summary ecosystem-summary"><p className="eyebrow">UNIVERSE B</p><h2>Wider ZA API Ecosystem</h2><div className="metrics"><div><strong>{ecosystemResources.length}</strong><span>Verified resources</span></div><div><strong>{ecosystemResources.filter((item) => item.monitoring.enabled).length}</strong><span>Configured monitors</span></div><div><strong>{ecosystemResources.filter((item) => item.resourceType.includes("api")).length}</strong><span>Developer APIs</span></div><div><strong>0</strong><span>In national metric</span></div></div><p className="data-note">Commercial and private developer APIs are useful catalogue entries, but never contaminate public-infrastructure statistics.</p><Link href="/ecosystem">Open ZA ecosystem →</Link></article></section><section className="home-section"><div className="section-heading"><div><p className="eyebrow">START HERE</p><h2>High-value public infrastructure</h2></div><Link href="/catalogue">View all {resources.length} resources →</Link></div><div className="resource-grid">{publicResources.slice(0, 6).map((resource) => <ResourceCard
  key={resource.id}
  resource={resource}
  liveState={
    latestByResource.has(resource.id)
      ? {
          operationalState:
            latestByResource.get(resource.id)!.success === 1
              ? "operational"
              : "down",
          observedAt:
            latestByResource.get(resource.id)!.observed_at,
        }
      : undefined
  }
/>)}</div></section><section className="machine-panel"><div><p className="eyebrow">BUILT FOR MACHINES TOO</p><h2>No scraping required.</h2><p>Stable identifiers, explicit provenance, JSON Schema, OpenAPI, predictable exports and an API with hard universe boundaries.</p></div><pre><code>{`GET /api/v1/resources?universe=public-infrastructure\nGET /api/v1/status/public-infrastructure\nGET /catalogue.json\nGET /.well-known/public-api-observatory.json`}</code></pre></section></SiteShell>;
}
