# 🇿🇦 SA Public API Observatory

**Find the API. See if it works. See if the data is fresh. Build.**

An open-source catalogue and observatory for South African public data infrastructure and the wider ZA API ecosystem.

| Signal | Initial build |
| --- | ---: |
| Public infrastructure verified | 30+ |
| ZA APIs catalogued | 3 |
| 30-day infrastructure uptime | Not yet observed |
| Active incidents | No observations yet |
| Catalogue build | Validated in CI |
| Code / original metadata | MIT / CC0-1.0 intent, subject to third-party rights |

The repository encodes a hard architectural boundary:

- `public-infrastructure` — national, provincial, municipal, regulatory, public-institution and clearly identified civic infrastructure. This population alone supplies national metrics.
- `za-api-ecosystem` — commercial and community developer APIs. Useful for discovery, never included in the national public-infrastructure score.

Production does not contain fictional uptime. New resources begin as **Not yet observed**. Measurement rows are append-only facts.

## Repository map

```text
app/                  web surfaces and /api/v1
catalogue/            reviewed YAML and candidate boundary
packages/             pure catalogue, monitoring, freshness and scoring logic
workers/monitor/      scheduled Cloudflare probe worker
db/ + drizzle/        D1 schema and migrations
public/schemas/       JSON Schema contracts
scripts/              import, validation, export and seed tools
docs/                 operations and Termux handoff
```

## Local development

Requires Node 22+.

```bash
npm ci
npm run validate:catalogue
npm run typecheck
npm test
```

See [docs/TERMUX.md](docs/TERMUX.md) and [ARCHITECTURE.md](ARCHITECTURE.md).

## Machine access

- `/api/v1/resources`
- `/api/v1/status/public-infrastructure`
- `/catalogue.json`, `/catalogue.csv`, `/catalogue.yaml`, `/catalogue.ndjson`
- `/.well-known/public-api-observatory.json`
- `/openapi.json`

[`sinditech/public-apis-za`](https://github.com/sinditech/public-apis-za) is an attributed discovery source. Imported entries enter `catalogue/candidates/`; they cannot silently mutate verified resources or production probes.
