import * as os from "os";
import * as path from "path";
import * as fs from "fs";
import * as https from "https";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export interface GraphApiEndpoint {
  path: string;
  method: string;
  summary?: string;
  description?: string;
  resource?: string;
}

export interface ApiDocsEndpoint {
  path: string;
  method: string;
  permissions?: {
    delegatedWork?: string[];
    delegatedPersonal?: string[];
    application?: string[];
  };
  notes?: string[];
  queryParams?: string[];
}

export interface SampleEntry {
  intent: string;
  query: string | string[];
  product: string;
  file: string;
}

export interface GraphIndex {
  version?: string;
  generated?: string;
  count?: number;
  endpoints: GraphApiEndpoint[];
}

export interface ApiDocsIndex {
  version?: string;
  generated?: string;
  endpointCount?: number;
  endpoints: ApiDocsEndpoint[];
}

export interface SamplesIndex {
  generated?: string;
  count?: number;
  samples: SampleEntry[];
}

export interface MergedEndpoint extends GraphApiEndpoint {
  permissions?: ApiDocsEndpoint["permissions"];
  notes?: string[];
  queryParams?: string[];
}

export interface RepoIndex {
  tagName: string;
  cloneTimestamp: string;
  repoDir: string;
  endpoints: MergedEndpoint[];
  samplesIndex: SamplesIndex;
  apiCount: number;
  sampleCount: number;
  /** API version string from graph-api-index.json (e.g. "beta") */
  apiVersion: string;
  /** Map from normalised path (lowercase, no trailing slash) to MergedEndpoints */
  endpointMap: Map<string, MergedEndpoint[]>;
}

let cachedIndex: RepoIndex | null = null;

function fetchJson<T>(url: string): Promise<T> {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { "User-Agent": "msgraph-kb-mcp/1.0" } }, (res) => {
        if (res.statusCode !== 200) {
          reject(
            new Error(
              `HTTP ${res.statusCode ?? "unknown"} fetching ${url}`
            )
          );
          res.resume();
          return;
        }
        let body = "";
        res.on("data", (chunk: Buffer) => (body += chunk.toString()));
        res.on("end", () => {
          try {
            resolve(JSON.parse(body) as T);
          } catch (e) {
            reject(new Error(`Failed to parse JSON from ${url}: ${String(e)}`));
          }
        });
      })
      .on("error", reject);
  });
}

async function resolveLatestTag(): Promise<string> {
  try {
    const data = await fetchJson<{ tag_name: string }>(
      "https://api.github.com/repos/merill/msgraph/releases/latest"
    );
    if (typeof data.tag_name === "string" && data.tag_name.length > 0) {
      return data.tag_name;
    }
    throw new Error("tag_name missing or empty in GitHub API response");
  } catch (err) {
    process.stderr.write(
      `[msgraph-kb-mcp] WARNING: Could not resolve latest tag from GitHub API: ${String(err)}. Falling back to default branch.\n`
    );
    return "";
  }
}

async function cloneRepo(tagName: string, targetDir: string): Promise<void> {
  const args = ["clone", "--depth", "1"];
  if (tagName) {
    args.push("--branch", tagName);
  }
  args.push("https://github.com/merill/msgraph.git", targetDir);

  await execFileAsync("git", args, { timeout: 120_000 });
}

