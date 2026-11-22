// render.js — camera, world drawing, day lighting and the minimap for Palmera.
import { WORLD, V_ROADS, H_ROADS, ROAD_W, DISTRICTS, districtAt } from './city.js';

export function makeCamera() { return { x: 1300, y: 500, zoom: 1 }; }

export function updateCamera(cam, target, dt, viewW, viewH) {
  const k = 1 - Math.pow(0.0015, dt);
  cam.x += (target.x - cam.x) * k; cam.y += (target.y - cam.y) * k;
  cam.x = Math.max(viewW / 2 - 200, Math.min(WORLD.w - viewW / 2 + 200, cam.x));
  cam.y = Math.max(viewH / 2 - 200, Math.min(WORLD.h - viewH / 2 + 200, cam.y));
}

export function dayLight(hour) { // 0..24 -> overlay colour + alpha for time of day
  if (hour < 5 || hour >= 20) return { color: '10,16,48', a: 0.42, name: 'Night' };
  if (hour < 8) return { color: '255,150,80', a: 0.16, name: 'Sunrise' };
  if (hour < 17) return { color: '255,240,200', a: 0.0, name: 'Day' };
  if (hour < 20) return { color: '255,110,60', a: 0.18, name: 'Sunset' };
  return { color: '10,16,48', a: 0.42, name: 'Night' };
}

export function drawWorld(ctx, state, viewW, viewH) {
  const cam = state.camera;
  const left = cam.x - viewW / 2, top = cam.y - viewH / 2;
  ctx.save(); ctx.translate(-left, -top);
  // ground: grass, then sand and sea to the south
  ctx.fillStyle = '#8fbf6f'; ctx.fillRect(left - 20, top - 20, viewW + 40, viewH + 40);
  const vis = { x0: left - 80, y0: top - 80, x1: left + viewW + 80, y1: top + viewH + 80 };
  ctx.fillStyle = '#f6dd9a'; ctx.fillRect(vis.x0, 2180, vis.x1 - vis.x0, 200);
  ctx.fillStyle = '#2a9d8f'; ctx.fillRect(vis.x0, 2380, vis.x1 - vis.x0, WORLD.h - 2380 + 200);
  ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 3;
  for (let i = 0; i < 4; i++) { const wy = 2410 + i * 55 + Math.sin(state.time * 1.4 + i) * 4; ctx.beginPath(); ctx.moveTo(vis.x0, wy); ctx.lineTo(vis.x1, wy); ctx.stroke(); }
  // district tints
  for (const d of DISTRICTS) {
    ctx.fillStyle = d.tint + '55'; ctx.fillRect(d.x, d.y, d.w, d.h);
    ctx.fillStyle = 'rgba(40,30,20,0.55)'; ctx.font = 'bold 30px sans-serif'; ctx.textAlign = 'center';
    if (d.x + d.w > vis.x0 && d.x < vis.x1 && d.y + d.h > vis.y0 && d.y < vis.y1) ctx.fillText(d.name.toUpperCase(), d.x + d.w / 2, d.y + 46);
  }
  // roads
  ctx.fillStyle = '#3c4048';
  for (const rx of V_ROADS) ctx.fillRect(rx - ROAD_W / 2, 0, ROAD_W, 2380);
  for (const ry of H_ROADS) ctx.fillRect(0, ry - ROAD_W / 2, WORLD.w, ROAD_W);
  ctx.strokeStyle = '#f9e784'; ctx.lineWidth = 3; ctx.setLineDash([26, 22]);
  for (const rx of V_ROADS) { ctx.beginPath(); ctx.moveTo(rx, 0); ctx.lineTo(rx, 2380); ctx.stroke(); }
  for (const ry of H_ROADS) { ctx.beginPath(); ctx.moveTo(0, ry); ctx.lineTo(WORLD.w, ry); ctx.stroke(); }
  ctx.setLineDash([]);
  // sidewalks
  ctx.strokeStyle = '#cfc8b8'; ctx.lineWidth = 8;
  for (const rx of V_ROADS) { ctx.strokeRect(rx - ROAD_W / 2 - 4, -4, ROAD_W + 8, 2388); }
  // buildings
  for (const b of state.city.buildings) {
    if (b.x + b.w < vis.x0 || b.x > vis.x1 || b.y + b.h < vis.y0 || b.y > vis.y1) continue;
    ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(b.x + 6, b.y + 8, b.w, b.h);
    ctx.fillStyle = b.color; ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(b.x + 5, b.y + 5, b.w - 10, 7);
    ctx.fillStyle = 'rgba(30,40,60,0.5)';
    const cols = Math.floor(b.w / 26), rows = Math.floor(b.h / 26);
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) ctx.fillRect(b.x + 10 + i * 26, b.y + 18 + j * 26, 9, 9);
    if (b.name) { ctx.fillStyle = '#402e10'; ctx.font = 'bold 15px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(b.name, b.x + b.w / 2, b.y + b.h / 2 + 5); }
  }
  // docks
  ctx.fillStyle = '#8a6642'; for (const d of state.city.docks) ctx.fillRect(d.x, d.y, d.w, d.h);
  // palms
  for (const t of state.city.palms) {
    if (t.x < vis.x0 || t.x > vis.x1 || t.y < vis.y0 || t.y > vis.y1) continue;
    ctx.fillStyle = '#7a5230'; ctx.fillRect(t.x - 3, t.y - 3, 6, 10);
    ctx.strokeStyle = '#2e7d32'; ctx.lineWidth = 3;
    for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2 + t.x; ctx.beginPath(); ctx.moveTo(t.x, t.y); ctx.quadraticCurveTo(t.x + Math.cos(a) * 14, t.y + Math.sin(a) * 14 - 5, t.x + Math.cos(a) * 22, t.y + Math.sin(a) * 22 + 3); ctx.stroke(); }
  }
  drawMarkers(ctx, state);
  for (const pk of state.pickups) drawPickup(ctx, pk, state.time);
  for (const car of state.cars) if (!car.dead) drawCar(ctx, car, state);
  for (const ped of state.peds) drawPed(ctx, ped, state);
  if (!state.player.inCar && !state.player.dead) drawPlayer(ctx, state);
  drawEffects(ctx, state);
  ctx.restore();
  // day lighting overlay
  const light = dayLight(state.hour);
  if (light.a > 0) { ctx.fillStyle = `rgba(${light.color},${light.a})`; ctx.fillRect(0, 0, viewW, viewH); }
}

