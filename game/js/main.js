// main.js — Palmera Nights boot, game loop and state machine.
// Rico Vale arrives in Palmera with $120. The Marisol family has work. The Palmera PD has opinions.
import { buildCity, collidesWithBuilding, WORLD } from './city.js';
import { makePlayer, updatePlayerOnFoot, playerPos } from './player.js';
import { driveCar, nearestCar, carsCollide, pointInCar, makeCar } from './vehicles.js';
import { spawnTraffic, spawnParked, updateTraffic } from './traffic.js';
import { spawnPeds, updatePeds, scarePeds } from './pedestrians.js';
import { updatePolice, addWanted } from './police.js';
import { playerAttack, updateCombat, damageCar } from './combat.js';
import { makeMissionState, startMission, updateMissions, missionMarker, makeDelivery, updateDelivery, MISSIONS, failMission } from './missions.js';
import { makeCamera, updateCamera, drawWorld, drawMinimap } from './render.js';
import { grabHud, updateHud } from './hud.js';
import { SoundBank } from './audio.js';
import { loadSave, storeSave } from './save.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const hud = grabHud(document);

export function createState() {
  const city = buildCity();
  const player = makePlayer(1300, 520);
  const saved = loadSave();
  if (saved) {
    player.cash = saved.cash ?? player.cash; player.respect = saved.respect ?? 0;
  }
  const state = {
    mode: 'menu', // menu | playing | paused | over
    city, player, cars: [], peds: [], bullets: [], enemyShots: [], effects: [], pickups: [],
    camera: makeCamera(), time: 0, hour: 10.5, day: saved?.day ?? 1,
    wanted: 0, heatTimer: 0, spawnCd: 0, missionIndex: Math.min(saved?.missionIndex ?? 0, MISSIONS.length),
    mission: makeMissionState(), delivery: null, deliveryCd: 8, missionThugsActive: false,
    stats: { deliveries: saved?.deliveries ?? 0, racesWon: saved?.racesWon ?? 0, carsStolen: saved?.carsStolen ?? 0 },
    sound: new SoundBank(), keys: {}, mouse: { x: 0, y: 0, down: false }, overReason: '', saveNow: false,
    missionMarkerCache: null, shake: 0,
  };
  state.camera.x = player.x; state.camera.y = player.y;
  spawnTraffic(state, 26); spawnParked(state, 30); spawnPeds(state, 42);
  // the yellow Fenix from mission 1 waits by the lighthouse; the casino Brisa beside the Grand
  const fenix = makeCar(3, 330, 2010, Math.PI / 2, 'parked'); fenix.missionCar = true; state.cars.push(fenix);
  const brisa = makeCar(1, 2380, 800, 0, 'parked'); brisa.missionCar = true; state.cars.push(brisa);
  // scattered pickups: health at the beach kiosks, ammo behind Club Palma
  state.pickups.push({ kind: 'health', x: 2600, y: 2220, amount: 0, t: 0 }, { kind: 'ammo', x: 1880, y: 1790, amount: 0, t: 0 }, { kind: 'health', x: 500, y: 500, amount: 0, t: 0 });
  return state;
}

export const state = createState();

function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
window.addEventListener('resize', resize); resize();

// ---------- input ----------
window.addEventListener('keydown', e => {
  state.keys[e.code] = true;
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  state.sound.ensure();
  if (e.code === 'Escape') togglePause();
  if (e.code === 'KeyE' && state.mode === 'playing') toggleCar();
  if (e.code === 'KeyF' && state.mode === 'playing') toggleCar();
  if (e.code === 'Space' && state.mode === 'playing') playerAttack(state);
  if (e.code === 'KeyM' && state.mode === 'playing') state.bigMap = !state.bigMap;
});
window.addEventListener('keyup', e => { state.keys[e.code] = false; });
canvas.addEventListener('mousemove', e => { state.mouse.x = e.clientX; state.mouse.y = e.clientY; });
canvas.addEventListener('mousedown', e => { state.sound.ensure(); state.mouse.down = true; if (state.mode === 'playing') playerAttack(state); });
window.addEventListener('mouseup', () => { state.mouse.down = false; });

