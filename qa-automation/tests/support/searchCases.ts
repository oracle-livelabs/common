import { readFileSync } from "node:fs";
import path from "node:path";

import { PROJECT_ROOT } from "../../config/projectConfig.js";

export interface SearchCaseRecord {
  id: string;
  search_term: string;
}

// Regression search cases live in JSON so expanding the matrix does not require
// rewriting the spec structure or hard-coding data deep inside a test body.
const SEARCH_CASES_FILE = path.join(PROJECT_ROOT, "tests", "data", "search_edge_cases.json");
const SEARCH_CASES = JSON.parse(readFileSync(SEARCH_CASES_FILE, "utf-8")) as SearchCaseRecord[];

export const SEARCH_CASE_NAMES = {
  unknownWorkshopTerm: "Unknown workshop term",
  blankSpaceSearch: "Blank-space search",
} as const;

const CASE_NAME_TO_ID = {
  [SEARCH_CASE_NAMES.unknownWorkshopTerm]: "no_results",
  [SEARCH_CASE_NAMES.blankSpaceSearch]: "blank_spaces",
} as const;

export type SearchCaseName = (typeof SEARCH_CASE_NAMES)[keyof typeof SEARCH_CASE_NAMES];

export function getSearchCaseByName(caseName: SearchCaseName): SearchCaseRecord {
  const caseId = CASE_NAME_TO_ID[caseName];
  const matchingCase = SEARCH_CASES.find((searchCase) => searchCase.id === caseId);

  if (!matchingCase) {
    throw new Error(`Unknown search case id: ${caseId}`);
  }

  return matchingCase;
}
