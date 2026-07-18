import express from "express";
import { randomUUID } from "node:crypto";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createServer } from "./server.js";

// Remote/cloud entry point: exposes the same tools as index.ts over HTTP
// instead of stdio, so a browser-based or remote MCP client can reach a
// Tally instance that this process has local network access to.
const PORT = Number(process.env.PORT ?? 3939);
const AUTH_TOKEN = process.env.TALLY_MCP_TOKEN;

const app = express();
app.use(express.json());

if (AUTH_TOKEN) {
  app.use((req, res, next) => {
    const header = req.header("authorization");
    if (header !== `Bearer ${AUTH_TOKEN}`) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    next();
  });
}

app.post("/mcp", async (req, res) => {
  const server = createServer();
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  res.on("close", () => {
    transport.close();
    server.close();
  });
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

app.get("/healthz", (_req, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  console.error(`Tally MCP server running (HTTP) on port ${PORT}`);
  if (!AUTH_TOKEN) {
    console.error(
      "WARNING: TALLY_MCP_TOKEN is not set — the /mcp endpoint is unauthenticated. " +
        "Set TALLY_MCP_TOKEN before exposing this beyond localhost."
    );
  }
});
