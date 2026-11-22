// pedestrians.js — Palmera's walkers: strolling, chatting, fleeing danger, fighting back rarely.
import { WORLD, collidesWithBuilding } from './city.js';

const SHIRTS = ['#ef476f', '#ffd166', '#06d6a0', '#118ab2', '#f78c6b', '#cdb4db', '#fefae0', '#90be6d'];
const NAMES = ['Lucia', 'Marco', 'Sofia', 'Diego', 'Ana', 'Pablo', 'Carmen', 'Hugo', 'Valeria', 'Mateo', 'Isabela', 'Rafael'];

let nextPedId = 1;
export function makePed(x, y, role = 'civilian') {
  return {
    id: nextPedId++, x, y, angle: Math.random() * Math.PI * 2, r: 10,
    hp: 40, maxHp: 40, role, name: NAMES[Math.floor(Math.random() * NAMES.length)],
    shirt: role === 'cop' ? '#1d3557' : role === 'thug' ? '#3a0ca3' : SHIRTS[Math.floor(Math.random() * SHIRTS.length)],
    state: 'walk', targetX: x, targetY: y, wait: Math.random() * 2, panic: 0, dead: false,
    attackCd: 0, walkPhase: Math.random() * 6, cash: 5 + Math.floor(Math.random() * 30),
  };
}

export function spawnPeds(state, count) {
  for (let i = 0; i < count; i++) {
    const x = 100 + Math.random() * (WORLD.w - 200), y = 100 + Math.random() * 1950;
    if (state.city && pedBlocked(state, x, y)) continue;
    state.peds.push(makePed(x, y));
  }
}

export function pedBlocked(state, x, y) { return collidesWithBuilding(state.city, x, y, 12); }

export function scarePeds(state, x, y, radius) {
  for (const ped of state.peds) {
    if (ped.dead || ped.role === 'cop') continue;
    if (Math.hypot(ped.x - x, ped.y - y) < radius) { ped.state = 'flee'; ped.panic = 3 + Math.random() * 2; ped.fleeFrom = { x, y }; }
  }
}

export function updatePeds(state, dt) {
  const pp = state.player.inCar ? state.player.inCar : state.player;
  for (const ped of state.peds) {
    if (ped.dead) continue;
    const dPlayer = Math.hypot(ped.x - pp.x, ped.y - pp.y);
    if (ped.role === 'civilian' && dPlayer > 1400) { // recycle far walkers near the player
      ped.x = pp.x + (Math.random() - 0.5) * 700; ped.y = Math.max(80, Math.min(2100, pp.y + (Math.random() - 0.5) * 700));
      if (pedBlocked(state, ped.x, ped.y)) continue;
      ped.state = 'walk'; pickTarget(state, ped);
    }
    let spd = 0;
    if (ped.state === 'flee') {
      const from = ped.fleeFrom || pp;
      ped.angle = Math.atan2(ped.y - from.y, ped.x - from.x);
      spd = 175; ped.panic -= dt;
      if (ped.panic <= 0) ped.state = 'walk';
    } else if (ped.state === 'walk') {
      const dx = ped.targetX - ped.x, dy = ped.targetY - ped.y;
      if (Math.hypot(dx, dy) < 14 || ped.wait > 4) { pickTarget(state, ped); ped.wait = 0; }
      else { ped.angle = Math.atan2(dy, dx); spd = 62; }
      ped.wait += dt;
    } else if (ped.state === 'fight') {
      const t = ped.fightTarget;
      if (!t || t.dead) { ped.state = 'walk'; }
      else {
        const d = Math.hypot(t.x - ped.x, t.y - ped.y);
        ped.angle = Math.atan2(t.y - ped.y, t.x - ped.x);
        if (d > 30) spd = 150;
      }
    }
    if (spd > 0) {
      ped.walkPhase += dt * 9;
      const nx = ped.x + Math.cos(ped.angle) * spd * dt, ny = ped.y + Math.sin(ped.angle) * spd * dt;
      if (!pedBlocked(state, nx, ped.y)) ped.x = nx;
      if (!pedBlocked(state, ped.x, ny)) ped.y = ny;
    }
    ped.attackCd = Math.max(0, ped.attackCd - dt);
  }
  // remove corpses after a while to keep the cast fresh
  state.peds = state.peds.filter(p => !p.dead || (p.deathTimer = (p.deathTimer || 0) + dt) < 14);
}

function pickTarget(state, ped) {
  for (let tries = 0; tries < 6; tries++) {
    const x = ped.x + (Math.random() - 0.5) * 420, y = ped.y + (Math.random() - 0.5) * 420;
    if (x > 60 && x < WORLD.w - 60 && y > 60 && y < 2140 && !pedBlocked(state, x, y)) { ped.targetX = x; ped.targetY = y; return; }
  }
}
