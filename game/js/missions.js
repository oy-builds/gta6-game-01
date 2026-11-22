// missions.js — the Marisol family story chain, free-roam deliveries and a beach race.
// Story: Rico Vale washes up in Palmera with $120 and a borrowed name. Lucia Marisol,
// who runs the Marisol family out of Hotel Marisol, gives him work — and a way up.

export const MISSIONS = [
  {
    id: 'first-wheels', title: 'First Wheels', giver: 'Lucia Marisol',
    intro: ['Lucia: Rico. You drive, you eat. Simple.', 'Lucia: Bring me the yellow Fenix parked by the Faro Azul lighthouse. Intact, please.'],
    steps: [
      { kind: 'goto', x: 330, y: 2080, label: 'Reach the Faro Azul lighthouse' },
      { kind: 'steal-model', model: 'Fenix Roadster', label: 'Steal the Fenix Roadster' },
      { kind: 'deliver-car', x: 1300, y: 380, label: 'Deliver the Fenix to Hotel Marisol' },
    ],
    reward: { cash: 300, respect: 10 },
    outro: 'Lucia: Clean work. The family notices clean work.',
  },
  {
    id: 'port-run', title: 'Port Run', giver: 'Lucia Marisol',
    intro: ['Lucia: A crate came in at Port Azul. No questions, no receipts.', 'Lucia: Pick it up and bring it to the Mercado. Fast — the port authority is jumpy today.'],
    steps: [
      { kind: 'goto', x: 420, y: 2260, label: 'Reach the Port Azul docks' },
      { kind: 'pickup', x: 420, y: 2260, label: 'Collect the crate', wanted: 2 },
      { kind: 'goto', x: 1420, y: 1420, label: 'Deliver the crate to Mercado Central' },
    ],
    reward: { cash: 450, respect: 14 },
    outro: 'Lucia: Whatever was in that crate, it was worth it.',
  },
  {
    id: 'turf', title: 'Turf Lessons', giver: 'Marco Marisol',
    intro: ['Marco: The Serena crew thinks The Palms is theirs now.', 'Marco: Three of their boys are hanging around Palm Court. Teach them geography.'],
    steps: [
      { kind: 'goto', x: 620, y: 560, label: 'Reach Palm Court in The Palms' },
      { kind: 'defeat', count: 3, x: 620, y: 560, label: 'Run off the Serena crew (0/3)' },
    ],
    reward: { cash: 250, respect: 20 },
    outro: 'Marco: Geography learned. You hit like rent is due.',
  },
  {
    id: 'casino-chip', title: 'The Casino Chip', giver: 'Lucia Marisol',
    intro: ['Lucia: A high roller at the Palmera Grand lost something of mine — a platinum chip.', 'Lucia: His Brisa is parked at the casino. Take the car, shake the heat, park it at Club Palma.'],
    steps: [
      { kind: 'goto', x: 2380, y: 880, label: 'Reach the Palmera Grand Casino' },
      { kind: 'steal-model', model: 'Brisa Sedan', label: 'Steal the high roller\'s Brisa' },
      { kind: 'lose-heat', label: 'Lose the police before delivering' },
      { kind: 'deliver-car', x: 1880, y: 1880, label: 'Park the Brisa at Club Palma' },
    ],
    reward: { cash: 700, respect: 24 },
    outro: 'Lucia: The chip is back where it belongs. So are you — with us.',
  },
  {
    id: 'night-race', title: 'Serena Strip Showdown', giver: 'Marco Marisol',
    intro: ['Marco: The Serena crew wants a race instead of a war. Beach road, three checkpoints.', 'Marco: Win it and Costa Serena hears the Marisol name differently.'],
    steps: [
      { kind: 'goto', x: 2980, y: 2080, label: 'Reach the beach start line in a car', needCar: true },
      { kind: 'race', checkpoints: [[2980, 1300], [2980, 560], [2450, 330]], label: 'Win the Serena Strip race' },
    ],
    reward: { cash: 600, respect: 28 },
    outro: 'Marco: They heard it. The whole coast heard it.',
  },
  {
    id: 'last-job', title: 'The Last Job at Torre Serena', giver: 'Lucia Marisol',
    intro: ['Lucia: One last job, Rico. The Serena boss keeps his ledger at Torre Serena.', 'Lucia: Take the ledger, survive his boys, and bring it home to the hotel. Then you are family.'],
    steps: [
      { kind: 'goto', x: 2860, y: 380, label: 'Reach Torre Serena' },
      { kind: 'pickup', x: 2860, y: 380, label: 'Take the ledger', wanted: 3, thugs: 3 },
      { kind: 'goto', x: 1300, y: 380, label: 'Bring the ledger back to Hotel Marisol' },
    ],
    reward: { cash: 1500, respect: 50 },
    outro: 'Lucia: Family, Rico. Palmera is yours now — keep it loud.',
  },
];

