export const INSERT_MEASUREMENT_SQL = `
  INSERT INTO measurements (
    id,
    endpoint_id,
    observed_at,
    success,
    http_status,
    latency_ms,
    response_bytes,
    content_type,
    validation_result,
    error_class,
    payload_hash,
    schema_hash,
    freshness_timestamp
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`;

export const UPSERT_CURRENT_ENDPOINT_STATE_SQL = `
  INSERT INTO current_endpoint_state (
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
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)

  ON CONFLICT(endpoint_id) DO UPDATE SET
    resource_id = excluded.resource_id,
    measurement_id = excluded.measurement_id,
    success = excluded.success,
    http_status = excluded.http_status,
    latency_ms = excluded.latency_ms,
    validation_result = excluded.validation_result,
    error_class = excluded.error_class,
    schema_hash = COALESCE(excluded.schema_hash, current_endpoint_state.schema_hash),
    observed_at = excluded.observed_at
`;

export const UPSERT_DAILY_ENDPOINT_STATS_SQL = `
  INSERT INTO daily_endpoint_stats (
    day,
    endpoint_id,
    resource_id,
    measurements,
    successes,
    latency_sum,
    latency_samples
  )
  VALUES (?, ?, ?, ?, ?, ?, ?)

  ON CONFLICT(day, endpoint_id) DO UPDATE SET
    resource_id = excluded.resource_id,
    measurements =
      daily_endpoint_stats.measurements + excluded.measurements,
    successes =
      daily_endpoint_stats.successes + excluded.successes,
    latency_sum =
      daily_endpoint_stats.latency_sum + excluded.latency_sum,
    latency_samples =
      daily_endpoint_stats.latency_samples + excluded.latency_samples
`;
