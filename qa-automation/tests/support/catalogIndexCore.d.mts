export interface CatalogShard {
  current: number;
  total: number;
}

export interface SelectableCatalogItem {
  id: string;
  slug: string;
  type: string;
}

export function parseCatalogShard(value?: string): CatalogShard | undefined;
export function selectCatalogIndexItems<T extends SelectableCatalogItem>(
  items: T[],
  options?: { type?: string; ids?: string[]; shard?: CatalogShard; limit?: number },
): T[];
export function expectedTermsForText(value: string, maxTerms?: number): string[];
