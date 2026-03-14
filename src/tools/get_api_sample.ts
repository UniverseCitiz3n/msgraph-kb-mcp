import * as fs from "fs";
import * as path from "path";
import { RepoIndex, SampleEntry } from "../loader.js";

export interface GetApiSampleInput {
  endpoint: string;
}

export interface SampleDetail {
  intent: string;
  query: string | string[];
  product: string;
  rawContent?: string;
}

export interface GetApiSampleResult {
  endpoint: string;
  samples: SampleDetail[];
  error?: string;
}

function normalizeQuery(q: string | string[]): string {
  if (Array.isArray(q)) return q.join(" ");
  return q;
}

function sampleMatchesEndpoint(
  sample: SampleEntry,
  endpoint: string
): boolean {
  const epLower = endpoint.toLowerCase().replace(/\/$/, "");
  const queryStr = normalizeQuery(sample.query).toLowerCase();
  return (
    queryStr.includes(epLower) ||
    epLower.split("/").some((segment) => {
      const clean = segment.replace(/[{}]/g, "").toLowerCase();
      return clean.length > 3 && queryStr.includes(clean);
    })
  );
}

function readSampleFile(repoDir: string, relFile: string): string | undefined {
  if (!repoDir) return undefined;
  try {
    const fullPath = path.join(repoDir, "samples", relFile);
    return fs.readFileSync(fullPath, "utf-8");
  } catch {
    return undefined;
  }
}

export function getApiSample(
  index: RepoIndex | null,
  input: GetApiSampleInput
): GetApiSampleResult {
  if (!index || index.sampleCount === 0) {
    return {
      endpoint: input.endpoint,
      samples: [],
      error:
        "Data unavailable: the merill/msgraph repository could not be cloned at startup, or no samples were found.",
    };
  }

  const matched = index.samplesIndex.samples.filter((s) =>
    sampleMatchesEndpoint(s, input.endpoint)
  );

  if (matched.length === 0) {
    return {
      endpoint: input.endpoint,
      samples: [],
      error: `No samples found for endpoint: ${input.endpoint}`,
    };
  }

  const samples: SampleDetail[] = matched.map((s) => ({
    intent: s.intent,
    query: s.query,
    product: s.product,
    rawContent: readSampleFile(index.repoDir, s.file),
  }));

  return {
    endpoint: input.endpoint,
    samples,
  };
}
