import { CatalogueExplorer } from "../../../components/CatalogueExplorer";
import {
  PageHeader,
  SiteShell,
} from "../../../components/SiteShell";
import { getLiveResourceStates } from "../../../lib/live-resource-state";
import { resources } from "../../../packages/catalogue/src/catalogue";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return [
    ...new Set(
      resources.flatMap(
        (resource) => resource.categories,
      ),
    ),
  ].map((slug) => ({ slug }));
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const selected = resources.filter((resource) =>
    resource.categories.includes(slug),
  );

  const liveStates = await getLiveResourceStates();

  return (
    <SiteShell>
      <PageHeader
        eyebrow="CATEGORY"
        title={slug.replaceAll("-", " ")}
        description={`${selected.length} verified resources classified in this subject area.`}
      />

      <CatalogueExplorer
        resources={selected}
        liveStates={liveStates}
      />
    </SiteShell>
  );
}
