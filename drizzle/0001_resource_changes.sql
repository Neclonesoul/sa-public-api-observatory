CREATE TABLE IF NOT EXISTS resource_changes (
  id TEXT PRIMARY KEY NOT NULL,
  resource_id TEXT NOT NULL,
  endpoint_id TEXT NOT NULL,
  measurement_id TEXT NOT NULL,
  observed_at TEXT NOT NULL,
  change_type TEXT NOT NULL,
  previous_hash TEXT,
  current_hash TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS resource_changes_measurement_type_idx
ON resource_changes (measurement_id, change_type);

CREATE INDEX IF NOT EXISTS resource_changes_resource_observed_idx
ON resource_changes (resource_id, observed_at DESC);
