// traffic.js — civilian traffic AI that cruises Palmera's avenues, plus parked cars.
import { V_ROADS, H_ROADS, WORLD, isWater } from './city.js';
import { makeCar, moveCarSimple } from './vehicles.js';

const rand = (a, b) => a + Math.random() * (b - a);

export function spawnTraffic(state, count) {
  for (let i = 0; i < count; i++) {
    const vertical = Math.random() < 0.5;
    const line = vertical ? V_ROADS[Math.floor(Math.random() * V_ROADS.length)] : H_ROADS[Math.floor(Math.random() * H_ROADS.length)];
    const dir = Math.random() < 0.5 ? 1 : -1;
    const lane = 24 * dir;
    let x, y, angle;
    if (vertical) { x = line + lane; y = rand(150, 2100); angle = dir > 0 ? Math.PI / 2 : -Math.PI / 2; }
    else { y = line + lane; x = rand(150, WORLD.w - 150); angle = dir > 0 ? 0 : Math.PI; }
    if (isWater(x, y)) continue;
    const car = makeCar(Math.floor(Math.random() * 7), x, y, angle, 'traffic');
    car.routeAxis = vertical ? 'v' : 'h'; car.routeLine = line; car.routeDir = dir; car.lane = lane;
    car.speed = rand(70, 120); car.cruise = car.speed;
    state.cars.push(car);
  }
}

export function spawnParked(state, count) {
  for (let i = 0; i < count; i++) {
    const vertical = Math.random() < 0.5;
    const line = vertical ? V_ROADS[Math.floor(Math.random() * V_ROADS.length)] : H_ROADS[Math.floor(Math.random() * H_ROADS.length)];
    const side = Math.random() < 0.5 ? -52 : 52;
    let x, y, angle;
    if (vertical) { x = line + side; y = rand(120, 2050); angle = Math.PI / 2; }
    else { y = line + side; x = rand(120, WORLD.w - 120); angle = 0; }
    const car = makeCar(Math.floor(Math.random() * 7), x, y, angle, 'parked');
    state.cars.push(car);
  }
}

function pickTurn(car) { // at an intersection, maybe turn onto a crossing avenue
  if (Math.random() > 0.45) return;
  if (car.routeAxis === 'v') {
    const cross = H_ROADS.reduce((best, ry) => Math.abs(ry - car.y) < Math.abs(best - car.y) ? ry : best, H_ROADS[0]);
    if (Math.abs(cross - car.y) > 30) return;
    car.routeAxis = 'h'; car.routeLine = cross;
    car.routeDir = Math.random() < 0.5 ? 1 : -1; car.lane = 24 * car.routeDir;
  } else {
    const cross = V_ROADS.reduce((best, rx) => Math.abs(rx - car.x) < Math.abs(best - car.x) ? rx : best, V_ROADS[0]);
    if (Math.abs(cross - car.x) > 30) return;
    car.routeAxis = 'v'; car.routeLine = cross;
    car.routeDir = Math.random() < 0.5 ? 1 : -1; car.lane = 24 * car.routeDir;
  }
}

export function updateTraffic(state, dt) {
  const pp = state.player.inCar ? state.player.inCar : state.player;
  for (const car of state.cars) {
    if (car.kind !== 'traffic' || car.dead) continue;
    // despawn far cars, respawn near the action to keep streets alive
    const d = Math.hypot(car.x - pp.x, car.y - pp.y);
    if (d > 1500) { respawnNear(state, car); continue; }
    // slow for a car ahead or a fleeing pedestrian crossing
    let target = car.cruise;
    for (const other of state.cars) {
      if (other === car || other.dead) continue;
      const ahead = car.routeAxis === 'v' ? (other.x - car.x) * 0 + (other.y - car.y) * car.routeDir : (other.x - car.x) * car.routeDir;
      const side = car.routeAxis === 'v' ? Math.abs(other.x - car.x) : Math.abs(other.y - car.y);
      if (ahead > 0 && ahead < 78 && side < 30) target = Math.min(target, Math.max(0, (ahead - 55) * 2));
    }
    car.speed += (target - car.speed) * Math.min(1, dt * 2.2);
    // steer toward the lane centre of the current avenue
    let tx, ty;
    if (car.routeAxis === 'v') { tx = car.routeLine + car.lane; ty = car.y + car.routeDir * 120; }
    else { ty = car.routeLine + car.lane; tx = car.x + car.routeDir * 120; }
    const want = Math.atan2(ty - car.y, tx - car.x);
    let diff = want - car.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    car.angle += Math.max(-2.4 * dt, Math.min(2.4 * dt, diff));
    if (Math.abs(diff) > 1.2) pickTurn(car);
    moveCarSimple(car, dt);
    // keep traffic inside the city; wrap around at the edges
    if (car.x < 40 || car.x > WORLD.w - 40 || car.y < 40 || car.y > 2320) respawnNear(state, car);
    car.honkCd = Math.max(0, car.honkCd - dt);
  }
}

function respawnNear(state, car) {
  const pp = state.player.inCar ? state.player.inCar : state.player;
  const vertical = Math.random() < 0.5;
  const line = vertical ? V_ROADS[Math.floor(Math.random() * V_ROADS.length)] : H_ROADS[Math.floor(Math.random() * H_ROADS.length)];
  const dir = Math.random() < 0.5 ? 1 : -1;
  car.lane = 24 * dir; car.routeDir = dir; car.routeAxis = vertical ? 'v' : 'h'; car.routeLine = line;
  if (vertical) { car.x = line + car.lane; car.y = Math.max(120, Math.min(2050, pp.y + rand(-900, 900))); car.angle = dir > 0 ? Math.PI / 2 : -Math.PI / 2; }
  else { car.y = line + car.lane; car.x = Math.max(120, Math.min(WORLD.w - 120, pp.x + rand(-900, 900))); car.angle = dir > 0 ? 0 : Math.PI; }
  car.speed = car.cruise || 90;
}
