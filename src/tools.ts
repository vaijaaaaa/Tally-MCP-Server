import { tallyRequest, buildCollectionXml } from "./tally.js";
import { cleanTallyResult } from "./clean.js";
import { render } from "./templates.js";
import { syncAll, runSql } from "./db.js";

export const tools = [
  {
    name: "get_ledgers",
    description: "Get all ledgers (accounts) from TallyPrime",
    inputSchema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "get_stock_items",
    description: "Get all stock items from TallyPrime",
    inputSchema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "get_vouchers",
    description: "Get vouchers (Day Book) from TallyPrime filtered by date range",
    inputSchema: {
      type: "object",
      properties: {
        from: { type: "string", description: "Start date in DD-MM-YYYY format" },
        to: { type: "string", description: "End date in DD-MM-YYYY format" },
      },
      required: ["from", "to"],
    },
  },
  {
    name: "get_company_info",
    description: "Get the currently open company info from TallyPrime",
    inputSchema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "get_profit_and_loss",
    description: "Get the Profit & Loss statement from TallyPrime for a date range",
    inputSchema: {
      type: "object",
      properties: {
        from: { type: "string", description: "Start date in DD-MM-YYYY format" },
        to: { type: "string", description: "End date in DD-MM-YYYY format" },
      },
      required: ["from", "to"],
    },
  },
  {
    name: "get_balance_sheet",
    description: "Get the Balance Sheet from TallyPrime as of a given date",
    inputSchema: {
      type: "object",
      properties: {
        asOf: { type: "string", description: "As-of date in DD-MM-YYYY format" },
      },
      required: ["asOf"],
    },
  },
  {
    name: "get_trial_balance",
    description: "Get the Trial Balance from TallyPrime for a date range",
    inputSchema: {
      type: "object",
      properties: {
        from: { type: "string", description: "Start date in DD-MM-YYYY format" },
        to: { type: "string", description: "End date in DD-MM-YYYY format" },
      },
      required: ["from", "to"],
    },
  },
  {
    name: "get_groups",
    description: "Get all account groups (e.g. Sundry Debtors, Fixed Assets) from TallyPrime",
    inputSchema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "get_voucher_types",
    description: "Get all voucher types configured in TallyPrime (e.g. Payment, Sales, Journal)",
    inputSchema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "get_cost_centres",
    description: "Get all cost centres from TallyPrime",
    inputSchema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "get_stock_summary",
    description: "Get the Stock Summary report from TallyPrime as of a given date",
    inputSchema: {
      type: "object",
      properties: {
        asOf: { type: "string", description: "As-of date in DD-MM-YYYY format" },
      },
      required: ["asOf"],
    },
  },
  {
    name: "get_bills_receivable",
    description: "Get outstanding Bills Receivable from TallyPrime as of a given date",
    inputSchema: {
      type: "object",
      properties: {
        asOf: { type: "string", description: "As-of date in DD-MM-YYYY format" },
      },
      required: ["asOf"],
    },
  },
  {
    name: "get_bills_payable",
    description: "Get outstanding Bills Payable from TallyPrime as of a given date",
    inputSchema: {
      type: "object",
      properties: {
        asOf: { type: "string", description: "As-of date in DD-MM-YYYY format" },
      },
      required: ["asOf"],
    },
  },
  {
    name: "get_ledger_vouchers",
    description: "Get all voucher entries posted to a specific ledger within a date range",
    inputSchema: {
      type: "object",
      properties: {
        ledgerName: { type: "string", description: "Exact ledger name" },
        from: { type: "string", description: "Start date in DD-MM-YYYY format" },
        to: { type: "string", description: "End date in DD-MM-YYYY format" },
      },
      required: ["ledgerName", "from", "to"],
    },
  },
  {
    name: "create_ledger",
    description: "Create a new ledger (account) in TallyPrime",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Name of the new ledger" },
        parent: {
          type: "string",
          description: "Parent group, e.g. 'Sundry Debtors', 'Sundry Creditors', 'Bank Accounts'",
        },
        openingBalance: {
          type: "number",
          description: "Opening balance (optional, defaults to 0)",
        },
      },
      required: ["name", "parent"],
    },
  },
  {
    name: "create_voucher",
    description:
      "Create a new voucher (e.g. Payment, Receipt, Sales, Purchase, Journal) in TallyPrime with two ledger entries (debit and credit)",
    inputSchema: {
      type: "object",
      properties: {
        voucherType: {
          type: "string",
          description: "Voucher type, e.g. 'Payment', 'Receipt', 'Sales', 'Purchase', 'Journal'",
        },
        date: { type: "string", description: "Voucher date in DD-MM-YYYY format" },
        narration: { type: "string", description: "Narration / description for the voucher" },
        debitLedger: { type: "string", description: "Ledger name to debit" },
        creditLedger: { type: "string", description: "Ledger name to credit" },
        amount: { type: "number", description: "Amount of the transaction" },
      },
      required: ["voucherType", "date", "debitLedger", "creditLedger", "amount"],
    },
  },
  {
    name: "create_group",
    description: "Create a new account group in TallyPrime, nested under a parent group",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Name of the new group" },
        parent: {
          type: "string",
          description: "Parent group, e.g. 'Primary', 'Current Assets'",
        },
      },
      required: ["name", "parent"],
    },
  },
  {
    name: "create_stock_item",
    description: "Create a new stock item in TallyPrime",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Name of the new stock item" },
        group: {
          type: "string",
          description: "Stock group, e.g. 'Primary' (use 'Primary' if there are no custom stock groups)",
        },
        unit: { type: "string", description: "Unit of measure, e.g. 'Nos', 'Kg', 'Box'" },
        openingBalance: { type: "number", description: "Opening quantity (optional, defaults to 0)" },
        openingRate: { type: "number", description: "Opening rate per unit (optional, defaults to 0)" },
      },
      required: ["name", "group", "unit"],
    },
  },
  {
    name: "update_stock_item",
    description: "Update the group and/or unit of an existing stock item in TallyPrime",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Exact name of the existing stock item" },
        group: { type: "string", description: "New stock group" },
        unit: { type: "string", description: "New unit of measure" },
      },
      required: ["name", "group", "unit"],
    },
  },
  {
    name: "delete_stock_item",
    description: "Delete a stock item from TallyPrime. Fails if it has transactions posted against it.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Exact name of the stock item to delete" },
      },
      required: ["name"],
    },
  },
  {
    name: "update_voucher",
    description:
      "Update an existing voucher in TallyPrime, replacing its ledger entries and narration. " +
      "The voucher is matched by type + date + voucher number, so that combination must be unique " +
      "and must exactly match an existing voucher (use get_ledger_vouchers or get_vouchers first to confirm it).",
    inputSchema: {
      type: "object",
      properties: {
        voucherType: { type: "string", description: "Voucher type, e.g. 'Payment', 'Receipt', 'Journal'" },
        voucherNumber: { type: "string", description: "Exact voucher number of the voucher to update" },
        date: { type: "string", description: "Existing voucher's date in DD-MM-YYYY format" },
        narration: { type: "string", description: "New narration / description for the voucher" },
        debitLedger: { type: "string", description: "Ledger name to debit" },
        creditLedger: { type: "string", description: "Ledger name to credit" },
        amount: { type: "number", description: "New amount of the transaction" },
      },
      required: ["voucherType", "voucherNumber", "date", "debitLedger", "creditLedger", "amount"],
    },
  },
  {
    name: "sync_to_sql",
    description:
      "Pull ledgers, groups, stock items, and vouchers (last 365 days) from TallyPrime into a local " +
      "in-memory SQL cache, so query_sql can run fast arbitrary queries without hitting Tally each time",
    inputSchema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "query_sql",
    description:
      "Run a read-only SQL SELECT query against the local cache populated by sync_to_sql. " +
      "Tables: ledgers(name, parent, closing_balance), groups(name, parent), " +
      "stock_items(name, parent, closing_balance), vouchers(date, voucher_type, ledger, amount, narration)",
    inputSchema: {
      type: "object",
      properties: {
        sql: { type: "string", description: "A single SELECT statement" },
      },
      required: ["sql"],
    },
  },
];

