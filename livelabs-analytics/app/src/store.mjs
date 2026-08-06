import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";

const initialState = () => ({
  users: [
    { id: "usr_admin", email: "admin@local.test", displayName: "Local Administrator", status: "ACTIVE", roles: ["ANALYTICS_ADMIN"], preferences: {}, createdAt: new Date().toISOString() },
    { id: "usr_viewer", email: "viewer@local.test", displayName: "Local Reviewer", status: "ACTIVE", roles: ["ANALYTICS_USER"], preferences: {}, createdAt: new Date().toISOString() }
  ],
  audit: []
});

export async function openStore(file) {
  await mkdir(dirname(file), { recursive: true });
  let state;
  try { state = JSON.parse(await readFile(file, "utf8")); } catch { state = initialState(); await writeFile(file, JSON.stringify(state, null, 2)); }
  const save = () => writeFile(file, JSON.stringify(state, null, 2));
  const audit = (actorId, event, targetId) => state.audit.unshift({ id: randomUUID(), actorId, event, targetId, occurredAt: new Date().toISOString() });
  return {
    listUsers: () => state.users.map(({ preferences, ...user }) => user),
    getUser: (id) => state.users.find((user) => user.id === id),
    login: async (email) => { const user = state.users.find((candidate) => candidate.email.toLowerCase() === String(email).toLowerCase() && candidate.status === "ACTIVE"); if (user) { audit(user.id, "LOGIN", user.id); await save(); } return user; },
    createUser: async ({ email, displayName, roles }) => { if (state.users.some((user) => user.email.toLowerCase() === email.toLowerCase())) throw new Error("Email is already in use."); const user = { id: `usr_${randomUUID()}`, email, displayName, status: "ACTIVE", roles, preferences: {}, createdAt: new Date().toISOString() }; state.users.push(user); await save(); return user; },
    updateUser: async (id, patch) => { const user = state.users.find((candidate) => candidate.id === id); if (!user) throw new Error("User not found."); Object.assign(user, patch); await save(); return user; },
    deleteUser: async (id) => { const index = state.users.findIndex((user) => user.id === id); if (index < 0) throw new Error("User not found."); state.users.splice(index, 1); await save(); },
    setPreference: async (id, key, value) => { const user = state.users.find((candidate) => candidate.id === id); if (!user) throw new Error("User not found."); user.preferences[key] = value; await save(); return user.preferences; },
    audit: async (actorId, event, targetId) => { audit(actorId, event, targetId); await save(); },
    recentAudit: () => state.audit.slice(0, 20)
  };
}
