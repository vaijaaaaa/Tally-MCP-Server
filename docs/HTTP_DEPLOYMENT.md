# Remote / HTTP Deployment

By default this server runs over stdio (`src/index.ts`), launched directly
by Claude Desktop on the same machine as TallyPrime. `src/http-server.ts` is
an alternative entry point exposing the same tools over HTTP using MCP's
[Streamable HTTP transport](https://modelcontextprotocol.io), for cases
where the MCP client isn't on the same machine as this server (e.g. a
browser-based client, or a client on a different machine on your network).

TallyPrime itself still has to be reachable from wherever this process runs
— this doesn't remote-control Tally, it just lets the *MCP client* be remote
from the *MCP server*, while the server stays local to Tally.

**Tally on a separate machine:** `TALLY_URL` isn't hardcoded to `localhost`
— point it at any reachable host, e.g. `TALLY_URL=http://192.168.1.50:9000`,
to run this server on one machine and TallyPrime on another (as long as
Tally's HTTP gateway port is reachable on the network between them).

**Restarts don't drop clients:** each `POST /mcp` request is handled by a
fresh, independent `Server`/`transport` pair (see "Deployment notes" below)
— there's no shared client registry for a server restart to wipe out. Each
client just reconnects on its next request.

## Running

```bash
npm run build
TALLY_MCP_TOKEN=<a-long-random-secret> npm run start:http
```

Defaults to port `3939` (override with `PORT`). Endpoints:

- `POST /mcp` — the MCP Streamable HTTP endpoint
- `GET /healthz` — liveness check, returns `{"status":"ok"}`

## Authentication

Set `TALLY_MCP_TOKEN` to a long random secret. Requests to `/mcp` must then
include `Authorization: Bearer <token>`. **If you leave `TALLY_MCP_TOKEN`
unset, `/mcp` is completely unauthenticated** — the server logs a warning on
startup in that case. Do not expose an unauthenticated instance beyond
`localhost`.

## Deployment notes

- Put this behind HTTPS (a reverse proxy like nginx/Caddy, or a platform
  that terminates TLS for you) before exposing it outside your LAN — the
  bearer token is sent in plaintext otherwise.
- Each `POST /mcp` request currently creates a fresh `Server`/`transport`
  pair (`sessionIdGenerator: undefined`, i.e. stateless mode) — simple and
  safe for a single-user setup, but it means there's no persistent MCP
  session or server-push notifications between requests.
- The [SQL cache](./SQL_CACHE.md) lives in server process memory — in
  stateless HTTP mode it persists across requests as long as the process
  keeps running, but is lost on restart, same as stdio mode.

## Environment variables

| Variable | Default | Purpose |
|---|---|---|
| `TALLY_URL` | `http://localhost:9000` | Tally's HTTP gateway address |
| `PORT` | `3939` | Port for the HTTP server |
| `TALLY_MCP_TOKEN` | _(unset)_ | Bearer token required on `/mcp` if set |
