# SA Public API Observatory

> **Find the API. See if it works. See if the data is fresh. Build.**

**Independent observability for South African public-data infrastructure.**

**Production:** https://api-observatory-za.tysonbarnes.co.uk  
**Stable release:** `v1.0.0`

The SA Public API Observatory is a public, machine-readable catalogue and independent observability system for South African public-data infrastructure and the wider ZA API ecosystem.

It answers three separate questions:

1. **What public-data infrastructure exists?**
2. **Is it actually working?**
3. **Is the data being served still current?**

Publication, transport availability, and data freshness are deliberately treated as different facts.

An endpoint returning HTTP `200` does **not** necessarily mean its data is current.

---

## Why this exists

Public APIs, statistical systems, GIS services, and open-data portals are increasingly important infrastructure.

But discovering that an API exists is not enough.

A useful public-data system also needs to answer:

- Is the endpoint reachable?
- Is the payload structurally valid?
- How reliable has it been?
- Is authentication unexpectedly required?
- Is it rate-limited?
- Is the published data fresh?
- Has its interface or schema changed?
- Is there an active incident?
- When did it recover?
- What evidence supports the current status?

The Observatory records those observations independently rather than simply repeating publisher claims.

**Unknown information remains unknown. Historical observations are never fabricated.**

---

## Who it is for

The Observatory is intended for:

- software developers integrating South African public data
- data journalists and investigative researchers
- academics and policy researchers
- civic-tech projects
- government and public-sector technical teams
- businesses that depend on public information
- automated systems and AI agents that need machine-readable trust signals

---

## Two explicit universes

The catalogue deliberately separates two populations.

### Public Data Infrastructure

Resources classified as:

~~~text
public-infrastructure
~~~

These form the population used for national availability and freshness statistics.

Examples include infrastructure published by:

- National Treasury
- South African Reserve Bank
- Statistics South Africa
- Electoral Commission of South Africa
- DPME
- DFFE
- provincial government GIS systems

### Wider ZA API Ecosystem

Resources classified as:

~~~text
za-api-ecosystem
~~~

These include useful South African commercial and developer APIs.

They remain discoverable through the Observatory but **never contaminate national public-infrastructure statistics**.

---

## What the Observatory observes

~~~text
Official public-data source
          │
          ▼
   Verified catalogue
          │
          ▼
    Scheduled probes
          │
    ┌─────┼─────┐
    ▼     ▼     ▼
Transport Freshness Schema
    │     │     │
    └─────┼─────┘
          ▼
 Append-only measurements
          │
    ┌─────┼──────────┐
    ▼     ▼          ▼
Incidents Recovery  Changes
          │
          ▼
 Historical evidence
          │
    ┌─────┼────────────┐
    ▼     ▼            ▼
 Website API      OpenAPI / exports
~~~

---

## Production capabilities

`v1.0.0` includes:

- verified South African public-data and API catalogue
- explicit public-infrastructure and ecosystem boundaries
- scheduled Cloudflare Worker monitoring
- bounded concurrent probing
- SSRF-safe probe URL validation
- append-only production measurements
- HTTP status observations
- latency measurements
- payload validation
- payload hashing
- structural schema hashing
- observed 30-day availability
- consecutive-failure incident thresholds
- incident opening and continuation
- recovery detection and incident closure
- active and resolved incident history
- publisher-specific freshness extraction
- independent `fresh`, `due`, `late`, `stale`, and `unknown` states
- structural/schema-change detection
- live National API Pulse
- live per-resource observability pages
- machine-readable observability API
- OpenAPI 3.1 specification
- JSON, CSV, YAML, and NDJSON catalogue exports
- automated upstream candidate discovery
- review-only candidate workflow
- CI-gated automatic Cloudflare production deployment
- protected production branch with required CI verification

---

## Evidence model

The Observatory distinguishes between **publisher claims** and **independent observations**.

### Publisher claims

Examples include:

- documentation URLs
- licence statements
- authentication requirements
- declared formats
- publisher identity
- API or portal descriptions

### Observatory observations

Examples include:

- HTTP response status
- latency
- payload validity
- structural signature
- extracted freshness timestamp
- observed availability
- outage
- recovery
- schema change

The two are never silently conflated.

---

## Transport is not freshness

These states are intentionally independent.

A resource can be:

~~~text
TRANSPORT: operational
FRESHNESS: stale
~~~

or:

~~~text
TRANSPORT: down
FRESHNESS: unknown
~~~

or:

~~~text
TRANSPORT: operational
FRESHNESS: fresh
~~~

The Observatory does not infer freshness merely because an endpoint responds successfully.

---

## Incident lifecycle

A single failed request does not automatically constitute an outage.

Current methodology:

~~~text
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
~~~

Authentication-required and rate-limited responses are represented separately from transport outages.

Incident history is derived exclusively from production observations.

---

## Freshness

Freshness is calculated only where there is a defensible publisher-specific extraction strategy.

Current examples include:

- eTenders OCDS release dates
- SARB indicator dates

Resources without reliable freshness evidence remain:

~~~text
unknown
~~~

rather than being guessed.

---

## Schema observatory

For JSON payloads, the monitor computes structural signatures.

When a successful observation produces a structural signature different from the previous valid observation, the Observatory records an append-only change event.

Publisher payload contents are not retained merely to create schema history.

Relevant surfaces:

~~~text
/changes
/api/v1/changes
~~~

