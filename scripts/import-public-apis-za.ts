import { createHash } from "node:crypto";

const upstream = process.argv[2] ?? "https://raw.githubusercontent.com/sinditech/public-apis-za/main/README.md";

export interface SeedCandidate {
  sourceExternalId: string;
  name: string;
  documentationUrl: string;
  sourceCategory: string;
  sourceFirstSeen: string;
  sourceLastSeen: string;
  sourceHash: string;
  sourcePresence: "present" | "removed-upstream";
  status: "discovered";
}

export function parseMarkdown(markdown: string, now = new Date().toISOString()): SeedCandidate[] {
  let category = "uncategorised";
  const candidates: SeedCandidate[] = [];
  for (const line of markdown.split(/\r?\n/)) {
    const heading = line.match(/^#{2,4}\s+(.+)/);
    if (heading) category = heading[1].trim();
    const match = line.match(/^\s*[-*]\s+\[([^\]]+)\]\((https?:\/\/[^)]+)\)/);
    if (!match) continue;
    const name = match[1].trim();
    const documentationUrl = match[2].trim();
    const sourceExternalId = `${category.toLowerCase().replace(/[^a-z0-9]+/g, "-")}:${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
    candidates.push({ sourceExternalId, name, documentationUrl, sourceCategory: category, sourceFirstSeen: now, sourceLastSeen: now, sourceHash: createHash("sha256").update(line).digest("hex"), sourcePresence: "present", status: "discovered" });
  }
  return candidates;
}

async function main() {
  const response = await fetch(upstream, { headers: { "User-Agent": "SA-Public-API-Observatory/1.0" } });
  if (!response.ok) throw new Error(`Upstream returned ${response.status}`);
  const markdown = await response.text();
  const candidates = parseMarkdown(markdown);
  const malformed = markdown.split(/\r?\n/).filter((line) => /^\s*[-*]\s+\[/.test(line) && !/\]\(https?:\/\//.test(line)).length;
  console.log(JSON.stringify({ source: "sinditech/public-apis-za", entriesDiscovered: candidates.length, existingResources: 0, newCandidates: candidates.length, potentialDuplicates: 0, rejectedMalformed: malformed, verifiedResourcesModified: 0, candidates }, null, 2));
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((error) => { console.error(error); process.exitCode = 1; });
