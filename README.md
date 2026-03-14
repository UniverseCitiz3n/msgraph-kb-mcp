# msgraph-kb-mcp

A [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) server that provides **Microsoft Graph API knowledge** by cloning the [`merill/msgraph`](https://github.com/merill/msgraph) repository at startup and exposing its contents as searchable tools.

## Features

- Automatically fetches the latest release of `merill/msgraph` at startup
- Indexes 27 000+ Graph API endpoints with descriptions and permissions
- Exposes 5 MCP tools for querying the index
- Works headless via **stdio** transport (Windows and Linux compatible)
- Falls back gracefully if the clone fails — server still starts, tools return descriptive errors

## Tools

| Tool | Input | Description |
|---|---|---|
| `search_graph_apis` | `query` (string) | Search endpoints by keyword — returns path, method, description, permissions |
| `get_api_details` | `endpoint` (string) | Full details for a specific endpoint |
| `get_api_sample` | `endpoint` (string) | Code samples for an endpoint |
| `list_permissions` | `endpoint` (string) | Delegated and application permissions |
| `get_server_info` | _(none)_ | Data version, clone timestamp, index stats |

## Running locally

### Prerequisites

- Node.js ≥ 18
- `git` available on `PATH`

### Install and run

```bash
npm install
npm run build
node dist/index.js
```

Or directly via npx (after publishing):

```bash
npx github:UniverseCitiz3n/msgraph-kb-mcp
```

## MCP configuration

### Claude Code (`mcp.json`)

```json
{
  "mcpServers": {
    "msgraph-kb": {
      "command": "node",
      "args": ["/path/to/msgraph-kb-mcp/dist/index.js"]
    }
  }
}
```

### GitHub Copilot Coding Agent (repository settings)

Add to your repository's MCP server configuration (`.github/copilot-mcp.json` or equivalent):

```json
{
  "mcpServers": {
    "msgraph-kb": {
      "command": "node",
      "args": ["dist/index.js"],
      "cwd": "${workspaceFolder}"
    }
  }
}
```

## Data source

This server clones [https://github.com/merill/msgraph](https://github.com/merill/msgraph) at the latest tagged release. The clone is stored in `os.tmpdir()/msgraph-skill-{timestamp}` and cleaned up on process exit.

The index is built from:
- `skills/msgraph/references/graph-api-index.json` — endpoint paths, methods, summaries
- `skills/msgraph/references/api-docs-index.json` — permissions, notes, query parameters
- `skills/msgraph/references/samples-index.json` — sample queries

## License

MIT