---

## Public API

Examples:

~~~http
GET /api/v1/resources
GET /api/v1/resources/treasury-etenders-ocds
GET /api/v1/resources?universe=public-infrastructure

GET /api/v1/status
GET /api/v1/status/public-infrastructure
GET /api/v1/status/ecosystem

GET /api/v1/incidents
GET /api/v1/changes
~~~

A resource response can include live observability evidence:

~~~json
{
  "observability": {
    "latest_transport": {
      "success": true,
      "http_status": 200,
      "latency_ms": 4763
    },
    "availability_30d": 99.55,
    "freshness": {
      "state": "fresh",
      "extracted_timestamp": "2026-08-24T00:00:00.000Z"
    },
    "active_incidents": 0,
    "incident_history": []
  }
}
~~~

---

## Machine-readable surfaces

The project is designed to be useful without HTML scraping.

~~~text
/openapi.json
/catalogue.json
/catalogue.csv
/catalogue.yaml
/catalogue.ndjson
/public-infrastructure.json
/za-api-ecosystem.json
/.well-known/public-api-observatory.json
~~~

JSON Schemas are published under:

~~~text
/schemas/
~~~

---

## Architecture

The production system uses:

- TypeScript
- React
- Cloudflare Workers
- Cloudflare D1
- scheduled Worker triggers
- GitHub Actions
- OpenAPI 3.1

Key areas:

~~~text
app/                    Web UI + HTTP API
components/             Shared UI
packages/catalogue/     Canonical verified catalogue
packages/monitor-core/  Monitoring and status logic
packages/shared/        Shared domain types
workers/monitor/        Scheduled production monitor
drizzle/                D1 schema and migrations
scripts/                Import, validation and seed tooling
tests/                  Domain and importer regression tests
~~~

---

## Production deployment

Production follows:

~~~text
push main
    ↓
GitHub CI
    ↓
verify passes
    ↓
Deploy production
    ↓
Cloudflare
    ↓
api-observatory-za.tysonbarnes.co.uk
~~~

The tested commit is what gets deployed.

The `main` branch is protected and requires the real CI `verify` check.

Force pushes and branch deletion are disabled.

---

## Upstream discovery

The Observatory watches `sinditech/public-apis-za` as one discovery source for candidate APIs.

Discovery does **not** imply verification.

~~~text
upstream source
    ↓
candidate parser
    ↓
reject malformed and repository-navigation entries
    ↓
genuine candidate diff
    ↓
review pull request
    ↓
manual verification
~~~

No verified resource or monitoring configuration is modified automatically.

If there are no genuine candidates, no pull request is opened.

---

## Methodological principles

The project follows several hard rules:

- verified catalogue data and observations remain separate
- public infrastructure and commercial ecosystem resources remain separate
- measurements are append-only facts
- unknown values remain unknown
- outages are not invented
- freshness is not inferred from transport success
- historical availability is not backfilled
- automated discovery never equals verification
- publisher payloads are processed conservatively
- monitoring must avoid becoming abusive traffic
- working production behaviour is treated as a contract

See the live methodology:

https://api-observatory-za.tysonbarnes.co.uk/methodology

---

## Local development

Install dependencies:

~~~bash
npm ci
~~~

Run the verification suite:

~~~bash
npm run lint
npm run typecheck
npm run test:unit
npm run build
~~~

Production Cloudflare builds and deployments run on Linux through GitHub Actions.

### Android / Termux

Android/Termux is supported for repository work, tests, Git, and GitHub workflows.

Cloudflare's local `workerd` runtime does not support Android ARM64, so production Wrangler build/deploy operations are intentionally executed on the GitHub Linux runner.

See [`docs/TERMUX.md`](docs/TERMUX.md).

---

## Further documentation

- [`ARCHITECTURE.md`](ARCHITECTURE.md)
- [`docs/TERMUX.md`](docs/TERMUX.md)
- [`DATA-LICENCE.md`](DATA-LICENCE.md)
- [`ATTRIBUTION.md`](ATTRIBUTION.md)
- [`SECURITY.md`](SECURITY.md)
- [`CONTRIBUTING.md`](CONTRIBUTING.md)

---

## Licensing

Project code is covered by [`LICENSE`](LICENSE).

Original catalogue metadata and data-specific licensing are documented separately in [`DATA-LICENCE.md`](DATA-LICENCE.md).

Third-party sources and discovery datasets remain subject to their respective rights and attribution requirements documented in [`ATTRIBUTION.md`](ATTRIBUTION.md).

---

## Current scope

`v1.0.0` focuses on South Africa.

South Africa is the reference implementation for a broader idea:

> **Independent observability infrastructure for public data.**

A future country-neutral Observatory Engine could allow the same architecture to support additional national catalogues without maintaining separate forks.

That is future direction, not a claim about current production coverage.

---

## Contributing

Useful contributions include:

- identifying missing official public-data resources
- supplying authoritative documentation
- reporting catalogue errors
- proposing safe monitoring strategies
- adding freshness extraction strategies
- adding regression tests
- improving methodology
- improving machine-readable schemas

Discovery evidence should be reproducible and preferably come from official publisher sources.

Automated discovery is a lead-generation mechanism only. Verification remains a deliberate review step.

---

## Production

**SA Public API Observatory**  
https://api-observatory-za.tysonbarnes.co.uk

**Stable release:** `v1.0.0`
