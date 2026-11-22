// player.js — Rico Vale, the player character: on-foot movement, health, wallet.

export function makePlayer(x, y) {
  return {
    x, y, angle: -Math.PI / 2, speed: 0, r: 11,
    hp: 100, maxHp: 100, cash: 120, respect: 0,
    inCar: null, weapon: 'fists', ammo: 0, // weapon: 'fists' | 'pistol'; ammo pickups arm the pistol
    attackCd: 0, hurtFlash: 0, dead: false, bustTimer: 0,
    walkPhase: 0, name: 'Rico Vale',
  };
}

export const WALK_SPEED = 150;
export const SPRINT_SPEED = 245;

export function updatePlayerOnFoot(p, input, dt, collides) {
  let mx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  let my = (input.down ? 1 : 0) - (input.up ? 1 : 0);
  const len = Math.hypot(mx, my);
  p.speed = 0;
  if (len > 0) {
    mx /= len; my /= len;
    const spd = input.sprint ? SPRINT_SPEED : WALK_SPEED;
    p.speed = spd; p.angle = Math.atan2(my, mx);
    p.walkPhase += dt * (input.sprint ? 13 : 9);
    const nx = p.x + mx * spd * dt, ny = p.y + my * spd * dt;
    if (!collides(nx, p.y, p.r)) p.x = nx;
    if (!collides(p.x, ny, p.r)) p.y = ny;
  }
  if (input.aimX !== undefined && input.aimY !== undefined && (input.aimX !== p.x || input.aimY !== p.y)) {
    p.angle = Math.atan2(input.aimY - p.y, input.aimX - p.x);
  }
  p.attackCd = Math.max(0, p.attackCd - dt);
  p.hurtFlash = Math.max(0, p.hurtFlash - dt * 3);
}

export function hurtPlayer(p, dmg) {
  if (p.dead) return;
  p.hp -= dmg; p.hurtFlash = 1;
  if (p.hp <= 0) { p.hp = 0; p.dead = true; }
}

export function healPlayer(p, amount) { p.hp = Math.min(p.maxHp, p.hp + amount); }

export function playerPos(p) { return p.inCar ? { x: p.inCar.x, y: p.inCar.y } : { x: p.x, y: p.y }; }