function input() {
  const k = state.keys;
  const pp = playerPos(state.player);
  const wx = state.camera.x + (state.mouse.x - canvas.width / 2), wy = state.camera.y + (state.mouse.y - canvas.height / 2);
  return {
    up: !!(k.KeyW || k.ArrowUp), down: !!(k.KeyS || k.ArrowDown),
    left: !!(k.KeyA || k.ArrowLeft), right: !!(k.KeyD || k.ArrowRight),
    sprint: !!(k.ShiftLeft || k.ShiftRight), aimX: wx, aimY: wy,
    worldAim: { x: wx, y: wy }, playerWorld: pp,
  };
}

function togglePause() {
  if (state.mode === 'playing') { state.mode = 'paused'; show('pause-screen'); state.sound.setEngine(false); state.sound.setSiren(false); }
  else if (state.mode === 'paused') { state.mode = 'playing'; hide('pause-screen'); }
}
function show(id) { document.getElementById(id).classList.remove('hidden'); }
function hide(id) { document.getElementById(id).classList.add('hidden'); }

function toggleCar() {
  const p = state.player;
  if (p.inCar) {
    const car = p.inCar; p.inCar = null;
    p.x = car.x + Math.cos(car.angle + Math.PI / 2) * 30; p.y = car.y + Math.sin(car.angle + Math.PI / 2) * 30;
    if (collidesWithBuilding(state.city, p.x, p.y, p.r)) { p.x = car.x - Math.cos(car.angle + Math.PI / 2) * 30; p.y = car.y - Math.sin(car.angle + Math.PI / 2) * 30; }
    car.kind = car.kind === 'player' ? 'parked' : car.kind;
    state.sound.setEngine(false); state.sound.door();
  } else {
    const car = nearestCar(state.cars, p.x, p.y, 52);
    if (!car) return;
    const wasParked = car.kind === 'parked';
    if (car.kind === 'traffic') { scarePeds(state, car.x, car.y, 120); addWanted(state, 0.7, car.x, car.y); state.sound.horn(); }
    else if (wasParked) { addWanted(state, 0.35, car.x, car.y); }
    car.kind = 'player'; p.inCar = car; state.stats.carsStolen += wasParked || true ? 1 : 0;
    state.sound.door();
  }
}

