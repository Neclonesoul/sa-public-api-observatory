export type Universe = "public-infrastructure" | "za-api-ecosystem";

export type PublisherClass =
  | "national-government"
  | "provincial-government"
  | "municipality"
  | "regulator"
  | "constitutional-institution"
  | "state-owned-entity"
  | "public-research"
  | "university"
  | "civic-tech"
  | "non-profit"
  | "commercial"
  | "community"
  | "other";

export type AccessClass =
  | "open-data"
  | "public-api"
  | "developer-api"
  | "registration-required"
  | "authenticated-public"
  | "restricted"
  | "bulk-download"
  | "unknown";

export type ResourceType =
  | "rest-api"
  | "graphql-api"
  | "soap-api"
  | "ogc-wms"
  | "ogc-wfs"
  | "arcgis-rest"
  | "ckan-api"
  | "json-feed"
  | "xml-feed"
  | "csv-feed"
  | "rss-feed"
  | "bulk-dataset"
  | "developer-portal"
  | "open-data-portal"
  | "statistical-database"
  | "machine-readable-collection"
  | "other";

export type OperationalState =
  | "operational"
  | "degraded"
  | "partial"
  | "down"
  | "blocked"
  | "auth-required"
  | "rate-limited"
  | "maintenance"
  | "unknown"
  | "retired";

export type FreshnessState =
  | "fresh"
  | "due"
  | "late"
  | "stale"
  | "unknown"
  | "not-applicable";

export interface Organisation {
  id: string;
  slug: string;
  name: string;
  publisherClass: PublisherClass;
  website: string;
}

export interface DiscoverySource {
  type: "official-portal" | "github-catalogue" | "manual-research";
  name: string;
  url: string;
  repository?: string;
  discoveredAt: string;
}

export interface CatalogueResource {
  id: string;
  slug: string;
  name: string;
  description: string;
  universe: Universe;
  organisationId: string;
  publisherClass: PublisherClass;
  accessClass: AccessClass;
  resourceType: ResourceType;
  categories: string[];
  tags: string[];
  formats: string[];
  standards: string[];
  baseUrl?: string;
  documentationUrl: string;
  openapiUrl?: string;
  authentication: "none" | "api-key" | "registration" | "unknown";
  https: boolean;
  cors: "yes" | "no" | "unknown";
  licence: string;
  commercialReuse: "yes" | "no" | "unknown";
  verification: {
    status: "verified" | "partially-verified" | "community-reported" | "unverified" | "retired";
    verifiedAt: string;
    evidenceUrls: string[];
  };
  discovery: DiscoverySource[];
  monitoring: {
    enabled: boolean;
    intervalSeconds: number;
    timeoutMs: number;
  };
  operationalState: OperationalState;
  freshnessState: FreshnessState;
  latestObservation?: string;
}

export interface MeasurementFact {
  id: string;
  endpointId: string;
  observedAt: string;
  success: boolean;
  httpStatus: number | null;
  latencyMs: number | null;
  responseBytes: number | null;
  contentType: string | null;
  validationResult: string;
  errorClass: string | null;
  payloadHash: string | null;
  schemaHash: string | null;
  freshnessTimestamp: string | null;
}
