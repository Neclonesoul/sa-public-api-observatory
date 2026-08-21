CREATE TABLE `candidates` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`documentation_url` text,
	`status` text DEFAULT 'discovered' NOT NULL,
	`source_external_id` text,
	`source_first_seen` text,
	`source_last_seen` text,
	`source_hash` text,
	`source_presence` text DEFAULT 'present' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `endpoints` (
	`id` text PRIMARY KEY NOT NULL,
	`resource_id` text NOT NULL,
	`url` text NOT NULL,
	`method` text DEFAULT 'GET' NOT NULL,
	`enabled` integer DEFAULT false NOT NULL,
	`interval_seconds` integer DEFAULT 900 NOT NULL,
	`timeout_ms` integer DEFAULT 10000 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `freshness_observations` (
	`id` text PRIMARY KEY NOT NULL,
	`resource_id` text NOT NULL,
	`observed_at` text NOT NULL,
	`state` text NOT NULL,
	`extracted_timestamp` text,
	`strategy` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `incidents` (
	`id` text PRIMARY KEY NOT NULL,
	`resource_id` text NOT NULL,
	`endpoint_id` text NOT NULL,
	`started_at` text NOT NULL,
	`ended_at` text,
	`classification` text NOT NULL,
	`first_error` text NOT NULL,
	`last_error` text NOT NULL,
	`probe_count` integer DEFAULT 1 NOT NULL,
	`recovery_observation` text
);
--> statement-breakpoint
CREATE TABLE `measurements` (
	`id` text PRIMARY KEY NOT NULL,
	`endpoint_id` text NOT NULL,
	`observed_at` text NOT NULL,
	`success` integer NOT NULL,
	`http_status` integer,
	`latency_ms` real,
	`response_bytes` integer,
	`content_type` text,
	`validation_result` text NOT NULL,
	`error_class` text,
	`payload_hash` text,
	`schema_hash` text,
	`freshness_timestamp` text
);
--> statement-breakpoint
CREATE TABLE `organisations` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`publisher_class` text NOT NULL,
	`website` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `organisations_slug_idx` ON `organisations` (`slug`);--> statement-breakpoint
CREATE TABLE `resources` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`organisation_id` text NOT NULL,
	`ecosystem_universe` text NOT NULL,
	`publisher_class` text NOT NULL,
	`access_class` text NOT NULL,
	`resource_type` text NOT NULL,
	`documentation_url` text NOT NULL,
	`base_url` text,
	`verification_status` text NOT NULL,
	`verified_at` text NOT NULL,
	`retired_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `resources_slug_idx` ON `resources` (`slug`);--> statement-breakpoint
CREATE TABLE `schema_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`endpoint_id` text NOT NULL,
	`schema_hash` text NOT NULL,
	`first_seen` text NOT NULL,
	`last_seen` text NOT NULL,
	`field_count` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `system_state` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` text NOT NULL
);