function readJsonFile<T>(filePath: string): T | null {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

function buildIndex(repoDir: string): {
  endpoints: MergedEndpoint[];
  samplesIndex: SamplesIndex;
  apiVersion: string;
} {
  const refDir = path.join(
    repoDir,
    "skills",
    "msgraph",
    "references"
  );

  const graphIndex = readJsonFile<GraphIndex>(
    path.join(refDir, "graph-api-index.json")
  );
  const apiDocsIndex = readJsonFile<ApiDocsIndex>(
    path.join(refDir, "api-docs-index.json")
  );
  const samplesIndex = readJsonFile<SamplesIndex>(
    path.join(refDir, "samples-index.json")
  );

  const graphEndpoints: GraphApiEndpoint[] = graphIndex?.endpoints ?? [];
  const docsEndpoints: ApiDocsEndpoint[] = apiDocsIndex?.endpoints ?? [];

  // Build a lookup map from docs index: "<METHOD>:<normalizedPath>" -> permissions info
  const docsMap = new Map<string, ApiDocsEndpoint>();
  for (const ep of docsEndpoints) {
    const key = `${ep.method.toUpperCase()}:${ep.path}`;
    docsMap.set(key, ep);
  }

  const merged: MergedEndpoint[] = graphEndpoints.map((ep) => {
    const key = `${ep.method.toUpperCase()}:${ep.path}`;
    const docs = docsMap.get(key);
    return {
      ...ep,
      permissions: docs?.permissions,
      notes: docs?.notes,
      queryParams: docs?.queryParams,
    };
  });

  return {
    endpoints: merged,
    samplesIndex: samplesIndex ?? { samples: [] },
    apiVersion: graphIndex?.version ?? "beta",
  };
}

function getCacheDir(tagName: string): string {
  const base =
    process.env["LOCALAPPDATA"] ??
    path.join(os.homedir(), ".cache");
  return path.join(base, "msgraph-kb-mcp", tagName || "latest");
}

function isCacheValid(repoDir: string, tagName: string): boolean {
  const markerFile = path.join(repoDir, ".tag");
  if (!fs.existsSync(markerFile)) return false;
  try {
    const cached = fs.readFileSync(markerFile, "utf-8").trim();
    return cached === tagName;
  } catch {
    return false;
  }
}

export async function loadIndex(): Promise<RepoIndex> {
  const cloneTimestamp = new Date().toISOString();
  const tagName = await resolveLatestTag();

  const repoDir = getCacheDir(tagName);

  if (isCacheValid(repoDir, tagName)) {
    process.stderr.write(
      `[msgraph-kb-mcp] Using cached repo for ${tagName || "latest"}: ${repoDir}\n`
    );
  } else {
    // Clone to a temp staging dir, then atomically replace cache dir.
    // This avoids partial-state issues if a previous clone was interrupted.
    const stagingDir = `${repoDir}-staging-${Date.now()}`;
    try {
      process.stderr.write(
        `[msgraph-kb-mcp] Cloning merill/msgraph${tagName ? ` @ ${tagName}` : " (default branch)"}...\n`
      );
      await cloneRepo(tagName, stagingDir);
      fs.writeFileSync(path.join(stagingDir, ".tag"), tagName, "utf-8");

      // Remove stale cache dir (may have read-only .git files on Windows)
      if (fs.existsSync(repoDir)) {
        await execFileAsync("cmd", ["/c", "rmdir", "/s", "/q", repoDir], { timeout: 30_000 });
      }
      fs.renameSync(stagingDir, repoDir);
      process.stderr.write(`[msgraph-kb-mcp] Clone complete: ${repoDir}\n`);
    } catch (err) {
      // Clean up staging dir if it exists
      try { await execFileAsync("cmd", ["/c", "rmdir", "/s", "/q", stagingDir], { timeout: 30_000 }); } catch { /* ignore */ }
      process.stderr.write(
        `[msgraph-kb-mcp] ERROR: Clone failed: ${String(err)}\n`
      );
      // Return empty index so server still starts
      return {
        tagName,
        cloneTimestamp,
        repoDir: "",
        endpoints: [],
        samplesIndex: { samples: [] },
        apiCount: 0,
        sampleCount: 0,
        apiVersion: "",
        endpointMap: new Map(),
      };
    }
  }

  const { endpoints, samplesIndex, apiVersion } = buildIndex(repoDir);

  // Build fast-lookup endpoint map keyed by normalised path (lowercase, no trailing slash)
  const endpointMap = new Map<string, MergedEndpoint[]>();
  for (const ep of endpoints) {
    const normPath = ep.path.toLowerCase().replace(/\/$/, "");
    const existing = endpointMap.get(normPath) ?? [];
    existing.push(ep);
    endpointMap.set(normPath, existing);
  }

  const index: RepoIndex = {
    tagName,
    cloneTimestamp,
    repoDir,
    endpoints,
    samplesIndex,
    apiCount: endpoints.length,
    sampleCount: samplesIndex.samples.length,
    apiVersion,
    endpointMap,
  };

  cachedIndex = index;
  return index;
}

export function getIndex(): RepoIndex | null {
  return cachedIndex;
}
