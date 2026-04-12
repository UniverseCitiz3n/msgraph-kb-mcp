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

const STOPWORDS = new Set([
  "a",
  "an",
  "all",
  "and",
  "for",
  "from",
  "get",
  "in",
  "of",
  "on",
  "the",
  "to",
  "with",
]);

const TERM_CORRECTIONS: Record<string, string> = {
  bussines: "business",
  bussiness: "business",
  buisness: "business",
};

interface DomainBoost {
  keywords: string[];
  pathIncludes: string[];
  bonus: number;
}

const DOMAIN_BOOSTS: DomainBoost[] = [
  {
    keywords: ["windows", "update", "driver", "profile"],
    pathIncludes: ["windowsdriverupdateprofiles"],
    bonus: 6,
  },
  {
    keywords: ["windows", "update", "driver"],
    pathIncludes: ["driverinventories"],
    bonus: 12,
  },
];

function addTermVariants(term: string, target: Set<string>) {
  target.add(term);
  if (term.length > 4 && term.endsWith("es")) {
    target.add(term.slice(0, -2));
  }
  if (term.length > 4 && term.endsWith("s")) {
    target.add(term.slice(0, -1));
  }
}

function normalizeTerms(query: string): string[] {
  const terms = new Set<string>();
  const rawParts = query
    .toLowerCase()
    .split(/[^a-z0-9{}\/-]+/)
    .filter((t) => t.length > 0);

  for (const part of rawParts) {
    if (STOPWORDS.has(part)) continue;
    const corrected = TERM_CORRECTIONS[part] ?? part;
    addTermVariants(corrected, terms);
  }

  return Array.from(terms);
}

function applyDomainBoosts(
  score: number,
  terms: Set<string>,
  pathLower: string
): number {
  for (const boost of DOMAIN_BOOSTS) {
    const matchesAllKeywords = boost.keywords.every((kw) => terms.has(kw));
    const pathMatches = boost.pathIncludes.some((needle) =>
      pathLower.includes(needle)
    );
    if (matchesAllKeywords && pathMatches) {
      score += boost.bonus;
    }
  }
  return score;
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

  const normalizedTerms = normalizeTerms(query);
  if (normalizedTerms.length === 0) {
    return [];
  }
  const termSet = new Set(normalizedTerms);

  const scored: Array<{
    ep: MergedEndpoint;
    score: number;
  }> = [];

  for (const ep of index.endpoints) {
    const pathLower = ep.path.toLowerCase();
    const summaryLower = (ep.summary ?? "").toLowerCase();
    const descLower = (ep.description ?? "").toLowerCase();
    const resourceLower = (ep.resource ?? "").toLowerCase();

    let score = 0;
    const matchedInPath = new Set<string>();
    const matchedAnywhere = new Set<string>();

    for (const term of normalizedTerms) {
      if (pathLower.includes(term)) {
        score += 3;
        matchedInPath.add(term);
        matchedAnywhere.add(term);
      }
      if (summaryLower.includes(term)) {
        score += 2;
        matchedAnywhere.add(term);
      }
      if (descLower.includes(term)) {
        score += 1;
        matchedAnywhere.add(term);
      }
      if (resourceLower.includes(term)) {
        score += 1;
        matchedAnywhere.add(term);
      }
    }

    if (score === 0) {
      continue;
    }

    if (matchedInPath.size >= 2) {
      score += matchedInPath.size; // reward endpoints that hit multiple key terms in the path
    }
    if (matchedAnywhere.size === termSet.size) {
      score += 2; // small boost when all query terms are represented somewhere
    }

    score = applyDomainBoosts(score, termSet, pathLower);
    scored.push({ ep, score });
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
