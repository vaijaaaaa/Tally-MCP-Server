# SQL Cache (PGLite)

For ad-hoc analysis, calling one fixed-shape report tool per question doesn't
scale — Claude can't do things like "top 10 debtors by balance" without a
dedicated tool for exactly that. The SQL cache solves this generically.

## How it works

`sync_to_sql` pulls ledgers, groups, and stock items from Tally and loads
them into [PGLite](https://pglite.dev) — a real Postgres engine compiled to
WASM, running in-process, in-memory (see [`src/db.ts`](../src/db.ts)). No
external database server involved.

`query_sql` then runs an arbitrary read-only `SELECT` against that cache.

## Tables

| Table | Columns |
|---|---|
| `ledgers` | `name`, `parent`, `closing_balance` |
| `groups` | `name`, `parent` |
| `stock_items` | `name`, `parent`, `closing_balance` |
| `vouchers` | `date`, `voucher_type`, `ledger`, `amount`, `narration` (reserved — not bulk-synced yet, see below) |

## Example

```
sync_to_sql
query_sql: SELECT name, closing_balance FROM ledgers
           WHERE parent = 'Sundry Debtors'
           ORDER BY closing_balance DESC LIMIT 10
```

## Limitations

- **In-memory only.** The cache is lost when the server process restarts.
  Re-run `sync_to_sql` after restarting Claude Desktop or the HTTP server.
- **Snapshot, not live.** Data reflects Tally's state at the moment you last
  ran `sync_to_sql`, not the current moment. Re-sync before answering
  questions that need up-to-the-minute figures.
- **Vouchers aren't bulk-synced.** Tally's Day Book export doesn't page well
  across large date ranges, so `vouchers` stays empty for now — use
  `get_vouchers` / `get_ledger_vouchers` for voucher-level data.
- **Read-only.** `query_sql` rejects anything that isn't a single `SELECT`
  (see the `DDL_KEYWORDS` guard in `src/db.ts`) — it cannot be used to write
  back to Tally.