// ---------- collisions & crime ----------
function carWorldCollisions(dt) {
  const p = state.player;
  for (const car of state.cars) {
    if (car.dead) continue;
    // buildings stop cars (except gentle traffic slide)
    if ((car.kind === 'player' || car.kind === 'police') && collidesWithBuilding(state.city, car.x, car.y, 16)) {
      car.x -= Math.cos(car.angle) * car.speed * dt * 1.4; car.y -= Math.sin(car.angle) * car.speed * dt * 1.4;
      if (Math.abs(car.speed) > 120) { damageCar(state, car, 12); state.sound.crash(); state.shake = 0.35; }
      car.speed *= -0.25;
    }
    if (car.x < 20 || car.x > WORLD.w - 20 || car.y < 20 || car.y > 2360) { car.x = Math.max(20, Math.min(WORLD.w - 20, car.x)); car.y = Math.max(20, Math.min(2360, car.y)); car.speed *= 0.4; }
  }
  // car vs car
  for (let i = 0; i < state.cars.length; i++) for (let j = i + 1; j < state.cars.length; j++) {
    const a = state.cars[i], b = state.cars[j];
    if (a.dead || b.dead || !carsCollide(a, b)) continue;
    const dx = b.x - a.x, dy = b.y - a.y, d = Math.max(10, Math.hypot(dx, dy));
    const push = (34 - d) / 2 + 1;
    a.x -= dx / d * push; a.y -= dy / d * push; b.x += dx / d * push; b.y += dy / d * push;
    const impact = Math.abs(a.speed - b.speed);
    if (impact > 90) {
      damageCar(state, a, 8); damageCar(state, b, 8); state.sound.crash(); state.shake = Math.max(state.shake, 0.25);
      if (a.kind === 'player' || b.kind === 'player') addWanted(state, 0.4, a.x, a.y);
    }
    const swap = a.speed; a.speed = b.speed * 0.4; b.speed = swap * 0.4;
  }
  // cars run over pedestrians (a crime, and it hurts)
  for (const car of state.cars) {
    if (car.dead || Math.abs(car.speed) < 40) continue;
    for (const ped of state.peds) {
      if (ped.dead || pointInCar(car, ped.x, ped.y) === false) continue;
      if (Math.hypot(ped.x - car.x, ped.y - car.y) < 30) {
        ped.hp = 0; ped.dead = true; ped.deathTimer = 0;
        if (ped.cash) state.pickups.push({ kind: 'cash', x: ped.x, y: ped.y, amount: ped.cash, t: 0 });
        if (car.kind === 'player') { addWanted(state, ped.role === 'cop' ? 1.8 : 1, ped.x, ped.y); state.shake = 0.2; }
        scarePeds(state, ped.x, ped.y, 240);
      }
    }
    // police car ramming the player's car
    if (p.inCar && car.kind === 'police' && carsCollide(car, p.inCar) && Math.abs(car.speed) > 150) { p.inCar.hp -= 6 * dt * 10; }
  }
  // player car hits the player? no. player on foot hit by traffic:
  if (!p.inCar) for (const car of state.cars) {
    if (car.kind === 'player' || car.dead || Math.abs(car.speed) < 60) continue;
    if (Math.hypot(p.x - car.x, p.y - car.y) < 26) { p.hp -= 22; p.hurtFlash = 1; p.x += Math.cos(car.angle) * 26; p.y += Math.sin(car.angle) * 26; state.sound.crash(); if (p.hp <= 0) { p.hp = 0; p.dead = true; } }
  }
}

// ---------- flow ----------
function startGame() {
  hide('start-screen'); hide('over-screen');
  state.mode = 'playing'; state.sound.ensure();
  state.mission.banner = state.missionIndex < MISSIONS.length ? 'Meet the Marisol family at Hotel Marisol' : 'Free roam — Palmera is yours';
  state.mission.bannerT = 4;
}
function gameOver(reason) {
  state.mode = 'over'; state.overReason = reason;
  document.getElementById('over-title').textContent = reason === 'busted' ? 'BUSTED' : 'WASTED';
  document.getElementById('over-text').textContent = reason === 'busted'
    ? 'The Palmera PD got Rico. The family pays the fine — you lose $150 and some face.'
    : 'Rico wakes up at Hospital Serena. The bill is $150 and the streets remember.';
  show('over-screen'); state.sound.setEngine(false); state.sound.setSiren(false);
  if (reason === 'busted') state.sound.busted();
}
function respawn() {
  const p = state.player;
  p.cash = Math.max(0, p.cash - 150); p.hp = 100; p.dead = false; p.busted = false; p.bustTimer = 0;
  if (p.inCar) { p.inCar.kind = 'parked'; p.inCar = null; }
  p.x = 1300; p.y = 520; state.wanted = 0;
  state.cars = state.cars.filter(c => c.kind !== 'police');
  state.peds = state.peds.filter(q => q.role !== 'cop');
  if (state.mission.active) failMission(state, 'you went down');
  hide('over-screen'); state.mode = 'playing'; state.saveNow = true;
}

document.getElementById('btn-start').addEventListener('click', startGame);
document.getElementById('btn-resume').addEventListener('click', togglePause);
document.getElementById('btn-respawn').addEventListener('click', respawn);
document.getElementById('btn-newgame').addEventListener('click', () => { localStorage.removeItem('palmera-nights-save-v1'); location.reload(); });

