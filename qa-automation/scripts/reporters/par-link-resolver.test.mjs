import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  ParResolverError,
  extractParUrls,
  isAllowedSourceUrl,
  parFingerprint,
  resolveParLink,
} from "./par-link-resolver.mjs";

const FULL_PAR_URL =
  "https://objectstorage.eu-frankfurt-1.oraclecloud.com/p/private-token-value/n/example/b/assets/o/files/demo.zip";
const SOURCE_URL = "https://livelabs.oracle.com/cdn/example/workshops/demo/lab.md";

test("resolves the exact full PAR link from an approved LiveLabs source by fingerprint", async () => {
  const fetchImpl = async (url, options) => {
    assert.equal(url, SOURCE_URL);
    assert.equal(options.redirect, "manual");
    return new Response(`Download with:\n\nwget ${FULL_PAR_URL}\n`, {
      status: 200,
      headers: { "content-type": "text/markdown" },
    });
  };

  const resolved = await resolveParLink(
    {
      sourceUrl: SOURCE_URL,
      fingerprint: parFingerprint(FULL_PAR_URL),
    },
    { fetchImpl },
  );

  assert.equal(resolved, FULL_PAR_URL);
});

test("decodes source HTML entities before matching PAR links", () => {
  const url = `${FULL_PAR_URL}?download=1&response-content-type=application%2Fzip`;
  const encoded = url.replace(/&/g, "&amp;");
  assert.deepEqual(extractParUrls(`<a href="${encoded}">Download</a>`), [url]);
});

test("rejects arbitrary source hosts before making a request", async () => {
  let requested = false;
  await assert.rejects(
    resolveParLink(
      {
        sourceUrl: "https://example.com/private",
        fingerprint: parFingerprint(FULL_PAR_URL),
      },
      {
        fetchImpl: async () => {
          requested = true;
          return new Response("");
        },
      },
    ),
    (error) =>
      error instanceof ParResolverError &&
      error.statusCode === 400 &&
      /approved HTTPS LiveLabs source hosts/.test(error.message),
  );
  assert.equal(requested, false);
  assert.equal(isAllowedSourceUrl(SOURCE_URL), true);
  assert.equal(
    isAllowedSourceUrl("https://oracle-livelabs.github.io/common/workshop/lab.md"),
    true,
  );
  assert.equal(isAllowedSourceUrl("http://livelabs.oracle.com/cdn/file.md"), false);
});

test("does not return a different PAR from the same source", async () => {
  await assert.rejects(
    resolveParLink(
      {
        sourceUrl: SOURCE_URL,
        fingerprint: "0000000000000000",
      },
      {
        fetchImpl: async () => new Response(FULL_PAR_URL, { status: 200 }),
      },
    ),
    (error) =>
      error instanceof ParResolverError &&
      error.statusCode === 404 &&
      /exact PAR link is no longer present/.test(error.message),
  );
});

test("VM exposes the resolver only through the authenticated report portal", () => {
  const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
  const compose = fs.readFileSync(path.join(projectRoot, "deploy", "vm", "compose.yaml"), "utf-8");
  const nginx = fs.readFileSync(
    path.join(projectRoot, "deploy", "vm", "portal", "nginx.conf"),
    "utf-8",
  );
  const jobs = fs.readFileSync(
    path.join(projectRoot, "deploy", "vm", "jenkins", "jobs.groovy"),
    "utf-8",
  );

  const resolverService = compose.match(
    /  par-resolver:\r?\n(?<body>[\s\S]*?)(?=\r?\n  [a-z][a-z-]+:|\r?\nnetworks:)/,
  )?.groups?.body;
  assert.ok(resolverService);
  assert.doesNotMatch(resolverService, /^\s+ports:/m);
  assert.match(resolverService, /no-new-privileges:true/);
  assert.match(nginx, /location = \/api\/par-link\/resolve/);
  assert.match(nginx, /auth_basic "LiveLabs QA reports"/);
  assert.match(nginx, /auth_basic_user_file \/var\/run\/reports\.htpasswd/);
  assert.match(nginx, /proxy_pass http:\/\/par-resolver:/);
  assert.match(
    jobs,
    /stringParam\("CATALOG_ITEM_IDS", "", "Optional comma-separated WMS IDs for a targeted PAR retest"\)/,
  );
  assert.match(
    jobs,
    /string\(name: "CATALOG_ITEM_IDS", value: params\.CATALOG_ITEM_IDS\?\.trim\(\) \?: ""\)/,
  );
});
