import { existsSync } from "node:fs";
import path from "node:path";

import { PROJECT_ROOT } from "../../config/projectConfig.js";

export interface AuthRuntimeConfig {
  storageStatePath?: string;
  hasStorageState: boolean;
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
  const hasStorageState = Boolean(storageStatePath && existsSync(storageStatePath));

  return {
    storageStatePath,
    hasStorageState,
  };
}