function drawMarkers(ctx, state) {
  const mk = state.missionMarkerCache;
  const bob = Math.sin(state.time * 4) * 6;
  const drawBeacon = (x, y, color, letter) => {
    ctx.fillStyle = color + '33'; ctx.beginPath(); ctx.arc(x, y, 44 + bob, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, 15, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 17px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(letter, x, y + 6);
    ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(x - 9, y - 58 + bob); ctx.lineTo(x + 9, y - 58 + bob); ctx.lineTo(x, y - 40 + bob); ctx.fill();
  };
  if (mk) drawBeacon(mk.x, mk.y, mk.kind === 'giver' ? '#ffd166' : '#ef476f', mk.kind === 'giver' ? 'M' : '!');
  if (state.delivery) drawBeacon(state.delivery.x, state.delivery.y, '#06d6a0', 'D');
}

function drawPickup(ctx, pk, time) {
  const y = pk.y + Math.sin(time * 3 + pk.x) * 3;
  ctx.fillStyle = pk.kind === 'cash' ? '#2ecc71' : pk.kind === 'health' ? '#ffffff' : '#ffb703';
  ctx.beginPath(); ctx.arc(pk.x, y, 10, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#123'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(pk.kind === 'cash' ? '$' : pk.kind === 'health' ? '+' : 'A', pk.x, y + 4);
}

export function drawCar(ctx, car, state) {
  ctx.save(); ctx.translate(car.x, car.y); ctx.rotate(car.angle);
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(-car.w / 2 + 3, -car.h / 2 + 5, car.w, car.h);
  ctx.fillStyle = car.color; roundRect(ctx, -car.w / 2, -car.h / 2, car.w, car.h, 7); ctx.fill();
  if (car.kind === 'police') { ctx.fillStyle = '#f1faee'; roundRect(ctx, -car.w / 2, -car.h / 2, car.w, car.h, 7); ctx.fill(); ctx.fillStyle = '#1d3557'; ctx.fillRect(-car.w / 2, -car.h / 2, car.w, 6); ctx.fillRect(-car.w / 2, car.h / 2 - 6, car.w, 6); }
  ctx.fillStyle = '#bfe9ff'; roundRect(ctx, -car.w * 0.12, -car.h / 2 + 3, car.w * 0.3, car.h - 6, 4); ctx.fill(); // windshield/cabin
  ctx.fillStyle = '#22303c'; roundRect(ctx, -car.w * 0.34, -car.h / 2 + 4, car.w * 0.16, car.h - 8, 3); ctx.fill();
  ctx.fillStyle = '#ffe66d'; ctx.fillRect(car.w / 2 - 3, -car.h / 2 + 3, 3, 5); ctx.fillRect(car.w / 2 - 3, car.h / 2 - 8, 3, 5);
  ctx.fillStyle = '#e63946'; ctx.fillRect(-car.w / 2, -car.h / 2 + 3, 3, 5); ctx.fillRect(-car.w / 2, car.h / 2 - 8, 3, 5);
  if (car.model.taxi) { ctx.fillStyle = '#222'; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('TAXI', 0, 3); }
  if (car.kind === 'police') {
    const flash = Math.floor(state.time * 6) % 2 === 0;
    ctx.fillStyle = flash ? '#ff2e2e' : '#2e7bff'; ctx.beginPath(); ctx.arc(0, -6, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = flash ? '#2e7bff' : '#ff2e2e'; ctx.beginPath(); ctx.arc(0, 6, 4, 0, Math.PI * 2); ctx.fill();
  }
  if (car.hp < 55) { ctx.fillStyle = 'rgba(60,60,60,0.55)'; ctx.beginPath(); ctx.arc(car.w * 0.3, 0, 8 + Math.sin(state.time * 7) * 2, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
  if (car.missionCar) { ctx.fillStyle = '#ffd166'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('▼ TARGET', car.x, car.y - 34); }
}

export function drawPed(ctx, ped, state) {
  ctx.save(); ctx.translate(ped.x, ped.y);
  if (ped.dead) { ctx.rotate(Math.PI / 2); ctx.globalAlpha = 0.75; }
  ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.beginPath(); ctx.arc(2, 3, 10, 0, Math.PI * 2); ctx.fill();
  const step = Math.sin(ped.walkPhase || 0) * 4;
  ctx.strokeStyle = '#33415c'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(0, 2); ctx.lineTo(step, 10); ctx.moveTo(0, 2); ctx.lineTo(-step, 10); ctx.stroke();
  ctx.fillStyle = ped.shirt; ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#f2c29b'; ctx.beginPath(); ctx.arc(0, -2, 5.5, 0, Math.PI * 2); ctx.fill();
  if (ped.role === 'cop') { ctx.fillStyle = '#ffd166'; ctx.fillRect(-4, -9, 8, 3); }
  ctx.restore();
  if (ped.role === 'thug' && !ped.dead && state.missionThugsActive) { ctx.fillStyle = '#ff5964'; ctx.fillRect(ped.x - 14, ped.y - 26, 28, 4); ctx.fillStyle = '#6ee7a0'; ctx.fillRect(ped.x - 14, ped.y - 26, 28 * Math.max(0, ped.hp / ped.maxHp), 4); }
  void state;
}

function drawPlayer(ctx, state) {
  const p = state.player;
  ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.angle);
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.arc(3, 4, 11, 0, Math.PI * 2); ctx.fill();
  const step = Math.sin(p.walkPhase) * 4;
  ctx.strokeStyle = '#1d3557'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(0, 2); ctx.lineTo(step, 11); ctx.moveTo(0, 2); ctx.lineTo(-step, 11); ctx.stroke();
  ctx.fillStyle = '#ff5964'; ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#f2c29b'; ctx.beginPath(); ctx.arc(1, -1, 6, 0, Math.PI * 2); ctx.fill();
  if (p.weapon === 'pistol') { ctx.fillStyle = '#222'; ctx.fillRect(8, 4, 12, 4); }
  else { ctx.strokeStyle = '#f2c29b'; ctx.lineWidth = 3.4; ctx.beginPath(); ctx.moveTo(6, 5); ctx.lineTo(13, 7); ctx.stroke(); }
  ctx.restore();
  if (p.hurtFlash > 0.4) { ctx.strokeStyle = 'rgba(255,40,40,0.8)'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(p.x, p.y, 17, 0, Math.PI * 2); ctx.stroke(); }
}

function drawEffects(ctx, state) {
  for (const e of state.effects) {
    const a = Math.max(0, e.t / e.max);
    if (e.kind === 'muzzle') { ctx.fillStyle = `rgba(255,200,60,${a})`; ctx.beginPath(); ctx.arc(e.x, e.y, 9 * a + 2, 0, Math.PI * 2); ctx.fill(); }
    else if (e.kind === 'hit' || e.kind === 'swing') { ctx.strokeStyle = `rgba(255,255,255,${a})`; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(e.x, e.y, 14 * (1 - a) + 4, 0, Math.PI * 2); ctx.stroke(); }
    else if (e.kind === 'tracer') { ctx.strokeStyle = `rgba(255,230,120,${a})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(e.x + Math.cos(e.angle) * 190, e.y + Math.sin(e.angle) * 190); ctx.stroke(); }
    else if (e.kind === 'boom') { ctx.fillStyle = `rgba(255,110,30,${a})`; ctx.beginPath(); ctx.arc(e.x, e.y, 60 * (1 - a) + 12, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = `rgba(255,210,80,${a})`; ctx.beginPath(); ctx.arc(e.x, e.y, 34 * (1 - a) + 6, 0, Math.PI * 2); ctx.fill(); }
    else if (e.kind === 'smoke') { ctx.fillStyle = `rgba(70,70,70,${a * 0.5})`; ctx.beginPath(); ctx.arc(e.x, e.y - (1 - a) * 22, 13, 0, Math.PI * 2); ctx.fill(); }
  }
  ctx.strokeStyle = '#ffe66d'; ctx.lineWidth = 2.4;
  for (const b of state.bullets) { ctx.beginPath(); ctx.moveTo(b.x - Math.cos(b.angle) * 9, b.y - Math.sin(b.angle) * 9); ctx.lineTo(b.x, b.y); ctx.stroke(); }
}

export function drawMinimap(ctx, state, w, h) {
  const sx = w / WORLD.w, sy = h / WORLD.h;
  ctx.fillStyle = '#79a95c'; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#2a9d8f'; ctx.fillRect(0, 2380 * sy, w, (WORLD.h - 2380) * sy);
  ctx.fillStyle = '#f6dd9a'; ctx.fillRect(0, 2180 * sy, w, 200 * sy);
  ctx.strokeStyle = '#3c4048'; ctx.lineWidth = 3;
  for (const rx of V_ROADS) { ctx.beginPath(); ctx.moveTo(rx * sx, 0); ctx.lineTo(rx * sx, 2380 * sy); ctx.stroke(); }
  for (const ry of H_ROADS) { ctx.beginPath(); ctx.moveTo(0, ry * sy); ctx.lineTo(w, ry * sy); ctx.stroke(); }
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  for (const car of state.cars) { if (car.dead) continue; ctx.fillStyle = car.kind === 'police' ? (Math.floor(state.time * 5) % 2 ? '#ff2e2e' : '#2e7bff') : 'rgba(255,255,255,0.75)'; ctx.fillRect(car.x * sx - 1.6, car.y * sy - 1.6, 3.2, 3.2); }
  const mk = state.missionMarkerCache;
  if (mk) { ctx.fillStyle = '#ffd166'; ctx.beginPath(); ctx.arc(mk.x * sx, mk.y * sy, 4.6, 0, Math.PI * 2); ctx.fill(); }
  if (state.delivery) { ctx.fillStyle = '#06d6a0'; ctx.beginPath(); ctx.arc(state.delivery.x * sx, state.delivery.y * sy, 4, 0, Math.PI * 2); ctx.fill(); }
  const pp = state.player.inCar ? state.player.inCar : state.player;
  ctx.fillStyle = '#ff1744'; ctx.beginPath(); ctx.arc(pp.x * sx, pp.y * sy, 4.6, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(pp.x * sx, pp.y * sy, 7, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.font = '10px sans-serif'; ctx.textAlign = 'left';
  ctx.fillText(districtAt(pp.x, pp.y).name, 5, h - 5);
}

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
