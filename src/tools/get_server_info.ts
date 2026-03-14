import { RepoIndex } from "../loader.js";

export interface GetServerInfoResult {
  dataVersion: string;
  cloneTimestamp: string;
  indexStats: {
    apisIndexed: number;
    samplesIndexed: number;
  };
  status: "ok" | "degraded";
  error?: string;
}

export function getServerInfo(index: RepoIndex | null): GetServerInfoResult {
  if (!index) {
    return {
      dataVersion: "unknown",
      cloneTimestamp: new Date().toISOString(),
      indexStats: { apisIndexed: 0, samplesIndexed: 0 },
      status: "degraded",
      error:
        "Index not yet built or clone failed. Please check server logs.",
    };
  }

  return {
    dataVersion: index.tagName || "default branch",
    cloneTimestamp: index.cloneTimestamp,
    indexStats: {
      apisIndexed: index.apiCount,
      samplesIndexed: index.sampleCount,
    },
    status: index.apiCount > 0 ? "ok" : "degraded",
    error:
      index.apiCount === 0
        ? "Clone succeeded but no API endpoints were indexed."
        : undefined,
  };
}
