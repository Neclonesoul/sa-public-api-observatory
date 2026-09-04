-- SA Public API Observatory
-- D1 read-cost remediation.
--
-- FORWARD ONLY / NON-DESTRUCTIVE.
--
-- Historical measurements remain append-only.
-- Public current-state requests must not scale with measurement history.

CREATE INDEX IF NOT EXISTS measurements_endpoint_observed_idx
ON measurements(endpoint_id, observed_at DESC);

CREATE INDEX IF NOT EXISTS freshness_observations_resource_observed_idx
ON freshness_observations(resource_id, observed_at DESC);

CREATE INDEX IF NOT EXISTS incidents_endpoint_ended_idx
ON incidents(endpoint_id, ended_at);

CREATE INDEX IF NOT EXISTS incidents_ended_idx
ON incidents(ended_at);

-- Already created by 0001 on existing deployments; retained here defensively.
CREATE INDEX IF NOT EXISTS resource_changes_resource_observed_idx
ON resource_changes(resource_id, observed_at DESC);

CREATE INDEX IF NOT EXISTS resource_changes_observed_idx
ON resource_changes(observed_at DESC);


-- ---------------------------------------------------------------------
-- MATERIALIZED CURRENT ENDPOINT STATE
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS current_endpoint_state (
  endpoint_id TEXT PRIMARY KEY NOT NULL,
  resource_id TEXT NOT NULL,
  measurement_id TEXT NOT NULL,

  success INTEGER NOT NULL,
  http_status INTEGER,
  latency_ms REAL,

  validation_result TEXT NOT NULL,
  error_class TEXT,

  schema_hash TEXT,

  observed_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS current_endpoint_state_resource_observed_idx
ON current_endpoint_state(resource_id, observed_at DESC);


-- ---------------------------------------------------------------------
-- COMPACT DAILY ROLLUPS
--
-- Endpoint granularity is deliberate. It preserves the existing
-- "enabled endpoint" filtering semantics while still reducing a 30-day
-- query from tens of thousands of measurements to ~30 rows/endpoint.
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS daily_endpoint_stats (
  day TEXT NOT NULL,
  endpoint_id TEXT NOT NULL,
  resource_id TEXT NOT NULL,

  measurements INTEGER NOT NULL DEFAULT 0,
  successes INTEGER NOT NULL DEFAULT 0,

  latency_sum REAL NOT NULL DEFAULT 0,
  latency_samples INTEGER NOT NULL DEFAULT 0,

  PRIMARY KEY(day, endpoint_id)
);

CREATE INDEX IF NOT EXISTS daily_endpoint_stats_resource_day_idx
ON daily_endpoint_stats(resource_id, day);

CREATE INDEX IF NOT EXISTS daily_endpoint_stats_day_idx
ON daily_endpoint_stats(day);


-- ---------------------------------------------------------------------
-- ONE-TIME CURRENT-STATE BACKFILL
--
-- This is intentionally the only ROW_NUMBER measurement-history scan.
-- It runs once during migration, never during public requests.
-- ---------------------------------------------------------------------

INSERT OR REPLACE INTO current_endpoint_state (
  endpoint_id,
  resource_id,
  measurement_id,
  success,
  http_status,
  latency_ms,
  validation_result,
  error_class,
  schema_hash,
  observed_at
)
SELECT
  endpoint_id,
  resource_id,
  measurement_id,
  success,
  http_status,
  latency_ms,
  validation_result,
  error_class,
  schema_hash,
  observed_at
FROM (
  SELECT
    m.endpoint_id,
    e.resource_id,
    m.id AS measurement_id,
    m.success,
    m.http_status,
    m.latency_ms,
    m.validation_result,
    m.error_class,
    m.schema_hash,
    m.observed_at,

    ROW_NUMBER() OVER (
      PARTITION BY m.endpoint_id
      ORDER BY m.observed_at DESC
    ) AS rn

  FROM measurements m
  INNER JOIN endpoints e
    ON e.id = m.endpoint_id
)
WHERE rn = 1;


-- ---------------------------------------------------------------------
-- ONE-TIME DAILY BACKFILL
-- ---------------------------------------------------------------------

INSERT OR REPLACE INTO daily_endpoint_stats (
  day,
  endpoint_id,
  resource_id,
  measurements,
  successes,
  latency_sum,
  latency_samples
)
SELECT
  substr(m.observed_at, 1, 10) AS day,
  m.endpoint_id,
  e.resource_id,

  COUNT(*) AS measurements,

  SUM(
    CASE
      WHEN m.success = 1 THEN 1
      ELSE 0
    END
  ) AS successes,

  COALESCE(SUM(m.latency_ms), 0) AS latency_sum,

  SUM(
    CASE
      WHEN m.latency_ms IS NULL THEN 0
      ELSE 1
    END
  ) AS latency_samples

FROM measurements m

INNER JOIN endpoints e
  ON e.id = m.endpoint_id

GROUP BY
  substr(m.observed_at, 1, 10),
  m.endpoint_id,
  e.resource_id;
