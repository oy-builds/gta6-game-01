// hud.js — DOM HUD: cash, respect, health, wanted stars, objective banner, dialogue, minimap.
import { drawMinimap } from './render.js';
import { MISSIONS, currentStep } from './missions.js';

export function grabHud(doc) {
  return {
    cash: doc.getElementById('hud-cash'), respect: doc.getElementById('hud-respect'),
    healthFill: doc.getElementById('health-fill'), stars: doc.getElementById('hud-stars'),
    objective: doc.getElementById('hud-objective'), banner: doc.getElementById('hud-banner'),
    dialogue: doc.getElementById('hud-dialogue'), clock: doc.getElementById('hud-clock'),
    weapon: doc.getElementById('hud-weapon'), bust: doc.getElementById('hud-bust'),
    minimap: doc.getElementById('minimap'), speed: doc.getElementById('hud-speed'),
    missionTitle: doc.getElementById('hud-mission'),
  };
}

export function updateHud(state, hud) {
  const p = state.player;
  hud.cash.textContent = '$' + Math.floor(p.cash).toLocaleString('en-US');
  hud.respect.textContent = 'RESPECT ' + Math.floor(p.respect);
  hud.healthFill.style.width = Math.max(0, p.hp) + '%';
  hud.healthFill.style.background = p.hp > 55 ? '#6ee7a0' : p.hp > 25 ? '#ffd166' : '#ef476f';
  hud.stars.textContent = '★'.repeat(state.wanted) + '☆'.repeat(5 - state.wanted);
  hud.stars.style.color = state.wanted > 0 ? '#ffd166' : 'rgba(255,255,255,0.35)';
  const hh = Math.floor(state.hour), mm = Math.floor((state.hour % 1) * 60);
  hud.clock.textContent = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')} · Day ${state.day}`;
  hud.weapon.textContent = p.inCar ? p.inCar.model.name : (p.weapon === 'pistol' ? `PISTOL · ${p.ammo}` : 'FISTS');
  hud.speed.textContent = p.inCar ? Math.round(Math.abs(p.inCar.speed) * 0.36) + ' km/h' : '';
  const step = currentStep(state);
  if (state.mission.active) {
    hud.missionTitle.textContent = state.mission.active.title.toUpperCase();
    hud.objective.textContent = step ? '▸ ' + step.label : '';
  } else if (state.missionIndex < MISSIONS.length) {
    hud.missionTitle.textContent = 'FREE ROAM';
    hud.objective.textContent = '▸ Meet ' + MISSIONS[state.missionIndex].giver + ' at Hotel Marisol (M marker)';
  } else {
    hud.missionTitle.textContent = 'FREE ROAM — STORY COMPLETE';
    hud.objective.textContent = '▸ Palmera is yours. Deliveries pay cash — look for the green D.';
  }
  if (state.delivery) hud.objective.textContent += `   ·   Delivery: ${Math.ceil(state.delivery.timeLeft)}s`;
  hud.banner.textContent = state.mission.bannerT > 0 ? state.mission.banner : '';
  hud.banner.style.opacity = state.mission.bannerT > 0 ? '1' : '0';
  hud.dialogue.textContent = state.mission.dialogue.length ? state.mission.dialogue.join('\n') : '';
  hud.dialogue.style.opacity = state.mission.dialogue.length ? '1' : '0';
  hud.bust.style.opacity = p.bustTimer > 0.25 && !p.inCar ? '1' : '0';
  hud.bust.textContent = p.bustTimer > 0.25 ? 'BUSTED… hold still and you are done — RUN!' : '';
  const mmCtx = hud.minimap.getContext('2d');
  mmCtx.clearRect(0, 0, hud.minimap.width, hud.minimap.height);
  drawMinimap(mmCtx, state, hud.minimap.width, hud.minimap.height);
}
