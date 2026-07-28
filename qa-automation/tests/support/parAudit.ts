import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import path from "node:path";

import type { APIRequestContext, TestInfo } from "@playwright/test";

import { PROJECT_ROOT, parseIntegerFlag } from "../../config/projectConfig.js";

export type ParAuditScope = "catalog";
export type ParAuditStatus = "working" | "broken" | "unverified";

export interface ParSource {
  pageType: string;
  pageUrl: string;
  label: string;
  location?: string;
  sourceFileUrl?: string;
  sourceLine?: number;
  sourceExcerpt?: string;
  section?: string;
  searchText?: string;
  instruction?: string;
}

export interface ParCandidate {
  url: string;
  id?: string;
  label?: string;
  owner?: string;
  notes?: string;
  sources: ParSource[];
}

export interface ParAuditResult {
  id: string;
  label: string;
  scope: ParAuditScope;
  status: ParAuditStatus;
  masked_url: string;
  fingerprint: string;
  object_name: string;
  host?: string;
  region?: string;
  namespace?: string;
  bucket?: string;
  http_status?: number;
  method?: string;
  attempts: number;
  checked_at: string;
  error?: string;
  owner?: string;
  notes?: string;
  sources: ParSource[];
}

export interface ParAuditAttachment {
  schema_version: 1;
  scope: ParAuditScope;
  source_name: string;
  generated_at: string;
  pages_scanned: number;
  scan_errors: ParAuditScanError[];
  counts: Record<ParAuditStatus, number> & { total: number };
  links: ParAuditResult[];
}

export interface ParAuditScanError {
  page_type: string;
  page_url: string;
  label: string;
  error: string;
}

interface AuditOptions {
  retries?: number;
  retryDelayMs?: number;
  timeoutMs?: number;
  concurrency?: number;
}

interface ProbeResult {
  status: "working" | "broken" | "unverified";
  httpStatus?: number;
  method?: string;
  attempts: number;
  error?: string;
}

const PAR_PROBE_WORKER_FILE = path.join(PROJECT_ROOT, "scripts", "par-probe-worker.mjs");
const TRANSIENT_STATUSES = new Set([408, 416, 425, 429]);
const URL_PATTERN = /https?:\/\/[^\s"'<>\\]+/gi;
const EXPLICIT_PLACEHOLDER_PATTERN =
  /\b(?:your|replace|enter|insert|paste|placeholder|change\s+me|fill\s+in|path\s+to|par[\s_-]*(?:url|token)|pre[\s_-]*authenticated[\s_-]*request)\b/i;

export function parseParUrl(rawValue: string): {
  url: URL;
  objectName: string;
  host: string;
  region?: string;
  namespace: string;
  bucket: string;
} | undefined {
  let url: URL;
  try {
    url = new URL(rawValue.trim());
  } catch {
    return undefined;
  }

  if (url.protocol !== "https:" || !/objectstorage/i.test(url.hostname)) return undefined;

  const match = url.pathname.match(/\/p\/([^/]+)\/n\/([^/]+)\/b\/([^/]+)\/o(?:\/(.*))?$/i);
  if (!match || !match[1] || !match[2] || !match[3]) return undefined;

  return {
    url,
    objectName: decodeUrlComponent(match[4] || "") || "(bucket or prefix PAR)",
    host: url.hostname,
    region: url.hostname.match(/objectstorage\.([^.]+)\./i)?.[1],
    namespace: decodeUrlComponent(match[2]),
    bucket: decodeUrlComponent(match[3]),
  };
}

export function isParUrl(value: string): boolean {
  return Boolean(parseParUrl(value)) && !isObviousParPlaceholder(value);
}

export function isObviousParPlaceholder(value: string): boolean {
  const decoded = decodePlaceholderText(value);
  const angleBracketValues = decoded.match(/<[^<>\r\n]{1,200}>/g) || [];
  return angleBracketValues.some((placeholder) => EXPLICIT_PLACEHOLDER_PATTERN.test(placeholder));
}

export function maskParUrl(value: string): string {
  try {
    const url = new URL(value);
    url.pathname = url.pathname.replace(/\/p\/[^/]+/i, "/p/***");
    for (const key of Array.from(url.searchParams.keys())) url.searchParams.set(key, "***");
    return url.toString();
  } catch {
    return "(invalid URL hidden)";
  }
}

export function parFingerprint(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 16);
}

