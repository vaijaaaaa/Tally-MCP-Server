# Architecture

## Request flow

```
Claude Desktop (stdio)   or   remote MCP client (HTTP)
        │                              │
        ▼                              ▼
  src/index.ts                 src/http-server.ts
   (StdioServerTransport)       (Express + StreamableHTTPServerTransport)
        │                              │
        └──────────────┬───────────────┘
                        ▼
                 src/server.ts        builds the shared MCP Server: registers
                        │             ListTools + CallTool handlers
                        ▼
                 src/tools.ts         maps a tool name + args -> XML,
                        │             formats the response back into text
             ┌──────────┴──────────┐
             ▼                     ▼
      src/templates.ts        src/db.ts
      renders templates/*.xml.njk    PGLite SQL cache (sync_to_sql/query_sql)
             │
             ▼
       src/tally.ts           sends XML over HTTP POST to Tally, parses the
             │                XML response, raises TallyConnectionError
             ▼
       src/clean.ts           normalizes parsed XML into predictable JSON
             │
             ▼
   TallyPrime HTTP gateway (localhost:9000)
```

## File responsibilities

- **`index.ts`** — stdio entry point for local Claude Desktop use.
- **`http-server.ts`** — HTTP entry point for remote use (Express +
  Streamable HTTP transport, optional bearer-token auth). See
  [HTTP_DEPLOYMENT.md](./HTTP_DEPLOYMENT.md).
- **`server.ts`** — shared MCP `Server` construction (tool list + tool-call
  handlers), used by both entry points so they can't drift apart.
- **`tools.ts`** — the only file that knows about Tally's *business* shapes
  (which report name to use, which fields to fetch, how to build a
  voucher). This is where you add a new tool.
- **`templates.ts`** — loads and renders the Nunjucks templates in
  [`templates/`](../templates/) (auto-escaping on, so no manual XML
  escaping needed in `tools.ts`).
- **`db.ts`** — the PGLite (in-memory Postgres/WASM) SQL cache: `sync_to_sql`
  pulls masters from Tally into tables, `query_sql` runs read-only `SELECT`s
  against them. See [SQL_CACHE.md](./SQL_CACHE.md).
- **`tally.ts`** — the only file that knows about the *transport* (HTTP,
  timeouts, connection errors). Doesn't know what a ledger or voucher is.
- **`clean.ts`** — the only file that knows about Tally's XML quirks
  (attributes prefixed `@_`, single items not being arrays, empty tags).

This separation means: if Tally's transport changes (e.g. HTTPS, auth
headers), you only touch `tally.ts`. If you add a new report, you only touch
`tools.ts` and maybe `templates/`.

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
