# Security policy

Report vulnerabilities privately through GitHub Security Advisories where available. Do not test destructive behaviour against third-party publishers.

Probe configuration is constrained to reviewed HTTP(S) GET/HEAD requests. Private, loopback, link-local and reserved destinations, URL credentials and unreviewed ports are rejected. Redirects are checked; timeouts and response sizes are bounded.

API keys never belong in catalogue data. Authenticated monitoring is disabled by default. Response payloads are not persisted by default.
