import { readFileSync } from "node:fs";
import path from "node:path";

import { PROJECT_ROOT } from "../../config/projectConfig.js";

interface PlatformSmokeTargetsRecord {
  home_search_terms: string[];
  workshop_landing_search_terms: string[];
}

const PLATFORM_SMOKE_TARGETS_FILE = path.join(PROJECT_ROOT, "tests", "data", "platform_smoke_targets.json");
const PLATFORM_SMOKE_TARGETS = JSON.parse(
  readFileSync(PLATFORM_SMOKE_TARGETS_FILE, "utf-8"),
) as PlatformSmokeTargetsRecord;

function cloneTerms(terms: string[]): string[] {
  return [...terms];
}

export function getHomeSearchTerms(): string[] {
  return cloneTerms(PLATFORM_SMOKE_TARGETS.home_search_terms);
}

export function getWorkshopLandingSearchTerms(): string[] {
  return cloneTerms(PLATFORM_SMOKE_TARGETS.workshop_landing_search_terms);
}
