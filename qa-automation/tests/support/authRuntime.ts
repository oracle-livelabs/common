import { existsSync } from "node:fs";
import path from "node:path";

import { PROJECT_ROOT } from "../../config/projectConfig.js";

export interface AuthRuntimeConfig {
  storageStatePath?: string;
  username?: string;
  password?: string;
  hasStorageState: boolean;
  hasCredentials: boolean;
  isConfigured: boolean;
}

function normalizeSecret(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function resolveStorageStatePath(): string | undefined {
  const configuredPath = normalizeSecret(process.env.QA_STORAGE_STATE);
  if (!configuredPath) {
    return undefined;
  }

  return path.resolve(PROJECT_ROOT, configuredPath);
}

export function resolveAuthRuntimeConfig(): AuthRuntimeConfig {
  const storageStatePath = resolveStorageStatePath();
  const username = normalizeSecret(process.env.QA_AUTH_USERNAME);
  const password = normalizeSecret(process.env.QA_AUTH_PASSWORD);
  const hasStorageState = Boolean(storageStatePath && existsSync(storageStatePath));
  const hasCredentials = Boolean(username && password);

  return {
    storageStatePath,
    username,
    password,
    hasStorageState,
    hasCredentials,
    isConfigured: hasStorageState || hasCredentials,
  };
}

export function requireAuthRuntimeConfig(): AuthRuntimeConfig {
  const authRuntime = resolveAuthRuntimeConfig();
  if (authRuntime.isConfigured) {
    return authRuntime;
  }

  throw new Error(
    "Authenticated coverage is not configured. Set QA_STORAGE_STATE or provide QA_AUTH_USERNAME and QA_AUTH_PASSWORD.",
  );
}
