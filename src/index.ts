#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { loadIndex, getIndex } from "./loader.js";
import { searchGraphApis } from "./tools/search_graph_apis.js";
import { getApiDetails } from "./tools/get_api_details.js";
import { getApiSample } from "./tools/get_api_sample.js";
import { listPermissions } from "./tools/list_permissions.js";
import { getServerInfo } from "./tools/get_server_info.js";

async function main() {
  // Build index before accepting any MCP connections
  process.stderr.write("[msgraph-kb-mcp] Building index...\n");
  await loadIndex();
  process.stderr.write("[msgraph-kb-mcp] Index ready. Starting MCP server.\n");

  const server = new Server(
    {
      name: "msgraph-kb-mcp",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: "search_graph_apis",
        description:
          "Search Microsoft Graph API definitions by keyword. Returns matching endpoints with path, HTTP method, description, and permissions.",
        inputSchema: {
          type: "object" as const,
          properties: {
            query: {
              type: "string",
              description:
                "Search keyword(s) to match against endpoint paths, descriptions, and HTTP methods.",
            },
            limit: {
              type: "number",
              description:
                "Maximum number of results to return (default: 20, max: 100).",
            },
          },
          required: ["query"],
        },
      },
      {
        name: "get_api_details",
        description:
          "Get full details for a specific Microsoft Graph API endpoint including description, HTTP methods, required permissions, and availability.",
        inputSchema: {
          type: "object" as const,
          properties: {
            endpoint: {
              type: "string",
              description:
                'The API endpoint path to look up, e.g. "/users" or "/me/messages".',
            },
          },
          required: ["endpoint"],
        },
      },
      {
        name: "get_api_sample",
        description:
          "Return code sample(s) for a given Microsoft Graph API endpoint if available.",
        inputSchema: {
          type: "object" as const,
          properties: {
            endpoint: {
              type: "string",
              description:
                'The API endpoint path or keyword, e.g. "/me/sendMail" or "sendMail".',
            },
          },
          required: ["endpoint"],
        },
      },
      {
        name: "list_permissions",
        description:
          "List delegated and application permissions required for a specific Microsoft Graph API endpoint.",
        inputSchema: {
          type: "object" as const,
          properties: {
            endpoint: {
              type: "string",
              description:
                'The API endpoint path to look up permissions for, e.g. "/users".',
            },
          },
          required: ["endpoint"],
        },
      },
      {
        name: "get_server_info",
        description:
          "Get information about the MCP server including the current data version (tag name), clone timestamp, and index statistics.",
        inputSchema: {
          type: "object" as const,
          properties: {},
          required: [],
        },
      },
    ],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const index = getIndex();

    try {
      let result: unknown;

      switch (name) {
        case "search_graph_apis": {
          const input = args as { query: string; limit?: number };
          result = searchGraphApis(index, input);
          break;
        }

        case "get_api_details": {
          const input = args as { endpoint: string };
          result = getApiDetails(index, input);
          break;
        }

        case "get_api_sample": {
          const input = args as { endpoint: string };
          result = getApiSample(index, input);
          break;
        }

        case "list_permissions": {
          const input = args as { endpoint: string };
          result = listPermissions(index, input);
          break;
        }

        case "get_server_info": {
          result = getServerInfo(index);
          break;
        }

        default:
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({ error: `Unknown tool: ${name}` }),
              },
            ],
            isError: true,
          };
      }

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : String(err);
      process.stderr.write(
        `[msgraph-kb-mcp] Error handling tool "${name}": ${message}\n`
      );
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ error: message }),
          },
        ],
        isError: true,
      };
    }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  process.stderr.write(`[msgraph-kb-mcp] Fatal error: ${String(err)}\n`);
  process.exit(1);
});
