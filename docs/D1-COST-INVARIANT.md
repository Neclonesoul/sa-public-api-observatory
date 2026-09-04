# D1 Cost Invariant

## Purpose

This document records the database-cost invariant governing public request paths in the SA Public API Observatory.

It exists because the Observatory encountered a real production scaling failure in which a routine query could read approximately **70 million rows**.

The remediation was architectural rather than destructive: historical evidence was preserved, current state was materialized, historical availability was compacted into daily endpoint aggregates, public hot paths were moved away from raw measurement history, and regression tests were added.

---

## The invariant

> **Public request cost must scale with the monitored resource/endpoint universe or explicitly requested time window—not with lifetime measurement history.**

The number of rows in the evidence store should naturally increase over time. That growth must not make a normal request increasingly expensive merely because the system has existed longer.

---

## Evidence is not the problem

The `measurements` table is intentionally append-only.

It provides auditability, historical evidence, incident reconstruction, research value, reproducibility, and protection against retrospective rewriting.

The solution to database cost is not to delete evidence. The solution is to stop asking raw historical evidence to perform the role of a serving index.

---

## Serving architecture

### `measurements`

Purpose: append-only historical evidence.

Routine public hot-path historical scans: forbidden.

### `current_endpoint_state`

Purpose: latest derived state per endpoint.

Growth: approximately endpoint universe.

### `daily_endpoint_stats`

Purpose: compact day × endpoint aggregate.

Growth: days × endpoints.

---

## Allowed evidence reads

The invariant does not mean no code may ever read `measurements`.

Historical reads are permitted when they are operationally necessary, explicitly bounded, indexed for the exact query shape, and outside routine public aggregation paths where possible.

The incident lifecycle is the canonical example: the monitor reads only the latest three observations for one endpoint.

Supporting index:

```sql
ON measurements(endpoint_id, observed_at DESC)
```

---

## Production failure case study

### Symptom

Approximately:

```text
70,000,000 rows read
```

at the worst observed point.

### Root cause

Operational and rolling state was being reconstructed from raw historical measurement data.

### Remediation

Migration:

```text
drizzle/0002_d1_read_cost_remediation.sql
```

introduced/supports:

- `measurements_endpoint_observed_idx`;
- `current_endpoint_state`;
- `daily_endpoint_stats`;
- serving-state indexes; and
- backfill from existing evidence.

New observations now update all relevant layers:

```text
append measurement
      +
upsert current state
      +
upsert daily aggregate
```

---

## Regression controls

Automated guards live in:

```text
tests/d1-cost-regression.test.ts
```

They protect the following properties:

- public hot paths do not read raw measurement history;
- materialized serving structures remain in use;
- historical evidence remains preserved;
- incident lifecycle reads remain bounded; and
- the required endpoint/time index remains present.

---

## Query-review doctrine

For every material D1 query ask:

1. What dimension controls rows read?
2. Is it on a public hot path?
3. Does the index match the query shape?
4. Can the result be incrementally maintained?
5. Is caching merely hiding an expensive origin query?

Dangerous answer to question 1:

```text
however much history exists
```

---

## Expected complexity

Current state:

```text
O(enabled endpoints)
```

N-day availability:

```text
O(enabled endpoints × N days)
```

Incident threshold evaluation:

```text
O(1)
```

with respect to lifetime history.

---

## Operational verification

Production should periodically be checked using D1 Insights, rows-read metrics, `EXPLAIN QUERY PLAN`, representative public requests, and review after material changes to endpoint count or monitoring cadence.

See [`OPERATIONS.md`](OPERATIONS.md).

---

## Change-control requirement

Any change that causes a public route to query raw `measurements` must be treated as an architectural change requiring explicit justification, rows-read analysis, query-plan inspection, bounded complexity reasoning, regression coverage, review, and production verification.

The default response is to preserve the evidence plane and extend the serving plane instead.

---

## Summary

> **Evidence may grow indefinitely without forcing public request cost to grow with it.**

That property is part of the Observatory's production contract.
