import { notFound } from "next/navigation";

import { CatalogueExplorer } from "../../../components/CatalogueExplorer";
import {
  PageHeader,
  SiteShell,
} from "../../../components/SiteShell";
import { getLiveResourceStates } from "../../../lib/live-resource-state";
import {
  organisations,
  resources,
} from "../../../packages/catalogue/src/catalogue";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return organisations.map((organisation) => ({
    slug: organisation.slug,
  }));
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const organisation = organisations.find(
    (item) => item.slug === slug,
  );

  if (!organisation) notFound();

  const selected = resources.filter(
    (resource) =>
      resource.organisationId === organisation.id,
  );

  const liveStates = await getLiveResourceStates();

  return (
    <SiteShell>
      <PageHeader
        eyebrow={organisation.publisherClass.replaceAll(
          "-",
          " ",
        )}
        title={organisation.name}
        description={`${selected.length} verified resources in the Observatory catalogue.`}
      />

      <CatalogueExplorer
        resources={selected}
        liveStates={liveStates}
      />
    </SiteShell>
  );
}
