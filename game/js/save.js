// save.js — localStorage persistence for Palmera Nights progress.
const KEY = 'palmera-nights-save-v1';

export function loadSave() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (typeof data !== 'object' || data === null) return null;
    return data;
  } catch { return null; }
}

export function storeSave(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify({
      cash: state.player.cash,
      respect: state.player.respect,
      missionIndex: state.missionIndex,
      deliveries: state.stats.deliveries,
      racesWon: state.stats.racesWon,
      carsStolen: state.stats.carsStolen,
      day: state.day,
    }));
  } catch { /* storage unavailable: play on without saving */ }
}

export function clearSave() { try { localStorage.removeItem(KEY); } catch {} }
