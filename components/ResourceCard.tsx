import Link from "next/link";

import type { CatalogueResource } from "../packages/shared/src/types";
import { organisationById } from "../packages/catalogue/src/catalogue";
import type { LiveResourceState } from "../lib/live-resource-state";

export function UniverseBadge({
  universe,
}: {
  universe: CatalogueResource["universe"];
}) {
  return (
    <span
      className={`universe-badge ${
        universe === "public-infrastructure"
          ? "public"
          : "ecosystem"
      }`}
    >
      {universe === "public-infrastructure"
        ? "PUBLIC INFRASTRUCTURE"
        : "ZA API ECOSYSTEM"}
    </span>
  );
}

export function StateBadge({ state }: { state: string }) {
  const label =
    state === "unknown"
      ? "Not yet observed"
      : state.replaceAll("-", " ");

  const symbol =
    state === "operational"
      ? "●"
      : state === "down"
        ? "×"
        : "–";

  return (
    <span className={`state-badge state-${state}`}>
      <span aria-hidden="true">{symbol}</span>{" "}
      {label}
    </span>
  );
}

export function ResourceCard({
  resource,
  liveState,
}: {
  resource: CatalogueResource;
  liveState?: LiveResourceState;
}) {
  const organisation =
    organisationById[resource.organisationId];

  const state =
    liveState?.operationalState ??
    resource.operationalState;

  return (
    <article className="resource-card">
      <div className="card-top">
        <UniverseBadge universe={resource.universe} />
        <span className="type-label">
          {resource.resourceType.replaceAll("-", " ")}
        </span>
      </div>

      <h3>
        <Link href={`/apis/${resource.slug}`}>
          {resource.name}
        </Link>
      </h3>

      <p className="publisher">
        {organisation?.name}
      </p>

      <p>{resource.description}</p>

      <div className="tag-row">
        {resource.categories
          .slice(0, 3)
          .map((category) => (
            <Link
              key={category}
              href={`/categories/${category}`}
            >
              {category.replaceAll("-", " ")}
            </Link>
          ))}
      </div>

      <div className="card-bottom">
        <StateBadge state={state} />

        <span>
          {resource.authentication === "none"
            ? "No auth"
            : resource.authentication}
        </span>
      </div>
    </article>
  );
}
