// Small in-memory sliding-window rate limiter. It is per server process, which is correct for the
// single-VPS deployment described in docs/DEPLOYMENT.md. Use a shared store (e.g. Redis) if you ever
// run more than one app instance.

const buckets = globalThis.__guruji_rate_limit ?? (globalThis.__guruji_rate_limit = new Map());

function prune(entries, windowMs, now) {
  while (entries.length > 0 && now - entries[0] >= windowMs) entries.shift();
}

/** Records one hit and reports whether the caller is still within the limit. */
export function hit(key, { limit, windowMs }, now = Date.now()) {
  const entries = buckets.get(key) ?? [];
  prune(entries, windowMs, now);
  if (entries.length >= limit) {
    buckets.set(key, entries);
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((entries[0] + windowMs - now) / 1000)) };
  }
  entries.push(now);
  buckets.set(key, entries);
  return { allowed: true, retryAfterSeconds: 0 };
}

/** Checks without recording a hit. */
export function peek(key, { limit, windowMs }, now = Date.now()) {
  const entries = buckets.get(key) ?? [];
  prune(entries, windowMs, now);
  if (entries.length >= limit) {
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((entries[0] + windowMs - now) / 1000)) };
  }
  return { allowed: true, retryAfterSeconds: 0 };
}

export function reset(key) {
  buckets.delete(key);
}

export function clearAll() {
  buckets.clear();
}

// Periodically drop empty / expired buckets so the map cannot grow without bound.
const CLEANUP_MS = 10 * 60 * 1000;
if (!globalThis.__guruji_rate_limit_timer) {
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [key, entries] of buckets) {
      prune(entries, 60 * 60 * 1000, now);
      if (entries.length === 0) buckets.delete(key);
    }
  }, CLEANUP_MS);
  timer.unref?.();
  globalThis.__guruji_rate_limit_timer = timer;
}