export function makeMissionState() {
  return { active: null, stepIndex: 0, dialogue: [], dialogueT: 0, defeated: 0, raceIndex: 0, raceTime: 0, banner: '', bannerT: 0, complete: false };
}

export function startMission(state, index) {
  const m = MISSIONS[index];
  if (!m) return false;
  state.mission.active = m; state.mission.stepIndex = 0; state.mission.defeated = 0; state.mission.raceIndex = 0;
  state.mission.dialogue = [...m.intro]; state.mission.dialogueT = 7;
  state.sound.missionStart();
  return true;
}

export function currentStep(state) {
  const ms = state.mission;
  return ms.active ? ms.active.steps[ms.stepIndex] : null;
}

export function missionMarker(state) {
  const step = currentStep(state);
  if (!step) {
    // next mission giver waits at Hotel Marisol
    if (state.missionIndex < MISSIONS.length) return { x: 1300, y: 380, kind: 'giver', label: MISSIONS[state.missionIndex].giver };
    return null;
  }
  if (step.kind === 'steal-model') {
    const car = state.cars.find(c => !c.dead && c.model.name === step.model && c.missionCar);
    if (car) return { x: car.x, y: car.y, kind: 'car', label: step.label };
    return { x: 330, y: 2080, kind: 'goto', label: step.label };
  }
  if (step.kind === 'race') return { x: step.checkpoints[state.mission.raceIndex][0], y: step.checkpoints[state.mission.raceIndex][1], kind: 'race', label: step.label };
  if (step.kind === 'lose-heat') return null;
  return { x: step.x, y: step.y, kind: step.kind, label: step.label };
}

function advanceStep(state) {
  const ms = state.mission;
  ms.stepIndex += 1; ms.defeated = 0; ms.raceIndex = 0;
  if (ms.stepIndex >= ms.active.steps.length) finishMission(state);
}

function finishMission(state) {
  const ms = state.mission, m = ms.active;
  state.player.cash += m.reward.cash; state.player.respect += m.reward.respect;
  ms.dialogue = [m.outro]; ms.dialogueT = 6;
  ms.banner = `MISSION PASSED — ${m.title}  +$${m.reward.cash}`; ms.bannerT = 5;
  ms.active = null; state.missionIndex += 1; state.missionThugsActive = false;
  state.sound.missionDone();
  if (state.missionIndex >= MISSIONS.length) { ms.complete = true; ms.banner = 'STORY COMPLETE — Rico Vale, legend of Palmera'; ms.bannerT = 8; }
  state.saveNow = true;
}

export function failMission(state, why) {
  const ms = state.mission;
  ms.banner = `MISSION FAILED — ${why}`; ms.bannerT = 4;
  ms.active = null; state.missionThugsActive = false;
  state.sound.busted();
}

