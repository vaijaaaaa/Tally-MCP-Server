# Tally MCP Server

A Model Context Protocol (MCP) server that lets Claude read from and write to
[TallyPrime](https://tallysolutions.com) via its built-in XML/HTTP gateway.

## How it works

```
Claude  <--stdio-->  this MCP server  <--HTTP/XML-->  TallyPrime (localhost:9000)
```

Claude Desktop launches this server as a local process and talks to it over
stdio. The server translates MCP tool calls into Tally's XML request format,
sends them to Tally's HTTP gateway, and returns cleaned-up JSON.

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

Edit your Claude Desktop config file:

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

| Tool | Description |
|---|---|
| `get_ledgers` | List all ledgers (accounts) with parent group and closing balance |
| `get_stock_items` | List all stock items with closing balance |
| `get_vouchers` | Day Book vouchers for a date range |
| `get_company_info` | Info about the currently open company |
| `get_profit_and_loss` | P&L statement for a date range |
| `get_balance_sheet` | Balance Sheet as of a given date |
| `get_trial_balance` | Trial Balance for a date range |
| `create_ledger` | Create a new ledger under a parent group |
| `create_voucher` | Create a voucher (Payment, Receipt, Sales, Purchase, Journal) with a debit/credit ledger pair |

Dates use `DD-MM-YYYY` format, matching Tally's convention.

## Project structure

```
src/
  tally.ts    Tally HTTP client: sends XML, handles connection/timeout errors
  clean.ts    Normalizes Tally's raw XML->JSON into predictable JSON
  tools.ts    MCP tool definitions + XML request builders
  index.ts    MCP server entry point (stdio transport)
```

## Environment variables

| Variable | Default | Purpose |
|---|---|---|
| `TALLY_URL` | `http://localhost:9000` | Tally's HTTP gateway address |

## Troubleshooting

- **"Could not reach TallyPrime"** — Tally isn't running, or the HTTP gateway
  isn't enabled on port 9000.
- **"Tally returned an empty response"** — Tally is running but no company is
  open.
- **`create_ledger` / `create_voucher` fails with errors** — check that the
  parent group / ledger names exactly match what exists in Tally (names are
  case-sensitive and must match exactly).

## Roadmap / not yet supported

- Editing or deleting existing vouchers/ledgers
- Inventory vouchers (Stock Journal, etc.)
- GST-specific reports
