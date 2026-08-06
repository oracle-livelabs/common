import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { permissionsFor, allowed } from "../src/policy.mjs";
import { openStore } from "../src/store.mjs";

test("role permissions are additive and administrative actions stay restricted", () => {
  assert.equal(allowed({ roles: ["ANALYTICS_USER"] }, "users:write"), false);
  assert.equal(allowed({ roles: ["ANALYTICS_ADMIN"] }, "users:write"), true);
  assert.deepEqual(permissionsFor(["ANALYTICS_USER", "UNKNOWN"]), ["preferences:read", "preferences:write", "profile:read"]);
});

test("local review adapter persists user, preference, and audit state", async () => {
  const directory = await mkdtemp(join(tmpdir(), "llanalytics-auth-"));
  const file = join(directory, "state.json");
  try {
    const store = await openStore(file);
    const created = await store.createUser({ email: "test.user@local.test", displayName: "Test user", roles: ["ANALYTICS_USER"] });
    await store.setPreference(created.id, "dashboard_layout", { density: "compact" });
    await store.audit("usr_admin", "USER_CREATED", created.id);
    assert.throws(() => store.createUser({ email: "test.user@local.test", displayName: "Duplicate", roles: [] }), /Email is already in use/);
    const reopened = await openStore(file);
    assert.equal(reopened.getUser(created.id).preferences.dashboard_layout.density, "compact");
    assert.equal(reopened.recentAudit()[0].event, "USER_CREATED");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
