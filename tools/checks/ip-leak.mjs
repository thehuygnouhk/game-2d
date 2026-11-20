// IP leak check (docs/product/reskin-spec.md §10, validator V015).
// List A: original-work names, forbidden everywhere outside the internal files.
// List B: reference game names, forbidden in game content, i18n, the player guide and shipped code.
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
const INTERNAL = new Set([
  "docs/product/reskin-spec.md",
  "docs/product/reskin-plan.md",
  "docs/product/legal-and-compliance.md",
  "CLAUDE.md",
]);
const SKIP_DIRS = new Set([".git", "node_modules", "dist", "test-results", "playwright-report", "__pycache__"]);
const TEXT = /\.(md|ya?ml|json|tmj|ts|tsx|js|mjs|html|css|py|txt)$/;
const A =
  "black[ _-]?clover|clover|hage|diamond|spade|heart|ma đạo thư|grimoire|phản ma|anti[ _-]?magic|mana[ _-]?skin|mana[ _-]?zone|spirit[ _-]?dive|hiệp sĩ ma pháp|magic[ _-]?knight|vua phép thuật|wizard[ _-]?king|yul|ngọc mana|ngoc|lễ trao sao|linh thạch sao|tinh linh|lá cỏ|[345] lá|mắt mặt trời|midnight[ _-]?sun|bộ ba hắc ám|dark[ _-]?triad|golden[ _-]?dawn|black[ _-]?bulls|bò đen|bình minh vàng|sư tử đỏ|hoa hồng xanh|đại bàng bạc|công xanh san hô|bọ ngựa xanh|orca tím|hươu nước|asta|yuno|julius|novachrono|yami|sukehiro|vangeance|fuegoleon|mereoleona|vermillion|roselei|nozel|noelle|silva|mimosa|finral|magna|vanessa|charmy|gauche|zora|secre|nacht|liebe|lily|orsi|zogratis|dante|vanica|zenon|lucius|zagred|megicula|lucifero|licht|patry|vetto|fana|rhya|lumiere|langris|leopold|rill|nebra";
const listA = new RegExp(`(^|[^\\p{L}])(${A})([^\\p{L}]|$)`, "iu");
const listB = /Ninja School|Ngọc Rồng|Dragon Ball|\bNRO\b|\bNSO\b/;
const PLAYER_FACING = [
  "docs/guides/player-guide.md",
  "art/prototype/content/",
  "packages/content/",
  "apps/",
  "prototype/playable/index.html",
];

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) yield* walk(full);
    else if (TEXT.test(name)) yield full;
  }
}

let hits = 0;
for (const full of walk(ROOT)) {
  const rel = path.relative(ROOT, full).split(path.sep).join("/");
  if (INTERNAL.has(rel) || rel.startsWith("docs/world-bible/") || rel.startsWith("tools/checks/")) continue;
  const playerFacing = PLAYER_FACING.some((p) => rel.startsWith(p));
  readFileSync(full, "utf8")
    .split("\n")
    .forEach((line, i) => {
      if (listA.test(line) || (playerFacing && listB.test(line))) {
        hits++;
        console.log(`${rel}:${i + 1}: ${line.trim().slice(0, 140)}`);
      }
    });
}
console.log(hits ? `\n${hits} dòng cần sửa (reskin-spec §10)` : "Không có rò rỉ tên IP.");
process.exit(hits ? 1 : 0);
