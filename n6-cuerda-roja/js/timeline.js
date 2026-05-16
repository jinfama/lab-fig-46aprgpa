// Bottom timeline: dual-handle slider + play/pause + speed.

import { State } from './state.js';

const YEAR_MIN = 1961;
const YEAR_MAX = 2024;

let _yearFrom = 1961, _yearTo = 2021;
let _playInterval = null;
let _speed = 2;

function el(id) { return document.getElementById(id); }

function pctFor(year) {
  return ((year - YEAR_MIN) / (YEAR_MAX - YEAR_MIN)) * 100;
}
function yearFor(pct) {
  return Math.round(YEAR_MIN + (pct / 100) * (YEAR_MAX - YEAR_MIN));
}

function renderTrack() {
  const handleFrom = el('tl-handle-from');
  const handleTo   = el('tl-handle-to');
  const rangeFill  = el('tl-range-fill');
  const pFrom = pctFor(_yearFrom);
  const pTo   = pctFor(_yearTo);
  handleFrom.style.left = `${pFrom}%`;
  handleTo.style.left   = `${pTo}%`;
  rangeFill.style.left  = `${pFrom}%`;
  rangeFill.style.width = `${pTo - pFrom}%`;
  el('tl-label-from').textContent = _yearFrom;
  el('tl-label-to').textContent   = _yearTo;
  el('tl-year-start').value = _yearFrom;
  el('tl-year-end').value   = _yearTo;
  State.set('yearRange', [_yearFrom, _yearTo]);
}

function setCurrentYear(y) {
  const yy = Math.max(_yearFrom, Math.min(_yearTo, y));
  State.set('currentYear', yy);
  el('tl-year').textContent = yy;
  const mapYear = el('map-year');
  if (mapYear) mapYear.textContent = yy;
}

function dragHandle(which) {
  const handle = el(`tl-handle-${which}`);
  const track  = el('tl-track');
  let dragging = false;
  handle.addEventListener('pointerdown', e => {
    e.preventDefault();
    handle.setPointerCapture(e.pointerId);
    dragging = true;
  });
  handle.addEventListener('pointermove', e => {
    if (!dragging) return;
    const rect = track.getBoundingClientRect();
    const pct = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = yearFor(pct);
    if (which === 'from') _yearFrom = Math.min(y, _yearTo);
    else                  _yearTo   = Math.max(y, _yearFrom);
    renderTrack();
    setCurrentYear(State.get('currentYear'));
  });
  handle.addEventListener('pointerup',    () => { dragging = false; });
  handle.addEventListener('pointercancel',() => { dragging = false; });
}

function playLoop() {
  if (_playInterval) clearInterval(_playInterval);
  _playInterval = setInterval(() => {
    let y = State.get('currentYear') + 1;
    if (y > _yearTo) y = _yearFrom;
    setCurrentYear(y);
  }, 1000 / _speed);
}
function pauseLoop() {
  if (_playInterval) clearInterval(_playInterval);
  _playInterval = null;
}

export function initTimeline() {
  el('tl-track').addEventListener('click', e => {
    if (e.target.closest('.tl-handle')) return;
    const rect = el('tl-track').getBoundingClientRect();
    const pct = ((e.clientX - rect.left) / rect.width) * 100;
    setCurrentYear(yearFor(pct));
  });

  dragHandle('from');
  dragHandle('to');

  el('tl-year-start').addEventListener('change', e => {
    const v = Math.max(YEAR_MIN, Math.min(_yearTo, parseInt(e.target.value, 10) || YEAR_MIN));
    _yearFrom = v;
    renderTrack();
    setCurrentYear(State.get('currentYear'));
  });
  el('tl-year-end').addEventListener('change', e => {
    const v = Math.min(YEAR_MAX, Math.max(_yearFrom, parseInt(e.target.value, 10) || YEAR_MAX));
    _yearTo = v;
    renderTrack();
    setCurrentYear(State.get('currentYear'));
  });

  const playBtn  = el('tl-play');
  const playIcon = el('tl-play-icon');
  playBtn.addEventListener('click', () => {
    const playing = !State.get('playing');
    State.set('playing', playing);
    if (playing) {
      playLoop();
      playIcon.innerHTML = '<rect x="6" y="5" width="4" height="14" fill="currentColor"/><rect x="14" y="5" width="4" height="14" fill="currentColor"/>';
    } else {
      pauseLoop();
      playIcon.innerHTML = '<path d="M8 5v14l11-7z"/>';
    }
  });

  const speedBtn = el('tl-speed');
  const speeds = [1, 2, 4, 8];
  speedBtn.addEventListener('click', () => {
    const i = speeds.indexOf(_speed);
    _speed = speeds[(i + 1) % speeds.length];
    speedBtn.textContent = `${_speed}x`;
    State.set('speed', _speed);
    if (State.get('playing')) playLoop();
  });

  renderTrack();
  setCurrentYear(2020);
}
