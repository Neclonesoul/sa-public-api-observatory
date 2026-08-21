import { CatalogueExplorer } from "../../components/CatalogueExplorer"; import { PageHeader, SiteShell } from "../../components/SiteShell"; import { resources } from "../../packages/catalogue/src/catalogue";
export const metadata = { title: "Catalogue" };
export default function CataloguePage(){return <SiteShell><PageHeader eyebrow="VERIFIED REGISTRY" title="South African API catalogue" description="Public infrastructure and the wider ZA developer ecosystem, clearly separated at record level."/><CatalogueExplorer resources={resources}/></SiteShell>}
