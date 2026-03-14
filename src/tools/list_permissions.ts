import { RepoIndex } from "../loader.js";
import { findEndpointsByPath } from "../search.js";

export interface ListPermissionsInput {
  endpoint: string;
}

export interface PermissionEntry {
  path: string;
  method: string;
  delegatedWork: string[];
  delegatedPersonal: string[];
  application: string[];
}

export interface ListPermissionsResult {
  endpoint: string;
  permissions: PermissionEntry[];
  error?: string;
}

export function listPermissions(
  index: RepoIndex | null,
  input: ListPermissionsInput
): ListPermissionsResult {
  if (!index || index.apiCount === 0) {
    return {
      endpoint: input.endpoint,
      permissions: [],
      error:
        "Data unavailable: the merill/msgraph repository could not be cloned at startup. Please check server logs.",
    };
  }

  const found = findEndpointsByPath(index, input.endpoint);

  if (found.length === 0) {
    return {
      endpoint: input.endpoint,
      permissions: [],
      error: `No endpoint found matching: ${input.endpoint}`,
    };
  }

  const permissions: PermissionEntry[] = found.map((ep) => ({
    path: ep.path,
    method: ep.method,
    delegatedWork: ep.permissions?.delegatedWork ?? [],
    delegatedPersonal: ep.permissions?.delegatedPersonal ?? [],
    application: ep.permissions?.application ?? [],
  }));

  return {
    endpoint: input.endpoint,
    permissions,
  };
}
