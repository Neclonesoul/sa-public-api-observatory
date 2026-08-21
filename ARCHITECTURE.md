# Architecture

The web Worker serves catalogue pages, `/api/v1` and exports. D1 stores organisations, canonical resources, endpoints, candidates, append-only measurements, incidents, freshness observations, schema versions and self-observation state. R2 is reserved for versioned exports and archives.

The scheduled monitor reads reviewed endpoints, applies URL safety checks, performs bounded probes and appends measurements. Aggregation derives roll-ups without rewriting raw facts.

```text
seed catalogue → untrusted candidate → review → canonical resource
canonical resource → safe probe → append-only measurement → status/incident/freshness
```

Network, database, clocks and secrets remain at system boundaries. Freshness, status and scoring are deterministic transformations with explicit inputs and outputs.