export function extractParUrlsFromText(value: string): string[] {
  const matches = decodeHtmlEntities(value).match(URL_PATTERN) || [];
  const urls = new Set<string>();

  for (const match of matches) {
    const candidate = trimUrlPunctuation(match);
    if (isObviousParPlaceholder(candidate)) continue;
    const parsed = parseParUrl(candidate);
    if (parsed) urls.add(parsed.url.toString());
  }

  return Array.from(urls);
}

export function mergeParCandidates(candidates: ParCandidate[]): ParCandidate[] {
  const merged = new Map<string, ParCandidate>();

  for (const candidate of candidates) {
    if (isObviousParPlaceholder(candidate.url)) continue;
    const parsed = parseParUrl(candidate.url);
    if (!parsed) continue;

    const normalizedUrl = parsed.url.toString();
    const existing = merged.get(normalizedUrl);
    if (!existing) {
      merged.set(normalizedUrl, { ...candidate, url: normalizedUrl, sources: uniqueSources(candidate.sources) });
      continue;
    }

    existing.sources = uniqueSources([...existing.sources, ...candidate.sources]);
    existing.id ||= candidate.id;
    existing.label ||= candidate.label;
    existing.owner ||= candidate.owner;
    existing.notes ||= candidate.notes;
  }

  return Array.from(merged.values());
}

export async function auditParCandidates(
  request: APIRequestContext,
  scope: ParAuditScope,
  candidates: ParCandidate[],
  options: AuditOptions = {},
): Promise<ParAuditResult[]> {
  const config = resolveAuditOptions(options);
  const merged = mergeParCandidates(candidates);
  const results: ParAuditResult[] = new Array(merged.length);
  let nextIndex = 0;

  const workers = Array.from({ length: Math.min(config.concurrency, Math.max(merged.length, 1)) }, async () => {
    while (nextIndex < merged.length) {
      const index = nextIndex++;
      const candidate = merged[index];
      const probe = await probeParUrl(
        request,
        candidate.url,
        config.retries,
        config.retryDelayMs,
        config.timeoutMs,
      );
      results[index] = parAuditResult(scope, candidate, probe);
    }
  });

  await Promise.all(workers);
  return results;
}

export async function auditParCandidatesIsolated(
  scope: ParAuditScope,
  candidates: ParCandidate[],
  options: AuditOptions = {},
): Promise<ParAuditResult[]> {
  const merged = mergeParCandidates(candidates);
  if (merged.length === 0) return [];

  const probes = await runIsolatedParProbes(merged, resolveAuditOptions(options));
  return merged.map((candidate, index) => parAuditResult(scope, candidate, probes[index]));
}

function resolveAuditOptions(options: AuditOptions): Required<AuditOptions> {
  return {
    retries: options.retries ?? parseIntegerFlag(process.env.QA_PAR_RETRIES, 2),
    retryDelayMs: options.retryDelayMs ?? parseIntegerFlag(process.env.QA_PAR_RETRY_DELAY_MS, 1500),
    timeoutMs: options.timeoutMs ?? parseIntegerFlag(process.env.QA_PAR_TIMEOUT_MS, 20_000),
    concurrency: Math.max(
      1,
      options.concurrency ?? parseIntegerFlag(process.env.QA_PAR_CHECK_CONCURRENCY, 4),
    ),
  };
}

