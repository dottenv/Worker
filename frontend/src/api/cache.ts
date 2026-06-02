const cache = new Map<string, { data: any; ts: number }>();
const TTL = 5000;

export function cacheGet(key: string): any | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > TTL) { cache.delete(key); return null; }
  return entry.data;
}

export function cacheSet(key: string, data: any) {
  cache.set(key, { data, ts: Date.now() });
}

export function cacheClear(pattern?: string) {
  if (!pattern) { cache.clear(); return; }
  for (const k of cache.keys()) {
    if (k.includes(pattern)) cache.delete(k);
  }
}
