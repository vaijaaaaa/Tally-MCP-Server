import { XMLParser } from "fast-xml-parser";

const TALLY_URL = process.env.TALLY_URL ?? "http://localhost:9000";

const parser = new XMLParser({ ignoreAttributes: false });

export class TallyConnectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TallyConnectionError";
  }
}

export async function tallyRequest(xml: string): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(TALLY_URL, {
      method: "POST",
      headers: { "Content-Type": "text/xml" },
      body: xml,
      signal: AbortSignal.timeout(10_000),
    });
  } catch (err) {
    if (err instanceof Error && err.name === "TimeoutError") {
      throw new TallyConnectionError(
        `Tally did not respond within 10s at ${TALLY_URL}. Is it busy or hung?`
      );
    }
    throw new TallyConnectionError(
      `Could not reach TallyPrime at ${TALLY_URL}. Make sure TallyPrime is running and ` +
        `the HTTP gateway is enabled (F1 > Settings > Connectivity).`
    );
  }

  if (!res.ok) {
    throw new TallyConnectionError(`Tally HTTP error: ${res.status} ${res.statusText}`);
  }

  const text = await res.text();

  if (!text || text.trim() === "") {
    throw new TallyConnectionError(
      "Tally returned an empty response. This usually means no company is open in TallyPrime."
    );
  }

  const parsed = parser.parse(text) as any;

  // Tally reports request-level errors inside the XML body itself, not via HTTP status.
  const lineError = parsed?.ENVELOPE?.BODY?.DATA?.LINEERROR ?? parsed?.ENVELOPE?.LINEERROR;
  if (lineError) {
    throw new TallyConnectionError(`Tally reported an error: ${lineError}`);
  }

  return parsed;
}

export function buildCollectionXml(
  collectionName: string,
  type: string,
  fields: string[]
): string {
  const fetchList = fields.map((f) => `<FETCH>${f}</FETCH>`).join("\n");
  return `
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Export Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <EXPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>List of Accounts</REPORTNAME>
        <STATICVARIABLES>
          <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
        </STATICVARIABLES>
      </REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <COLLECTION SYSNAME="${collectionName}">
            <TYPE>${type}</TYPE>
            ${fetchList}
          </COLLECTION>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </EXPORTDATA>
  </BODY>
</ENVELOPE>`.trim();
}
