import http from "node:http";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { openStore } from "./src/store.mjs";
import { allowed, permissionsFor, roles } from "./src/policy.mjs";

const appDir = fileURLToPath(new URL(".", import.meta.url));
const root = join(appDir, "..");
const staticDashboard = root;
const store = await openStore(join(appDir, ".local", "review-state.json"));
const sessions = new Map();
const secret = process.env.LOCAL_SESSION_SECRET || "local-review-only-change-before-deployment";
const port = Number(process.env.PORT || 4179);
const preferenceKeys = new Set(["dashboard_layout", "saved_filters", "saved_searches", "accessibility"]);

function sign(value) { return createHmac("sha256", secret).update(value).digest("base64url"); }
function parseCookies(request) { return Object.fromEntries((request.headers.cookie || "").split(";").map((part) => part.trim().split("=")).filter(([key]) => key)); }
function session(request) { const token = parseCookies(request).ll_session; if (!token) return null; const [id, signature] = token.split("."); if (!id || !signature || !timingSafeEqual(Buffer.from(sign(id)), Buffer.from(signature))) return null; return sessions.get(id) || null; }
function json(response, status, value, headers = {}) { response.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers }); response.end(JSON.stringify(value)); }
async function body(request) { let value = ""; for await (const chunk of request) value += chunk; return value ? JSON.parse(value) : {}; }
function current(request) { const record = session(request); return record && store.getUser(record.userId); }
function requirePermission(request, response, permission) { const user = current(request); if (!user) { json(response, 401, { error: "sign_in_required" }); return null; } if (!allowed(user, permission)) { json(response, 403, { error: "permission_denied" }); return null; } return user; }
function publicUser(user) { const { preferences, ...value } = user; return { ...value, permissions: permissionsFor(user.roles) }; }
async function staticFile(response, relativePath, base = appDir) { const safe = normalize(relativePath).replace(/^([.]{2}[\\/])+/, ""); try { const file = await readFile(join(base, safe)); const ext = safe.split(".").pop(); const type = ({ html: "text/html; charset=utf-8", js: "application/javascript", json: "application/json", svg: "image/svg+xml", png: "image/png", ttf: "font/ttf" })[ext] || "application/octet-stream"; response.writeHead(200, { "content-type": type }); response.end(file); } catch { response.writeHead(404); response.end("Not found"); } }

http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`); const path = url.pathname;
  if (path === "/healthz") return json(response, 200, { status: "ready", mode: "local-review", persistence: "local-file-adapter" });
  if (path === "/api/v1/me" && request.method === "GET") { const user = current(request); return user ? json(response, 200, { user: publicUser(user), preferences: user.preferences }) : json(response, 401, { error: "sign_in_required" }); }
  if (path === "/api/v1/session" && request.method === "POST") { const input = await body(request); const user = await store.login(input.email); if (!user) return json(response, 401, { error: "invalid_local_review_user" }); const id = randomUUID(); sessions.set(id, { userId: user.id }); return json(response, 200, { user: publicUser(user) }, { "set-cookie": `ll_session=${id}.${sign(id)}; HttpOnly; SameSite=Lax; Path=/` }); }
  if (path === "/api/v1/session" && request.method === "DELETE") { const token = parseCookies(request).ll_session?.split(".")[0]; if (token) sessions.delete(token); return json(response, 204, {}, { "set-cookie": "ll_session=; Max-Age=0; HttpOnly; SameSite=Lax; Path=/" }); }
  if (path === "/api/v1/users" && request.method === "GET") { const actor = requirePermission(request, response, "users:read"); if (actor) return json(response, 200, { users: store.listUsers(), audit: store.recentAudit() }); return; }
  if (path === "/api/v1/users" && request.method === "POST") { const actor = requirePermission(request, response, "users:write"); if (!actor) return; const input = await body(request); const requestedRoles = Array.isArray(input.roles) ? input.roles.filter((role) => roles[role]) : ["ANALYTICS_USER"]; try { const user = await store.createUser({ email: input.email, displayName: input.displayName, roles: requestedRoles }); await store.audit(actor.id, "USER_CREATED", user.id); return json(response, 201, { user: publicUser(user) }); } catch (error) { return json(response, 400, { error: error.message }); } }
  const userMatch = path.match(/^\/api\/v1\/users\/([^/]+)$/);
  if (userMatch && request.method === "PATCH") { const actor = requirePermission(request, response, "roles:manage"); if (!actor) return; const input = await body(request); try { const user = await store.updateUser(userMatch[1], { status: input.status, roles: Array.isArray(input.roles) ? input.roles.filter((role) => roles[role]) : undefined }); await store.audit(actor.id, "USER_UPDATED", user.id); return json(response, 200, { user: publicUser(user) }); } catch (error) { return json(response, 400, { error: error.message }); } }
  if (userMatch && request.method === "DELETE") { const actor = requirePermission(request, response, "users:write"); if (!actor) return; if (actor.id === userMatch[1]) return json(response, 400, { error: "cannot_delete_current_user" }); try { await store.deleteUser(userMatch[1]); await store.audit(actor.id, "USER_DELETED", userMatch[1]); return json(response, 204, {}); } catch (error) { return json(response, 404, { error: error.message }); } }
  const preferenceMatch = path.match(/^\/api\/v1\/me\/preferences\/([^/]+)$/);
  if (preferenceMatch && request.method === "PUT") { const actor = requirePermission(request, response, "preferences:write"); if (!actor) return; if (!preferenceKeys.has(preferenceMatch[1])) return json(response, 400, { error: "preference_key_not_allowed" }); const input = await body(request); const preferences = await store.setPreference(actor.id, preferenceMatch[1], input.value); return json(response, 200, { preferences }); }
  if (path.startsWith("/dashboard/")) return staticFile(response, path.slice("/dashboard/".length) || "index.html", staticDashboard);
  if (path === "/" || path === "/login" || path === "/admin") return staticFile(response, "public/index.html");
  return staticFile(response, path.slice(1));
}).listen(port, "127.0.0.1", () => console.log(`Local review app: http://127.0.0.1:${port}/`));
