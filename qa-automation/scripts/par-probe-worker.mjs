import { request } from "@playwright/test";

const TRANSIENT_STATUSES = new Set([408, 416, 425, 429]);

async function main() {
  const payload = JSON.parse(await readStandardInput());
  const links = Array.isArray(payload.links) ? payload.links : [];
  const options = {
    retries: safeInteger(payload.options?.retries, 2, 0, 10),
    retryDelayMs: safeInteger(payload.options?.retryDelayMs, 1500, 0, 60_000),
    timeoutMs: safeInteger(payload.options?.timeoutMs, 20_000, 1000, 120_000),
    concurrency: safeInteger(payload.options?.concurrency, 4, 1, 20),
  };
  const api = await request.newContext();
  const results = new Array(links.length);
  let nextIndex = 0;

  try {
    const workers = Array.from(
      { length: Math.min(options.concurrency, Math.max(links.length, 1)) },
      async () => {
        while (nextIndex < links.length) {
          const index = nextIndex++;
          const entry = links[index];
          const url = typeof entry?.url === "string" ? entry.url : "";
          results[index] = {
            index,
            ...(url
              ? await probeParUrl(api, url, options)
              : { status: "unverified", attempts: 0, error: "PAR probe received an invalid URL." }),
          };
        }
      },
    );
    await Promise.all(workers);
  } finally {
    await api.dispose();
  }

  process.stdout.write(JSON.stringify({ schema_version: 1, results }));
}

async function probeParUrl(api, url, options) {
  let lastResult = { status: "unverified", attempts: 0, error: "PAR check did not run." };

  for (let attempt = 1; attempt <= options.retries + 1; attempt += 1) {
    lastResult = await probeParUrlOnce(api, url, options.timeoutMs, attempt);
    if (lastResult.status !== "unverified") return lastResult;
    if (attempt <= options.retries) await delay(options.retryDelayMs);
  }

  return lastResult;
}

async function probeParUrlOnce(api, url, timeoutMs, attempt) {
  let headStatus;
  let headError = "";

  try {
    const response = await api.head(url, { failOnStatusCode: false, maxRedirects: 5, timeout: timeoutMs });
    headStatus = response.status();
    await response.dispose();
    if (isWorkingStatus(headStatus)) {
      return { status: "working", httpStatus: headStatus, method: "HEAD", attempts: attempt };
    }
  } catch (error) {
    headError = sanitizeError(error);
  }

  try {
    const response = await api.get(url, {
      failOnStatusCode: false,
      headers: { Range: "bytes=0-0", "Accept-Encoding": "identity" },
      maxRedirects: 5,
      timeout: timeoutMs,
    });
    const status = response.status();
    await response.dispose();
    const resultStatus = classifyHttpStatus(status);
    return {
      status: resultStatus,
      httpStatus: status,
      method: "GET range",
      attempts: attempt,
      error: resultStatus === "unverified" ? "HTTP " + status + " after retry-safe PAR probe." : undefined,
    };
  } catch (error) {
    const getError = sanitizeError(error);
    return {
      status: "unverified",
      httpStatus: headStatus,
      method: headStatus === undefined ? "HEAD/GET range" : "GET range",
      attempts: attempt,
      error: [headError, getError].filter(Boolean).join(" | ") || "Network request failed.",
    };
  }
}

function classifyHttpStatus(status) {
  if (isWorkingStatus(status)) return "working";
  if (status >= 400 && status < 500 && !TRANSIENT_STATUSES.has(status)) return "broken";
  return "unverified";
}

function isWorkingStatus(status) {
  return status >= 200 && status < 300;
}

function sanitizeError(error) {
  return String(error instanceof Error ? error.message : error)
    .replace(/(https?:\/\/[^\s"'<>]*\/p\/)[^\/\s"'<>]+/gi, "$1***")
    .replace(/\/p\/[^\/\s"'<>]+/gi, "/p/***")
    .replace(
      /(^|\n)\s*-?\s*(cookie|set-cookie|authorization|proxy-authorization|x-api-key|x-auth-token):[^\n]*/gi,
      "$1$2: ***",
    )
    .replace(/([?&](?:session|p_instance|token|access_token|auth|authorization)=)[^&\s"'<>]*/gi, "$1***")
    .replace(/\s+/g, " ")
    .trim();
}

function safeInteger(value, fallback, minimum, maximum) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(maximum, Math.max(minimum, parsed));
}

async function readStandardInput() {
  let value = "";
  process.stdin.setEncoding("utf-8");
  for await (const chunk of process.stdin) value += chunk;
  return value;
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

main().catch((error) => {
  process.stdout.write(JSON.stringify({ schema_version: 1, error: sanitizeError(error) }));
  process.exitCode = 1;
});