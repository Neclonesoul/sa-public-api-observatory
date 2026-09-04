# Changelog


## Documentation hardening — 2026-09-04

- Document the post-v1.0 evidence/serving architecture.
- Record `current_endpoint_state` and `daily_endpoint_stats` as bounded D1 serving structures.
- Establish the public-request D1 cost invariant.
- Record the approximately 70M-row-read production failure as an engineering case study.
- Add the production operations and D1 verification runbook.
- Preserve append-only measurement history as a hard architectural rule.

## [0.1.1] - 2026-08-21

### Production

- Deployed the Observatory to `api-observatory-za.tysonbarnes.co.uk`.
- Activated Cloudflare D1-backed production catalogue and measurement storage.
- Activated the scheduled `sa-api-observatory-monitor` Worker at 15-minute intervals.
- Added the initial seven-endpoint monitored public-infrastructure cohort.
- Connected `/api/v1/status` to real append-only production measurements.
- Connected the National API Pulse homepage to live measurements.
- Preserved the hard `public-infrastructure` / `za-api-ecosystem` metric boundary.
- Bound the production R2 export bucket.
- Corrected Vinext/Cloudflare binding and Worker entrypoint configuration.
- Confirmed production catalogue, API, OpenAPI, exports, PWA assets and monitoring endpoints.


## 0.1.0 — 2026-08-21

- Established the explicit two-universe model.
- Added verified official resources, candidate importer and provenance.
- Added searchable catalogue, detail pages and National API Pulse.
- Added `/api/v1`, OpenAPI, JSON Schema and exports.
- Added D1 schema, scheduled probe core, SSRF checks, PWA and CI.
- Preserved unknown status rather than fabricating measurements.
