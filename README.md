# SA Public API Observatory

> **Find the API. See if it works. See if the data is fresh. Build.**

**Independent observability for South African public-data infrastructure.**

**Production:** https://api-observatory-za.tysonbarnes.co.uk  
**Stable release:** `v1.0.0`

The **SA Public API Observatory** is a public, machine-readable catalogue and independent observability system for South African public-data infrastructure and the wider ZA API ecosystem.

It separates three questions that are often incorrectly collapsed into one:

1. **What public-data infrastructure exists?**
2. **Is the interface operational?**
3. **Is the information being served still current?**

An endpoint returning HTTP `200` does not prove that its data is fresh.

The Observatory records evidence rather than repeating publisher claims and does not invent historical observations where none exist.

---

## Why this exists

Finding an API is only the beginning.

A production consumer also needs to know whether the endpoint is reachable, whether the payload is structurally valid, how reliable it has been over an observed window, whether authentication is unexpectedly required, whether the service is being rate limited, whether the published information is current, whether its interface or schema has changed, whether an incident is active, whether a previous incident recovered, and what evidence supports the current state.

The Observatory makes those observations independently and exposes them to humans and machines.

---

## Current capabilities

The production system includes:

- verified South African public-data and API catalogue;
- explicit `public-infrastructure` and `za-api-ecosystem` universes;
- scheduled Cloudflare Worker monitoring;
- bounded concurrent probing;
- SSRF-safe probe URL validation;
- append-only measurement evidence;
- HTTP status and latency observations;
- response-size and payload validation;
- payload and structural schema hashing;
- publisher-specific freshness extraction;
- `fresh`, `due`, `late`, `stale`, and `unknown` freshness states;
- 30-day observed availability;
- consecutive-failure incident thresholds;
- incident opening, continuation, recovery, and closure;
- structural/schema-change detection;
- live National API Pulse;
- live per-resource observability;
- versioned `/api/v1` surfaces;
- OpenAPI 3.1;
- JSON, CSV, YAML, and NDJSON exports;
- automated upstream candidate discovery;
- review-only candidate promotion;
- CI-gated Cloudflare production deployment; and
- D1 cost-regression safeguards.

---

## Two explicit universes

### Public Data Infrastructure

Resources classified as:

```text
public-infrastructure
```

This is the population used for national availability and freshness statistics.

### Wider ZA API Ecosystem

Resources classified as:

```text
za-api-ecosystem
```

This includes useful South African commercial and developer APIs.

These resources remain discoverable but do **not** enter national public-infrastructure statistics.

Universe membership is explicit catalogue data. It is not inferred from a UI filter, category, or publisher name.

---

## Evidence and serving architecture

The Observatory deliberately separates durable historical evidence from bounded operational serving state.

```text
PUBLIC SOURCE
     │
     ▼
SAFE / BOUNDED MONITOR
     │
     ├──────────────► measurements
     │                APPEND-ONLY EVIDENCE
     │
     ├──────────────► current_endpoint_state
     │                LATEST SERVING STATE
     │
     └──────────────► daily_endpoint_stats
                      BOUNDED HISTORICAL SERVING DATA
                              │
                              ▼
                         PUBLIC QUERIES
                              │
                         API / WEBSITE
```

`measurements` is the durable observation history.

Public current-state and availability paths do not derive routine responses by rescanning lifetime measurement history. They use materialized current state and compact daily rollups instead.

This is a core architectural boundary, not merely an optimization.

See:

- [`ARCHITECTURE.md`](ARCHITECTURE.md)
- [`docs/D1-COST-INVARIANT.md`](docs/D1-COST-INVARIANT.md)
- [`docs/OPERATIONS.md`](docs/OPERATIONS.md)

---

## Core engineering invariant

> **Public request cost must scale with the monitored resource/endpoint universe or explicitly requested time window—not with lifetime measurement history.**

Historical evidence remains append-only.

The serving architecture exists specifically so preserving that evidence does not make ordinary public requests progressively more expensive as the measurement table grows.

The scheduled monitor may read narrowly bounded evidence when required for a state transition. For example, incident evaluation reads only the latest three observations for a single endpoint.

Unbounded historical scans on public hot paths are forbidden and protected by regression tests.

---

## Transport is not freshness

Transport and freshness are independent observations.

A resource can be `operational` while freshness is `stale`, or transport can be `down` while freshness is `unknown`.

The Observatory does not infer freshness from transport success.

---

## Measurements

Measurements are append-only observational facts.

Stored evidence can include observation timestamp, success/failure, HTTP status, latency, response size, content type, payload validation result, error classification, payload hash, schema hash, and extracted freshness timestamp.

Historical observations are not rewritten to improve availability scores.

---

## Incident lifecycle

A single failed request does not automatically constitute an outage.

Current production methodology requires three consecutive outage-eligible failures before an incident opens.

