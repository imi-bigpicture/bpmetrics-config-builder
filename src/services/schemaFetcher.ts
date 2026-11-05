/**
 * Schema Fetcher Service
 * Manages fetching and caching of MSMdad schema files from the GitHub repository
 */
import { safeGetJson, safeSetItem } from "@/lib/safeStorage";

export interface SchemaMetadata {
  lastFetched: string;
  sourceRepo: string;
  branch: string;
  version: string;
  fileCount: number;
  fallbackFiles: string[];
  failedFiles: string[];
}

const SCHEMA_FILES = [
  '5.4.1_Context_Specific_Attributes.xml',
  '5.4.2_Dataset_Entity.xml',
  '5.4.3_Policy_Entity.xml',
  '5.4.4_Biological_Being_Entity.xml',
  '5.4.5_Case_Entity.xml',
  '5.4.6_Specimen_Entity.xml',
  '5.4.7_Block_Entity.xml',
  '5.4.8_Slide_Entity.xml',
  '5.4.9_Staining_Entity.xml',
  '5.4.10_Image_Entity.xml',
  '5.4.11_Annotation_Entity.xml',
  '5.4.12_Observation_Entity.xml',
  '5.4.13_Observer_Entity.xml',
  '5.4.14_Landing_page_Entity.xml',
  '5.4.15_REMS_Entity.xml',
  '5.4.16_Organisation_Entity.xml',
  '5.4.17_DataCite_Entity.xml',
];

const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com/imi-bigpicture/bigpicture-msmdad/main/src';
const LOCAL_FALLBACK_BASE = '/msmdad';
const CACHE_KEY_PREFIX = 'msmdad_schema_';
const METADATA_KEY = 'msmdad_metadata';

interface FetchOutcome {
  content: string | null;
  source: 'cache' | 'live' | 'stale-cache-fallback' | 'local-fallback' | 'failed';
}

/**
 * Fetch the bundled local copy of a schema file (public/msmdad/), used only
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
 * Fetch a single schema file: cache -> live GitHub fetch -> stale cache -> bundled local copy.
 */
async function fetchSchemaFile(filename: string, useCache: boolean): Promise<FetchOutcome> {
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

export interface FetchAllSchemasResult {
  schemas: Map<string, string>;
  fallbackFiles: string[];
  failedFiles: string[];
}

/**
 * Fetch all schema files from GitHub
 */
export async function fetchAllSchemas(forceRefresh: boolean = false): Promise<FetchAllSchemasResult> {
  const schemas = new Map<string, string>();
  const fallbackFiles: string[] = [];
  const failedFiles: string[] = [];
  const useCache = !forceRefresh;

  for (const filename of SCHEMA_FILES) {
    const outcome = await fetchSchemaFile(filename, useCache);
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
  const metadata: SchemaMetadata = {
    lastFetched: new Date().toISOString(),
    sourceRepo: 'https://github.com/imi-bigpicture/bigpicture-msmdad',
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
 * Get cached schema file
 */
export function getCachedSchema(filename: string): string | null {
  return localStorage.getItem(CACHE_KEY_PREFIX + filename);
}

/**
 * Get all cached schemas
 */
export function getAllCachedSchemas(): Map<string, string> {
  const schemas = new Map<string, string>();

  for (const filename of SCHEMA_FILES) {
    const content = getCachedSchema(filename);
    if (content) {
      schemas.set(filename, content);
    }
  }

  return schemas;
}

/**
 * Get schema metadata
 */
export function getSchemaMetadata(): SchemaMetadata | null {
  return safeGetJson<SchemaMetadata>(METADATA_KEY);
}

/**
 * Check if schemas are cached
 */
export function hasCachedSchemas(): boolean {
  const metadata = getSchemaMetadata();
  return metadata !== null && metadata.fileCount === SCHEMA_FILES.length;
}

/**
 * Clear all cached schemas
 */
export function clearSchemaCache(): void {
  for (const filename of SCHEMA_FILES) {
    localStorage.removeItem(CACHE_KEY_PREFIX + filename);
  }
  localStorage.removeItem(METADATA_KEY);
}

/**
 * Check if schemas need update (older than 24 hours)
 */
export function needsUpdate(): boolean {
  const metadata = getSchemaMetadata();
  if (!metadata) return true;

  const lastFetched = new Date(metadata.lastFetched);
  const now = new Date();
  const hoursSinceUpdate = (now.getTime() - lastFetched.getTime()) / (1000 * 60 * 60);

  return hoursSinceUpdate > 24;
}

export { SCHEMA_FILES };
