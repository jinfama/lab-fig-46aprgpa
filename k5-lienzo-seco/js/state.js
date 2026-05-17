const listeners = new Set();
const state = {
  section: "visualizacion",
  subsection: "landing",
  categoryId: null,
  year: 2021,
  variable: "Absoluto",
  tipoMulti: ["Total"],
  stacked: false,
  view: "trend",
  mapComboId: null,
  globalIndicator: "Energía",
  globalVariable: "Per cápita",
  globalAnalysis: "tendencias",
  speed: 1,
  playing: false,
};

function snapshot(){ return { ...state, tipoMulti: [...state.tipoMulti] }; }
function get(key){ return state[key]; }
function set(key, value){ if(state[key] === value) return; state[key] = value; emit(); }
function patch(obj){
  let changed = false;
  Object.entries(obj).forEach(([k, v]) => { if(state[k] !== v){ state[k] = v; changed = true; } });
  if(changed) emit();
}
function emit(){ for(const fn of listeners) fn(state); }
function subscribe(fn){ listeners.add(fn); return () => listeners.delete(fn); }

export default { snapshot, get, set, patch, subscribe };
