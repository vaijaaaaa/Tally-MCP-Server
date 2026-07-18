# Tool Reference

All dates are `DD-MM-YYYY` unless stated otherwise.

## Read tools

| Tool | Args | Returns |
|---|---|---|
| `get_ledgers` | — | All ledgers: name, parent group, closing balance |
| `get_stock_items` | — | All stock items: name, parent group, closing balance |
| `get_groups` | — | All account groups: name, parent |
| `get_voucher_types` | — | All configured voucher types: name, parent |
| `get_cost_centres` | — | All cost centres: name, parent |
| `get_vouchers` | `from`, `to` | Day Book entries in the date range |
| `get_ledger_vouchers` | `ledgerName`, `from`, `to` | Voucher entries posted to one ledger |
| `get_company_info` | — | Currently open company details |
| `get_profit_and_loss` | `from`, `to` | P&L statement |
| `get_balance_sheet` | `asOf` | Balance Sheet as of a date |
| `get_trial_balance` | `from`, `to` | Trial Balance |
| `get_stock_summary` | `asOf` | Stock Summary as of a date |
| `get_bills_receivable` | `asOf` | Outstanding receivables as of a date |
| `get_bills_payable` | `asOf` | Outstanding payables as of a date |

## Write tools

| Tool | Args | Effect |
|---|---|---|
| `create_ledger` | `name`, `parent`, `openingBalance?` | Creates a new ledger |
| `create_group` | `name`, `parent` | Creates a new account group |
| `create_stock_item` | `name`, `group`, `unit`, `openingBalance?`, `openingRate?` | Creates a new stock item |
| `create_voucher` | `voucherType`, `date`, `narration?`, `debitLedger`, `creditLedger`, `amount` | Creates a two-leg voucher (Payment, Receipt, Sales, Purchase, Journal, ...) |
| `update_voucher` | `voucherType`, `voucherNumber`, `date`, `narration?`, `debitLedger`, `creditLedger`, `amount` | Replaces the ledger entries/narration of an existing voucher. **Matched by type + date + voucher number** — that combination must uniquely identify the voucher (confirm with `get_ledger_vouchers` first). |
| `update_stock_item` | `name`, `group`, `unit` | Updates an existing stock item's group and unit |
| `delete_stock_item` | `name` | Deletes a stock item (fails if it has transactions posted against it) |

## SQL cache tools

| Tool | Args | Effect |
|---|---|---|
| `sync_to_sql` | — | Loads ledgers/groups/stock items into an in-memory SQL cache (PGLite) |
| `query_sql` | `sql` | Runs a read-only `SELECT` against that cache |

See [SQL_CACHE.md](./SQL_CACHE.md) for schema and examples.

Write tools return a plain-text summary: `Success. Created: N. ...` or
`Failed. Tally reported N error(s). ...` — always check the response text
before assuming a write succeeded, since Tally reports errors inside the XML
body rather than via HTTP status.

## Adding a new tool

1. Add an entry to the `tools` array in [`src/tools.ts`](../src/tools.ts)
   with a `name`, `description`, and JSON Schema `inputSchema`.
2. If the request needs new XML shape, add a `.xml.njk` file to
   [`templates/`](../templates/) and render it with `render(name, context)`
   from `src/templates.ts` (see the existing `report.xml.njk` /
   `create-ledger.xml.njk` for the two shapes: Export Data vs Import Data).
3. Add a case to the `switch` in `handleTool` in `src/tools.ts` that builds
   the XML and calls `tallyRequest`.
4. Run `npm run build` to type-check.
5. If it's a report you haven't used before, confirm the exact `REPORTNAME`
   string by checking what Tally calls it on-screen — see
   [TALLY_XML_GUIDE.md](./TALLY_XML_GUIDE.md).
