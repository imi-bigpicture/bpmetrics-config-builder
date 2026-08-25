/**
 * localStorage can throw - Safari private browsing treats it as zero-quota, and
 * quota-exceeded is always possible. These wrappers make that failure mode explicit
 * and non-fatal everywhere it's used, instead of relying on an unrelated try/catch
 * (e.g. one wrapping a fetch call) to happen to catch it too.
 */

export function safeSetItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    console.error(`Failed to write localStorage key "${key}":`, error);
    return false;
  }
}

export function safeGetJson<T>(key: string): T | null {
  const raw = localStorage.getItem(key);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    console.error(`Failed to parse localStorage key "${key}", clearing it:`, error);
    localStorage.removeItem(key);
    return null;
  }
}
