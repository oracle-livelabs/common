export const roles = Object.freeze({
  ANALYTICS_USER: ["profile:read", "preferences:read", "preferences:write"],
  ANALYTICS_STEWARD: ["profile:read", "preferences:read", "preferences:write", "governance:review"],
  ANALYTICS_ADMIN: ["profile:read", "preferences:read", "preferences:write", "governance:review", "users:read", "users:write", "roles:manage"]
});

export function permissionsFor(roleCodes = []) {
  return [...new Set(roleCodes.filter((role) => roles[role]).flatMap((role) => roles[role]))].sort();
}

export function allowed(value, permission) {
  return permissionsFor(value.roles).includes(permission);
}
