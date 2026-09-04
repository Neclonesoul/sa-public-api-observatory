# Architecture

## SA Public API Observatory

This document describes the production architecture of the SA Public API Observatory after the D1 read-cost remediation introduced at commit `f874ff7`.

The governing architectural distinction is:

> **Evidence is preserved independently from the structures used to serve routine public requests.**

That separation allows the Observatory to retain historical facts without making ordinary request cost grow with the lifetime of the project.

---

## 1. System responsibilities

The Observatory maintains a verified catalogue, safely probes enabled endpoints, preserves observation evidence, derives operational state, and exposes results through human and machine-readable interfaces.

---

## 2. Top-level data flow

```text
Official / verified public source
                │
                ▼
        Canonical catalogue
                │
                ▼
        Scheduled monitor
                │
         URL safety checks
                │
          bounded probe
                │
                ▼
        observation result
           /      |      \
          /       |       \
         ▼        ▼        ▼
measurements  current_   daily_
append-only   endpoint_  endpoint_stats
evidence      state      compact rollups
         \       |       /
          \      |      /
           \     |     /
              D1
               │
               ▼
      bounded public queries
               │
          ┌────┴────┐
          ▼         ▼
        website   /api/v1
```

---

## 3. Monitoring plane

The scheduled monitor under `workers/monitor/` performs URL safety validation, controlled HTTP(S) requests, timeout enforcement, response-size bounds, payload validation, transport classification, hashing, freshness extraction, measurement persistence, current-state updates, daily aggregate updates, incident lifecycle evaluation, schema-change detection, and monitor-cycle self-observation.

The monitor is permitted to use historical evidence only through narrow bounded query shapes required for state transitions.

For incident evaluation, the relevant history query is limited to the latest three observations for one endpoint.

---

## 4. Evidence plane

### `measurements`

Core append-only transport observation history.

Historical measurement rows are evidence. They are not rewritten or deleted to improve current presentation or availability scores.

### `freshness_observations`

Stores independently derived freshness state when a defensible freshness strategy exists.

### `incidents`

Records sustained failure episodes that meet the configured incident threshold.

### Schema versions and changes

Structural signatures allow independently observed interface changes without retaining publisher payloads merely to build schema history.

### `system_state`

Stores small operational state including monitor cycle information.

---

## 5. Serving plane

### `current_endpoint_state`

Contains the latest derived operational state for each endpoint.

Public current-state queries use this table rather than repeatedly rediscovering the latest row from `measurements`.

### `daily_endpoint_stats`

Contains compact day × endpoint aggregates including measurement count, success count, latency sum, and latency sample count.

This allows rolling availability calculations to operate over bounded aggregates rather than raw measurement history.

---

## 6. Evidence vs serving tables

| Responsibility | Evidence plane | Serving plane |
|---|---|---|
| Preserve raw observations | `measurements` | No |
| Latest endpoint status | Source evidence | `current_endpoint_state` |
| 30-day availability | Historical observations | `daily_endpoint_stats` |
| Auditability | High | Derived |
| Routine public hot path | Raw scans forbidden | Intended |
| Growth behaviour | Lifetime history | Endpoint/window bounded |

The serving plane is derived from evidence. It does not replace evidence.

---

## 7. D1 cost invariant

> **Public request cost must scale with the monitored resource/endpoint universe or explicitly requested time window—not with lifetime measurement history.**

See [`docs/D1-COST-INVARIANT.md`](docs/D1-COST-INVARIANT.md).

---

## 8. Persistence shape

The monitor persistence path performs:

1. append measurement evidence;
2. upsert current endpoint state; and
3. upsert endpoint/day aggregate.

Relevant implementation:

```text
packages/monitor-core/src/persistence.ts
workers/monitor/src/index.ts
```

---

## 9. Public serving paths

Important routes include:

```text
/api/v1/resources
/api/v1/resources/{id}
/api/v1/status
/api/v1/incidents
/api/v1/changes
```

The regression suite guards public hot paths against direct raw measurement queries.

---

## 10. Production deployment

```text
developer branch
      │
      ▼
pull request
      │
      ▼
CI / verify
      │
      ▼
protected main
      │
      ▼
CI on push to main
      │
      ▼
Deploy production workflow
      │
checkout exact workflow_run.head_sha
      │
      ▼
Cloudflare
```

---

## 11. Production failure already encountered

A public-serving query reached approximately **70 million rows read** at the worst observed point.

The root cause was coupling routine operational serving to raw historical measurement scans.

The remediation preserved evidence and introduced bounded serving structures.

```text
BEFORE

public request
     ↓
raw measurements
     ↓
historical scan
     ↓
response


AFTER

monitor
  ├──► measurements              evidence
  ├──► current_endpoint_state    current serving
  └──► daily_endpoint_stats      historical serving

public request
     ↓
bounded serving tables
     ↓
response
```

---

## 12. Architectural rules

1. Measurements remain append-only evidence.
2. Unknown values remain unknown.
3. Transport and freshness remain independent.
4. Automated discovery does not equal verification.
5. Public infrastructure and wider ecosystem populations remain distinct.
6. Probe traffic remains bounded and safety checked.
7. Public hot paths do not scan raw lifetime measurement history.
8. Monitor-side historical reads must be explicitly bounded.
9. Cache behaviour does not justify an unbounded query.
10. Serving-state changes require cost-regression tests.
11. Production deployment follows the exact tested commit.
12. Operational evidence is preserved before architecture is changed.

---

## Related documents

- [`README.md`](README.md)
- [`docs/D1-COST-INVARIANT.md`](docs/D1-COST-INVARIANT.md)
- [`docs/OPERATIONS.md`](docs/OPERATIONS.md)
- [`METHODOLOGY.md`](METHODOLOGY.md)
- [`SECURITY.md`](SECURITY.md)
