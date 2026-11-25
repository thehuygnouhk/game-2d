import { Op, RULES, type SSkillCast, TILE, Tile, tileAt } from "@htk/shared";
import { mobAttackLands } from "./combat";
import type { Mob, Player } from "./entities";
import type { Zone } from "./zone";

/**
 * Monster AI (combat §5.2): idle/wander, chase, attack, leash back home with full HP, flee when weak.
 * Ground monsters stay on their platform (they never walk off an edge); flying ones move freely.
 */
const DT = 0.05;

function solidAt(zone: Zone, x: number, y: number): boolean {
  return tileAt(zone.collision, Math.floor(x / TILE), Math.floor(y / TILE)) === Tile.SOLID;
}

/** Walk a ground monster by dx px; stops at walls and platform edges. Returns true when it moved. */
export function walk(zone: Zone, m: Mob, dx: number, turn = true): boolean {
  if (dx === 0) return false;
  const dir = dx > 0 ? 1 : -1;
  if (turn) m.facing = dir;
  const nx = m.x + dx,
    edge = nx + (dir * m.w) / 2;
  const maxX = zone.collision.width * TILE - m.w / 2;
  if (nx < m.w / 2 || nx > maxX) return false;
  for (let y = m.y - m.h + 2; y < m.y; y += TILE / 2) if (solidAt(zone, edge, y)) return false;
  if (solidAt(zone, edge, m.y - 1)) return false;
  const under = tileAt(zone.collision, Math.floor(edge / TILE), Math.floor(m.y / TILE));
  if (under !== Tile.SOLID && under !== Tile.ONE_WAY) return false; // platform edge
  m.x = nx;
  m.moving = true;
  return true;
}

export function fly(zone: Zone, m: Mob, tx: number, ty: number, speed: number): void {
  const dx = Math.max(-1, Math.min(1, (tx - m.x) / 8)) * speed * DT;
  const dy = Math.max(-1, Math.min(1, (ty - m.y) / 8)) * speed * 0.6 * DT;
  if (!solidAt(zone, m.x + dx, m.y - m.h / 2)) m.x += dx;
  if (!solidAt(zone, m.x, m.y + dy) && !solidAt(zone, m.x, m.y - m.h + dy)) m.y += dy;
  if (Math.abs(dx) > 0.5) m.facing = dx > 0 ? 1 : -1;
  m.moving = Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5;
}

function startAttack(zone: Zone, m: Mob, t: Player, now: number): void {
  const ai = m.def.ai;
  m.atkReadyAt = now + ai.attackCooldownMs;
  const ranged = ai.attackRange > 100;
  m.windup = { at: now + (ranged ? RULES.mobShotWindupMs : RULES.mobMeleeWindupMs), targetId: t.id };
  const cast: SSkillCast = { casterId: m.id, skillId: m.def.skills[0] ?? "MOBSKL_TACKLE", f: m.facing, targetId: t.id };
  if (ranged) cast.shot = { vx: m.facing * RULES.shotSpeed, range: RULES.shotRange, delayMs: RULES.mobShotWindupMs };
  for (const o of zone.observers(m.id)) o.out.send(Op.S_SKILL_CAST, cast);
}

function finishWindup(zone: Zone, m: Mob, now: number): void {
  const w = m.windup!;
  m.windup = null;
  const t = zone.players.get(w.targetId);
  if (m.def.ai.attackRange > 100) {
    zone.shots.push({ mob: m, x: m.x, y: m.y - m.h / 2, vx: m.facing * RULES.shotSpeed, left: RULES.shotRange });
    return;
  }
  if (t?.alive && Math.abs(t.body.x - m.x) < RULES.mobMeleeHit + m.w / 2 && Math.abs(t.body.y - m.y) < 90)
    mobAttackLands(zone, m, t, now);
}