function reportXml(reportName: string, staticVariables: Record<string, string>): string {
  return render("report.xml.njk", { reportName, staticVariables: Object.entries(staticVariables) });
}

function createLedgerXml(name: string, parent: string, openingBalance: number): string {
  return render("create-ledger.xml.njk", { name, parent, openingBalance });
}

function createVoucherXml(args: {
  voucherType: string;
  date: string;
  narration?: string;
  debitLedger: string;
  creditLedger: string;
  amount: number;
}): string {
  const { voucherType, date, narration, debitLedger, creditLedger, amount } = args;
  return render("create-voucher.xml.njk", {
    voucherType,
    tallyDate: date.split("-").reverse().join(""),
    narration: narration ?? "",
    debitLedger,
    creditLedger,
    amount,
  });
}

function createGroupXml(name: string, parent: string): string {
  return render("create-group.xml.njk", { name, parent });
}

function updateStockItemXml(name: string, group: string, unit: string): string {
  return render("update-stock-item.xml.njk", { name, group, unit });
}

function deleteStockItemXml(name: string): string {
  return render("delete-stock-item.xml.njk", { name });
}

function updateVoucherXml(args: {
  voucherType: string;
  voucherNumber: string;
  date: string;
  narration?: string;
  debitLedger: string;
  creditLedger: string;
  amount: number;
}): string {
  const { voucherType, voucherNumber, date, narration, debitLedger, creditLedger, amount } = args;
  return render("update-voucher.xml.njk", {
    voucherType,
    voucherNumber,
    tallyDate: date.split("-").reverse().join(""),
    narration: narration ?? "",
    debitLedger,
    creditLedger,
    amount,
  });
}