export function updateMissions(state, dt) {
  const ms = state.mission, p = state.player;
  ms.dialogueT = Math.max(0, ms.dialogueT - dt);
  ms.bannerT = Math.max(0, ms.bannerT - dt);
  if (ms.dialogueT <= 0) ms.dialogue = [];
  const pp = p.inCar ? p.inCar : p;
  const step = currentStep(state);
  if (!step) return;
  const near = (x, y, r) => Math.hypot(pp.x - x, pp.y - y) < r;
  if (step.kind === 'goto') {
    if (step.needCar && !p.inCar) { /* marker waits */ }
    else if (near(step.x, step.y, 60)) advanceStep(state);
  } else if (step.kind === 'pickup') {
    if (!p.inCar && near(step.x, step.y, 42)) {
      if (step.wanted) { state.wanted = Math.max(state.wanted, step.wanted); state.heatTimer = 0; }
      if (step.thugs) spawnThugs(state, step.x, step.y, step.thugs);
      state.sound.pickup(); advanceStep(state);
    }
  } else if (step.kind === 'steal-model') {
    if (p.inCar && p.inCar.model.name === step.model) advanceStep(state);
  } else if (step.kind === 'deliver-car') {
    if (p.inCar && near(step.x, step.y, 80) && Math.abs(p.inCar.speed) < 40) advanceStep(state);
  } else if (step.kind === 'lose-heat') {
    if (state.wanted === 0) advanceStep(state);
  } else if (step.kind === 'defeat') {
    if (near(step.x, step.y, 300) && !ms.thugsSpawned) { spawnThugs(state, step.x, step.y, step.count); ms.thugsSpawned = true; }
    step.label = `Run off the Serena crew (${ms.defeated}/${step.count})`;
    if (ms.defeated >= step.count) { ms.thugsSpawned = false; advanceStep(state); }
  } else if (step.kind === 'race') {
    if (!p.inCar) return;
    ms.raceTime += dt;
    const cp = step.checkpoints[ms.raceIndex];
    if (cp && near(cp[0], cp[1], 95)) {
      ms.raceIndex += 1; state.sound.pickup();
      if (ms.raceIndex >= step.checkpoints.length) advanceStep(state);
    }
  }
}

export function spawnThugs(state, x, y, count) {
  state.missionThugsActive = true;
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    state.peds.push({ id: 9000 + i + Math.floor(Math.random() * 500), x: x + Math.cos(a) * 90, y: y + Math.sin(a) * 90, angle: a + Math.PI, r: 10, hp: 55, maxHp: 55, role: 'thug', name: 'Serena crew', shirt: '#3a0ca3', state: 'fight', fightTarget: state.player, targetX: x, targetY: y, wait: 0, panic: 0, dead: false, attackCd: 0, walkPhase: 0, cash: 25, isMissionThug: true });
  }
}

export function onPedDefeated(state, ped) {
  if (ped.isMissionThug && state.mission.active) state.mission.defeated += 1;
}

// Free-roam side work: pizza-style deliveries and cash pickups scattered by the game loop.
export function makeDelivery(state) {
  const spots = [[420, 2260], [2380, 880], [620, 560], [2860, 380], [1880, 1880], [1420, 1420], [2980, 2080]];
  const s = spots[Math.floor(Math.random() * spots.length)];
  return { x: s[0], y: s[1], timeLeft: 75, pay: 90 + Math.floor(Math.random() * 90) };
}
export function updateDelivery(state, dt) {
  const d = state.delivery;
  if (!d) return;
  d.timeLeft -= dt;
  const pp = state.player.inCar ? state.player.inCar : state.player;
  if (Math.hypot(pp.x - d.x, pp.y - d.y) < 70) {
    state.player.cash += d.pay; state.stats.deliveries += 1;
    state.mission.banner = `DELIVERY DONE +$${d.pay}`; state.mission.bannerT = 3;
    state.sound.cash(); state.delivery = null; state.saveNow = true;
  } else if (d.timeLeft <= 0) { state.delivery = null; state.mission.banner = 'DELIVERY EXPIRED'; state.mission.bannerT = 2.5; }
}
