import { readFileSync } from "node:fs";
import path from "node:path";

import { PROJECT_ROOT } from "../../config/projectConfig.js";

export type CatalogResultKind = "any" | "workshop" | "livestack";

export interface CatalogFacetSelection {
  facet: string;
  option: string;
}

export interface CatalogSingleFacetTarget extends CatalogFacetSelection {
  expected_result_kind: CatalogResultKind;
}

export interface CatalogCombinedFilterTarget {
  name: string;
  filters: CatalogFacetSelection[];
  expected_result_kind: CatalogResultKind;
}

interface CatalogFilterTargetsRecord {
  facet_sections: string[];
  single_facet_targets: CatalogSingleFacetTarget[];
  combined_filter_targets: CatalogCombinedFilterTarget[];
  overflow_facets: string[];
}

const CATALOG_FILTER_TARGETS_FILE = path.join(PROJECT_ROOT, "tests", "data", "catalog_filter_targets.json");
const CATALOG_FILTER_TARGETS = JSON.parse(
  readFileSync(CATALOG_FILTER_TARGETS_FILE, "utf-8"),
) as CatalogFilterTargetsRecord;

export function getCatalogFacetSections(): string[] {
  return [...CATALOG_FILTER_TARGETS.facet_sections];
}

export function getCatalogSingleFacetTargets(): CatalogSingleFacetTarget[] {
  return CATALOG_FILTER_TARGETS.single_facet_targets.map((target) => ({ ...target }));
}

export function getCatalogCombinedFilterTargets(): CatalogCombinedFilterTarget[] {
  return CATALOG_FILTER_TARGETS.combined_filter_targets.map((target) => ({
    ...target,
    filters: target.filters.map((filter) => ({ ...filter })),
  }));
}

export function getCatalogOverflowFacets(): string[] {
  return [...CATALOG_FILTER_TARGETS.overflow_facets];
}
