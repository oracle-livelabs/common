import { readFileSync } from "node:fs";
import path from "node:path";

import { PROJECT_ROOT } from "../../config/projectConfig.js";

export interface WorkshopOverviewTarget {
  name: string;
  search_term: string;
  title_pattern: string;
  expected_terms: string[];
}

export interface LiveStackOverviewTarget {
  name: string;
  search_term: string;
  max_cards: number;
  minimum_cards: number;
  expected_terms: string[];
}

export interface PreviewInstructionTarget extends WorkshopOverviewTarget {}

export interface LiveStackResourceTarget extends WorkshopOverviewTarget {}

interface OverviewTargetsRecord {
  workshop_overview_targets: WorkshopOverviewTarget[];
  livestack_overview_targets: LiveStackOverviewTarget[];
  livestack_resource_targets: LiveStackResourceTarget[];
  preview_instruction_targets: PreviewInstructionTarget[];
}

const OVERVIEW_TARGETS_FILE = path.join(PROJECT_ROOT, "tests", "data", "overview_targets.json");
const OVERVIEW_TARGETS = JSON.parse(readFileSync(OVERVIEW_TARGETS_FILE, "utf-8")) as OverviewTargetsRecord;

export function getWorkshopOverviewTargets(): WorkshopOverviewTarget[] {
  return OVERVIEW_TARGETS.workshop_overview_targets.map((target) => ({
    ...target,
    expected_terms: [...target.expected_terms],
  }));
}

export function getLiveStackOverviewTargets(): LiveStackOverviewTarget[] {
  return OVERVIEW_TARGETS.livestack_overview_targets.map((target) => ({
    ...target,
    expected_terms: [...target.expected_terms],
  }));
}

export function getPreviewInstructionTargets(): PreviewInstructionTarget[] {
  return OVERVIEW_TARGETS.preview_instruction_targets.map((target) => ({
    ...target,
    expected_terms: [...target.expected_terms],
  }));
}

export function getLiveStackResourceTargets(): LiveStackResourceTarget[] {
  return OVERVIEW_TARGETS.livestack_resource_targets.map((target) => ({
    ...target,
    expected_terms: [...target.expected_terms],
  }));
}
