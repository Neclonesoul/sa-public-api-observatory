import Link from "next/link";

const nav = [
  ["/catalogue", "Catalogue"],
  ["/infrastructure", "Infrastructure"],
  ["/ecosystem", "ZA ecosystem"],
  ["/status", "Status"],
  ["/incidents", "Incidents"],
  ["/changes", "Changes"],
  ["/methodology", "Methodology"],
];

export function SiteShell({
  children,
  variant = "default",
}: {
  children: React.ReactNode;
  variant?: "default" | "dashboard";
}) {
  const dashboard = variant === "dashboard";

  return (
    <>
      <header
        className={`site-header${dashboard ? " dashboard-header" : ""}`}
      >
        <Link href="/" className="brand">
          <span className="za-mark">ZA</span>
          <span>
            PUBLIC API
            <br />
            <b>OBSERVATORY</b>
          </span>
        </Link>

        <nav aria-label="Primary navigation">
          {nav.map(([href, label]) => (
            <Link key={href} href={href}>
              {label}
            </Link>
          ))}
        </nav>

        <a
          className="github-link"
          href="https://github.com/Neclonesoul/sa-public-api-observatory"
        >
          GitHub ↗
        </a>
      </header>

      <main className={dashboard ? "dashboard-main" : undefined}>
        {children}
      </main>

      <footer className={dashboard ? "dashboard-footer" : undefined}>
        <div>
          <strong>SA Public API Observatory</strong>
          <p>
            Open infrastructure for observing South Africa&apos;s open
            infrastructure.
          </p>
        </div>

        <div className="footer-links">
          <Link href="/about">About</Link>
          <Link href="/contribute">Contribute</Link>
          <Link href="/api/v1/resources">API</Link>
          <Link href="/openapi.json">OpenAPI</Link>
        </div>
      </footer>
    </>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <section className="page-header">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      <p>{description}</p>
    </section>
  );
}