function createStockItemXml(args: {
  name: string;
  group: string;
  unit: string;
  openingBalance: number;
  openingRate: number;
}): string {
  const { name, group, unit, openingBalance, openingRate } = args;
  return render("create-stock-item.xml.njk", {
    name,
    group,
    unit,
    openingBalance,
    openingRate,
    openingValue: openingBalance * openingRate,
  });
}

function ledgerVouchersXml(ledgerName: string, from: string, to: string): string {
  return render("ledger-vouchers.xml.njk", { ledgerName, from, to });
}

function checkImportResult(result: unknown): string {
  const cleaned = cleanTallyResult(result) as any;
  const created = cleaned?.ENVELOPE?.HEADER?.CREATED ?? cleaned?.ENVELOPE?.BODY?.DATA?.CREATED;
  const errors = cleaned?.ENVELOPE?.HEADER?.ERRORS ?? cleaned?.ENVELOPE?.BODY?.DATA?.ERRORS;
  const exceptions = cleaned?.ENVELOPE?.HEADER?.EXCEPTIONS;

  if (errors && Number(errors) > 0) {
    return `Failed. Tally reported ${errors} error(s). Raw response: ${JSON.stringify(cleaned)}`;
  }
  if (exceptions && Number(exceptions) > 0) {
    return `Completed with ${exceptions} exception(s). Raw response: ${JSON.stringify(cleaned)}`;
  }
  return `Success. Created: ${created ?? "unknown"}. Raw response: ${JSON.stringify(cleaned, null, 2)}`;
}

