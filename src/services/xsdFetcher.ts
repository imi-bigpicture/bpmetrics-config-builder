/**
 * XSD Schema Fetcher Service
 * Manages fetching and caching of MetaFleX XSD schema files from GitHub repository
 */
import { safeGetJson, safeSetItem } from "@/lib/safeStorage";

export interface XsdMetadata {
  lastFetched: string;
  sourceRepo: string;
  branch: string;
  version: string;
  fileCount: number;
  fallbackFiles: string[];
  failedFiles: string[];
}

const XSD_FILES = [
  'BP.annotation.xsd',
  'BP.common.xsd',
  'BP.dataset.xsd',
  'BP.image.xsd',
  'BP.landing_page.xsd',
  'BP.observation.xsd',
  'BP.observer.xsd',
  'BP.organisation.xsd',
  'BP.policy.xsd',
  'BP.rems.xsd',
  'BP.sample.xsd',
  'BP.staining.xsd',
];

const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com/imi-bigpicture/bigpicture-metaflex/main/src';
const LOCAL_FALLBACK_BASE = '/metaflex';
const CACHE_KEY_PREFIX = 'metaflex_xsd_';
const METADATA_KEY = 'metaflex_metadata';

interface FetchOutcome {
  content: string | null;
  source: 'cache' | 'live' | 'stale-cache-fallback' | 'local-fallback' | 'failed';
}

/**
 * Fetch the bundled local copy of an XSD file (public/metaflex/), used only
 * when the live GitHub fetch fails and no cache is available.
 */
async function fetchLocalFallback(filename: string): Promise<string | null> {
  try {
    const response = await fetch(`${LOCAL_FALLBACK_BASE}/${filename}`);
    if (!response.ok) return null;
    return await response.text();
  } catch (error) {
    console.error(`Error reading local fallback for ${filename}:`, error);
    return null;
  }
}

/**
 * Fetch a single XSD file: cache -> live GitHub fetch -> stale cache -> bundled local copy.
 */
async function fetchXsdFile(filename: string, useCache: boolean): Promise<FetchOutcome> {
  if (useCache) {
    const cached = localStorage.getItem(CACHE_KEY_PREFIX + filename);
    if (cached) {
      return { content: cached, source: 'cache' };
    }
  }

  try {
    const url = `${GITHUB_RAW_BASE}/${filename}`;
    const response = await fetch(url);

    if (response.ok) {
      const content = await response.text();
      safeSetItem(CACHE_KEY_PREFIX + filename, content);
      return { content, source: 'live' };
    }

    console.error(`Failed to fetch ${filename}: ${response.statusText}`);
  } catch (error) {
    console.error(`Error fetching ${filename}:`, error);
  }

  // Live fetch failed - fall back to whatever's cached, even if stale
  // (relevant on forced refresh, which skips the cache check above). This is a
  // degraded outcome, not a normal cache hit: the caller asked for fresh data
  // and didn't get it, so it's tagged separately from 'cache'.
  const stale = localStorage.getItem(CACHE_KEY_PREFIX + filename);
  if (stale) {
    return { content: stale, source: 'stale-cache-fallback' };
  }

  // No cache either - fall back to the bundled copy shipped with the app.
  const local = await fetchLocalFallback(filename);
  if (local) {
    return { content: local, source: 'local-fallback' };
  }

  return { content: null, source: 'failed' };
}

export interface FetchAllXsdSchemasResult {
  schemas: Map<string, string>;
  fallbackFiles: string[];
  failedFiles: string[];
}

/**
 * Fetch all XSD files from GitHub
 */
export async function fetchAllXsdSchemas(forceRefresh: boolean = false): Promise<FetchAllXsdSchemasResult> {
  const schemas = new Map<string, string>();
  const fallbackFiles: string[] = [];
  const failedFiles: string[] = [];
  const useCache = !forceRefresh;

  for (const filename of XSD_FILES) {
    const outcome = await fetchXsdFile(filename, useCache);
    if (outcome.content) {
      schemas.set(filename, outcome.content);
      if (outcome.source === 'local-fallback' || outcome.source === 'stale-cache-fallback') {
        fallbackFiles.push(filename);
      }
    } else {
      failedFiles.push(filename);
    }
  }

  // Update metadata
  const metadata: XsdMetadata = {
    lastFetched: new Date().toISOString(),
    sourceRepo: 'https://github.com/imi-bigpicture/bigpicture-metaflex',
    branch: 'main',
    version: '2.0.0',
    fileCount: schemas.size,
    fallbackFiles,
    failedFiles,
  };

  safeSetItem(METADATA_KEY, JSON.stringify(metadata));

  return { schemas, fallbackFiles, failedFiles };
}

/**
 * Get cached XSD file
 */
export function getCachedXsd(filename: string): string | null {
  return localStorage.getItem(CACHE_KEY_PREFIX + filename);
}

/**
 * Get all cached XSD schemas
 */
export function getAllCachedXsdSchemas(): Map<string, string> {
  const schemas = new Map<string, string>();

  for (const filename of XSD_FILES) {
    const content = getCachedXsd(filename);
    if (content) {
      schemas.set(filename, content);
    }
  }

  return schemas;
}

/**
 * Get XSD metadata
 */
export function getXsdMetadata(): XsdMetadata | null {
  return safeGetJson<XsdMetadata>(METADATA_KEY);
}

/**
 * Check if XSD schemas are cached
 */
export function hasCachedXsdSchemas(): boolean {
  const metadata = getXsdMetadata();
  return metadata !== null && metadata.fileCount === XSD_FILES.length;
}

/**
 * Clear all cached XSD schemas
 */
export function clearXsdSchemaCache(): void {
  for (const filename of XSD_FILES) {
    localStorage.removeItem(CACHE_KEY_PREFIX + filename);
  }
  localStorage.removeItem(METADATA_KEY);
}

/**
 * Check if XSD schemas need update (older than 24 hours)
 */
export function needsXsdUpdate(): boolean {
  const metadata = getXsdMetadata();
  if (!metadata) return true;

  const lastFetched = new Date(metadata.lastFetched);
  const now = new Date();
  const hoursSinceUpdate = (now.getTime() - lastFetched.getTime()) / (1000 * 60 * 60);

  return hoursSinceUpdate > 24;
}

export { XSD_FILES };
