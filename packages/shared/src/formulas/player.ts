/** Player stats: docs/game-design/04-combat-and-progression.md §3, origins in 03-origins-classes-skills.md §2. */

/** base and growth per level: [HP, MP, ATK, DEF] (content: classes/origins.yaml). */
export interface OriginStats {
  base: readonly [number, number, number, number];
  growth: readonly [number, number, number, number];
}
export type PointKey = "hp" | "mp" | "atk" | "def" | "crit";
export type Points = Record<PointKey, number>;

/** §3.3: value of one potential point. */
export const POINT_VALUE: Points = { hp: 30, mp: 20, atk: 3, def: 2, crit: 0.0005 };
export const START_POINTS = 10;
export const POINTS_PER_LEVEL = 5;
export const totalPoints = (L: number): number => START_POINTS + POINTS_PER_LEVEL * (L - 1);
export const noPoints = (): Points => ({ hp: 0, mp: 0, atk: 0, def: 0, crit: 0 });

/** §3.3 "Cộng gợi ý": 2 HP, 2 ATK, 1 DEF per 5 points, in the order HP, ATK, HP, ATK, DEF. */
export function suggestedPoints(n: number, into: Points = noPoints()): Points {
  const cycle: PointKey[] = ["hp", "atk", "hp", "atk", "def"];
  for (let i = 0; i < n; i++) into[cycle[i % 5]!]++;
  return into;
}

export interface PlayerStats {
  lv: number;
  hp: number;
  mp: number;
  atk: number;
  def: number;
  crit: number;
  critDmg: number;
}

/** §3.4 without gear, gems and buffs (they come with the inventory in step B3). */
export function playerStats(L: number, o: OriginStats, pts: Points): PlayerStats {
  const v = (i: number, k: PointKey) => o.base[i]! + o.growth[i]! * (L - 1) + pts[k] * POINT_VALUE[k];
  return {
    lv: L,
    hp: Math.round(v(0, "hp")),
    mp: Math.round(v(1, "mp")),
    atk: Math.round(v(2, "atk")),
    def: Math.round(v(3, "def")),
    crit: Math.min(0.5, 0.05 + pts.crit * POINT_VALUE.crit),
    critDmg: 1.5,
  };
}

/** §3.5 Lực Chiến. */
export function combatPower(s: PlayerStats, skillLevels: number): number {
  return Math.round(
    s.hp * 0.1 +
      s.mp * 0.05 +
      s.atk * 4 +
      s.def * 3 +
      s.crit * 100 * 10 +
      (s.critDmg * 100 - 150) * 0.5 +
      skillLevels * 20,
  );
}

/** Origin passives (classes §2) that act in combat. */
export const PASSIVE = {
  /** Dân Làng, Không Lùi Bước: below 30% HP, +15% ATK and DEF for 8 s, every 60 s at most. */
  rally: { belowHp: 0.3, bonus: 0.15, durationMs: 8000, cooldownMs: 60_000 },
  /** Thế Gia, Gia Truyền: skill damage +5% (MP regen +25% is in REGEN). */
  nobleSkillMult: 1.05,
} as const;
