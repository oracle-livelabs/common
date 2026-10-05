import { existsSync } from "node:fs";
import path from "node:path";

import type { Page } from "@playwright/test";

import { PROJECT_ROOT } from "../../config/projectConfig.js";

export interface AuthRuntimeConfig {
  storageStatePath?: string;
  hasStorageState: boolean;
  privatePageUrl?: string;
  privatePageReadyText?: string;
  privateAccessBootstrapUrl?: string;
  privateAccessBootstrapToken?: string;
  hasPrivateAccessBootstrap: boolean;
  username?: string;
  password?: string;
  hasCredentials: boolean;
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
  const privateAccessBootstrapUrl = normalizeSecret(process.env.QA_AUTH_BOOTSTRAP_URL);
  const privateAccessBootstrapToken = normalizeSecret(process.env.QA_AUTH_BOOTSTRAP_TOKEN);
  const username = normalizeSecret(process.env.QA_LIVELABS_USERNAME);
  const password = normalizeSecret(process.env.QA_LIVELABS_PASSWORD);

  return {
    storageStatePath,
    hasStorageState,
    privatePageUrl: normalizeSecret(process.env.QA_AUTH_TARGET_URL),
    privatePageReadyText: normalizeSecret(process.env.QA_AUTH_READY_TEXT),
    privateAccessBootstrapUrl,
    privateAccessBootstrapToken,
    hasPrivateAccessBootstrap: Boolean(privateAccessBootstrapUrl && privateAccessBootstrapToken),
    username,
    password,
    hasCredentials: Boolean(username && password),
  };
}

export function resolvePrivatePageUrl(authRuntime: AuthRuntimeConfig, baseUrl: string): string | undefined {
  if (!authRuntime.privatePageUrl) {
    return undefined;
  }

  return new URL(authRuntime.privatePageUrl, baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`).toString();
}

export function hasConfiguredPrivatePageAccess(authRuntime: AuthRuntimeConfig): boolean {
  return authRuntime.hasStorageState || authRuntime.hasPrivateAccessBootstrap;
}

export async function bootstrapPrivatePageAccess(page: Page, authRuntime: AuthRuntimeConfig): Promise<void> {
  if (!authRuntime.hasPrivateAccessBootstrap) {
    return;
  }

  const response = await page.request.get(authRuntime.privateAccessBootstrapUrl as string, {
    headers: {
      authorization: `Bearer ${authRuntime.privateAccessBootstrapToken}`,
    },
    maxRedirects: 0,
  });

  if (response.status() >= 400) {
    throw new Error(`Private access bootstrap failed with HTTP ${response.status()}.`);
  }
}

export async function assertPageIsNotAuthenticationFallback(page: Page): Promise<void> {
  const bodyText = (await page.locator("body").innerText({ timeout: 5000 })).toLowerCase();
  const markerHits = ["saml", "single sign-on", "oracle identity", "sign in", "login", "sso"].filter((marker) =>
    bodyText.includes(marker),
  );

  if (markerHits.length >= 2 || (bodyText.includes("saml") && bodyText.includes("login"))) {
    throw new Error(`Private page still looks like an authentication fallback. Matched markers: ${markerHits.join(", ")}`);
  }
}
