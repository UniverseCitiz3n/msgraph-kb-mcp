import { RepoIndex } from "../loader.js";
import { findEndpointsByPath } from "../search.js";

export interface GetApiDetailsInput {
  endpoint: string;
}

export interface ApiDetails {
  path: string;
  method: string;
  summary?: string;
  description?: string;
  resource?: string;
  permissions?: {
    delegatedWork?: string[];
    delegatedPersonal?: string[];
    application?: string[];
  };
  notes?: string[];
  queryParams?: string[];
  availability?: string;
}

export interface GetApiDetailsResult {
  endpoint: string;
  matches: ApiDetails[];
  error?: string;
}

export function getApiDetails(
  index: RepoIndex | null,
  input: GetApiDetailsInput
): GetApiDetailsResult {
  if (!index || index.apiCount === 0) {
    return {
      endpoint: input.endpoint,
      matches: [],
      error:
        "Data unavailable: the merill/msgraph repository could not be cloned at startup. Please check server logs.",
    };
  }

  const found = findEndpointsByPath(index, input.endpoint);

  if (found.length === 0) {
    return {
      endpoint: input.endpoint,
      matches: [],
      error: `No endpoint found matching: ${input.endpoint}`,
    };
  }

  const matches: ApiDetails[] = found.map((ep) => ({
    path: ep.path,
    method: ep.method,
    summary: ep.summary,
    description: ep.description,
    resource: ep.resource,
    permissions: ep.permissions,
    notes: ep.notes,
    queryParams: ep.queryParams,
    availability: index.apiVersion || undefined,
  }));

  return {
    endpoint: input.endpoint,
    matches,
  };
}
