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

Add to `.vscode/mcp.json` in your workspace (create the file if it doesn't exist):

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
      "command": "npx",
      "args": ["-y", "github:UniverseCitiz3n/msgraph-kb-mcp"]
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

## License

MIT
