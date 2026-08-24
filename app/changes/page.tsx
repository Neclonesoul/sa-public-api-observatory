import Link from "next/link";
import { getDb } from "../../lib/cloudflare";
import {
  PageHeader,
  SiteShell,
} from "../../components/SiteShell";

export const dynamic = "force-dynamic";

interface ChangeRow {
  id: string;
  resource_id: string;
  resource_slug: string;
  resource_name: string;
  endpoint_id: string;
  observed_at: string;
  change_type: string;
  previous_hash: string | null;
  current_hash: string;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-ZA", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Johannesburg",
  });
}

function shortHash(value: string | null) {
  return value ? value.slice(0, 12) : "—";
}

export default async function Page() {
  const db = getDb();

  const { results = [] } = await db
    .prepare(`
      SELECT
        c.id,
        c.resource_id,
        r.slug AS resource_slug,
        r.name AS resource_name,
        c.endpoint_id,
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

  return (
    <SiteShell>
      <PageHeader
        eyebrow="SCHEMA OBSERVATORY"
        title="Interface changes"
        description="Append-only structural changes detected from production observations without retaining publisher payloads."
      />

      <div className="page-wrap">
        {results.length === 0 ? (
          <div className="empty-state">
            No independently observed schema changes yet.
            This is a real empty history, not synthetic demo data.
          </div>
        ) : (
          <div className="resource-grid">
            {results.map((change) => (
              <article
                className="resource-card"
                key={change.id}
              >
                <p className="eyebrow">
                  SCHEMA SIGNATURE CHANGED
                </p>

                <h3>
                  <Link
                    href={`/apis/${change.resource_slug}`}
                  >
                    {change.resource_name}
                  </Link>
                </h3>

                <dl>
                  <div>
                    <dt>Observed</dt>
                    <dd>
                      {formatDate(change.observed_at)}
                    </dd>
                  </div>

                  <div>
                    <dt>Endpoint</dt>
                    <dd>
                      <code>{change.endpoint_id}</code>
                    </dd>
                  </div>

                  <div>
                    <dt>Previous signature</dt>
                    <dd>
                      <code>
                        {shortHash(change.previous_hash)}
                      </code>
                    </dd>
                  </div>

                  <div>
                    <dt>Current signature</dt>
                    <dd>
                      <code>
                        {shortHash(change.current_hash)}
                      </code>
                    </dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        )}
      </div>
    </SiteShell>
  );
}
