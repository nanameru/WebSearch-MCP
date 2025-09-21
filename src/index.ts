import 'dotenv/config';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema, McpError, ErrorCode, type Tool } from '@modelcontextprotocol/sdk/types.js';
import { fetch } from 'undici';
import { z } from 'zod';

// Name normalization
const CANONICAL_ID = (process.env.MCP_NAME ?? 'url-context-mcp');
const ENV_PREFIX = 'SEARCH_MCP';

// Environment variables
const BRAVE_API_KEY = process.env[`${ENV_PREFIX}_API_KEY`];

// Schemas
const webSearchInput = z.object({
  query: z.string().min(1, 'query is required'),
  count: z.number().int().min(1).max(20).optional(),
  offset: z.number().int().min(0).optional(),
  safeSearch: z.enum(['off', 'moderate', 'strict']).optional(),
  country: z.string().optional(),
  freshness: z.enum(['pd', 'pw', 'pm', 'py']).optional(),
  enableRichCallback: z.boolean().optional()
});

type WebSearchInput = z.infer<typeof webSearchInput>;

async function braveFetchJson(url: string, params: Record<string, string>): Promise<any> {
  if (!BRAVE_API_KEY) {
    throw new Error(`${ENV_PREFIX}_API_KEY is not set`);
  }
  const u = new URL(url);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && String(v).length > 0) {
      u.searchParams.set(k, String(v));
    }
  }
  const res = await fetch(u.toString(), {
    headers: {
      'Accept': 'application/json',
      'Accept-Encoding': 'gzip',
      'X-Subscription-Token': BRAVE_API_KEY,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Brave API ${res.status}: ${text}`);
  }
  return res.json();
}

// tool registration will happen below via server.tool

const localPoisInput = z.object({
  ids: z.array(z.string()).min(1).max(20)
});
type LocalPoisInput = z.infer<typeof localPoisInput>;

// tool registration will happen below via server.tool

const localDescriptionsInput = z.object({
  ids: z.array(z.string()).min(1).max(20)
});
type LocalDescriptionsInput = z.infer<typeof localDescriptionsInput>;

// tool registration will happen below via server.tool

const richFetchInput = z.object({
  callback_key: z.string().min(1)
});
type RichFetchInput = z.infer<typeof richFetchInput>;

// tool registration will happen below via server.tool

async function main(): Promise<void> {
  const server = new Server(
    {
      name: CANONICAL_ID,
      version: '0.1.0'
    },
    {
      capabilities: { tools: {} }
    }
  );

  const tools: Array<Tool & { handler: (args: unknown) => Promise<{ content: Array<{ type: 'json'; json: unknown } | { type: 'text'; text: string }> }> }> = [
    {
      name: 'web_search',
      description: 'Search the web using Brave Web Search API',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query' },
          count: { type: 'number', description: 'Results count (1-20)' },
          offset: { type: 'number', description: 'Results offset' },
          safeSearch: { type: 'string', enum: ['off', 'moderate', 'strict'] },
          country: { type: 'string' },
          freshness: { type: 'string', enum: ['pd', 'pw', 'pm', 'py'] },
          enableRichCallback: { type: 'boolean', description: 'Include rich callback hint' }
        },
        required: ['query']
      },
      handler: async (args: unknown) => {
        const input = webSearchInput.parse(args);
        const json = await braveFetchJson('https://api.search.brave.com/res/v1/web/search', {
          q: input.query,
          count: input.count?.toString() ?? '',
          offset: input.offset?.toString() ?? '',
          safesearch: input.safeSearch ?? '',
          country: input.country ?? '',
          freshness: input.freshness ?? '',
          enable_rich_callback: input.enableRichCallback ? '1' : ''
        });
        return { content: [{ type: 'json', json }] };
      }
    },
    {
      name: 'local_pois',
      description: 'Fetch extra information for locations using Brave Local Search API',
      inputSchema: {
        type: 'object',
        properties: { ids: { type: 'array', items: { type: 'string' } } },
        required: ['ids']
      },
      handler: async (args: unknown) => {
        const input = localPoisInput.parse(args);
        const url = 'https://api.search.brave.com/res/v1/local/pois';
        const qs = input.ids.map((id) => `ids=${encodeURIComponent(id)}`).join('&');
        const json = await braveFetchJson(`${url}?${qs}`, {});
        return { content: [{ type: 'json', json }] };
      }
    },
    {
      name: 'local_descriptions',
      description: 'Fetch AI-generated descriptions for locations using Brave Local Search API',
      inputSchema: {
        type: 'object',
        properties: { ids: { type: 'array', items: { type: 'string' } } },
        required: ['ids']
      },
      handler: async (args: unknown) => {
        const input = localDescriptionsInput.parse(args);
        const url = 'https://api.search.brave.com/res/v1/local/descriptions';
        const qs = input.ids.map((id) => `ids=${encodeURIComponent(id)}`).join('&');
        const json = await braveFetchJson(`${url}?${qs}`, {});
        return { content: [{ type: 'json', json }] };
      }
    },
    {
      name: 'rich_fetch',
      description: 'Fetch rich results using the callback_key from web_search',
      inputSchema: {
        type: 'object',
        properties: {
          callback_key: { type: 'string', description: 'callback_key from web_search.rich.hint.callback_key' }
        },
        required: ['callback_key']
      },
      handler: async (args: unknown) => {
        const input = richFetchInput.parse(args);
        const json = await braveFetchJson('https://api.search.brave.com/res/v1/web/rich', {
          callback_key: input.callback_key
        });
        return { content: [{ type: 'json', json }] };
      }
    }
  ];

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: tools.map(({ name, description, inputSchema }) => ({ name, description, inputSchema }))
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const name = request.params.name;
    const tool = tools.find((t) => t.name === name);
    if (!tool) {
      throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    }
    const args = request.params.arguments ?? {};
    return tool.handler(args);
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error('[search-mcp] fatal', err);
  process.exit(1);
});


