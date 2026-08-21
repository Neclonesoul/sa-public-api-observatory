import type { CatalogueResource, Organisation } from "../../shared/src/types";

const verifiedAt = "2026-08-21T00:00:00+02:00";

export const organisations: Organisation[] = [
  { id: "national-treasury", slug: "national-treasury", name: "National Treasury", publisherClass: "national-government", website: "https://www.treasury.gov.za" },
  { id: "stats-sa", slug: "stats-sa", name: "Statistics South Africa", publisherClass: "national-government", website: "https://www.statssa.gov.za" },
  { id: "sarb", slug: "sarb", name: "South African Reserve Bank", publisherClass: "regulator", website: "https://www.resbank.co.za" },
  { id: "iec", slug: "iec", name: "Electoral Commission of South Africa", publisherClass: "constitutional-institution", website: "https://www.elections.org.za" },
  { id: "cipc", slug: "cipc", name: "Companies and Intellectual Property Commission", publisherClass: "regulator", website: "https://www.cipc.co.za" },
  { id: "dpme", slug: "dpme", name: "Department of Planning, Monitoring and Evaluation", publisherClass: "national-government", website: "https://www.dpme.gov.za" },
  { id: "dffe", slug: "dffe", name: "Department of Forestry, Fisheries and the Environment", publisherClass: "national-government", website: "https://www.dffe.gov.za" },
  { id: "kzn-dard", slug: "kzn-dard", name: "KwaZulu-Natal Department of Agriculture and Rural Development", publisherClass: "provincial-government", website: "https://www.kzndard.gov.za" },
  { id: "peach-payments", slug: "peach-payments", name: "Peach Payments", publisherClass: "commercial", website: "https://www.peachpayments.com" },
  { id: "ozow", slug: "ozow", name: "Ozow", publisherClass: "commercial", website: "https://ozow.com" },
  { id: "yoco", slug: "yoco", name: "Yoco", publisherClass: "commercial", website: "https://www.yoco.com" },
];

function publicResource(input: Partial<CatalogueResource> & Pick<CatalogueResource, "id" | "name" | "description" | "organisationId" | "publisherClass" | "accessClass" | "resourceType" | "categories" | "formats" | "documentationUrl">): CatalogueResource {
  return {
    slug: input.id,
    universe: "public-infrastructure",
    tags: [], standards: [], authentication: "none", https: true, cors: "unknown",
    licence: "Licence not verified", commercialReuse: "unknown",
    verification: { status: "verified", verifiedAt, evidenceUrls: [input.documentationUrl] },
    discovery: [{ type: "official-portal", name: "Official publisher", url: input.documentationUrl, discoveredAt: verifiedAt }],
    monitoring: { enabled: Boolean(input.baseUrl), intervalSeconds: 900, timeoutMs: 10000 },
    operationalState: "unknown", freshnessState: "unknown",
    ...input,
  } as CatalogueResource;
}

function statsDataset(id: string, name: string, description: string, categories: string[], formats = ["xlsx", "ascii"]): CatalogueResource {
  return publicResource({
    id, name, description, organisationId: "stats-sa", publisherClass: "national-government",
    accessClass: "bulk-download", resourceType: "bulk-dataset", categories, formats,
    documentationUrl: "https://www.statssa.gov.za/?page_id=1847",
    tags: ["official-statistics", "time-series"], monitoring: { enabled: false, intervalSeconds: 86400, timeoutMs: 10000 },
  });
}

