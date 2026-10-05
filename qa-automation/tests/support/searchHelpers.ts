// The old Python framework supported tokens like "configured" or "default"
// in example tables. Keeping that convention makes migration easier while
// leaving the tests free to override the actual search term centrally.
const CONFIGURED_SEARCH_TERM_TOKENS = new Set(["configured", "default"]);

export function resolveSearchTerm(exampleSearchTerm: string, configuredSearchTerm: string): string {
  if (CONFIGURED_SEARCH_TERM_TOKENS.has(exampleSearchTerm.trim().toLowerCase())) {
    return configuredSearchTerm;
  }

  return exampleSearchTerm;
}
