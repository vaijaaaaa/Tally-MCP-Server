import { z } from "zod";
import { tallyRequest, buildCollectionXml } from "./tally.js";

export const tools = [
  {
    name: "get_ledgers",
    description: "Get all ledgers (accounts) from TallyPrime",
    inputSchema: z.object({}),
  },
  {
    name: "get_stock_items",
    description: "Get all stock items from TallyPrime",
    inputSchema: z.object({}),
  },
  {
    name: "get_vouchers",
    description: "Get vouchers from TallyPrime filtered by date range",
    inputSchema: z.object({
      from: z.string().describe("Start date in DD-MM-YYYY format"),
      to: z.string().describe("End date in DD-MM-YYYY format"),
    }),
  },
  {
    name: "get_company_info",
    description: "Get the currently open company info from TallyPrime",
    inputSchema: z.object({}),
  },
];


export async function handleTool(
  name: string,
  args: Record<string, unknown>
): Promise<string> {
  switch (name) {
    case "get_ledgers": {
      const xml = buildCollectionXml("Ledger", "Ledger", ["NAME", "PARENT", "CLOSINGBALANCE"]);
      const result = await tallyRequest(xml);
      return JSON.stringify(result, null, 2);
    }

    case "get_stock_items": {
      const xml = buildCollectionXml("Stock Item", "Stock Item", ["NAME", "PARENT", "CLOSINGBALANCE"]);
      const result = await tallyRequest(xml);
      return JSON.stringify(result, null, 2);
    }

    case "get_vouchers": {
      const { from, to } = args as { from: string; to: string };
      const xml = `
<ENVELOPE>
  <HEADER><TALLYREQUEST>Export Data</TALLYREQUEST></HEADER>
  <BODY>
    <EXPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Day Book</REPORTNAME>
        <STATICVARIABLES>
          <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
          <SVFROMDATE>${from}</SVFROMDATE>
          <SVTODATE>${to}</SVTODATE>
        </STATICVARIABLES>
      </REQUESTDESC>
    </EXPORTDATA>
  </BODY>
</ENVELOPE>`.trim();
      const result = await tallyRequest(xml);
      return JSON.stringify(result, null, 2);
    }

    case "get_company_info": {
      const xml = `
<ENVELOPE>
  <HEADER><TALLYREQUEST>Export Data</TALLYREQUEST></HEADER>
  <BODY>
    <EXPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Company</REPORTNAME>
        <STATICVARIABLES>
          <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
        </STATICVARIABLES>
      </REQUESTDESC>
    </EXPORTDATA>
  </BODY>
</ENVELOPE>`.trim();
      const result = await tallyRequest(xml);
      return JSON.stringify(result, null, 2);
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}