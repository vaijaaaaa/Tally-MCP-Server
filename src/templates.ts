import nunjucks from "nunjucks";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
// templates/ lives next to src/ and dist/, not inside either.
const TEMPLATES_DIR = join(__dirname, "..", "templates");

const env = new nunjucks.Environment(new nunjucks.FileSystemLoader(TEMPLATES_DIR), {
  autoescape: true,
  trimBlocks: true,
  lstripBlocks: true,
});

export function render(templateName: string, context: Record<string, unknown>): string {
  return env.render(templateName, context).trim();
}
