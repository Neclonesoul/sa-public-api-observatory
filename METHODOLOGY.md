# Methodology

Universe, publisher class and access class are independent fields. National metrics select only `ecosystem_universe = 'public-infrastructure'`.

Publisher-stated, Observatory-observed and community-supplied claims remain distinct. Verification requires evidence URLs and a timestamp; discovery provenance does not establish accuracy.

Probes use an identifiable user agent, safe GET/HEAD requests, 10-second default timeouts and bounded one-megabyte processing. A response is successful only when transport and configured payload validation pass. Three failed observations are required before an incident.

Transport and freshness are independent. Cadence-aware strategies compare extracted timestamps, HTTP metadata, hashes or publication schedules. Unknown remains unknown.

Availability is successful eligible observations divided by total eligible observations for the labelled window. Raw failures are never deleted to improve a score. Payloads are transient; stored facts are time, status, latency, size, content type, validation result, hashes, schema signature and extracted freshness timestamp.
