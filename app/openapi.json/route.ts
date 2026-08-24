export function GET() {
  return Response.json(
    {
      openapi: "3.1.0",

      info: {
        title: "SA Public API Observatory API",
        version: "1.1.0",
        description:
          "Machine-readable catalogue and independently observed transport, freshness and incident status for South African public data infrastructure and the wider ZA API ecosystem.",
      },

      servers: [
        {
          url: "/",
        },
      ],

      paths: {
        "/api/v1/resources": {
          get: {
            summary: "List verified resources",
            parameters: [
              {
                name: "universe",
                in: "query",
                schema: {
                  type: "string",
                  enum: [
                    "public-infrastructure",
                    "za-api-ecosystem",
                  ],
                },
              },
            ],
            responses: {
              "200": {
                description: "Paginated resource collection",
              },
            },
          },
        },

        "/api/v1/resources/{id}": {
          get: {
            summary:
              "Get a verified resource with live observability evidence",

            parameters: [
              {
                name: "id",
                in: "path",
                required: true,
                description:
                  "Stable resource identifier, currently equal to the resource slug.",
                schema: {
                  type: "string",
                },
              },
            ],

            responses: {
              "200": {
                description:
                  "Canonical resource enriched with latest transport, observed availability, freshness and incident history.",

                content: {
                  "application/json": {
                    schema: {
                      type: "object",

                      properties: {
                        observability: {
                          $ref: "#/components/schemas/Observability",
                        },
                      },

                      additionalProperties: true,
                    },
                  },
                },
              },

              "404": {
                description: "Unknown identifier",
              },
            },
          },
        },

        "/api/v1/status": {
          get: {
            summary:
              "Combined observed status for public infrastructure and the wider ZA API ecosystem",

            responses: {
              "200": {
                description:
                  "Transport and freshness summary derived from production observations.",
              },
            },
          },
        },

        "/api/v1/status/public-infrastructure": {
          get: {
            summary:
              "National public-infrastructure status",

            responses: {
              "200": {
                description:
                  "National status explicitly excluding commercial ecosystem resources.",
              },
            },
          },
        },

        "/api/v1/status/ecosystem": {
          get: {
            summary:
              "Wider ZA ecosystem status",

            responses: {
              "200": {
                description:
                  "Observed developer-ecosystem status.",
              },
            },
          },
        },

        "/api/v1/incidents": {
          get: {
            summary: "Observed incident history",

            responses: {
              "200": {
                description:
                  "Open and resolved incidents derived from production measurements.",
              },
            },
          },
        },

        "/api/v1/measurements": {
          get: {
            summary: "Observed transport measurements",

            responses: {
              "200": {
                description:
                  "Append-only production transport observations.",
              },
            },
          },
        },
      },

      components: {
        schemas: {
          Observability: {
            type: "object",

            required: [
              "latest_transport",
              "availability_30d",
              "observation_evidence",
              "freshness",
              "active_incidents",
              "incident_history",
            ],

            properties: {
              latest_transport: {
                oneOf: [
                  {
                    $ref:
                      "#/components/schemas/LatestTransportObservation",
                  },
                  {
                    type: "null",
                  },
                ],
              },

              availability_30d: {
                oneOf: [
                  {
                    type: "number",
                    minimum: 0,
                    maximum: 100,
                  },
                  {
                    type: "null",
                  },
                ],

                description:
                  "Availability percentage calculated only from actual observations within the current 30-day window.",
              },

              observation_evidence: {
                type: "object",

                properties: {
                  transport_measurements_30d: {
                    type: "integer",
                    minimum: 0,
                  },
                },

                required: [
                  "transport_measurements_30d",
                ],
              },

              freshness: {
                $ref:
                  "#/components/schemas/FreshnessObservation",
              },

              active_incidents: {
                type: "integer",
                minimum: 0,
              },

              incident_history: {
                type: "array",

                items: {
                  $ref:
                    "#/components/schemas/Incident",
                },
              },

              note: {
                type: "string",
              },
            },
          },

          LatestTransportObservation: {
            type: "object",

            properties: {
              endpoint_id: {
                type: "string",
              },

              observed_at: {
                type: "string",
                format: "date-time",
              },

              success: {
                type: "boolean",
              },

              http_status: {
                oneOf: [
                  {
                    type: "integer",
                  },
                  {
                    type: "null",
                  },
                ],
              },

              latency_ms: {
                oneOf: [
                  {
                    type: "number",
                    minimum: 0,
                  },
                  {
                    type: "null",
                  },
                ],
              },

              validation_result: {
                type: "string",
              },

              error_class: {
                oneOf: [
                  {
                    type: "string",
                  },
                  {
                    type: "null",
                  },
                ],
              },
            },

            required: [
              "endpoint_id",
              "observed_at",
              "success",
              "http_status",
              "latency_ms",
              "validation_result",
              "error_class",
            ],
          },

          FreshnessObservation: {
            type: "object",

            properties: {
              state: {
                type: "string",
                enum: [
                  "fresh",
                  "due",
                  "late",
                  "stale",
                  "unknown",
                  "not-applicable",
                ],
              },

              observed_at: {
                oneOf: [
                  {
                    type: "string",
                    format: "date-time",
                  },
                  {
                    type: "null",
                  },
                ],
              },

              extracted_timestamp: {
                oneOf: [
                  {
                    type: "string",
                    format: "date-time",
                  },
                  {
                    type: "null",
                  },
                ],
              },

              strategy: {
                oneOf: [
                  {
                    type: "string",
                  },
                  {
                    type: "null",
                  },
                ],
              },
            },

            required: [
              "state",
              "observed_at",
              "extracted_timestamp",
              "strategy",
            ],
          },

          Incident: {
            type: "object",

            properties: {
              id: {
                type: "string",
              },

              endpoint_id: {
                type: "string",
              },

              state: {
                type: "string",
                enum: [
                  "open",
                  "resolved",
                ],
              },

              classification: {
                type: "string",
              },

              started_at: {
                type: "string",
                format: "date-time",
              },

              ended_at: {
                oneOf: [
                  {
                    type: "string",
                    format: "date-time",
                  },
                  {
                    type: "null",
                  },
                ],
              },

              first_error: {
                type: "string",
              },

              last_error: {
                type: "string",
              },

              probe_count: {
                type: "integer",
                minimum: 1,
              },

              recovery_observation: {
                oneOf: [
                  {
                    type: "string",
                  },
                  {
                    type: "null",
                  },
                ],
              },
            },

            required: [
              "id",
              "endpoint_id",
              "state",
              "classification",
              "started_at",
              "ended_at",
              "first_error",
              "last_error",
              "probe_count",
              "recovery_observation",
            ],
          },
        },
      },
    },

    {
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
    },
  );
}
