import assert from "node:assert/strict";
import test from "node:test";

import {
  isRejectedCandidate,
  parseMarkdown,
} from "../scripts/import-public-apis-za";

test("rejects the Learn more about Public APIs section", () => {
  const markdown = `
## Learn more about Public APIs

- [Issues](https://github.com/sinditech/public-apis-za/issues)
- [Pull Requests](https://github.com/sinditech/public-apis-za/pulls)
`;

  assert.deepEqual(parseMarkdown(markdown), []);
});

test("rejects GitHub repository navigation URLs", () => {
  assert.equal(
    isRejectedCandidate(
      "Payments",
      "https://github.com/example/project/issues",
    ),
    true,
  );

  assert.equal(
    isRejectedCandidate(
      "Payments",
      "https://github.com/example/project/pulls",
    ),
    true,
  );

  assert.equal(
    isRejectedCandidate(
      "Payments",
      "https://github.com/example/project/actions",
    ),
    true,
  );
});

test("preserves genuine resource links", () => {
  const markdown = `
## Payments

- [Example Payments API](https://developer.example.co.za/api)
`;

  const results = parseMarkdown(
    markdown,
    "2026-08-27T00:00:00.000Z",
  );

  assert.equal(results.length, 1);

  assert.deepEqual(
    {
      sourceExternalId: results[0].sourceExternalId,
      name: results[0].name,
      documentationUrl: results[0].documentationUrl,
      sourceCategory: results[0].sourceCategory,
      status: results[0].status,
    },
    {
      sourceExternalId: "payments:example-payments-api",
      name: "Example Payments API",
      documentationUrl:
        "https://developer.example.co.za/api",
      sourceCategory: "Payments",
      status: "discovered",
    },
  );
});