export async function handleTool(
  name: string,
  args: Record<string, unknown>
): Promise<string> {
  switch (name) {
    case "get_ledgers": {
      const xml = buildCollectionXml("Ledger", "Ledger", ["NAME", "PARENT", "CLOSINGBALANCE"]);
      const result = await tallyRequest(xml);
      return JSON.stringify(cleanTallyResult(result), null, 2);
    }

    case "get_stock_items": {
      const xml = buildCollectionXml("Stock Item", "Stock Item", ["NAME", "PARENT", "CLOSINGBALANCE"]);
      const result = await tallyRequest(xml);
      return JSON.stringify(cleanTallyResult(result), null, 2);
    }

    case "get_vouchers": {
      const { from, to } = args as { from: string; to: string };
      const xml = reportXml("Day Book", { SVFROMDATE: from, SVTODATE: to });
      const result = await tallyRequest(xml);
      return JSON.stringify(cleanTallyResult(result), null, 2);
    }

    case "get_company_info": {
      const xml = reportXml("Company", {});
      const result = await tallyRequest(xml);
      return JSON.stringify(cleanTallyResult(result), null, 2);
    }

    case "get_profit_and_loss": {
      const { from, to } = args as { from: string; to: string };
      const xml = reportXml("Profit and Loss A/c", { SVFROMDATE: from, SVTODATE: to });
      const result = await tallyRequest(xml);
      return JSON.stringify(cleanTallyResult(result), null, 2);
    }

    case "get_balance_sheet": {
      const { asOf } = args as { asOf: string };
      const xml = reportXml("Balance Sheet", { SVFROMDATE: asOf, SVTODATE: asOf });
      const result = await tallyRequest(xml);
      return JSON.stringify(cleanTallyResult(result), null, 2);
    }

    case "get_trial_balance": {
      const { from, to } = args as { from: string; to: string };
      const xml = reportXml("Trial Balance", { SVFROMDATE: from, SVTODATE: to });
      const result = await tallyRequest(xml);
      return JSON.stringify(cleanTallyResult(result), null, 2);
    }

    case "get_groups": {
      const xml = buildCollectionXml("Group", "Group", ["NAME", "PARENT"]);
      const result = await tallyRequest(xml);
      return JSON.stringify(cleanTallyResult(result), null, 2);
    }

    case "get_voucher_types": {
      const xml = buildCollectionXml("Voucher Type", "Voucher Type", ["NAME", "PARENT"]);
      const result = await tallyRequest(xml);
      return JSON.stringify(cleanTallyResult(result), null, 2);
    }

    case "get_cost_centres": {
      const xml = buildCollectionXml("Cost Centre", "Cost Centre", ["NAME", "PARENT"]);
      const result = await tallyRequest(xml);
      return JSON.stringify(cleanTallyResult(result), null, 2);
    }

    case "get_stock_summary": {
      const { asOf } = args as { asOf: string };
      const xml = reportXml("Stock Summary", { SVFROMDATE: asOf, SVTODATE: asOf });
      const result = await tallyRequest(xml);
      return JSON.stringify(cleanTallyResult(result), null, 2);
    }

    case "get_bills_receivable": {
      const { asOf } = args as { asOf: string };
      const xml = reportXml("Bills Receivable", { SVFROMDATE: asOf, SVTODATE: asOf });
      const result = await tallyRequest(xml);
      return JSON.stringify(cleanTallyResult(result), null, 2);
    }

    case "get_bills_payable": {
      const { asOf } = args as { asOf: string };
      const xml = reportXml("Bills Payable", { SVFROMDATE: asOf, SVTODATE: asOf });
      const result = await tallyRequest(xml);
      return JSON.stringify(cleanTallyResult(result), null, 2);
    }

    case "get_ledger_vouchers": {
      const { ledgerName, from, to } = args as { ledgerName: string; from: string; to: string };
      const xml = ledgerVouchersXml(ledgerName, from, to);
      const result = await tallyRequest(xml);
      return JSON.stringify(cleanTallyResult(result), null, 2);
    }

    case "create_ledger": {
      const { name: ledgerName, parent, openingBalance } = args as {
        name: string;
        parent: string;
        openingBalance?: number;
      };
      const xml = createLedgerXml(ledgerName, parent, openingBalance ?? 0);
      const result = await tallyRequest(xml);
      return checkImportResult(result);
    }

    case "create_voucher": {
      const voucherArgs = args as {
        voucherType: string;
        date: string;
        narration?: string;
        debitLedger: string;
        creditLedger: string;
        amount: number;
      };
      const xml = createVoucherXml(voucherArgs);
      const result = await tallyRequest(xml);
      return checkImportResult(result);
    }

    case "create_group": {
      const { name: groupName, parent } = args as { name: string; parent: string };
      const xml = createGroupXml(groupName, parent);
      const result = await tallyRequest(xml);
      return checkImportResult(result);
    }

    case "create_stock_item": {
      const { name: itemName, group, unit, openingBalance, openingRate } = args as {
        name: string;
        group: string;
        unit: string;
        openingBalance?: number;
        openingRate?: number;
      };
      const xml = createStockItemXml({
        name: itemName,
        group,
        unit,
        openingBalance: openingBalance ?? 0,
        openingRate: openingRate ?? 0,
      });
      const result = await tallyRequest(xml);
      return checkImportResult(result);
    }

    case "update_stock_item": {
      const { name: itemName, group, unit } = args as { name: string; group: string; unit: string };
      const xml = updateStockItemXml(itemName, group, unit);
      const result = await tallyRequest(xml);
      return checkImportResult(result);
    }

    case "delete_stock_item": {
      const { name: itemName } = args as { name: string };
      const xml = deleteStockItemXml(itemName);
      const result = await tallyRequest(xml);
      return checkImportResult(result);
    }

    case "update_voucher": {
      const voucherArgs = args as {
        voucherType: string;
        voucherNumber: string;
        date: string;
        narration?: string;
        debitLedger: string;
        creditLedger: string;
        amount: number;
      };
      const xml = updateVoucherXml(voucherArgs);
      const result = await tallyRequest(xml);
      return checkImportResult(result);
    }

    case "sync_to_sql": {
      return await syncAll();
    }

    case "query_sql": {
      const { sql } = args as { sql: string };
      return await runSql(sql);
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