export function tickMob(zone: Zone, m: Mob, now: number): void {
  if (!m.alive) return;
  const ai = m.def.ai;
  m.moving = false;
  if (m.windup && now >= m.windup.at) finishWindup(zone, m, now);
  if (now < m.hurtUntil) {
    if (!m.flying) walk(zone, m, m.knockDir * RULES.mobKnockback * DT, false);
    m.moving = false;
    return;
  }
  // leash: too far from home → run back and heal up
  if (!m.forceAggro && m.mode !== "return" && Math.abs(m.x - m.homeX) > ai.leash) {
    m.mode = "return";
    m.targetId = 0;
    m.threat.clear();
    m.windup = null;
  }
  if (m.mode === "return") {
    const dx = m.homeX - m.x;
    if (Math.abs(dx) < 20) {
      m.mode = "idle";
      m.hp = m.max.hp;
    } else if (m.flying) fly(zone, m, m.homeX, m.hoverY, ai.moveSpeed * RULES.mobReturn);
    else if (!walk(zone, m, Math.sign(dx) * Math.min(Math.abs(dx), ai.moveSpeed * RULES.mobReturn * DT))) {
      m.mode = "idle"; // cannot get back (pushed off its platform): give up and heal where it stands
      m.hp = m.max.hp;
    }
    return;
  }
  let t = m.targetId ? zone.players.get(m.targetId) : undefined;
  if (t && !t.alive) {
    t = undefined;
    m.targetId = 0;
  }
  if (!t && (ai.type === "AGGRESSIVE" || m.forceAggro)) {
    let best = Infinity;
    for (const p of zone.players.values()) {
      const dx = Math.abs(p.body.x - m.x);
      if (
        p.alive &&
        now >= p.invulnUntil &&
        dx < (m.forceAggro ? Math.max(ai.aggroRange, 600) : ai.aggroRange) &&
        Math.abs(p.body.y - m.y) < (m.forceAggro ? 300 : RULES.aggroDy) &&
        dx < best
      ) {
        best = dx;
        t = p;
      }
    }
    if (t) {
      m.targetId = t.id;
      m.mode = "chase";
    }
  }
  if (!t) {
    m.mode = "idle";
    wander(zone, m, now);
    return;
  }
  const dx = t.body.x - m.x;
  if (ai.fleeBelowHp > 0 && m.hp < m.max.hp * ai.fleeBelowHp) {
    if (m.flying) fly(zone, m, m.x - Math.sign(dx) * 64, m.hoverY, ai.moveSpeed * RULES.mobFlee);
    else walk(zone, m, -Math.sign(dx || 1) * ai.moveSpeed * RULES.mobFlee * DT);
    return;
  }
  if (m.windup) return; // swinging
  if (m.flying) {
    const dy = t.body.y - 34 - m.y;
    if (Math.abs(dx) < 40 && Math.abs(dy) < 50) {
      m.facing = dx >= 0 ? 1 : -1;
      if (now >= m.atkReadyAt) startAttack(zone, m, t, now);
    } else fly(zone, m, t.body.x, t.body.y - 34, ai.moveSpeed);
    return;
  }
  m.facing = dx >= 0 ? 1 : -1;
  if (Math.abs(dx) > ai.attackRange) walk(zone, m, Math.sign(dx) * ai.moveSpeed * RULES.mobChase * DT);
  else if (now >= m.atkReadyAt && Math.abs(t.body.y - m.y) < 90) startAttack(zone, m, t, now);
}

function wander(zone: Zone, m: Mob, now: number): void {
  const ai = m.def.ai;
  if (m.flying) {
    fly(
      zone,
      m,
      m.homeX + Math.sin(now / 1500 + m.homeX) * 60,
      m.hoverY + Math.sin(now / 500 + m.homeX) * 8,
      ai.moveSpeed,
    );
    return;
  }
  if (now >= m.nextThink) {
    const r = zone.world.rng;
    m.nextThink = now + 1200 + r() * 2000;
    m.wanderDir = r() < 0.5 ? -1 : 1;
    m.walking = r() < 0.6;
  }
  if (!m.walking) return;
  const fromHome = m.x - m.homeX;
  const dir = Math.abs(fromHome) > m.spawn.radius ? (fromHome > 0 ? -1 : 1) : m.wanderDir;
  if (!walk(zone, m, dir * ai.moveSpeed * RULES.mobWander * DT)) m.wanderDir = m.wanderDir === 1 ? -1 : 1;
}
