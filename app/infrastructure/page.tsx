import { CatalogueExplorer } from "../../components/CatalogueExplorer";
import {
  PageHeader,
  SiteShell,
} from "../../components/SiteShell";
import { getLiveResourceStates } from "../../lib/live-resource-state";
import { resources } from "../../packages/catalogue/src/catalogue";

const selected = resources.filter(
  (resource) =>
    resource.universe === "public-infrastructure",
);

export const metadata = {
  title: "Public Infrastructure",
};

export const dynamic = "force-dynamic";

export default async function Page() {
  const liveStates = await getLiveResourceStates();

  return (
    <SiteShell>
      <PageHeader
        eyebrow="UNIVERSE A · NATIONAL METRIC BOUNDARY"
        title="Public Data Infrastructure"
        description="Only resources explicitly classified public-infrastructure. This is the authoritative population for national availability and freshness statistics."
      />

      <CatalogueExplorer
        resources={selected}
        lockedUniverse="public-infrastructure"
        liveStates={liveStates}
      />
    </SiteShell>
  );
}
