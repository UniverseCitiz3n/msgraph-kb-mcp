# msgraph-kb-mcp

A [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) server that provides **Microsoft Graph API knowledge** — search 27,000+ endpoints, look up permissions, and get code samples, all from your AI assistant.

## Quick start

No local installation required. Use `npx` to run the server on-demand:

```bash
npx github:UniverseCitiz3n/msgraph-kb-mcp
```

> **Prerequisites:** Node.js ≥ 18 and `git` available on your PATH environment variable.

---

## Install in your MCP client

### VS Code (GitHub Copilot)

Install with one click:

| Platform | VS Code | VS Code Insiders |
|---|---|---|
| **macOS / Linux** | [![Install in VS Code](https://img.shields.io/badge/VS_Code-Install_Server-0098FF?style=flat-square&logo=visualstudiocode&logoColor=ffffff)](https://vscode.dev/redirect?url=vscode:mcp/install?%7B%22name%22%3A%22msgraph-kb%22%2C%22type%22%3A%22stdio%22%2C%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22github%3AUniverseCitiz3n%2Fmsgraph-kb-mcp%22%5D%7D) | [![Install in VS Code Insiders](https://img.shields.io/badge/VS_Code_Insiders-Install_Server-24bfa5?style=flat-square&logo=visualstudiocode&logoColor=ffffff)](https://vscode.dev/redirect?url=vscode-insiders:mcp/install?%7B%22name%22%3A%22msgraph-kb%22%2C%22type%22%3A%22stdio%22%2C%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22github%3AUniverseCitiz3n%2Fmsgraph-kb-mcp%22%5D%7D) |
| **Windows** | [![Install in VS Code](https://img.shields.io/badge/VS_Code-Install_Server-0098FF?style=flat-square&logo=visualstudiocode&logoColor=ffffff)](https://vscode.dev/redirect?url=vscode:mcp/install?%7B%22name%22%3A%22msgraph-kb%22%2C%22type%22%3A%22stdio%22%2C%22command%22%3A%22cmd%22%2C%22args%22%3A%5B%22%2Fc%22%2C%22npx%22%2C%22-y%22%2C%22github%3AUniverseCitiz3n%2Fmsgraph-kb-mcp%22%5D%7D) | [![Install in VS Code Insiders](https://img.shields.io/badge/VS_Code_Insiders-Install_Server-24bfa5?style=flat-square&logo=visualstudiocode&logoColor=ffffff)](https://vscode.dev/redirect?url=vscode-insiders:mcp/install?%7B%22name%22%3A%22msgraph-kb%22%2C%22type%22%3A%22stdio%22%2C%22command%22%3A%22cmd%22%2C%22args%22%3A%5B%22%2Fc%22%2C%22npx%22%2C%22-y%22%2C%22github%3AUniverseCitiz3n%2Fmsgraph-kb-mcp%22%5D%7D) |

Or add manually to `.vscode/mcp.json` in your workspace (create the file if it doesn't exist):

```json
{
  "servers": {
    "msgraph-kb": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "github:UniverseCitiz3n/msgraph-kb-mcp"]
    }
  }
}
```

### Claude Desktop

Edit your Claude Desktop config file:

- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "msgraph-kb": {
      "command": "npx",
      "args": ["-y", "github:UniverseCitiz3n/msgraph-kb-mcp"]
    }
  }
}
```

### Claude Code

Add to your project's `mcp.json` file:

```json
{
  "mcpServers": {
    "msgraph-kb": {
      "command": "npx",
      "args": ["-y", "github:UniverseCitiz3n/msgraph-kb-mcp"]
    }
  }
}
```

### GitHub Copilot Coding Agent (repository settings)

In your repository's **Settings → Copilot → MCP servers**, add:

```json
{
  "mcpServers": {
    "msgraph-kb": {
      "type": "local",
      "command": "npx",
      "args": ["-y", "github:UniverseCitiz3n/msgraph-kb-mcp"],
      "tools": ["*"]
    }
  }
}
```

---

## Available tools

| Tool | Input | Description |
|---|---|---|
| `search_graph_apis` | `query` (string) | Search endpoints by keyword — returns path, method, description, permissions |
| `get_api_details` | `endpoint` (string) | Full details for a specific endpoint |
| `get_api_sample` | `endpoint` (string) | Code samples for an endpoint |
| `list_permissions` | `endpoint` (string) | Delegated and application permissions |
| `get_server_info` | _(none)_ | Data version, clone timestamp, index stats |

---

## Endpoint advisories

The server can attach `advisories` to endpoint results when known real-world behavior differs from indexed metadata.

Current advisory:

- Intune DeviceConfigV2 caveat for `PATCH /deviceManagement/configurationPolicies/{deviceManagementConfigurationPolicy-id}/settings/{deviceManagementConfigurationSetting-id}`.
- If this route returns a route-mismatch error in your tenant, prefer:
  - `PUT /deviceManagement/configurationPolicies('{deviceManagementConfigurationPolicy-id}')`
  - Include the full policy payload with embedded `settings`.

These advisories are additive guidance and do not replace official Graph documentation.

---

## Local development

Clone the repo, install dependencies, and build:

```bash
git clone https://github.com/UniverseCitiz3n/msgraph-kb-mcp.git
cd msgraph-kb-mcp
npm install
npm run build
node dist/index.js
```

Point any MCP client at the built binary:

```json
{
  "mcpServers": {
    "msgraph-kb": {
      "command": "node",
      "args": ["/absolute/path/to/msgraph-kb-mcp/dist/index.js"]
    }
  }
}
```

---

## How it works

At startup the server fetches the latest release of [`merill/msgraph`](https://github.com/merill/msgraph) and builds a searchable in-memory index from files under `skills/msgraph/references/`:

- `graph-api-index.json` — endpoint paths, HTTP methods, summaries
- `api-docs-index.json` — permissions, notes, query parameters
- `samples-index.json` — sample queries

The clone is stored in a temporary directory and removed on process exit. If the clone fails the server still starts — tools will return a descriptive error until data is available.

### Search relevance

- Queries are normalized to drop stopwords, de-pluralize terms, and fix common typos (for example, `bussines` → `business`).
- Windows Update for Business driver profile routes (including driver inventories) get an extra relevance boost so natural language prompts surface the right endpoints without pasting raw URLs.

## License

MIT
