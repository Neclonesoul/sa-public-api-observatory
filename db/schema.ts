// Intentionally empty by default.
// Add Drizzle tables here when the site actually needs a database.
// See examples/d1/db/schema.ts for an opt-in example.
import { index, integer, primaryKey, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const organisations = sqliteTable("organisations", {
  id: text("id").primaryKey(), slug: text("slug").notNull(), name: text("name").notNull(),
  publisherClass: text("publisher_class").notNull(), website: text("website").notNull(),
}, (table) => [uniqueIndex("organisations_slug_idx").on(table.slug)]);

export const resources = sqliteTable("resources", {
  id: text("id").primaryKey(), slug: text("slug").notNull(), name: text("name").notNull(), description: text("description").notNull(),
  organisationId: text("organisation_id").notNull(), ecosystemUniverse: text("ecosystem_universe").notNull(),
  publisherClass: text("publisher_class").notNull(), accessClass: text("access_class").notNull(), resourceType: text("resource_type").notNull(),
  documentationUrl: text("documentation_url").notNull(), baseUrl: text("base_url"), verificationStatus: text("verification_status").notNull(),
  verifiedAt: text("verified_at").notNull(), retiredAt: text("retired_at"),
}, (table) => [uniqueIndex("resources_slug_idx").on(table.slug)]);

export const endpoints = sqliteTable("endpoints", {
  id: text("id").primaryKey(), resourceId: text("resource_id").notNull(), url: text("url").notNull(), method: text("method").notNull().default("GET"),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(false), intervalSeconds: integer("interval_seconds").notNull().default(900), timeoutMs: integer("timeout_ms").notNull().default(10000),
});

export const candidates = sqliteTable("candidates", {
  id: text("id").primaryKey(), name: text("name").notNull(), documentationUrl: text("documentation_url"), status: text("status").notNull().default("discovered"),
  sourceExternalId: text("source_external_id"), sourceFirstSeen: text("source_first_seen"), sourceLastSeen: text("source_last_seen"), sourceHash: text("source_hash"), sourcePresence: text("source_presence").notNull().default("present"),
});

export const measurements = sqliteTable("measurements", {
  id: text("id").primaryKey(), endpointId: text("endpoint_id").notNull(), observedAt: text("observed_at").notNull(), success: integer("success", { mode: "boolean" }).notNull(),
  httpStatus: integer("http_status"), latencyMs: real("latency_ms"), responseBytes: integer("response_bytes"), contentType: text("content_type"),
  validationResult: text("validation_result").notNull(), errorClass: text("error_class"), payloadHash: text("payload_hash"), schemaHash: text("schema_hash"), freshnessTimestamp: text("freshness_timestamp"),
});

export const incidents = sqliteTable("incidents", {
  id: text("id").primaryKey(), resourceId: text("resource_id").notNull(), endpointId: text("endpoint_id").notNull(), startedAt: text("started_at").notNull(), endedAt: text("ended_at"),
  classification: text("classification").notNull(), firstError: text("first_error").notNull(), lastError: text("last_error").notNull(), probeCount: integer("probe_count").notNull().default(1), recoveryObservation: text("recovery_observation"),
});

export const freshnessObservations = sqliteTable("freshness_observations", {
  id: text("id").primaryKey(), resourceId: text("resource_id").notNull(), observedAt: text("observed_at").notNull(), state: text("state").notNull(), extractedTimestamp: text("extracted_timestamp"), strategy: text("strategy").notNull(),
});

export const schemaVersions = sqliteTable("schema_versions", {
  id: text("id").primaryKey(), endpointId: text("endpoint_id").notNull(), schemaHash: text("schema_hash").notNull(), firstSeen: text("first_seen").notNull(), lastSeen: text("last_seen").notNull(), fieldCount: integer("field_count").notNull(),
});

export const systemState = sqliteTable("system_state", {
  key: text("key").primaryKey(), value: text("value").notNull(), updatedAt: text("updated_at").notNull(),
});

// Materialized operational state.
//
// measurements remains immutable append-only evidence.
// This table contains only the latest derived state per endpoint.
export const currentEndpointState = sqliteTable(
  "current_endpoint_state",
  {
    endpointId: text("endpoint_id").primaryKey(),
    resourceId: text("resource_id").notNull(),
    measurementId: text("measurement_id").notNull(),

    success: integer("success", { mode: "boolean" }).notNull(),
    httpStatus: integer("http_status"),
    latencyMs: real("latency_ms"),

    validationResult: text("validation_result").notNull(),
    errorClass: text("error_class"),

    schemaHash: text("schema_hash"),

    observedAt: text("observed_at").notNull(),
  },
  (table) => [
    index("current_endpoint_state_resource_observed_idx").on(
      table.resourceId,
      table.observedAt,
    ),
  ],
);

// Compact historical aggregate.
//
// Kept at endpoint granularity so public aggregation can continue to honour
// the enabled endpoint boundary without reading raw measurement history.
export const dailyEndpointStats = sqliteTable(
  "daily_endpoint_stats",
  {
    day: text("day").notNull(),
    endpointId: text("endpoint_id").notNull(),
    resourceId: text("resource_id").notNull(),

    measurements: integer("measurements").notNull().default(0),
    successes: integer("successes").notNull().default(0),

    latencySum: real("latency_sum").notNull().default(0),
    latencySamples: integer("latency_samples").notNull().default(0),
  },
  (table) => [
    primaryKey({ columns: [table.day, table.endpointId] }),
    index("daily_endpoint_stats_resource_day_idx").on(
      table.resourceId,
      table.day,
    ),
    index("daily_endpoint_stats_day_idx").on(table.day),
  ],
);
