import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { createCatalogExclusionServer, readRegistry } from "./catalog-exclusion-registry.mjs";

test("stores, lists, and removes catalog exclusions", async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "qa-exclusions-"));
  const filePath = path.join(directory, "catalog-exclusions.json");
  const server = createCatalogExclusionServer({ filePath });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    const created = await fetch(`${baseUrl}/api/catalog-exclusions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-QA-Action": "manage-catalog-exclusions" },
      body: JSON.stringify({ id: "4005", title: "Retired workshop" }),
    });
    assert.equal(created.status, 200);
    assert.deepEqual(readRegistry(filePath).items.map((item) => item.id), ["4005"]);

    const listed = await fetch(`${baseUrl}/api/catalog-exclusions`);
    assert.equal(listed.status, 200);
    assert.equal((await listed.json()).items[0].title, "Retired workshop");

    const removed = await fetch(`${baseUrl}/api/catalog-exclusions/4005`, {
      method: "DELETE",
      headers: { "X-QA-Action": "manage-catalog-exclusions" },
    });
    assert.equal(removed.status, 200);
    assert.deepEqual(readRegistry(filePath).items, []);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("rejects writes without the protected action header", async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "qa-exclusions-"));
  const server = createCatalogExclusionServer({ filePath: path.join(directory, "catalog-exclusions.json") });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();

  try {
    const response = await fetch(`http://127.0.0.1:${address.port}/api/catalog-exclusions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: "4005" }),
    });
    assert.equal(response.status, 403);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("VM exposes the registry only through the authenticated portal", () => {
  const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const compose = fs.readFileSync(path.join(projectRoot, "deploy", "vm", "compose.yaml"), "utf-8");
  const nginx = fs.readFileSync(path.join(projectRoot, "deploy", "vm", "portal", "nginx.conf"), "utf-8");
  const service = compose.match(
    /  exclusion-registry:\r?\n(?<body>[\s\S]*?)(?=\r?\n  [a-z][a-z-]+:|\r?\nsecrets:)/,
  )?.groups?.body;

  assert.ok(service);
  assert.doesNotMatch(service, /^\s+ports:/m);
  assert.match(service, /qa_config:\/var\/qa-config/);
  assert.match(service, /no-new-privileges:true/);
  assert.match(nginx, /location \^~ \/api\/catalog-exclusions/);
  assert.match(nginx, /auth_basic "LiveLabs QA reports"/);
  assert.match(nginx, /proxy_pass http:\/\/exclusion-registry:/);
});
