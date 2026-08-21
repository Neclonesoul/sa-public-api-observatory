"use client";

import { useMemo, useState } from "react";
import type { CatalogueResource, Universe } from "../packages/shared/src/types";
import { ResourceCard } from "./ResourceCard";

export function CatalogueExplorer({ resources, lockedUniverse }: { resources: CatalogueResource[]; lockedUniverse?: Universe }) {
  const [query, setQuery] = useState(""); const [universe, setUniverse] = useState<"all" | Universe>(lockedUniverse ?? "all"); const [type, setType] = useState("all");
  const visible = useMemo(() => { const q = query.trim().toLowerCase(); return resources.filter((item) => (universe === "all" || item.universe === universe) && (type === "all" || item.resourceType === type) && (!q || [item.name, item.description, item.organisationId, ...item.categories, ...item.tags, ...item.standards].join(" ").toLowerCase().includes(q))); }, [query, resources, type, universe]);
  const types = [...new Set(resources.map((item) => item.resourceType))].sort();
  return <section className="explorer"><div className="filter-bar"><label className="search-label"><span>Search resources</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="procurement, rainfall, payments…" /></label>{!lockedUniverse && <label><span>Universe</span><select value={universe} onChange={(event) => setUniverse(event.target.value as typeof universe)}><option value="all">All</option><option value="public-infrastructure">Public infrastructure</option><option value="za-api-ecosystem">ZA API ecosystem</option></select></label>}<label><span>Resource type</span><select value={type} onChange={(event) => setType(event.target.value)}><option value="all">All types</option>{types.map((item) => <option key={item} value={item}>{item.replaceAll("-", " ")}</option>)}</select></label></div><div className="result-count"><strong>{visible.length}</strong> verified resources <span>· search results are resources, not pages</span></div><div className="resource-grid">{visible.map((resource) => <ResourceCard key={resource.id} resource={resource}/>)}</div>{!visible.length && <div className="empty-state">No verified resources match those filters.</div>}</section>;
}
