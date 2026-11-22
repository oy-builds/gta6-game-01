// vehicles.js — Palmera's original car models, driving physics and car entry/theft.

export const CAR_MODELS = [
  { name: 'Solana Coupe', color: '#e63946', w: 46, h: 22, top: 330, accel: 260, grip: 3.4 },
  { name: 'Brisa Sedan', color: '#457b9d', w: 50, h: 23, top: 290, accel: 220, grip: 3.1 },
  { name: 'Tortuga Van', color: '#f4a261', w: 56, h: 26, top: 240, accel: 180, grip: 2.7 },
  { name: 'Fenix Roadster', color: '#ffd166', w: 47, h: 21, top: 380, accel: 310, grip: 3.8 },
  { name: 'Camino Pickup', color: '#6a994e', w: 54, h: 25, top: 265, accel: 205, grip: 2.9 },
  { name: 'Perla Compact', color: '#cdb4db', w: 42, h: 20, top: 255, accel: 200, grip: 3.2 },
  { name: 'Taxi Sol', color: '#ffb703', w: 50, h: 23, top: 285, accel: 215, grip: 3.1, taxi: true },
];

let nextCarId = 1;
export function makeCar(modelIdx, x, y, angle, kind = 'parked') {
  const m = CAR_MODELS[modelIdx % CAR_MODELS.length];
  return {
    id: nextCarId++, model: m, x, y, angle, speed: 0, steer: 0,
    w: m.w, h: m.h, hp: 100, kind, driver: null, color: m.color,
    routeAxis: null, routeLine: 0, routeDir: 1, lane: 22, honkCd: 0, dead: false,
  };
}

export function makePoliceCar(x, y, angle) {
  const car = makeCar(1, x, y, angle, 'police');
  car.color = '#1d3557'; car.roofColor = '#f1faee'; car.model = { ...car.model, name: 'PPD Interceptor', top: 345, accel: 275, grip: 3.5 };
  return car;
}

// Arcade driving: accelerate/brake/reverse, steering scales with speed.
export function driveCar(car, input, dt) {
  const m = car.model;
  if (input.up) car.speed += m.accel * dt;
  else if (input.down) car.speed -= (car.speed > 0 ? m.accel * 1.4 : m.accel * 0.55) * dt;
  else car.speed -= car.speed * 0.55 * dt; // rolling drag
  car.speed -= car.speed * 0.35 * dt;
  const maxRev = m.top * 0.38;
  car.speed = Math.max(-maxRev, Math.min(m.top, car.speed));
  if (Math.abs(car.speed) < 2 && !input.up && !input.down) car.speed = 0;
  const steerTarget = (input.left ? -1 : 0) + (input.right ? 1 : 0);
  car.steer += (steerTarget - car.steer) * Math.min(1, dt * 8);
  const speedRatio = car.speed / m.top;
  car.angle += car.steer * m.grip * speedRatio * dt * 1.9;
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
  return speedRatio;
}

export function moveCarSimple(car, dt) { // traffic/police kinematic move along facing
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
}

export function carCorners(car) {
  const c = Math.cos(car.angle), s = Math.sin(car.angle), hw = car.w / 2, hh = car.h / 2;
  return [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]].map(([lx, ly]) => ({ x: car.x + lx * c - ly * s, y: car.y + lx * s + ly * c }));
}

export function pointInCar(car, px, py) {
  const dx = px - car.x, dy = py - car.y;
  const c = Math.cos(-car.angle), s = Math.sin(-car.angle);
  const lx = dx * c - dy * s, ly = dx * s + dy * c;
  return Math.abs(lx) < car.w / 2 && Math.abs(ly) < car.h / 2;
}

export function carsCollide(a, b) {
  const dx = a.x - b.x, dy = a.y - b.y;
  const rr = (a.w + b.w) / 2.4;
  return dx * dx + dy * dy < rr * rr;
}

export function nearestCar(cars, x, y, maxDist) {
  let best = null, bd = maxDist;
  for (const car of cars) {
    if (car.dead) continue;
    const d = Math.hypot(car.x - x, car.y - y);
    if (d < bd) { bd = d; best = car; }
  }
  return best;
}
