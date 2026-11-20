const STOP_WORDS = new Set([
  "about", "and", "build", "create", "demo", "from", "into", "livelab",
  "livelabs", "livestack", "oracle", "overview", "the", "this", "using",
  "with", "workshop",
]);

export function parseCatalogShard(value) {
  const normalized = value?.trim();
  if (!normalized) return undefined;

  const match = normalized.match(/^(\d+)\/(\d+)$/);
  if (!match) {
    throw new Error(`QA_CATALOG_INDEX_SHARD must use the format "current/total", for example "1/4". Received: ${value}`);
  }

  const current = Number.parseInt(match[1], 10);
  const total = Number.parseInt(match[2], 10);
  if (!Number.isFinite(current) || !Number.isFinite(total) || total < 1 || current < 1 || current > total) {
    throw new Error(`QA_CATALOG_INDEX_SHARD is out of range. Received: ${value}`);
  }
  return { current, total };
}

export function selectCatalogIndexItems(items, { type, ids = [], shard, limit = 0 } = {}) {
  const selectedById = ids.length
    ? items.filter((item) => ids.includes(item.id) || ids.includes(item.slug))
    : items;
  const sharded = shard
    ? selectedById.filter((_, index) => index % shard.total === shard.current - 1)
    : selectedById;
  const filtered = type ? sharded.filter((item) => item.type === type) : sharded;
  return limit > 0 ? filtered.slice(0, limit) : filtered;
}

export function expectedTermsForText(value, maxTerms = 3) {
  const words = value
    .replace(/[^A-Za-z0-9+#. ]+/g, " ")
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean)
    .filter((word) => word.length >= 3)
    .filter((word) => !STOP_WORDS.has(word.toLowerCase()));
  const uniqueWords = [];
  const seen = new Set();
  for (const word of words) {
    const normalized = word.toLowerCase();
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    uniqueWords.push(word);
  }
  return uniqueWords.slice(0, maxTerms);
}
