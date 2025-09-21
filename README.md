# Search MCP

The Universal MCP Server exposes tools for your workflows and is designed for prompt-first usage in MCP-compatible clients.

## Installation

### Prerequisites
- Node.js 18+
- Set `SEARCH_MCP_...` in your environment

### Get an API key
- If your tools require an external API, obtain a key from the provider’s docs/console.
- Otherwise, you can skip this step.

### Build locally
```bash
cd /path/to/search-mcp
npm i
npm run build
```

## Setup: Claude Code (CLI)

Use this one-liner (replace with your real values):

```bash
claude mcp add URL-Context-MCP -s user -e SEARCH_MCP_API_KEY="sk-your-real-key" -- npx @taiyokimura/url-context-mcp@latest
```

To remove:

```bash
claude mcp remove Search MCP
```

## Setup: Cursor

Create .cursor/mcp.json in your client (do not commit it here):

```json
{
  "mcpServers": {
    "url-context-mcp": {
      "command": "npx",
      "args": ["@taiyokimura/url-context-mcp@latest"],
      "env": { "SEARCH_MCP_API_KEY": "sk-your-real-key" },
      "autoStart": true
    }
  }
}
```

## Other Clients and Agents

<details>
<summary>VS Code</summary>

Install via URI or CLI:

```bash
code --add-mcp '{"name":"url-context-mcp","command":"npx","args":["@taiyokimura/url-context-mcp@latest"],"env":{"SEARCH_MCP_API_KEY":"sk-your-real-key"}}'
```

</details>

<details>
<summary>Claude Desktop</summary>

Follow the MCP install guide and reuse the standard config above.

</details>

<details>
<summary>LM Studio</summary>

- Command: npx
- Args: ["@taiyokimura/url-context-mcp@latest"]
- Env: SEARCH_MCP_API_KEY=sk-your-real-key

</details>

<details>
<summary>Goose</summary>

- Type: STDIO
- Command: npx
- Args: @taiyokimura/url-context-mcp@latest
- Enabled: true

</details>

<details>
<summary>opencode</summary>

Example ~/.config/opencode/opencode.json:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "url-context-mcp": {
      "type": "local",
      "command": ["npx", "@taiyokimura/url-context-mcp@latest"],
      "enabled": true
    }
  }
}
```

</details>

<details>
<summary>Qodo Gen</summary>

Add a new MCP and paste the standard JSON config.

</details>

<details>
<summary>Windsurf</summary>

See docs and reuse the standard config above.

</details>

## Setup: Codex (TOML)

Example (Serena):

```toml
[mcp_servers.serena]
command = "uvx"
args = ["--from", "git+https://github.com/oraios/serena", "serena", "start-mcp-server", "--context", "codex"]
```

This server (minimal):

```toml
[mcp_servers.url-context-mcp]
command = "npx"
args = ["@taiyokimura/url-context-mcp@latest"]
# Optional:
# SEARCH_MCP_API_KEY = "sk-your-real-key"
# MCP_NAME = "url-context-mcp"
```

## Configuration (Env)
- SEARCH_MCP_API_KEY: Your API key (if applicable)
- MCP_NAME: Server name override (default: url-context-mcp)

## Available Tools

- web_search
  - inputs: object { query: string (required), count?: number, offset?: number, safeSearch?: 'off'|'moderate'|'strict', country?: string, freshness?: 'pd'|'pw'|'pm'|'py', enableRichCallback?: boolean }
  - outputs: object (Brave Web Search API JSON)
- local_pois
  - inputs: object { ids: string[] (1-20) }
  - outputs: object (Local POI API JSON)
- local_descriptions
  - inputs: object { ids: string[] (1-20) }
  - outputs: object (Local descriptions API JSON)
- rich_fetch
  - inputs: object { callback_key: string }
  - outputs: object (Rich results JSON)

## Example invocation (MCP tool call)

```json
{
  "tool": "web_search",
  "inputs": {
    "query": "weather in munich",
    "enableRichCallback": true
  }
}
```

## Troubleshooting
- 401 auth errors: check SEARCH_MCP_API_KEY
- Ensure Node 18+
- Local runs: npx search-mcp after npm run build
- Inspect publish artifacts: npm pack --dry-run

## References

- MCP SDK: https://modelcontextprotocol.io/docs/sdks
- Architecture: https://modelcontextprotocol.io/docs/learn/architecture
- Server Concepts: https://modelcontextprotocol.io/docs/learn/server-concepts
- Specification: https://modelcontextprotocol.io/specification/2025-06-18/server/index
- Brave Search API: https://api.search.brave.com/app/documentation

## Name Consistency & Troubleshooting
- Always use CANONICAL_ID (url-context-mcp) for identifiers and keys.
- Use CANONICAL_DISPLAY (URL-Context MCP) only for UI labels.
- Do not mix legacy keys after registration.

Consistency Matrix:
- npm package name → @taiyokimura/url-context-mcp
- Binary name → url-context-mcp
- MCP server name (SDK metadata) → url-context-mcp
- Env default MCP_NAME → url-context-mcp
- Client registry key → url-context-mcp
- UI label → URL-Context MCP

Conflict Cleanup:
- Remove any stale keys (e.g., old display names) and re-add with url-context-mcp only.
- Cursor: configure in the UI; this project intentionally omits .cursor/mcp.json.
