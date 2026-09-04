import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const hotPublicFiles = [
  "app/page.tsx",
  "app/status/page.tsx",
  "app/api/v1/status/route.ts",
  "app/apis/[slug]/page.tsx",
  "app/api/v1/resources/[id]/route.ts",
  "lib/live-resource-state.ts",
];

test("public current-state paths never read raw measurement history", () => {
  for (const file of hotPublicFiles) {
    const source = readFileSync(file, "utf8");

    assert.equal(
      /\bFROM\s+measurements\b/i.test(source),
      false,
      `${file} must not query raw measurements`,
    );

    assert.equal(
      /JOIN\s+measurements\b/i.test(source),
      false,
      `${file} must not join raw measurements`,
    );
  }
});

test("hot public paths use materialized state or compact rollups", () => {
  const combined = hotPublicFiles
    .map((file) => readFileSync(file, "utf8"))
    .join("\n");

  assert.match(combined, /current_endpoint_state/);
  assert.match(combined, /daily_endpoint_stats/);
});

test("migration preserves measurement history", () => {
  const migration = readFileSync(
    "drizzle/0002_d1_read_cost_remediation.sql",
    "utf8",
  );

  assert.match(
    migration,
    /measurements_endpoint_observed_idx/,
  );

  assert.match(
    migration,
    /current_endpoint_state/,
  );

  assert.match(
    migration,
    /daily_endpoint_stats/,
  );

  assert.doesNotMatch(
    migration,
    /\bDELETE\s+FROM\s+measurements\b/i,
  );

  assert.doesNotMatch(
    migration,
    /\bDROP\s+TABLE\s+measurements\b/i,
  );

  assert.doesNotMatch(
    migration,
    /\bTRUNCATE\b/i,
  );
});

test("ingestion retains append-only evidence and updates derived state", () => {
  const worker = readFileSync(
    "workers/monitor/src/index.ts",
    "utf8",
  );

  assert.match(worker, /INSERT_MEASUREMENT_SQL/);
  assert.match(worker, /UPSERT_CURRENT_ENDPOINT_STATE_SQL/);
  assert.match(worker, /UPSERT_DAILY_ENDPOINT_STATS_SQL/);
  assert.match(worker, /env\.DB\.batch/);
});

test("incident lifecycle remains bounded to latest three observations", () => {
  const worker = readFileSync(
    "workers/monitor/src/index.ts",
    "utf8",
  );

  assert.match(
    worker,
    /WHERE endpoint_id = \?[\s\S]*ORDER BY observed_at DESC[\s\S]*LIMIT 3/,
  );
});

test("history index exactly supports the incident query shape", () => {
  const migration = readFileSync(
    "drizzle/0002_d1_read_cost_remediation.sql",
    "utf8",
  );

  assert.match(
    migration,
    /ON measurements\(endpoint_id, observed_at DESC\)/,
  );
});