// ---------- main loop ----------
let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  let dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (state.mode !== 'playing') { drawWorld(ctx, state, canvas.width, canvas.height); return; }
  const inp = input();
  const p = state.player;
  state.time += dt;
  state.hour += dt * 0.06; if (state.hour >= 24) { state.hour -= 24; state.day += 1; }
  // mission giver interaction: walk into the M marker with no active mission
  state.missionMarkerCache = missionMarker(state);
  if (!state.mission.active && state.missionIndex < MISSIONS.length && !p.inCar) {
    if (Math.hypot(p.x - 1300, p.y - 380) < 62) startMission(state, state.missionIndex);
  }
  if (p.inCar) {
    const ratio = driveCar(p.inCar, inp, dt);
    p.x = p.inCar.x; p.y = p.inCar.y;
    state.sound.setEngine(true, ratio);
    if (state.mouse.down) { /* no shooting from cars: keep hands on the wheel */ }
  } else {
    updatePlayerOnFoot(p, inp, dt, (x, y, r) => collidesWithBuilding(state.city, x, y, r));
    if (state.mouse.down && p.attackCd <= 0) playerAttack(state);
    state.sound.setEngine(false);
  }
  updateTraffic(state, dt);
  updatePeds(state, dt);
  updatePolice(state, dt);
  updateCombat(state, dt);
  updateMissions(state, dt);
  // count mission thug defeats
  for (const ped of state.peds) if (ped.dead && ped.isMissionThug && !ped.counted) { ped.counted = true; state.mission.defeated += 1; }
  carWorldCollisions(dt);
  state.sound.setSiren(state.cars.some(c => c.kind === 'police' && !c.dead && Math.hypot(c.x - p.x, c.y - p.y) < 700));
  state.sound.music(dt);
  // free-roam deliveries appear regularly
  state.deliveryCd -= dt;
  if (!state.delivery && state.deliveryCd <= 0) { state.delivery = makeDelivery(state); state.deliveryCd = 55; }
  updateDelivery(state, dt);
  // slow health regen keeps runs forgiving
  if (!p.dead && p.hp > 0 && p.hp < 100) p.hp = Math.min(100, p.hp + dt * 1.1);
  state.shake = Math.max(0, state.shake - dt);
  const target = p.inCar ? p.inCar : p;
  updateCamera(state.camera, target, dt, canvas.width, canvas.height);
  if (state.shake > 0) { state.camera.x += (Math.random() - 0.5) * state.shake * 22; state.camera.y += (Math.random() - 0.5) * state.shake * 22; }
  drawWorld(ctx, state, canvas.width, canvas.height);
  if (state.bigMap) drawBigMap();
  updateHud(state, hud);
  if (state.saveNow) { storeSave(state); state.saveNow = false; }
  if (p.busted) gameOver('busted');
  else if (p.dead) gameOver('wasted');
}
function drawBigMap() {
  ctx.fillStyle = 'rgba(8,12,20,0.82)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  const w = Math.min(1000, canvas.width - 80), h = w * (WORLD.h / WORLD.w);
  ctx.save(); ctx.translate((canvas.width - w) / 2, (canvas.height - h) / 2);
  drawMinimap(ctx, state, w, h);
  ctx.restore();
  ctx.fillStyle = '#fff'; ctx.font = 'bold 22px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('PALMERA — press M to close', canvas.width / 2, 42);
}
requestAnimationFrame(frame);

// Debug / staging handle: used by the maker's screenshot script to stage real scenes.
window.PALMERA = {
  state, startGame, startMission: i => startMission(state, i),
  setWanted: n => { state.wanted = n; state.heatTimer = 0; },
  teleport: (x, y) => { state.player.x = x; state.player.y = y; if (state.player.inCar) { state.player.inCar.x = x; state.player.inCar.y = y; } state.camera.x = x; state.camera.y = y; },
  giveCar: () => { if (!state.player.inCar) { const c = nearestCar(state.cars, state.player.x, state.player.y, 4000); if (c) { c.x = state.player.x + 40; c.y = state.player.y; toggleCarRef(c); } } },
  setHour: h => { state.hour = h; },
  hurt: n => { state.player.hp = Math.max(1, state.player.hp - n); },
};
function toggleCarRef(car) { car.kind = 'player'; state.player.inCar = car; state.player.x = car.x; state.player.y = car.y; }
