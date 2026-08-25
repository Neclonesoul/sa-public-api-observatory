"use client";

import { useMemo, useState } from "react";

import type { CatalogueResource } from "../packages/shared/src/types";
import type { LiveResourceState } from "../lib/live-resource-state";
import { ResourceCard } from "./ResourceCard";

export function CatalogueExplorer({
  resources,
  lockedUniverse,
  liveStates = {},
}: {
  resources: CatalogueResource[];
  lockedUniverse?: CatalogueResource["universe"];
  liveStates?: Record<string, LiveResourceState>;
}) {
  const [query, setQuery] = useState("");
  const [universe, setUniverse] = useState<
    "all" | CatalogueResource["universe"]
  >(lockedUniverse ?? "all");
  const [type, setType] = useState("all");

  const types = useMemo(
    () =>
      [...new Set(resources.map((item) => item.resourceType))]
        .sort(),
    [resources],
  );

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return resources.filter((resource) => {
      if (
        universe !== "all" &&
        resource.universe !== universe
      ) {
        return false;
      }

      if (
        type !== "all" &&
        resource.resourceType !== type
      ) {
        return false;
      }

      if (!needle) return true;

      return [
        resource.name,
        resource.description,
        ...resource.categories,
        ...resource.tags,
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [query, universe, type, resources]);

  return (
    <section className="explorer">
      <div className="filter-bar">
        <label className="search-label">
          <span>Search resources</span>
          <input
            type="search"
            value={query}
            onChange={(event) =>
              setQuery(event.target.value)
            }
            placeholder="procurement, rainfall, payments…"
          />
        </label>

        {!lockedUniverse && (
          <label>
            <span>Universe</span>
            <select
              value={universe}
              onChange={(event) =>
                setUniverse(
                  event.target.value as typeof universe,
                )
              }
            >
              <option value="all">All</option>
              <option value="public-infrastructure">
                Public infrastructure
              </option>
              <option value="za-api-ecosystem">
                ZA API ecosystem
              </option>
            </select>
          </label>
        )}

        <label>
          <span>Resource type</span>
          <select
            value={type}
            onChange={(event) =>
              setType(event.target.value)
            }
          >
            <option value="all">All types</option>

            {types.map((item) => (
              <option key={item} value={item}>
                {item.replaceAll("-", " ")}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="result-count">
        <strong>{visible.length}</strong> verified resources{" "}
        <span>· search results are resources, not pages</span>
      </div>

      <div className="resource-grid">
        {visible.map((resource) => (
          <ResourceCard
            key={resource.id}
            resource={resource}
            liveState={liveStates[resource.id]}
          />
        ))}
      </div>

      {!visible.length && (
        <div className="empty-state">
          No verified resources match those filters.
        </div>
      )}
    </section>
  );
}
