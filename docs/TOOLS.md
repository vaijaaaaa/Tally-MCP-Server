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

Write tools return a plain-text summary: `Success. Created: N. ...` or
`Failed. Tally reported N error(s). ...` — always check the response text
before assuming a write succeeded, since Tally reports errors inside the XML
body rather than via HTTP status.

## Adding a new tool

1. Add an entry to the `tools` array in [`src/tools.ts`](../src/tools.ts)
   with a `name`, `description`, and JSON Schema `inputSchema`.
2. Add a case to the `switch` in `handleTool` in the same file. For reads,
   build XML with `reportXml(...)` or `buildCollectionXml(...)`. For writes,
   follow the pattern of `createLedgerXml`/`createVoucherXml`.
3. Run `npm run build` to type-check.
4. If it's a report you haven't used before, confirm the exact `REPORTNAME`
   string by checking what Tally calls it on-screen — see
   [TALLY_XML_GUIDE.md](./TALLY_XML_GUIDE.md).
