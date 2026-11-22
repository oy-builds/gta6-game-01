// city.js — the city of Palmera: road grid, districts, buildings, beach, landmarks.
// Everything here is original: Palmera is a sun-soaked coastal city invented for this game.

export const WORLD = { w: 3400, h: 2600 };

export const DISTRICTS = [
  { name: 'Marisol Beach', x: 2450, y: 2050, w: 950, h: 550, tint: '#f7d774' },
  { name: 'Port Azul', x: 0, y: 1750, w: 1100, h: 850, tint: '#7fb6d9' },
  { name: 'Downtown Palmera', x: 1100, y: 350, w: 1200, h: 1100, tint: '#e8e3d8' },
  { name: 'The Palms', x: 150, y: 150, w: 900, h: 900, tint: '#a8d08d' },
  { name: 'Mercado Viejo', x: 1150, y: 1500, w: 1100, h: 700, tint: '#e0a458' },
  { name: 'Costa Serena', x: 2350, y: 250, w: 1050, h: 1100, tint: '#f2b8c6' },
];

// Roads: vertical and horizontal avenues. Cars drive along these.
export const V_ROADS = [300, 800, 1300, 1800, 2300, 2800, 3200];
export const H_ROADS = [300, 800, 1300, 1800, 2150];
export const ROAD_W = 128;

export function isOnRoad(x, y) {
  for (const rx of V_ROADS) if (Math.abs(x - rx) < ROAD_W / 2) return true;
  for (const ry of H_ROADS) if (Math.abs(y - ry) < ROAD_W / 2) return true;
  return false;
}
export function isWater(x, y) { return y > 2380; }
export function isSand(x, y) { return y > 2180 && y <= 2380; }

export function districtAt(x, y) {
  for (const d of DISTRICTS) if (x >= d.x && x < d.x + d.w && y >= d.y && y < d.y + d.h) return d;
  return DISTRICTS[2];
}

// Deterministic pseudo-random generator so the city is identical on every load.
function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

const ROOF_COLORS = ['#d96f4e', '#c95d63', '#e0a458', '#7fb6d9', '#f2e3c6', '#b56576', '#6d8ea0', '#e9c46a', '#f4a261', '#90be6d'];
const LANDMARK_NAMES = ['Hotel Marisol', 'Faro Azul Lighthouse', 'Palmera Grand Casino', 'Mercado Central', 'Torre Serena', 'Club Palma', 'Museo del Mar', 'Estadio Sol'];

export function buildCity() {
  const rand = rng(20261122);
  const buildings = [];
  const palms = [];
  const landmarks = [];
  // city blocks between roads
  const xs = [60, ...V_ROADS.map(v => v + ROAD_W / 2 + 24)];
  const xe = [...V_ROADS.map(v => v - ROAD_W / 2 - 24), WORLD.w - 60];
  const ys = [60, ...H_ROADS.map(v => v + ROAD_W / 2 + 24)];
  const ye = [...H_ROADS.map(v => v - ROAD_W / 2 - 24), 2140];
  for (let i = 0; i < xs.length; i++) for (let j = 0; j < ys.length; j++) {
    let x = xs[i], y = ys[j];
    const bw = xe[i] - xs[i], bh = ye[j] - ys[j];
    while (x + 70 < xe[i]) {
      let w = 70 + rand() * 90;
      let yy = y;
      while (yy + 60 < ye[j]) {
        let h = 60 + rand() * 80;
        if (x + w <= xe[i] && yy + h <= ye[j]) {
          buildings.push({ x: x + 4, y: yy + 4, w: w - 8, h: h - 8, color: ROOF_COLORS[Math.floor(rand() * ROOF_COLORS.length)], floors: 1 + Math.floor(rand() * 6), name: null });
        }
        yy += h;
      }
      x += w;
    }
    void bw; void bh;
  }
  // landmarks replace the nearest building footprint with a named one
  const spots = [[1300, 300], [300, 2150], [2300, 800], [1300, 1300], [2800, 300], [1800, 1800], [800, 800], [2300, 1300]];
  spots.forEach(([sx, sy], i) => {
    const b = { x: sx - 70, y: sy - 55, w: 140, h: 110, color: '#fff3d6', floors: 8, name: LANDMARK_NAMES[i], landmark: true };
    landmarks.push(b); buildings.push(b);
  });
  // palm trees along beach and avenues
  for (let x = 80; x < WORLD.w; x += 90 + rand() * 120) palms.push({ x, y: 2200 + rand() * 60 });
  for (let i = 0; i < 130; i++) {
    const x = 80 + rand() * (WORLD.w - 160), y = 80 + rand() * 2000;
    if (!isOnRoad(x, y)) palms.push({ x, y });
  }
  // docks at Port Azul
  const docks = [];
  for (let i = 0; i < 5; i++) docks.push({ x: 120 + i * 190, y: 2330, w: 26, h: 130 });
  return { buildings, palms, landmarks, docks };
}

export function collidesWithBuilding(city, x, y, r) {
  if (x < 16 || y < 16 || x > WORLD.w - 16 || y > 2400) return true;
  for (const b of city.buildings) {
    if (x + r > b.x && x - r < b.x + b.w && y + r > b.y && y - r < b.y + b.h) return true;
  }
  return false;
}

export function nearestRoadPoint(x, y) {
  let best = null, bd = 1e12;
  for (const rx of V_ROADS) { const d = Math.abs(rx - x); if (d < bd) { bd = d; best = { x: rx, y, axis: 'v', line: rx }; } }
  for (const ry of H_ROADS) { const d = Math.abs(ry - y); if (d < bd) { bd = d; best = { x, y: ry, axis: 'h', line: ry }; } }
  return best;
}
