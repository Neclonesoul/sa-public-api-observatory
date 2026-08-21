import type { Metadata } from "next";
import "./globals.css";
import { PwaBoot } from "../components/PwaBoot";

export const metadata: Metadata = {
  metadataBase: new URL("https://sa-public-api-observatory.openai.site"),
  title: { default: "SA Public API Observatory", template: "%s · SA Public API Observatory" },
  description: "What South African public data exists. Whether it works. Whether it is current.",
  manifest: "/manifest.webmanifest",
  openGraph: { title: "SA Public API Observatory", description: "Find the API. See if it works. See if the data is fresh. Build.", type: "website", images: [{ url: "/og.png", width: 1200, height: 630, alt: "SA Public API Observatory national status matrix" }] },
  twitter: { card: "summary_large_image", title: "SA Public API Observatory", description: "Find the API. See if it works. See if the data is fresh. Build.", images: ["/og.png"] },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-ZA">
      <body><PwaBoot/>{children}</body>
    </html>
  );
}
