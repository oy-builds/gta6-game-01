// police.js — Palmera PD: wanted stars, pursuit cars, foot officers, bust & escape.
import { makePoliceCar, moveCarSimple } from './vehicles.js';
import { makePed } from './pedestrians.js';
import { hurtPlayer } from './player.js';

export function addWanted(state, amount, x, y) {
  // crimes only raise the level when a cop or a witness is near
  const witnessed = state.peds.some(p => !p.dead && Math.hypot(p.x - x, p.y - y) < 320) || state.cars.some(c => c.kind === 'police' && Math.hypot(c.x - x, c.y - y) < 420);
  if (!witnessed && state.wanted > 0) { /* already hot: it still counts */ }
  else if (!witnessed && amount < 1) return;
  state.wanted = Math.min(5, state.wanted + amount);
  state.heatTimer = 0;
}

export function updatePolice(state, dt) {
  const p = state.player;
  const pp = p.inCar ? p.inCar : p;
  state.heatTimer += dt;
  // wanted decays when the player breaks line of sight for a while
  const anyCopNear = state.cars.some(c => c.kind === 'police' && Math.hypot(c.x - pp.x, c.y - pp.y) < 460) ||
    state.peds.some(q => q.role === 'cop' && !q.dead && Math.hypot(q.x - pp.x, q.y - pp.y) < 300);
  if (state.wanted > 0 && !anyCopNear && state.heatTimer > 9) { state.wanted -= 1; state.heatTimer = 0; if (state.wanted === 0) state.onWantedCleared && state.onWantedCleared(); }

  const wantCars = state.wanted === 0 ? 0 : 1 + state.wanted;
  const policeCars = state.cars.filter(c => c.kind === 'police' && !c.dead);
  state.spawnCd = Math.max(0, (state.spawnCd || 0) - dt);
  if (policeCars.length < wantCars && state.spawnCd <= 0 && state.wanted > 0) {
    state.spawnCd = 2.5;
    const a = Math.random() * Math.PI * 2, d = 620;
    const car = makePoliceCar(pp.x + Math.cos(a) * d, pp.y + Math.sin(a) * d, a + Math.PI);
    car.speed = 60; state.cars.push(car);
  }
  const wantCops = state.wanted >= 2 ? state.wanted - 1 : 0;
  const footCops = state.peds.filter(q => q.role === 'cop' && !q.dead);
  if (footCops.length < wantCops && state.spawnCd <= 0) {
    const a = Math.random() * Math.PI * 2;
    const cop = makePed(pp.x + Math.cos(a) * 380, pp.y + Math.sin(a) * 380, 'cop');
    cop.state = 'chase'; state.peds.push(cop); state.spawnCd = 3;
  }

  // pursuit driving: aim ahead of the player, ram at close range
  for (const car of policeCars) {
    const d = Math.hypot(pp.x - car.x, pp.y - car.y);
    if (d > 1600) { car.dead = true; continue; }
    const lead = p.inCar ? 0.35 : 0.1;
    const tx = pp.x + (p.inCar ? Math.cos(p.inCar.angle) * p.inCar.speed * lead : 0);
    const ty = pp.y + (p.inCar ? Math.sin(p.inCar.angle) * p.inCar.speed * lead : 0);
    const want = Math.atan2(ty - car.y, tx - car.x);
    let diff = want - car.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    car.angle += Math.max(-2.6 * dt, Math.min(2.6 * dt, diff * 2));
    const top = car.model.top * (d > 300 ? 1 : 0.72);
    car.speed += ((d > 60 ? top : top * 0.4) - car.speed) * Math.min(1, dt * 1.6);
    moveCarSimple(car, dt);
    // bust pressure when a police car sits on a slow/on-foot player
    if (!p.inCar && d < 52 && Math.abs(pp.speed || 0) < 60) p.bustTimer += dt; 
  }

  // foot officers chase, and grab the player when close
  for (const cop of state.peds) {
    if (cop.role !== 'cop' || cop.dead) continue;
    const d = Math.hypot(p.x - cop.x, p.y - cop.y);
    if (state.wanted === 0 || d > 1500) { cop.dead = d > 1500; cop.state = 'walk'; continue; }
    cop.state = 'chase';
    cop.angle = Math.atan2(p.y - cop.y, p.x - cop.x);
    const spd = p.inCar ? 0 : 168;
    if (!p.inCar && d > 26) {
      const nx = cop.x + Math.cos(cop.angle) * spd * dt, ny = cop.y + Math.sin(cop.angle) * spd * dt;
      cop.x = nx; cop.y = ny; cop.walkPhase += dt * 10;
    }
    if (!p.inCar && d < 34) p.bustTimer += dt * 1.4;
    // officers shoot at high wanted when the player is armed and in the open
    if (state.wanted >= 4 && d < 260 && d > 60 && cop.attackCd <= 0) {
      cop.attackCd = 1.1 + Math.random() * 0.5;
      state.enemyShots.push({ x: cop.x, y: cop.y, angle: cop.angle, fromCop: true });
    }
  }
  if (p.inCar) p.bustTimer = Math.max(0, p.bustTimer - dt * 2);
  else if (!anyCopNear) p.bustTimer = Math.max(0, p.bustTimer - dt * 1.5);
  if (p.bustTimer > 2.2 && !p.dead) { p.busted = true; }
  void hurtPlayer;
}
