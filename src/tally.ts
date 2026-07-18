import {XMLParser} from "fast-xml-parser";

const TALLY_URL = process.env.TALLY_URL ??
"http://localhost:9000";

const parser = new XMLParser ({ignoreAttributes: false});

export async function tallyRequest(xml:string) : Promise<unknown>{   
    const res = await fetch(TALLY_URL,{
        method : "POST",
        headers:{"Content-Type" : "text/xml"},
        body : xml,
    });

    if (!res.ok) throw new Error (`Tally HTTP error : ${res.status}`);
    const text = await res.text();
    return parser.parse(text);

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