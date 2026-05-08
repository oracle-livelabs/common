import { request, type APIRequestContext } from "@playwright/test";

import { defaultEnvironmentName, resolveApiBaseUrl } from "../../config/projectConfig.js";

export interface APIRuntimeConfig {
  baseURL: string;
  extraHTTPHeaders: Record<string, string>;
  hasAuth: boolean;
}

function resolveHeadersFromEnv(): Record<string, string> {
  const bearerToken = process.env.QA_API_BEARER_TOKEN?.trim();
  const rawHeaders = process.env.QA_API_HEADERS_JSON?.trim();
  const envHeaders =
    rawHeaders && rawHeaders.startsWith("{")
      ? (JSON.parse(rawHeaders) as Record<string, string>)
      : {};

  return {
    ...envHeaders,
    ...(bearerToken ? { Authorization: `Bearer ${bearerToken}` } : {}),
  };
}

export function resolveApiRuntimeConfig(environmentName = defaultEnvironmentName()): APIRuntimeConfig {
  const extraHTTPHeaders = resolveHeadersFromEnv();

  return {
    baseURL: resolveApiBaseUrl(environmentName, process.env.QA_API_BASE_URL),
    extraHTTPHeaders,
    hasAuth: "Authorization" in extraHTTPHeaders,
  };
}

export async function createApiRequestContext(
  environmentName = defaultEnvironmentName(),
  overrides?: {
    baseURL?: string;
    extraHTTPHeaders?: Record<string, string>;
  },
): Promise<APIRequestContext> {
  const runtime = resolveApiRuntimeConfig(environmentName);

  return request.newContext({
    baseURL: overrides?.baseURL ?? runtime.baseURL,
    extraHTTPHeaders: {
      ...runtime.extraHTTPHeaders,
      ...overrides?.extraHTTPHeaders,
    },
  });
}