```text
failed observation
        ↓
failed observation
        ↓
failed observation
        ↓
incident opens
        ↓
continued observations
        ↓
successful recovery observation
        ↓
incident closes
```

Authentication-required and rate-limited responses remain measurements but do not automatically become transport outage incidents.

---

## Freshness

Freshness is calculated only where a defensible extraction strategy exists.

Unknown information remains `unknown` rather than being guessed.

---

## Structural change observatory

For JSON payloads, the monitor can compute structural signatures. When a successful observation produces a structural signature different from the prior valid observation, the Observatory records an append-only change event.

Relevant surfaces:

```text
/changes
/api/v1/changes
```

---

## Public API

```http
GET /api/v1/resources
GET /api/v1/resources/treasury-etenders-ocds
GET /api/v1/resources?universe=public-infrastructure
GET /api/v1/status
GET /api/v1/status/public-infrastructure
GET /api/v1/status/ecosystem
GET /api/v1/incidents
GET /api/v1/changes
```

---

## Machine-readable surfaces

```text
/openapi.json
/catalogue.json
/catalogue.csv
/catalogue.yaml
/catalogue.ndjson
/public-infrastructure.json
/za-api-ecosystem.json
/.well-known/public-api-observatory.json
/schemas/
```

---

## Production architecture

Primary technologies:

- TypeScript
- React
- Vinext/Vite
- Cloudflare Workers
- Cloudflare D1
- Cloudflare R2
- scheduled Worker triggers
- Drizzle schema/migrations
- GitHub Actions
- OpenAPI 3.1

Key repository areas:

```text
app/                    Web UI + HTTP API
components/             Shared UI
packages/catalogue/     Canonical verified catalogue
packages/freshness/     Freshness classification
packages/monitor-core/  Monitoring/status/persistence logic
packages/shared/        Shared domain types
workers/monitor/        Scheduled production monitor
db/                     Database schema
drizzle/                D1 migrations
scripts/                Validation, import and seed tooling
tests/                  Domain, importer, rendering and cost guards
```

---

## D1 serving model

### `measurements`

Immutable historical evidence.

### `current_endpoint_state`

One latest derived operational state per endpoint.

### `daily_endpoint_stats`

Compact endpoint/day aggregates used for bounded historical availability calculations without rescanning raw measurement history.

The migration introducing this serving model is `drizzle/0002_d1_read_cost_remediation.sql`.

The regression policy is enforced by `tests/d1-cost-regression.test.ts`.

---

## Caching

Selected live public responses use short public cache windows, including `stale-while-revalidate`.

Caching is a secondary protection. It does **not** excuse expensive database query shapes: an uncached request must still obey the D1 cost invariant.

---

## Production deployment

```text
push / merge to main
        ↓
GitHub Actions: CI
        ↓
required verify job succeeds
        ↓
Deploy production workflow
        ↓
checkout exact tested commit
        ↓
build
        ↓
Cloudflare deployment
```

The repository's protected `main` branch requires the `verify` check.

---

## Local development

```bash
npm run lint
npm run typecheck
npm run validate:catalogue
npm run test:unit
npm run build
```

Full local test path:

```bash
npm test
```

ARCHMAC can run:

```bash
npm run dev:cloudflare
```

See [`docs/TERMUX.md`](docs/TERMUX.md) for Android/Termux constraints.

---

## Operations

See [`docs/OPERATIONS.md`](docs/OPERATIONS.md).

---

## Methodological guarantees

- catalogue claims and Observatory observations remain distinct;
- public infrastructure and commercial ecosystem resources remain distinct;
- measurements are append-only evidence;
- unknown values remain unknown;
- freshness is not inferred from transport success;
- historical availability is not backfilled;
- automated discovery never equals verification;
- monitoring must remain bounded and non-abusive;
- public serving paths must not scale with lifetime measurement history; and
- working production behaviour is treated as a contract.

Live methodology:

https://api-observatory-za.tysonbarnes.co.uk/methodology

---

## Documentation

- [`ARCHITECTURE.md`](ARCHITECTURE.md)
- [`docs/D1-COST-INVARIANT.md`](docs/D1-COST-INVARIANT.md)
- [`docs/OPERATIONS.md`](docs/OPERATIONS.md)
- [`docs/TERMUX.md`](docs/TERMUX.md)
- [`METHODOLOGY.md`](METHODOLOGY.md)
- [`DATA-LICENCE.md`](DATA-LICENCE.md)
- [`ATTRIBUTION.md`](ATTRIBUTION.md)
- [`SECURITY.md`](SECURITY.md)
- [`CONTRIBUTING.md`](CONTRIBUTING.md)

---

## Licence

Project code is licensed under the [`MIT License`](LICENSE).

---

## Scope

`v1.0.0` focuses on South Africa.

South Africa is the reference implementation for a broader idea:

> **Independent observability infrastructure for public data.**
