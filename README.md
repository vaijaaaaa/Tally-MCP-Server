# Tally MCP Server

A Model Context Protocol (MCP) server that lets Claude read from and write to
[TallyPrime](https://tallysolutions.com) via its built-in XML/HTTP gateway.

## How it works

```
Claude Desktop  <--stdio-->   ┐
                               ├─ this MCP server  <--HTTP/XML-->  TallyPrime (localhost:9000)
Remote MCP client <--HTTP-->  ┘
```

Locally, Claude Desktop launches this server as a stdio process. Remotely, it
can also run as an HTTP server. Either way, tool calls get translated into
Tally's XML request format, sent to Tally's HTTP gateway, and returned as
cleaned-up JSON. There's also an optional local SQL cache (PGLite) for
ad-hoc queries beyond the fixed report tools.

## Prerequisites

- [Node.js](https://nodejs.org) 18+
- TallyPrime installed, running, with a company open
- Tally's HTTP gateway enabled:
  `F1 (Help) > Settings > Connectivity > Client/Server configuration` and set
  **TallyPrime acts as** to `Both` or `Server`, port `9000` (default).

## Setup

```bash
npm install
npm run build
```

## Configure Claude Desktop

**Option A — Extension (recommended):** package as a `.dxt` and install
with one click. See [docs/EXTENSION_PACKAGING.md](docs/EXTENSION_PACKAGING.md).

**Option B — manual config:** edit your Claude Desktop config file:

- Windows: `%APPDATA%\Claude\claude_desktop_config.json`
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`

Add:

```json
{
  "mcpServers": {
    "tally": {
      "command": "node",
      "args": ["D:\\Projects\\Tally-MCP-Server\\dist\\index.js"],
      "env": {
        "TALLY_URL": "http://localhost:9000"
      }
    }
  }
}
```

Restart Claude Desktop. You should see a hammer/tools icon indicating the
`tally` server is connected.

## Available tools

17 tools total — read (ledgers, stock, groups, voucher types, cost centres,
day book, ledger vouchers, company info, P&L, balance sheet, trial balance,
stock summary, bills receivable/payable), write (create ledger, group,
stock item, voucher), and SQL cache (`sync_to_sql`, `query_sql`). Full
reference with args: **[docs/TOOLS.md](docs/TOOLS.md)**.

Dates use `DD-MM-YYYY` format, matching Tally's convention.

## Running remotely (HTTP)

```bash
TALLY_MCP_TOKEN=<secret> npm run start:http
```

See [docs/HTTP_DEPLOYMENT.md](docs/HTTP_DEPLOYMENT.md).

## Docs

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — request flow, file responsibilities
- [docs/TALLY_XML_GUIDE.md](docs/TALLY_XML_GUIDE.md) — how Tally's XML gateway works, gotchas
- [docs/TOOLS.md](docs/TOOLS.md) — full tool reference + how to add a new tool
- [docs/SQL_CACHE.md](docs/SQL_CACHE.md) — the PGLite SQL cache, schema, examples
- [docs/HTTP_DEPLOYMENT.md](docs/HTTP_DEPLOYMENT.md) — running as a remote HTTP server
- [docs/EXTENSION_PACKAGING.md](docs/EXTENSION_PACKAGING.md) — packaging as a `.dxt` Claude Desktop Extension

## Project structure

```
src/
  tally.ts        Tally HTTP client: sends XML, handles connection/timeout errors
  clean.ts        Normalizes Tally's raw XML->JSON into predictable JSON
  templates.ts     Renders the Nunjucks XML templates in templates/
  db.ts             PGLite SQL cache: sync_to_sql / query_sql
  tools.ts        MCP tool definitions + XML request builders
  server.ts       Shared MCP Server construction (used by both entry points)
  index.ts        stdio entry point (local Claude Desktop)
  http-server.ts   HTTP entry point (remote clients)
templates/
  *.xml.njk       Nunjucks templates for each Tally XML request shape
manifest.json      Claude Desktop Extension (.dxt) manifest
```

## Environment variables

| Variable | Default | Purpose |
|---|---|---|
| `TALLY_URL` | `http://localhost:9000` | Tally's HTTP gateway address |
| `PORT` | `3939` | Port for `npm run start:http` |
| `TALLY_MCP_TOKEN` | _(unset)_ | Bearer token required on the HTTP server's `/mcp` endpoint if set |

## Troubleshooting

- **"Could not reach TallyPrime"** — Tally isn't running, or the HTTP gateway
  isn't enabled on port 9000.
- **"Tally returned an empty response"** — Tally is running but no company is
  open.
- **`create_ledger` / `create_voucher` fails with errors** — check that the
  parent group / ledger names exactly match what exists in Tally (names are
  case-sensitive and must match exactly).

## Roadmap / not yet supported

- Editing or deleting existing vouchers/ledgers/masters
- Inventory vouchers (Stock Journal, Manufacturing Journal, etc.)
- GST-specific reports (GSTR-1, GSTR-3B)
- Multi-company support (currently always targets whichever company is open)
