import { CatalogueExplorer } from "../../components/CatalogueExplorer";
import {
  PageHeader,
  SiteShell,
} from "../../components/SiteShell";
import { getLiveResourceStates } from "../../lib/live-resource-state";
import { resources } from "../../packages/catalogue/src/catalogue";

export const metadata = {
  title: "Catalogue",
};

export const dynamic = "force-dynamic";

export default async function CataloguePage() {
  const liveStates = await getLiveResourceStates();

  return (
    <SiteShell>
      <PageHeader
        eyebrow="VERIFIED REGISTRY"
        title="South African API catalogue"
        description="Public infrastructure and the wider ZA developer ecosystem, clearly separated at record level."
      />

      <CatalogueExplorer
        resources={resources}
        liveStates={liveStates}
      />
    </SiteShell>
  );
}