function parAuditResult(
  scope: ParAuditScope,
  candidate: ParCandidate,
  probe: ProbeResult,
): ParAuditResult {
  const parsed = parseParUrl(candidate.url);
  const fallbackId = "par-" + parFingerprint(candidate.url);

  return {
    id: candidate.id || fallbackId,
    label: candidate.label || parsed?.objectName || fallbackId,
    scope,
    status: probe.status,
    masked_url: maskParUrl(candidate.url),
    fingerprint: parFingerprint(candidate.url),
    object_name: parsed?.objectName || "(unknown object)",
    host: parsed?.host,
    region: parsed?.region,
    namespace: parsed?.namespace,
    bucket: parsed?.bucket,
    http_status: probe.httpStatus,
    method: probe.method,
    attempts: probe.attempts,
    checked_at: new Date().toISOString(),
    error: probe.error,
    owner: candidate.owner,
    notes: candidate.notes,
    sources: uniqueSources(candidate.sources),
  };
}

function runIsolatedParProbes(
  candidates: ParCandidate[],
  options: Required<AuditOptions>,
): Promise<ProbeResult[]> {
  return new Promise((resolve) => {
    const fallback = (message: string): ProbeResult[] =>
      candidates.map(() => ({ status: "unverified", attempts: 0, error: message }));
    const child = spawn(process.execPath, [PAR_PROBE_WORKER_FILE], {
      cwd: PROJECT_ROOT,
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    });
    let stdout = "";
    let settled = false;
    const maximumBatches = Math.ceil(candidates.length / options.concurrency);
    const maximumRuntime = Math.max(
      60_000,
      maximumBatches * (options.retries + 1) * (options.timeoutMs * 2 + options.retryDelayMs) + 30_000,
    );
    const timer = setTimeout(() => {
      child.kill();
      finish(fallback("The isolated PAR probe exceeded its safety timeout."));
    }, maximumRuntime);
    timer.unref();

    const finish = (results: ProbeResult[]) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(results);
    };

    child.stderr.resume();
    child.stdout.setEncoding("utf-8");
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
    });
    child.on("error", () => finish(fallback("The isolated PAR probe could not start.")));
    child.on("close", (code) => {
      if (settled) return;

      try {
        const payload = JSON.parse(stdout) as {
          results?: Array<ProbeResult & { index: number }>;
        };
        if (code !== 0 || !Array.isArray(payload.results)) {
          finish(fallback("The isolated PAR probe did not return a complete result."));
          return;
        }

        const byIndex = new Map(payload.results.map((result) => [result.index, result]));
        const results = candidates.map((_, index) => normalizeWorkerProbe(byIndex.get(index)));
        finish(results);
      } catch {
        finish(fallback("The isolated PAR probe returned an unreadable result."));
      }
    });

    child.stdin.on("error", () => finish(fallback("The isolated PAR probe could not receive its input.")));
    child.stdin.end(
      JSON.stringify({
        schema_version: 1,
        links: candidates.map((candidate, index) => ({ index, url: candidate.url })),
        options,
      }),
    );
  });
}

function isolatedProbeEnvironment(): NodeJS.ProcessEnv {
  const environment = { ...process.env };
  for (const key of [
    "QA_LIVELABS_USERNAME",
    "QA_LIVELABS_PASSWORD",
    "QA_STORAGE_STATE",
  ]) {
    delete environment[key];
  }
  return environment;
}
function normalizeWorkerProbe(value: (ProbeResult & { index: number }) | undefined): ProbeResult {
  if (!value || !["working", "broken", "unverified"].includes(value.status)) {
    return { status: "unverified", attempts: 0, error: "The isolated PAR probe omitted this result." };
  }

  return {
    status: value.status,
    httpStatus: typeof value.httpStatus === "number" ? value.httpStatus : undefined,
    method: typeof value.method === "string" ? value.method : undefined,
    attempts: Number.isInteger(value.attempts) ? value.attempts : 0,
    error: typeof value.error === "string" ? sanitizeDiagnosticMessage(value.error) : undefined,
  };
}

export function buildParAuditAttachment(
  scope: ParAuditScope,
  sourceName: string,
  links: ParAuditResult[],
  options: { pagesScanned?: number; scanErrors?: ParAuditScanError[] } = {},
): ParAuditAttachment {
  const counts = { total: links.length, working: 0, broken: 0, unverified: 0 };
  for (const link of links) counts[link.status] += 1;

  return {
    schema_version: 1,
    scope,
    source_name: sourceName,
    generated_at: new Date().toISOString(),
    pages_scanned: options.pagesScanned ?? 0,
    scan_errors: (options.scanErrors || []).map((error) => ({
      ...error,
      page_url: sanitizeSourceUrl(error.page_url),
      error: sanitizeDiagnosticMessage(error.error),
    })),
    counts,
    links,
  };
}

