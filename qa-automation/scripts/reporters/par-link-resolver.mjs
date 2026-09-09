#!/usr/bin/env node

import { createHash } from "node:crypto";
import http from "node:http";
import { fileURLToPath } from "node:url";

const DEFAULT_PORT = 32445;
const DEFAULT_TIMEOUT_MS = 20_000;
const MAX_REQUEST_BYTES = 8 * 1024;
const MAX_SOURCE_BYTES = 5 * 1024 * 1024;
const MAX_REDIRECTS = 3;
const URL_PATTERN = /https?:\/\/[^\s"'<>\\]+/gi;
const ALLOWED_SOURCE_HOSTS = new Set([
  "livelabs.oracle.com",
  "oracle-livelabs.github.io",
]);

export class ParResolverError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.name = "ParResolverError";
    this.statusCode = statusCode;
  }
}

export function isAllowedSourceUrl(value) {
  try {
    const url = new URL(String(value || ""));
    return (
      url.protocol === "https:" &&
      ALLOWED_SOURCE_HOSTS.has(url.hostname.toLowerCase()) &&
      !url.username &&
      !url.password &&
      (!url.port || url.port === "443")
    );
  } catch {
    return false;
  }
}

export function parFingerprint(value) {
  return createHash("sha256").update(value).digest("hex").slice(0, 16);
}

export function extractParUrls(value) {
  const decoded = decodeHtmlEntities(String(value || ""));
  const matches = decoded.match(URL_PATTERN) || [];
  const urls = new Set();

  for (const match of matches) {
    let candidate = match.trim();
    let previous = "";
    while (candidate !== previous) {
      previous = candidate;
      candidate = candidate.replace(/(?:\*{1,3}|_{2,3}|[`),.;\]}])$/, "");
    }

    try {
      const url = new URL(candidate);
      if (url.protocol !== "https:" || !/objectstorage/i.test(url.hostname)) continue;
      if (!/\/p\/[^/]+\/n\/[^/]+\/b\/[^/]+\/o(?:\/.*)?$/i.test(url.pathname)) continue;
      urls.add(url.toString());
    } catch {
      // Ignore malformed text that only resembles a URL.
    }
  }

  return Array.from(urls);
}

export async function resolveParLink(
  { sourceUrl, fingerprint },
  { fetchImpl = globalThis.fetch, timeoutMs = DEFAULT_TIMEOUT_MS } = {},
) {
  if (!isAllowedSourceUrl(sourceUrl)) {
    throw new ParResolverError(
      "Only approved HTTPS LiveLabs source hosts can be inspected.",
      400,
    );
  }
  if (!/^[a-f0-9]{16}$/i.test(String(fingerprint || ""))) {
    throw new ParResolverError("The PAR fingerprint is missing or invalid.", 400);
  }
  if (typeof fetchImpl !== "function") {
    throw new ParResolverError("The resolver HTTP client is unavailable.", 500);
  }

  const sourceText = await fetchSourceText(sourceUrl, fetchImpl, timeoutMs);
  const match = extractParUrls(sourceText).find(
    (url) => parFingerprint(url).toLowerCase() === String(fingerprint).toLowerCase(),
  );
  if (!match) {
    throw new ParResolverError(
      "The exact PAR link is no longer present in this workshop source. Refresh the audit or open the exact lab.",
      404,
    );
  }
  return match;
}

async function fetchSourceText(initialUrl, fetchImpl, timeoutMs) {
  let currentUrl = initialUrl;

  for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect += 1) {
    const response = await fetchImpl(currentUrl, {
      method: "GET",
      redirect: "manual",
      signal: AbortSignal.timeout(timeoutMs),
      headers: {
        Accept: "text/markdown,text/plain,text/html;q=0.9,*/*;q=0.1",
        "User-Agent": "LiveLabs-QA-PAR-Resolver/1.0",
      },
    }).catch((error) => {
      throw new ParResolverError(
        error?.name === "TimeoutError"
          ? "The workshop source did not respond before the resolver timeout."
          : "The workshop source could not be reached.",
        502,
      );
    });

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location || redirect === MAX_REDIRECTS) {
        throw new ParResolverError("The workshop source redirected too many times.", 502);
      }
      const redirectedUrl = new URL(location, currentUrl).toString();
      if (!isAllowedSourceUrl(redirectedUrl)) {
        throw new ParResolverError("The workshop source redirected outside approved LiveLabs hosts.", 502);
      }
      currentUrl = redirectedUrl;
      continue;
    }

    if (!response.ok) {
      throw new ParResolverError(
        `The workshop source returned HTTP ${response.status}.`,
        response.status === 404 ? 404 : 502,
      );
    }

    const declaredLength = Number(response.headers.get("content-length") || 0);
    if (declaredLength > MAX_SOURCE_BYTES) {
      throw new ParResolverError("The workshop source is too large to inspect safely.", 413);
    }
    const text = await response.text();
    if (Buffer.byteLength(text, "utf-8") > MAX_SOURCE_BYTES) {
      throw new ParResolverError("The workshop source is too large to inspect safely.", 413);
    }
    return text;
  }

  throw new ParResolverError("The workshop source could not be resolved.", 502);
}

function decodeHtmlEntities(value) {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_match, digits) => String.fromCodePoint(Number(digits)))
    .replace(/&#x([0-9a-f]+);/gi, (_match, digits) =>
      String.fromCodePoint(Number.parseInt(digits, 16)),
    );
}

export function createParResolverServer(options = {}) {
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const timeoutMs = Number(options.timeoutMs || DEFAULT_TIMEOUT_MS);

  return http.createServer(async (request, response) => {
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("Content-Type", "application/json; charset=utf-8");
    response.setHeader("X-Content-Type-Options", "nosniff");

    if (request.method === "GET" && request.url === "/healthz") {
      response.statusCode = 200;
      response.end('{"status":"ok"}\n');
      return;
    }
    if (request.method !== "POST" || request.url !== "/resolve") {
      response.statusCode = 404;
      response.end('{"error":"Not found."}\n');
      return;
    }

    try {
      const body = await readJsonBody(request);
      const url = await resolveParLink(body, { fetchImpl, timeoutMs });
      response.statusCode = 200;
      response.end(`${JSON.stringify({ url })}\n`);
    } catch (error) {
      const statusCode =
        error instanceof ParResolverError ? error.statusCode : 500;
      response.statusCode = statusCode;
      response.end(
        `${JSON.stringify({
          error:
            error instanceof ParResolverError
              ? error.message
              : "The full PAR link could not be retrieved.",
        })}\n`,
      );
    }
  });
}

async function readJsonBody(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_REQUEST_BYTES) {
      throw new ParResolverError("The request is too large.", 413);
    }
    chunks.push(chunk);
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf-8") || "{}");
  } catch {
    throw new ParResolverError("The request body must be valid JSON.", 400);
  }
}

function runServer() {
  const port = Number(process.env.QA_PAR_RESOLVER_INTERNAL_PORT || DEFAULT_PORT);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) {
    throw new Error("QA_PAR_RESOLVER_INTERNAL_PORT must be a non-standard TCP port.");
  }
  const server = createParResolverServer();
  server.listen(port, "0.0.0.0", () => {
    console.log(`LiveLabs PAR resolver listening on internal port ${port}.`);
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  runServer();
}
