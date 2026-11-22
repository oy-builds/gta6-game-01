// combat.js — fists, a pistol, bullets, hits, knockdowns and pickups.
import { scarePeds } from './pedestrians.js';
import { addWanted } from './police.js';

export function playerAttack(state) {
  const p = state.player;
  if (p.inCar || p.attackCd > 0 || p.dead) return;
  state.sound.ensure();
  if (p.weapon === 'pistol' && p.ammo > 0) {
    p.attackCd = 0.24; p.ammo -= 1;
    state.bullets.push({ x: p.x + Math.cos(p.angle) * 16, y: p.y + Math.sin(p.angle) * 16, angle: p.angle + (Math.random() - 0.5) * 0.03, life: 0.55, friendly: true });
    state.effects.push({ kind: 'muzzle', x: p.x + Math.cos(p.angle) * 20, y: p.y + Math.sin(p.angle) * 20, t: 0.06, max: 0.06 });
    state.sound.shot();
    scarePeds(state, p.x, p.y, 300);
    addWanted(state, 0.6, p.x, p.y);
  } else {
    p.weapon = p.ammo > 0 ? 'pistol' : 'fists';
    p.attackCd = 0.32;
    state.sound.punch();
    state.effects.push({ kind: 'swing', x: p.x + Math.cos(p.angle) * 22, y: p.y + Math.sin(p.angle) * 22, t: 0.12, max: 0.12 });
    // melee hits whatever stands in front
    const hx = p.x + Math.cos(p.angle) * 30, hy = p.y + Math.sin(p.angle) * 30;
    for (const ped of state.peds) {
      if (ped.dead) continue;
      if (Math.hypot(ped.x - hx, ped.y - hy) < 30) { damagePed(state, ped, 16, p.angle); return; }
    }
    for (const car of state.cars) {
      if (Math.hypot(car.x - hx, car.y - hy) < 42) { damageCar(state, car, 6); return; }
    }
  }
}

export function damagePed(state, ped, dmg, angle) {
  ped.hp -= dmg;
  ped.x += Math.cos(angle) * 7; ped.y += Math.sin(angle) * 7;
  state.effects.push({ kind: 'hit', x: ped.x, y: ped.y, t: 0.18, max: 0.18 });
  if (ped.hp <= 0 && !ped.dead) {
    ped.dead = true; ped.deathTimer = 0;
    state.player.respect += ped.role === 'thug' ? 2 : 0;
    if (ped.cash) state.pickups.push({ kind: 'cash', x: ped.x, y: ped.y, amount: ped.cash, t: 0 });
    if (ped.role === 'cop') addWanted(state, 1.6, ped.x, ped.y);
    else addWanted(state, 0.8, ped.x, ped.y);
    scarePeds(state, ped.x, ped.y, 260);
  } else if (ped.role === 'civilian' && Math.random() < 0.75) {
    ped.state = 'flee'; ped.panic = 3; ped.fleeFrom = { x: state.player.x, y: state.player.y };
    addWanted(state, 0.35, ped.x, ped.y);
  } else if (ped.role !== 'cop') {
    ped.state = 'fight'; ped.fightTarget = state.player;
    addWanted(state, 0.35, ped.x, ped.y);
  }
}

export function damageCar(state, car, dmg) {
  car.hp -= dmg;
  if (car.hp < 55 && car.hp + dmg >= 55) state.effects.push({ kind: 'smoke', x: car.x, y: car.y, t: 1.4, max: 1.4 });
  if (car.hp <= 0 && !car.dead) {
    car.dead = true;
    state.effects.push({ kind: 'boom', x: car.x, y: car.y, t: 0.5, max: 0.5 });
    state.sound.crash();
    if (car.kind === 'police') addWanted(state, 1.2, car.x, car.y);
  }
}

export function updateCombat(state, dt) {
  const p = state.player;
  // player bullets
  for (const b of state.bullets) {
    b.x += Math.cos(b.angle) * 720 * dt; b.y += Math.sin(b.angle) * 720 * dt; b.life -= dt;
    if (b.life <= 0) continue;
    for (const ped of state.peds) {
      if (ped.dead) continue;
      if (Math.hypot(ped.x - b.x, ped.y - b.y) < 13) { damagePed(state, ped, 26, b.angle); b.life = 0; break; }
    }
    if (b.life > 0) for (const car of state.cars) {
      if (car === p.inCar || car.dead) continue;
      if (Math.hypot(car.x - b.x, car.y - b.y) < 30) { damageCar(state, car, 12); b.life = 0; break; }
    }
  }
  state.bullets = state.bullets.filter(b => b.life > 0);
  // enemy shots queued by police/thugs resolve as instant tracers with a hit chance
  for (const s of state.enemyShots) {
    state.effects.push({ kind: 'tracer', x: s.x, y: s.y, angle: s.angle, t: 0.09, max: 0.09 });
    state.sound.shot();
    const d = Math.hypot(p.x - s.x, p.y - s.y);
    if (!p.inCar && Math.random() < Math.max(0.12, 0.55 - d / 600)) { p.hp -= 7; p.hurtFlash = 1; if (p.hp <= 0) { p.hp = 0; p.dead = true; } }
    else if (p.inCar && Math.random() < 0.3) { p.inCar.hp -= 3; }
  }
  state.enemyShots = [];
  // thugs and brawling civilians swing back
  for (const ped of state.peds) {
    if (ped.dead || ped.state !== 'fight') continue;
    const d = Math.hypot(p.x - ped.x, p.y - ped.y);
    if (!p.inCar && d < 32 && ped.attackCd <= 0) {
      ped.attackCd = 0.8; p.hp -= ped.role === 'thug' ? 8 : 4; p.hurtFlash = 1;
      state.effects.push({ kind: 'hit', x: p.x, y: p.y, t: 0.15, max: 0.15 });
      if (p.hp <= 0) { p.hp = 0; p.dead = true; }
    }
    if (ped.role === 'thug' && d < 300 && d > 40 && ped.attackCd <= 0 && state.wanted >= 0) {
      // thugs in the story shoot during their missions only
      if (state.missionThugsActive) { ped.attackCd = 1.4; state.enemyShots.push({ x: ped.x, y: ped.y, angle: ped.angle, fromCop: false }); }
    }
  }
  // effects decay
  for (const e of state.effects) e.t -= dt;
  state.effects = state.effects.filter(e => e.t > 0);
  // pickups
  for (const pk of state.pickups) {
    pk.t += dt;
    if (!p.inCar && Math.hypot(pk.x - p.x, pk.y - p.y) < 24) {
      pk.taken = true;
      if (pk.kind === 'cash') { p.cash += pk.amount; state.sound.cash(); }
      if (pk.kind === 'health') { p.hp = Math.min(p.maxHp, p.hp + 35); state.sound.pickup(); }
      if (pk.kind === 'ammo') { p.ammo += 18; p.weapon = 'pistol'; state.sound.pickup(); }
    }
  }
  state.pickups = state.pickups.filter(pk => !pk.taken && pk.t < 40);
}
