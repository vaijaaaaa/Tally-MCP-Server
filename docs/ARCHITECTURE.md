# Architecture

## Request flow

```
Claude Desktop
   │  stdio (JSON-RPC / MCP)
   ▼
src/index.ts          registers tool list + tool-call handler with the MCP SDK
   │
   ▼
src/tools.ts           maps a tool name + args -> an XML request string,
   │                    and formats the response back into text
   ▼
src/tally.ts            sends the XML over HTTP POST to Tally, parses the
   │                    XML response, raises TallyConnectionError on failure
   ▼
src/clean.ts             normalizes the parsed XML into predictable JSON
   │                    (drops attributes, flattens single-vs-array records)
   ▼
TallyPrime HTTP gateway (localhost:9000)
```

## File responsibilities

- **`index.ts`** — the only file that knows about the MCP protocol itself.
  Registers two handlers: `ListToolsRequestSchema` (what tools exist) and
  `CallToolRequestSchema` (run a tool, catch errors, return MCP content).
- **`tools.ts`** — the only file that knows about Tally's *business* XML
  shapes (which report name to use, which fields to fetch, how to build a
  voucher). This is where you add a new tool.
- **`tally.ts`** — the only file that knows about the *transport* (HTTP,
  timeouts, connection errors). Doesn't know what a ledger or voucher is.
- **`clean.ts`** — the only file that knows about Tally's XML quirks
  (attributes prefixed `@_`, single items not being arrays, empty tags).

This separation means: if Tally's transport changes (e.g. HTTPS, auth
headers), you only touch `tally.ts`. If you add a new report, you only touch
`tools.ts`.

## Two request styles

Tally's gateway understands two request shapes, both used in this project:

1. **Export Data** (`reportXml` / `buildCollectionXml` in `tools.ts`) — read
   requests. Ask for a `REPORTNAME` (a built-in Tally report) or a
   `COLLECTION` (a raw list of master records) with `STATICVARIABLES` like
   date range.
2. **Import Data** (`createLedgerXml`, `createVoucherXml`, etc.) — write
   requests. Send a `TALLYMESSAGE` containing the object to create, with
   `ACTION="Create"`.

See [TALLY_XML_GUIDE.md](./TALLY_XML_GUIDE.md) for details on both.
