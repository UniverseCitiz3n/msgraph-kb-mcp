import { RepoIndex, MergedEndpoint } from "./loader.js";

export interface SearchResult {
  path: string;
  method: string;
  summary: string;
  description?: string;
  permissions?: {
    delegatedWork?: string[];
    delegatedPersonal?: string[];
    application?: string[];
  };
  resource?: string;
}

/**
 * Search endpoints by keyword across path, summary, description, and resource.
 * Returns up to `limit` results sorted by relevance (simple score).
 */
export function searchEndpoints(
  index: RepoIndex,
  query: string,
  limit = 20
): SearchResult[] {
  if (!query || query.trim().length === 0) {
    return [];
  }

  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 0);

  if (terms.length === 0) {
    return [];
  }

  const scored: Array<{ ep: MergedEndpoint; score: number }> = [];

  for (const ep of index.endpoints) {
    const pathLower = ep.path.toLowerCase();
    const summaryLower = (ep.summary ?? "").toLowerCase();
    const descLower = (ep.description ?? "").toLowerCase();
    const resourceLower = (ep.resource ?? "").toLowerCase();

    let score = 0;
    for (const term of terms) {
      if (pathLower.includes(term)) score += 3;
      if (summaryLower.includes(term)) score += 2;
      if (descLower.includes(term)) score += 1;
      if (resourceLower.includes(term)) score += 1;
    }

    if (score > 0) {
      scored.push({ ep, score });
    }
  }

  // Sort by score descending, then by path + method for determinism
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const pathCmp = a.ep.path.localeCompare(b.ep.path);
    if (pathCmp !== 0) return pathCmp;
    return a.ep.method.localeCompare(b.ep.method);
  });

  return scored.slice(0, limit).map(({ ep }) => ({
    path: ep.path,
    method: ep.method,
    summary: ep.summary ?? ep.path,
    description: ep.description,
    permissions: ep.permissions,
    resource: ep.resource,
  }));
}

/**
 * Find all endpoints matching the given path (case-insensitive, ignoring trailing slash).
 */
export function findEndpointsByPath(
  index: RepoIndex,
  endpointPath: string
): MergedEndpoint[] {
  const normInput = endpointPath.toLowerCase().replace(/\/$/, "");

  // Exact key lookup first
  const direct = index.endpointMap.get(normInput);
  if (direct && direct.length > 0) {
    return direct;
  }

  // Fallback: linear scan for partial / prefix match
  const results: MergedEndpoint[] = [];
  for (const ep of index.endpoints) {
    const normPath = ep.path.toLowerCase().replace(/\/$/, "");
    if (normPath === normInput || normPath.startsWith(normInput)) {
      results.push(ep);
    }
  }
  return results;
}
