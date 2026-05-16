// Landing — Three.js globe with realistic Blue Marble texture.
// On CTA click: rotate to a target longitude, zoom slightly, fade out, hand off to the app.

import * as THREE from 'three';
import { State } from './state.js';

let _scene, _camera, _renderer, _globe, _animFrame;

function initGlobe() {
  const canvas = document.getElementById('landing-globe');
  if (!canvas) return;

  const W = canvas.clientWidth  || window.innerWidth;
  const H = canvas.clientHeight || window.innerHeight;

  _scene  = new THREE.Scene();
  _camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 100);
  _camera.position.set(0, 1.4, 7.8);
  _camera.lookAt(0, 0, 0);

  _renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  _renderer.setSize(W, H, false);
  _renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  _renderer.outputColorSpace = THREE.SRGBColorSpace;

  const geo = new THREE.SphereGeometry(1, 96, 96);
  const tex = new THREE.TextureLoader().load(
    'data/textures/earth.png',
    () => _renderer.render(_scene, _camera)
  );
  tex.colorSpace = THREE.SRGBColorSpace;

  const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9, metalness: 0.05 });
  _globe = new THREE.Mesh(geo, mat);
  _scene.add(_globe);

  // Subtle atmosphere
  const atmosGeo = new THREE.SphereGeometry(1.015, 64, 64);
  const atmosMat = new THREE.MeshBasicMaterial({
    color: 0xd4a032, transparent: true, opacity: 0.07, side: THREE.BackSide,
  });
  _scene.add(new THREE.Mesh(atmosGeo, atmosMat));

  _scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const sun = new THREE.DirectionalLight(0xffffff, 1.2);
  sun.position.set(5, 3, 5);
  _scene.add(sun);

  // Continuous slow rotation.
  function frame() {
    if (!_globe) return;
    _globe.rotation.y += 0.0011;
    _renderer.render(_scene, _camera);
    _animFrame = requestAnimationFrame(frame);
  }
  _animFrame = requestAnimationFrame(frame);

  window.addEventListener('resize', () => {
    const nw = canvas.clientWidth  || window.innerWidth;
    const nh = canvas.clientHeight || window.innerHeight;
    _camera.aspect = nw / nh;
    _camera.updateProjectionMatrix();
    _renderer.setSize(nw, nh, false);
  });
}

// Zoom-out transition: the globe pulls back and fades.
// The app DOM becomes visible behind it.
function zoomOutAndHide() {
  return new Promise(resolve => {
    if (_animFrame) cancelAnimationFrame(_animFrame);
    const t0 = performance.now();
    const startZ = _camera.position.z;
    const endZ   = 2.6;
    const dur    = 1800;

    function animate(now) {
      const t = Math.min(1, (now - t0) / dur);
      const ease = t < .5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3)/2;
      _camera.position.z = startZ + (endZ - startZ) * ease;
      if (_globe) _globe.rotation.y += 0.0018;
      _camera.lookAt(0, 0, 0);
      _renderer.render(_scene, _camera);
      if (t < 1) requestAnimationFrame(animate);
      else resolve();
    }
    requestAnimationFrame(animate);
  });
}

export function initLanding({ onEnter }) {
  initGlobe();

  // Language switcher on the landing.
  document.querySelectorAll('#landing-lang button').forEach(btn => {
    btn.addEventListener('click', () => {
      const lang = btn.dataset.lang;
      State.set('language', lang);
      document.querySelectorAll('#landing-lang button').forEach(b => {
        b.classList.toggle('active', b.dataset.lang === lang);
      });
      applyLandingI18n(lang);
    });
  });

  const cta = document.getElementById('landing-cta');
  cta.addEventListener('click', async () => {
    cta.disabled = true;
    const landing = document.getElementById('landing');
    landing.classList.add('fade-out');
    await zoomOutAndHide();
    landing.style.display = 'none';
    document.getElementById('app').classList.remove('hidden');
    if (onEnter) onEnter();
  });
}

function applyLandingI18n(lang) {
  const D = {
    es: {
      'landing.eyebrow':  'AGRICULTURA',
      'landing.title':    'Los Trabajadores Agrarios<br>del Mundo',
      'landing.subtitle': 'Una base de datos global sobre el trabajo agrario, las condiciones laborales y las huellas del comercio · 1961–2024',
      'landing.cta':      'Explorar',
    },
    en: {
      'landing.eyebrow':  'AGRICULTURAL',
      'landing.title':    'Workers<br>of the World',
      'landing.subtitle': 'A global database on agricultural labour, labour conditions and the footprints of trade · 1961–2024',
      'landing.cta':      'Explore',
    },
  };
  document.querySelectorAll('#landing [data-i18n]').forEach(el => {
    const txt = D[lang][el.dataset.i18n];
    if (!txt) return;
    if (/<br/i.test(txt)) el.innerHTML = txt;
    else el.textContent = txt;
  });
}
