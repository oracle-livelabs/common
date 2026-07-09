export async function openCatalogSearch(
  workshopCardsPage: {
    openBrowseFromHome(baseUrl: string): Promise<void>;
    searchWithinCatalog(searchTerm: string): Promise<void>;
    assertLoaded(searchTerm: string): Promise<void>;
  },
  baseUrl: string,
  searchTerm: string,
): Promise<void> {
  const maxAttempts = 2;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await workshopCardsPage.openBrowseFromHome(baseUrl);
      await workshopCardsPage.searchWithinCatalog(searchTerm);
      await workshopCardsPage.assertLoaded(searchTerm);
      return;
    } catch (error) {
      lastError = error;

      if (attempt < maxAttempts) {
        await delay(3_000 * attempt);
      }
    }
  }

  const detail = lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(
    `Catalog search setup did not become reachable after ${maxAttempts} attempts for "${searchTerm}". Last error: ${detail}`,
  );
}

export function exactTitlePattern(title: string): string {
  return `^\\s*${escapeRegex(title)}\\s*$`;
}

export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function delay(milliseconds: number): Promise<void> {
  await new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}