export async function attachParAudit(testInfo: TestInfo, audit: ParAuditAttachment): Promise<void> {
  await testInfo.attach("par-audit.json", {
    body: JSON.stringify(audit, null, 2),
    contentType: "application/json",
  });

  const issues = parAuditIssues(audit);
  if (issues.length > 0) {
    await testInfo.attach("qa-issues.json", {
      body: JSON.stringify({ schema_version: 1, issues }, null, 2),
      contentType: "application/json",
    });
  }
}

export function assertParAuditPassed(audit: ParAuditAttachment): void {
  const reviewCount =
    audit.counts.broken +
    audit.counts.unverified +
    audit.scan_errors.length;
  if (reviewCount === 0) return;

  const details = [
    audit.counts.broken ? audit.counts.broken + " broken" : "",
    audit.counts.unverified ? audit.counts.unverified + " unverified after retries" : "",
    audit.scan_errors.length ? audit.scan_errors.length + " page scan error(s)" : "",
  ].filter(Boolean);

  throw new Error("PAR audit needs review: " + details.join(", ") + ". Open the PAR Links report.");
}

export function sanitizeDiagnosticMessage(value: string): string {
  return redactPossibleParValues(value)
    .replace(/\u001b\[[0-9;]*m/g, "")
    .replace(
      /(^|\n)\s*-\s*(cookie|set-cookie|authorization|proxy-authorization|x-api-key|x-auth-token):[^\n]*/gi,
      "$1 - $2: ***",
    )
    .replace(
      /([?&](?:session|p_instance|token|access_token|auth|authorization)=)[^&\s]*/gi,
      "$1***",
    )
    .replace(/\s+/g, " ")
    .trim();
}

export function sanitizeSourceUrl(value: string): string {
  try {
    const url = new URL(value);
    for (const key of ["session", "p_instance"]) url.searchParams.delete(key);
    for (const key of ["token", "access_token", "auth", "authorization"]) {
      if (url.searchParams.has(key)) url.searchParams.set(key, "***");
    }

    for (const [key, parameterValue] of Array.from(url.searchParams.entries())) {
      const nestedPar = parseParUrl(parameterValue);
      if (nestedPar) {
        url.searchParams.set(key, maskParUrl(nestedPar.url.toString()));
      }
    }

    if (url.hash) {
      let decodedHash = url.hash;
      try {
        decodedHash = decodeURIComponent(url.hash);
      } catch {
        // Keep the original hash when it is not valid percent-encoded text.
      }
      for (const nestedPar of extractParUrlsFromText(decodedHash)) {
        decodedHash = decodedHash.split(nestedPar).join(maskParUrl(nestedPar));
      }
      url.hash = decodedHash;
    }

    return isParUrl(url.toString()) ? maskParUrl(url.toString()) : url.toString();
  } catch {
    return "";
  }
}

async function probeParUrl(
  request: APIRequestContext,
  url: string,
  retries: number,
  retryDelayMs: number,
  timeoutMs: number,
): Promise<ProbeResult> {
  let lastResult: ProbeResult = { status: "unverified", attempts: 0, error: "PAR check did not run." };

  for (let attempt = 1; attempt <= retries + 1; attempt += 1) {
    lastResult = await probeParUrlOnce(request, url, timeoutMs, attempt);
    if (lastResult.status !== "unverified") return lastResult;
    if (attempt <= retries) await delay(retryDelayMs);
  }

  return lastResult;
}

async function probeParUrlOnce(
  request: APIRequestContext,
  url: string,
  timeoutMs: number,
  attempt: number,
): Promise<ProbeResult> {
  let headStatus: number | undefined;
  let headError = "";

  try {
    const response = await request.head(url, { failOnStatusCode: false, maxRedirects: 5, timeout: timeoutMs });
    headStatus = response.status();
    await response.dispose();
    if (isWorkingStatus(headStatus)) {
      return { status: "working", httpStatus: headStatus, method: "HEAD", attempts: attempt };
    }
  } catch (error) {
    headError = redactError(error, url);
  }

  try {
    const response = await request.get(url, {
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
    const getError = redactError(error, url);
    return {
      status: "unverified",
      httpStatus: headStatus,
      method: headStatus === undefined ? "HEAD/GET range" : "GET range",
      attempts: attempt,
      error: [headError, getError].filter(Boolean).join(" | ") || "Network request failed.",
    };
  }
}

function classifyHttpStatus(status: number): "working" | "broken" | "unverified" {
  if (isWorkingStatus(status)) return "working";
  if (status >= 400 && status < 500 && !TRANSIENT_STATUSES.has(status)) return "broken";
  return "unverified";
}

function isWorkingStatus(status: number): boolean {
  return status >= 200 && status < 300;
}

function parAuditIssues(audit: ParAuditAttachment) {
  const issues = [];
  const broken = audit.links.filter((link) => link.status === "broken");
  const unverified = audit.links.filter((link) => link.status === "unverified");

  if (broken.length) {
    issues.push({
      code: "STALE_PAR_LINK",
      label: "Stale PAR link",
      severity: "major",
      message: audit.source_name + " contains " + broken.length + " definitively broken PAR link(s).",
      details: broken,
    });
  }
  if (unverified.length) {
    issues.push({
      code: "PAR_LINK_UNVERIFIED",
      label: "PAR link could not be verified",
      severity: "major",
      message: audit.source_name + " contains " + unverified.length + " PAR link(s) unverified after retries.",
      details: unverified,
    });
  }
  if (audit.scan_errors.length) {
    issues.push({
      code: "PAR_SCAN_INCOMPLETE",
      label: "PAR scan incomplete",
      severity: "major",
      message: audit.source_name + " has " + audit.scan_errors.length + " page(s) that could not be scanned.",
      details: audit.scan_errors,
    });
  }

  return issues;
}

function uniqueSources(sources: ParSource[]): ParSource[] {
  const unique = new Map<string, ParSource>();
  for (const source of sources) {
    const safeSource = {
      ...source,
      pageUrl: sanitizeSourceUrl(source.pageUrl),
      sourceFileUrl: source.sourceFileUrl ? sanitizeSourceUrl(source.sourceFileUrl) : undefined,
    };
    const key = [
      safeSource.pageType,
      safeSource.pageUrl,
      safeSource.sourceFileUrl || "",
      safeSource.sourceLine || "",
      safeSource.sourceExcerpt || "",
      safeSource.label,
      safeSource.location || "",
      safeSource.section || "",
      safeSource.instruction || "",
    ].join("|");
    unique.set(key, safeSource);
  }
  return Array.from(unique.values());
}

function safeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function redactError(error: unknown, url: string): string {
  return sanitizeDiagnosticMessage(
    safeError(error).split(url).join(maskParUrl(url)).replace(/\/p\/[^/\s]+/gi, "/p/***"),
  );
}

function redactPossibleParValues(value: string): string {
  let result = value;
  for (const url of extractParUrlsFromText(value)) result = result.split(url).join(maskParUrl(url));
  return result.replace(/\/p\/[^/\s]+/gi, "/p/***");
}

function trimUrlPunctuation(value: string): string {
  let result = value.trim();
  let previous = "";

  while (result !== previous) {
    previous = result;
    result = result.replace(/(?:\*{1,3}|_{2,3}|[`),.;\]}])$/, "");
  }

  return result;
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#x2f;/gi, "/")
    .replace(/&#47;/gi, "/")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

function decodePlaceholderText(value: string): string {
  let result = decodeHtmlEntities(value);

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const decoded = decodeURIComponent(result);
      if (decoded === result) break;
      result = decodeHtmlEntities(decoded);
    } catch {
      break;
    }
  }

  return result;
}

function decodeUrlComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