export const resources: CatalogueResource[] = [
  publicResource({ id: "treasury-etenders-ocds", name: "eTenders OCDS API", description: "Versioned South African public-procurement releases in the Open Contracting Data Standard.", organisationId: "national-treasury", publisherClass: "national-government", accessClass: "public-api", resourceType: "rest-api", categories: ["procurement", "government-spending"], formats: ["json"], standards: ["OCDS"], baseUrl: "https://ocds-api.etenders.gov.za/api/OCDSReleases?PageNumber=1&PageSize=1", documentationUrl: "https://ocds-api.etenders.gov.za/swagger/index.html", openapiUrl: "https://ocds-api.etenders.gov.za/swagger/v1/swagger.json", licence: "CC BY 4.0", commercialReuse: "yes" }),
  publicResource({ id: "treasury-municipal-money", name: "Municipal Money API", description: "National Treasury municipal financial data used by the Municipal Money public service.", organisationId: "national-treasury", publisherClass: "national-government", accessClass: "public-api", resourceType: "rest-api", categories: ["municipal-finance", "government-spending"], formats: ["json"], baseUrl: "https://municipaldata.treasury.gov.za/api", documentationUrl: "https://municipalmoney.gov.za/", licence: "Licence not verified" }),
  publicResource({ id: "iec-election-api", name: "IEC Election API", description: "Election, voter, ballot and results functions for third-party sites, mobile applications, parties and media.", organisationId: "iec", publisherClass: "constitutional-institution", accessClass: "public-api", resourceType: "rest-api", categories: ["elections", "democracy"], formats: ["json", "xml"], baseUrl: "https://api.elections.org.za/", documentationUrl: "https://api.elections.org.za/Help" }),
  publicResource({ id: "cipc-apiverse", name: "CIPC APIVerse", description: "Official CIPC developer portal for company and intellectual-property API products.", organisationId: "cipc", publisherClass: "regulator", accessClass: "registration-required", resourceType: "developer-portal", categories: ["companies", "intellectual-property"], formats: ["json"], baseUrl: "https://developer.cipc.co.za/", documentationUrl: "https://developer.cipc.co.za/apis", authentication: "registration" }),
  publicResource({ id: "dpme-geospatial-layers", name: "DPME Geospatial Data Layers", description: "ArcGIS REST map service containing national planning, water, agriculture and public-service layers.", organisationId: "dpme", publisherClass: "national-government", accessClass: "public-api", resourceType: "arcgis-rest", categories: ["geospatial", "planning"], formats: ["json", "geojson"], baseUrl: "https://dpmegis.dpme.gov.za/arcgis/rest/services/Geospatial_Data_Layers/MapServer?f=pjson", documentationUrl: "https://dpmegis.dpme.gov.za/arcgis/rest/services/Geospatial_Data_Layers/MapServer" }),
  publicResource({ id: "dpme-administrative-areas", name: "DPME Administrative Geospatial Areas", description: "Feature service for provinces, districts, local municipalities, metros and wards.", organisationId: "dpme", publisherClass: "national-government", accessClass: "public-api", resourceType: "arcgis-rest", categories: ["geospatial", "administrative-boundaries"], formats: ["json", "geojson"], baseUrl: "https://dpmegis.dpme.gov.za/arcgis/rest/services/Hosted/Administrative_Geospatial_Areas/FeatureServer?f=pjson", documentationUrl: "https://dpmegis.dpme.gov.za/arcgis/rest/services/Hosted/Administrative_Geospatial_Areas/FeatureServer" }),
  publicResource({ id: "dffe-renewable-energy-eia", name: "Renewable Energy EIA Applications", description: "Official map service for renewable-energy environmental impact assessment applications.", organisationId: "dffe", publisherClass: "national-government", accessClass: "public-api", resourceType: "arcgis-rest", categories: ["environment", "energy", "geospatial"], formats: ["json"], baseUrl: "https://dffeportal.environment.gov.za/hosting/rest/services/REEA/SA_REEA/MapServer?f=pjson", documentationUrl: "https://dffeportal.environment.gov.za/hosting/rest/services/REEA/SA_REEA/MapServer" }),
  publicResource({ id: "dffe-protected-areas", name: "South African Protected Areas Database", description: "Official SAPAD protected-area map service.", organisationId: "dffe", publisherClass: "national-government", accessClass: "public-api", resourceType: "arcgis-rest", categories: ["environment", "conservation", "geospatial"], formats: ["json"], baseUrl: "https://dffeportal.environment.gov.za/hosting/rest/services/PACA/SAPAD/MapServer?f=pjson", documentationUrl: "https://dffeportal.environment.gov.za/hosting/rest/services/PACA/SAPAD/MapServer" }),
  publicResource({ id: "dffe-planning-cadastre", name: "Planning Cadastre Map Service", description: "National cadastre map service for properties, erven, farms and portions.", organisationId: "dffe", publisherClass: "national-government", accessClass: "public-api", resourceType: "arcgis-rest", categories: ["geospatial", "land", "planning"], formats: ["json", "geojson"], baseUrl: "https://screening.environment.gov.za/server/rest/services/Corp/Planning_Cadastre/MapServer?f=pjson", documentationUrl: "https://screening.environment.gov.za/server/rest/services/Corp/Planning_Cadastre/MapServer" }),
  publicResource({ id: "kzn-local-municipalities", name: "KZN Local Municipalities Feature Layer", description: "Provincial feature layer for South African local municipality boundaries.", organisationId: "kzn-dard", publisherClass: "provincial-government", accessClass: "public-api", resourceType: "arcgis-rest", categories: ["geospatial", "municipalities", "kwazulu-natal"], formats: ["json", "geojson", "pbf"], baseUrl: "https://gis.kzndard.gov.za/server/rest/services/Hosted/BackgroundData/FeatureServer/1?f=pjson", documentationUrl: "https://gis.kzndard.gov.za/server/rest/services/Hosted/BackgroundData/FeatureServer/1" }),
  publicResource({ id: "statssa-isibalo", name: "Stats SA ISIbalo Data Portal", description: "Official statistical data products, unit records and associated metadata.", organisationId: "stats-sa", publisherClass: "national-government", accessClass: "open-data", resourceType: "open-data-portal", categories: ["statistics", "population", "economy"], formats: ["csv", "xlsx"], baseUrl: "https://isibaloweb.statssa.gov.za/", documentationUrl: "https://isibaloweb.statssa.gov.za/" }),
  publicResource({ id: "statssa-code-lists", name: "Stats SA Code Lists", description: "Official country, religion, industry, occupation, municipality and place code lists.", organisationId: "stats-sa", publisherClass: "national-government", accessClass: "bulk-download", resourceType: "machine-readable-collection", categories: ["statistics", "reference-data"], formats: ["html", "xlsx", "mdb"], documentationUrl: "https://www.statssa.gov.za/?page_id=4503", monitoring: { enabled: false, intervalSeconds: 86400, timeoutMs: 10000 } }),
  statsDataset("statssa-cpi", "Consumer Price Index Time Series", "CPI average prices and detailed COICOP time-series downloads.", ["prices", "inflation"]),
  statsDataset("statssa-ppi", "Producer Price Index Time Series", "Producer price index elementary and historical time series.", ["prices", "economy"]),
  statsDataset("statssa-provincial-gdp", "Provincial Gross Domestic Product", "Official provincial GDP time-series dataset.", ["economy", "provincial"]),
  statsDataset("statssa-electricity", "Electricity Generated and Available", "Electricity generated and available for distribution time series.", ["energy", "economy"]),
  statsDataset("statssa-mining", "Mining Production and Sales", "Mining production and sales monthly and annual time series.", ["mining", "economy"]),
  statsDataset("statssa-manufacturing", "Manufacturing Production and Sales", "Manufacturing production, sales and capacity utilisation time series.", ["manufacturing", "economy"]),
  statsDataset("statssa-retail", "Retail Trade Sales", "Current and previous official retail trade sales time series.", ["retail", "economy"]),
  statsDataset("statssa-wholesale", "Wholesale Trade Sales", "Official wholesale trade sales time series.", ["wholesale", "economy"]),
  statsDataset("statssa-land-transport", "Land Transport Survey", "Official land transport survey time series.", ["transport", "economy"]),
  statsDataset("statssa-tourist-accommodation", "Tourist Accommodation", "Official tourist accommodation time series.", ["tourism", "economy"]),
  statsDataset("statssa-food-beverages", "Food and Beverages", "Official food and beverages industry time series.", ["food", "hospitality", "economy"]),
  statsDataset("statssa-liquidations", "Liquidations", "Official liquidations time-series data.", ["companies", "economy"]),
  statsDataset("statssa-insolvencies", "Statistics of Insolvencies", "Official insolvency statistics time series.", ["companies", "economy"]),
  statsDataset("statssa-building", "Building Statistics", "Official building-plan and construction time series.", ["construction", "economy"]),
  statsDataset("statssa-property-price", "Residential Property Price Index", "Official residential property price index time series.", ["property", "prices"]),
  publicResource({ id: "sarb-statistical-query", name: "SARB Online Statistical Query", description: "Downloadable Quarterly Bulletin economic and financial time series.", organisationId: "sarb", publisherClass: "regulator", accessClass: "open-data", resourceType: "statistical-database", categories: ["economy", "finance", "monetary-policy"], formats: ["csv", "xlsx", "pdf", "doc"], baseUrl: "https://www.resbank.co.za/en/home/what-we-do/statistics/releases/online-statistical-query", documentationUrl: "https://www.resbank.co.za/en/home/what-we-do/statistics/releases/online-statistical-query" }),
  publicResource({ id: "sarb-market-rates", name: "SARB Current Market Rates", description: "Official current capital-market and related rates with historical observations.", organisationId: "sarb", publisherClass: "regulator", accessClass: "open-data", resourceType: "statistical-database", categories: ["finance", "interest-rates", "markets"], formats: ["html"], baseUrl: "https://www.resbank.co.za/en/home/what-we-do/statistics/key-statistics/current-market-rates", documentationUrl: "https://www.resbank.co.za/en/home/what-we-do/statistics/key-statistics/current-market-rates" }),
  publicResource({ id: "sarb-ba900", name: "SARB BA900 Economic Returns", description: "Banking-sector BA900 economic returns published for download.", organisationId: "sarb", publisherClass: "regulator", accessClass: "bulk-download", resourceType: "machine-readable-collection", categories: ["banking", "finance", "regulation"], formats: ["csv"], documentationUrl: "https://resbank.co.za/en/home/what-we-do/statistics/releases/banking-sector-information/banks-ba900-economic-returns", monitoring: { enabled: false, intervalSeconds: 86400, timeoutMs: 10000 } }),
  {
    ...publicResource({ id: "peach-payments-api", name: "Peach Payments API", description: "Commercial payment orchestration APIs for transactions, status checks and refunds.", organisationId: "peach-payments", publisherClass: "commercial", accessClass: "developer-api", resourceType: "rest-api", categories: ["payments", "fintech"], formats: ["json"], baseUrl: "https://developer.peachpayments.com/", documentationUrl: "https://developer.peachpayments.com/docs/payments-api-overview", authentication: "api-key" }),
    universe: "za-api-ecosystem", freshnessState: "not-applicable", discovery: [{ type: "manual-research", name: "Official developer portal", url: "https://developer.peachpayments.com/", discoveredAt: verifiedAt }, { type: "github-catalogue", name: "public-apis-za", url: "https://github.com/sinditech/public-apis-za", repository: "sinditech/public-apis-za", discoveredAt: verifiedAt }]
  },
  {
    ...publicResource({ id: "ozow-integrations", name: "Ozow Integrations API", description: "Commercial payment-link, status and payment integration interfaces.", organisationId: "ozow", publisherClass: "commercial", accessClass: "developer-api", resourceType: "developer-portal", categories: ["payments", "fintech"], formats: ["json"], baseUrl: "https://ozow.com/integrations", documentationUrl: "https://ozow.com/integrations", authentication: "api-key" }),
    universe: "za-api-ecosystem", freshnessState: "not-applicable", discovery: [{ type: "manual-research", name: "Official integration portal", url: "https://ozow.com/integrations", discoveredAt: verifiedAt }, { type: "github-catalogue", name: "public-apis-za", url: "https://github.com/sinditech/public-apis-za", repository: "sinditech/public-apis-za", discoveredAt: verifiedAt }]
  },
  {
    ...publicResource({ id: "yoco-payments-api", name: "Yoco Payments API", description: "Commercial online-payments API for South African merchants.", organisationId: "yoco", publisherClass: "commercial", accessClass: "developer-api", resourceType: "rest-api", categories: ["payments", "fintech"], formats: ["json"], baseUrl: "https://api.yoco.com/v1", documentationUrl: "https://developer.yoco.com/", authentication: "api-key" }),
    universe: "za-api-ecosystem", freshnessState: "not-applicable", discovery: [{ type: "manual-research", name: "Official developer portal", url: "https://developer.yoco.com/", discoveredAt: verifiedAt }, { type: "github-catalogue", name: "public-apis-za", url: "https://github.com/sinditech/public-apis-za", repository: "sinditech/public-apis-za", discoveredAt: verifiedAt }]
  }
];

export const organisationById = Object.fromEntries(organisations.map((item) => [item.id, item]));
export const resourceBySlug = Object.fromEntries(resources.map((item) => [item.slug, item]));

export function selectUniverse(universe?: string | null) {
  return universe === "public-infrastructure" || universe === "za-api-ecosystem"
    ? resources.filter((resource) => resource.universe === universe)
    : resources;
}
