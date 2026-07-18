# Claude Desktop Extension (.dxt) Packaging

[`manifest.json`](../manifest.json) at the repo root makes this installable
as a one-click Claude Desktop Extension instead of hand-editing
`claude_desktop_config.json`.

## Building a .dxt file

Install Anthropic's packaging CLI and run it from the repo root:

```bash
npm install -g @anthropic-ai/dxt
npm run build
dxt pack . tally-mcp-server.dxt
```

This bundles `manifest.json`, `dist/`, and `node_modules/` into a single
`.dxt` file.

## Installing

Double-click the resulting `.dxt` file (or drag it into Claude Desktop's
Settings → Extensions). Claude Desktop reads `manifest.json`, prompts for
the `tally_url` setting (defaults to `http://localhost:9000`), and launches
`dist/index.js` over stdio automatically — no manual JSON config editing.

## Manifest fields worth knowing

- `server.mcp_config` — the actual launch command Claude Desktop runs.
  `${__dirname}` is substituted with the extension's install directory at
  runtime.
- `user_config` — settings surfaced in Claude Desktop's UI. Currently just
  `tally_url`; add more here (e.g. an auth token) if you extend the server
  to need them, then reference them as `${user_config.<key>}` in
  `mcp_config`.
- This packages the **stdio** entry point ([`src/index.ts`](../src/index.ts)),
  not the HTTP one — `.dxt` extensions are always launched locally by Claude
  Desktop. For remote use, see [HTTP_DEPLOYMENT.md](./HTTP_DEPLOYMENT.md)
  instead.

## Updating the version

Bump `version` in both `package.json` and `manifest.json` together — Claude
Desktop uses the manifest version to detect updates when you re-import a
new `.dxt`.
