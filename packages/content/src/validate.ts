// pnpm content:validate: rules V001-V004 of docs/workflows/content-pipeline.md §4 on packages/content.
import { ContentError, loadContent } from "./index";

const warnings: string[] = [];
try {
  const c = loadContent({ warnings });
  for (const w of warnings) console.log(`warn ${w}`);
  console.log(
    `ok   ${c.monsters.size} monsters, ${c.items.size} items, ${c.skills.size} skills, ${c.drops.size} drop tables, ` +
      `${c.maps.size} maps, ${c.quests.size} quests, ${c.npcs.size} NPCs, ${c.bosses.size} bosses, ` +
      `${c.events.length} boss events, ${c.dungeons.size} dungeons, ${c.i18n.size} i18n strings`,
  );
} catch (e) {
  if (!(e instanceof ContentError)) throw e;
  for (const w of warnings) console.log(`warn ${w}`);
  for (const p of e.problems) console.log(`FAIL ${p}`);
  process.exit(1);
}
