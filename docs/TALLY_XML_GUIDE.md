# Tally XML Gateway Notes

TallyPrime exposes a raw XML-over-HTTP interface on port 9000 (configurable).
There's no REST/JSON API — every request and response is XML.

## Enabling the gateway

In TallyPrime: `F1 (Help) > Settings > Connectivity > Client/Server
configuration` → set **TallyPrime acts as** to `Both` or `Server`. Default
port is `9000`.

## Reading data — "Export Data"

Two ways to read:

**A) Built-in reports** (P&L, Balance Sheet, Day Book, Stock Summary, Bills
Receivable, ...) — use `REPORTNAME` with `STATICVARIABLES` like
`SVFROMDATE`/`SVTODATE`:

```xml
<ENVELOPE>
  <HEADER><TALLYREQUEST>Export Data</TALLYREQUEST></HEADER>
  <BODY>
    <EXPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Balance Sheet</REPORTNAME>
        <STATICVARIABLES>
          <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
          <SVFROMDATE>01-04-2025</SVFROMDATE>
          <SVTODATE>31-03-2026</SVTODATE>
        </STATICVARIABLES>
      </REQUESTDESC>
    </EXPORTDATA>
  </BODY>
</ENVELOPE>
```

**B) Raw collections** (Ledger, Stock Item, Group, Voucher Type, Cost Centre)
— use `COLLECTION` with explicit `FETCH` fields:

```xml
<ENVELOPE>
  <HEADER><TALLYREQUEST>Export Data</TALLYREQUEST></HEADER>
  <BODY>
    <EXPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Collection</REPORTNAME>
        <STATICVARIABLES><SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT></STATICVARIABLES>
      </REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <COLLECTION NAME="Ledger">
            <TYPE>Ledger</TYPE>
            <FETCH>NAME</FETCH>
            <FETCH>PARENT</FETCH>
            <FETCH>CLOSINGBALANCE</FETCH>
          </COLLECTION>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </EXPORTDATA>
  </BODY>
</ENVELOPE>
```

Collections are cheaper and give you exactly the fields you ask for. Reports
mirror what you'd see on-screen in Tally and are better for anything
aggregated (totals, P&L structure, etc.).

`REPORTNAME` must be exactly `Collection` for a raw collection export —
that's the magic value that tells Tally "run the ad-hoc `COLLECTION` defined
in `REQUESTDATA`". Any other value (e.g. `List of Accounts`) makes Tally look
up a named built-in report instead and silently ignore `TYPE`/`FETCH`
entirely — `List of Accounts` in particular dumps every master (Groups,
Ledgers, Stock Items, Voucher Types, Cost Centres, ...) regardless of what
you asked for.

## Writing data — "Import Data"

Wrap the object to create inside `TALLYMESSAGE`, with `ACTION="Create"` on
the root tag:

```xml
<ENVELOPE>
  <HEADER><TALLYREQUEST>Import Data</TALLYREQUEST></HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC><REPORTNAME>All Masters</REPORTNAME></REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <LEDGER NAME="Acme Corp" ACTION="Create">
            <NAME>Acme Corp</NAME>
            <PARENT>Sundry Debtors</PARENT>
            <OPENINGBALANCE>0</OPENINGBALANCE>
          </LEDGER>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>
```

For vouchers, use `REPORTNAME>Vouchers</REPORTNAME` and a `<VOUCHER>` tag with
`ALLLEDGERENTRIES.LIST` blocks — one per ledger leg, debit legs use
`ISDEEMEDPOSITIVE = Yes` and a negative amount, credit legs use `No` and a
positive amount. See `createVoucherXml` in [`src/tools.ts`](../src/tools.ts).

## Response format & gotchas

- Tally returns `ERRORS` / `EXCEPTIONS` counts in the response `HEADER` for
  Import requests — a `200 OK` HTTP status does **not** mean the create
  succeeded. Always check these (see `checkImportResult` in `tools.ts`).
- A single matching record and multiple matching records are shaped
  differently by the XML parser (object vs. array). `clean.ts` handles this.
- Dates in `STATICVARIABLES` use `DD-MM-YYYY`. Dates inside `<DATE>` tags in
  voucher creation use `YYYYMMDD` (see the `.split("-").reverse().join("")`
  conversion in `createVoucherXml`).
- Names (`PARENT`, `LEDGERNAME`, etc.) must exactly match what exists in
  Tally, including case. There's no fuzzy matching.
- An empty HTTP response body from Tally almost always means no company is
  currently open.
