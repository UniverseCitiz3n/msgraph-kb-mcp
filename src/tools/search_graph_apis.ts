import { RepoIndex } from "../loader.js";
import { searchEndpoints } from "../search.js";
import {
  EndpointAdvisory,
  getEndpointAdvisories,
} from "../endpoint_advisories.js";

export interface SearchGraphApisInput {
  query: string;
  limit?: number;
}

export interface SearchGraphApisResult {
  query: string;
  totalMatches: number;
  results: Array<{
    path: string;
    method: string;
    summary: string;
    description?: string;
    permissions?: {
      delegatedWork?: string[];
      delegatedPersonal?: string[];
      application?: string[];
    };
    advisories?: EndpointAdvisory[];
  }>;
  error?: string;
}

export function searchGraphApis(
  index: RepoIndex | null,
  input: SearchGraphApisInput
): SearchGraphApisResult {
  if (!index || index.apiCount === 0) {
    return {
      query: input.query,
      totalMatches: 0,
      results: [],
      error:
        "Data unavailable: the merill/msgraph repository could not be cloned at startup. Please check server logs.",
    };
  }

  const limit = input.limit && input.limit > 0 ? input.limit : 20;
  const results = searchEndpoints(index, input.query, limit);

  return {
    query: input.query,
    totalMatches: results.length,
    results: results.map((r) => ({
      path: r.path,
      method: r.method,
      summary: r.summary,
      description: r.description,
      permissions: r.permissions,
      advisories: getEndpointAdvisories(r.path, r.method),
    })),
  };
}
