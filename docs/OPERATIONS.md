# Operations Runbook

## SA Public API Observatory

This runbook records the operational procedure for maintaining and verifying the production Observatory.

---

## 1. Production principles

1. Production changes flow through reviewed Git history.
2. `main` remains protected.
3. The required CI context is `verify`.
4. The exact tested commit is what deploys.
5. Measurements remain append-only evidence.
6. Public hot paths do not scan raw lifetime measurement history.
7. Unknown observations remain unknown.
8. Monitoring remains bounded and safe.
9. Database-cost behaviour is part of production correctness.

---

## 2. Production components

### Web / API Worker

Serves the website, catalogue, `/api/v1`, exports, and OpenAPI/schema surfaces.

### Monitor Worker

Performs scheduled endpoint observations and exposes monitor health.

### D1

Binding:

```text
DB
```

Database:

```text
sa-api-observatory
```

### R2

Bucket:

```text
sa-api-observatory-exports
```

---

## 3. Normal deployment path

```text
branch
  ↓
pull request
  ↓
verify
  ↓
merge to protected main
  ↓
CI push run
  ↓
verify succeeds
  ↓
Deploy production workflow
  ↓
checkout exact tested SHA
  ↓
Cloudflare
```

---

## 4. Pre-merge verification

```bash
npm run lint
npm run typecheck
npm run validate:catalogue
npm run test:unit
npm run build
```

Full local path:

```bash
npm test
```

---

## 5. Production deployment verification

Confirm CI passed, required job is `verify`, production deployment was triggered by the successful CI run, the expected SHA was checked out, and deployment succeeded.

Representative smoke-test routes:

```text
/
/status
/changes
/incidents
/methodology
/api/v1/resources
/api/v1/status
/api/v1/incidents
/api/v1/changes
/openapi.json
/catalogue.json
```

Do not stop at HTTP `200`. Verify semantic correctness too.

---

## 6. D1 migrations

Before applying a migration:

1. inspect SQL;
2. identify destructive statements;
3. identify affected tables/indexes;
4. understand expected rows touched;
5. verify evidence preservation;
6. run relevant tests;
7. review query shapes;
8. inspect material `EXPLAIN QUERY PLAN` output; and
9. understand rollback/recovery.

The current cost-remediation migration is:

```text
drizzle/0002_d1_read_cost_remediation.sql
```

---

## 7. D1 inspection

Key tables:

```text
measurements
current_endpoint_state
daily_endpoint_stats
freshness_observations
incidents
schema_versions
system_state
```

Historical evidence and serving state should be interpreted differently.

---

## 8. Query-plan verification

For material queries determine what table is accessed, whether the expected index is used, whether a temporary scan/sort appears, whether the row domain is bounded, whether lifetime history affects the plan, and whether the observed plan matches the intended complexity.

Incident lifecycle pattern:

```text
endpoint_id = ?
ORDER BY observed_at DESC
LIMIT 3
```

Supporting index:

```text
measurements(endpoint_id, observed_at DESC)
```

---

## 9. D1 cost review

Periodically inspect D1 Insights and compare actual behaviour with expected query shapes.

Investigate when rows read increase unexpectedly, route latency increases, a new aggregate is introduced, monitoring cadence changes, D1 quota use changes sharply, or a regression test must be modified.

Do not treat cache hit rate as proof that an origin query is efficient.

---

## 10. Monitor health

Confirm:

- scheduled Worker execution;
- plausible last-cycle timestamp;
- enabled endpoints are being selected;
- new measurements are arriving;
- `current_endpoint_state` advances;
- `daily_endpoint_stats` advances; and
- freshness/incident processing continues.

---

## 11. Incident investigation

### External observed incident

Check recent measurements, error classification, outage eligibility, threshold state, open incident rows, recovery observations, rate limiting, and authentication behaviour.

### Observatory platform incident

Check GitHub Actions, deployed commit, Worker errors, D1 health, monitor health, query cost, public routes, and recent repository changes.

Keep publisher incidents separate from Observatory platform failures.

---

## 12. Rollback doctrine

Preferred sequence:

1. identify last known-good Git commit;
2. determine whether the problem is application code, migration, data, or external dependency;
3. avoid destructive DB rollback unless explicitly required;
4. restore code through Git and the protected deployment path;
5. verify deployed SHA;
6. run smoke tests;
7. verify D1 query behaviour; and
8. record the incident and recovery.

---

## 13. D1 recovery principle

Do not use:

```sql
DELETE FROM measurements
```

or:

```sql
DROP TABLE measurements
```

as a routine performance remedy.

Repair serving state, indexes, or bounded query shape instead.

---

## 14. Post-deployment acceptance

```text
[ ] expected commit merged to protected main
[ ] CI verify passed
[ ] deployment workflow succeeded
[ ] deployed SHA matches tested SHA
[ ] homepage returns successfully
[ ] /status returns successfully
[ ] /incidents returns successfully
[ ] /changes returns successfully
[ ] /api/v1/resources returns successfully
[ ] /api/v1/status returns successfully
[ ] /api/v1/incidents returns successfully
[ ] /api/v1/changes returns successfully
[ ] /openapi.json parses successfully
[ ] catalogue export parses successfully
[ ] transport and freshness remain independent
[ ] unknown values remain unknown
[ ] monitor health is plausible
[ ] current_endpoint_state is advancing
[ ] daily_endpoint_stats is advancing
[ ] representative EXPLAIN QUERY PLAN is acceptable
[ ] D1 rows-read behaviour is plausible
[ ] no public hot path scans raw measurement history
```

---

## 15. Cost regression response

If a public request unexpectedly reads a very large number of rows:

Do first:

1. identify the route;
2. identify its SQL;
3. obtain its query plan;
4. determine row-growth dimension;
5. compare against serving-table expectations;
6. inspect recent commits; and
7. preserve evidence.

Do not first delete historical measurements, hide the problem behind caching, disable monitoring without understanding cause, rewrite production history, or modify multiple architectural layers at once.

---

## 16. ARCHMAC workflow

```bash
git switch -c <branch>
npm run lint
npm run typecheck
npm run validate:catalogue
npm run test:unit
npm run build
```

Production-style Cloudflare development:

```bash
npm run dev:cloudflare
```

---

## 17. Termux

Android/Termux remains suitable for Git, catalogue editing, documentation, non-workerd tests, and GitHub Actions interaction.

Cloudflare workerd/Wrangler runtime tasks should be performed on ARCHMAC or hosted CI.

See [`TERMUX.md`](TERMUX.md).

---

## Related documents

- [`../README.md`](../README.md)
- [`../ARCHITECTURE.md`](../ARCHITECTURE.md)
- [`D1-COST-INVARIANT.md`](D1-COST-INVARIANT.md)
- [`TERMUX.md`](TERMUX.md)
- [`../METHODOLOGY.md`](../METHODOLOGY.md)
- [`../SECURITY.md`](../SECURITY.md)
