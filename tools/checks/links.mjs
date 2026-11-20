// Relative links in Markdown files must point at files that exist (CLAUDE.md, "Khi chỉnh sửa tài liệu").
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
const SKIP = new Set([".git", "node_modules", "dist", "test-results", "playwright-report"]);
function* md(dir) {
  for (const n of readdirSync(dir)) {
    if (SKIP.has(n)) continue;
    const f = path.join(dir, n);
    if (statSync(f).isDirectory()) yield* md(f);
    else if (n.endsWith(".md")) yield f;
  }
}
let bad = 0,
  files = 0;
for (const f of md(ROOT)) {
  files++;
  const text = readFileSync(f, "utf8").replace(/```[\s\S]*?```/g, "");
  for (const m of text.matchAll(/\]\(([^)\s]+)\)/g)) {
    const target = m[1].split("#")[0];
    if (!target || /^[a-z]+:/i.test(target)) continue;
    if (!existsSync(path.resolve(path.dirname(f), decodeURI(target)))) {
      bad++;
      console.log(`${path.relative(ROOT, f)}: ${m[1]}`);
    }
  }
}
console.log(`${files} file, ${bad} liên kết gãy`);
process.exit(bad ? 1 : 0);
