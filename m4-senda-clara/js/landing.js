/* landing.js — Entry point: animated globe → zoom to Andalusia → launch app.
   Uses D3 orthographic projection on canvas. Loads data in parallel.
   Floating olive leaves and olive branches as ambient particles. */

const ANDALUSIA_CENTER = [-4.5, 37.5]; // [lon, lat]
const WORLD_ATLAS_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/land-110m.json';

// Andalusia bounding polygon (rough outline for highlight)
const ANDALUSIA_BBOX = {
    type: 'Feature',
    geometry: {
        type: 'Polygon',
        coordinates: [[
            [-7.5, 36.0], [-7.5, 38.8], [-1.6, 38.8], [-1.6, 36.0], [-7.5, 36.0]
        ]]
    }
};

/* ═══════════════════════════════════════════════
   Globe state
   ═══════════════════════════════════════════════ */
let _canvas, _ctx, _width, _height;
let _projection, _path;
let _land = null;
let _rotation = [0, -15];
let _rotationSpeed = 0.18;
let _animFrame = null;
let _dataReady = false;
let _globeReady = false;
let _zooming = false;

/* ═══════════════════════════════════════════════
   Artistic particles — floating olive leaves
   ═══════════════════════════════════════════════ */
let _pCanvas, _pCtx;
let _particles = [];
let _pRaf = null;
let _mouse = { x: -9999, y: -9999 };
const NUM_LEAVES = 12;
const MOUSE_R = 180;

function _initParticles() {
    _pCanvas = document.getElementById('landing-particles');
    if (!_pCanvas) return;
    _pCtx = _pCanvas.getContext('2d');
    _resizeParticles();

    for (let i = 0; i < NUM_LEAVES; i++) _particles.push(_createLeaf(true));

    document.getElementById('landing').addEventListener('mousemove', e => {
        _mouse.x = e.clientX; _mouse.y = e.clientY;
    });
    document.getElementById('landing').addEventListener('mouseleave', () => {
        _mouse.x = -9999; _mouse.y = -9999;
    });

    _pLoop();
}

function _resizeParticles() {
    if (!_pCanvas) return;
    const dpr = window.devicePixelRatio || 1;
    _pCanvas.width = _width * dpr;
    _pCanvas.height = _height * dpr;
    _pCanvas.style.width = _width + 'px';
    _pCanvas.style.height = _height + 'px';
    _pCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function _createLeaf(randomY) {
    const size = 18 + Math.random() * 22;
    return {
        x: Math.random() * (_width || 800),
        y: randomY ? Math.random() * (_height || 600) : -size * 2,
        size,
        angle: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 0.006,
        vx: (Math.random() - 0.5) * 0.15,
        vy: 0.08 + Math.random() * 0.12,
        opacity: 0.18 + Math.random() * 0.18,
        phase: Math.random() * Math.PI * 2,
        sway: 0.2 + Math.random() * 0.3,
    };
}

function _pLoop() {
    _pUpdate();
    _pDraw();
    _pRaf = requestAnimationFrame(_pLoop);
}

function _pUpdate() {
    for (const p of _particles) {
        p.x += p.vx + Math.sin(p.phase) * p.sway * 0.3;
        p.y += p.vy;
        p.angle += p.spin;
        p.phase += 0.005;

        // Mouse repulsion
        const dx = p.x - _mouse.x;
        const dy = p.y - _mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < MOUSE_R && dist > 0) {
            const force = (1 - dist / MOUSE_R) * 0.5;
            p.x += (dx / dist) * force;
            p.y += (dy / dist) * force;
            p.spin += (dx > 0 ? 0.001 : -0.001);
        }

        // Recycle off-screen
        if (p.y > _height + p.size * 3 || p.x < -p.size * 4 || p.x > _width + p.size * 4) {
            Object.assign(p, _createLeaf(false));
            p.x = Math.random() * _width;
        }
    }
}

function _pDraw() {
    _pCtx.clearRect(0, 0, _width, _height);
    for (const p of _particles) {
        _pCtx.save();
        _pCtx.globalAlpha = p.opacity;
        _pCtx.translate(p.x, p.y);
        _pCtx.rotate(p.angle);
        _drawOliveLeaf(_pCtx, p.size);
        _pCtx.restore();
    }
}

/** Draw a single olive leaf */
function _drawOliveLeaf(ctx, size) {
    const w = size * 0.35;
    const h = size;

    ctx.beginPath();
    ctx.moveTo(0, -h);
    ctx.bezierCurveTo(w * 1.2, -h * 0.5, w * 1.2, h * 0.5, 0, h);
    ctx.bezierCurveTo(-w * 1.2, h * 0.5, -w * 1.2, -h * 0.5, 0, -h);
    ctx.closePath();
    ctx.fillStyle = 'rgba(130,170,110,0.7)';
    ctx.fill();

    // Central vein
    ctx.beginPath();
    ctx.moveTo(0, -h * 0.85);
    ctx.lineTo(0, h * 0.85);
    ctx.strokeStyle = 'rgba(100,140,80,0.5)';
    ctx.lineWidth = 0.5;
    ctx.stroke();
}

function _destroyParticles() {
    if (_pRaf) cancelAnimationFrame(_pRaf);
    _particles = [];
}

/* ═══════════════════════════════════════════════
   Globe init & rendering
   ═══════════════════════════════════════════════ */

(function init() {
    _canvas = document.getElementById('landing-globe');
    if (!_canvas) return;
    _ctx = _canvas.getContext('2d');
    _resize();
    window.addEventListener('resize', _resize);

    _projection = d3.geoOrthographic()
        .translate([_width / 2, _height / 2])
        .scale(Math.min(_width, _height) * 0.25)
        .clipAngle(90);
    _path = d3.geoPath(_projection, _ctx);

    // Start particles immediately
    _initParticles();

    // Start rotation immediately (sphere + graticule only)
    _startRotation();

    // Load world data + app data in parallel
    const progressBar = document.querySelector('.landing-bar');
    let progress = 0;
    function tick(amount) {
        progress = Math.min(progress + amount, 100);
        if (progressBar) progressBar.style.width = progress + '%';
    }

    const worldPromise = fetch(WORLD_ATLAS_URL)
        .then(r => r.json())
        .then(topo => {
            _land = topojson.feature(topo, topo.objects.land);
            _globeReady = true;
            tick(30);
        })
        .catch(err => {
            console.warn('World atlas load failed, continuing without land:', err);
            _globeReady = true;
            tick(30);
        });

    // Dynamic import of DataLoader for parallel init
    const dataPromise = import('./data-loader.js')
        .then(mod => mod.default.init())
        .then(() => {
            _dataReady = true;
            tick(70);
        })
        .catch(err => {
            console.error('Data load failed:', err);
            _dataReady = true; // still allow entry
            tick(70);
        });

    Promise.all([worldPromise, dataPromise]).then(() => {
        // Zoom to Andalusia, then show CTA
        _zoomToAndalusia().then(_showCTA);
    });

    // CTA click + keyboard enter
    document.getElementById('landing-cta').addEventListener('click', _enterApp);
    document.addEventListener('keydown', e => {
        if (e.key === 'Enter' && document.getElementById('landing-cta').style.display !== 'none') {
            _enterApp();
        }
    });
})();

function _resize() {
    _width = window.innerWidth;
    _height = window.innerHeight;
    const dpr = window.devicePixelRatio || 1;
    _canvas.width = _width * dpr;
    _canvas.height = _height * dpr;
    _canvas.style.width = _width + 'px';
    _canvas.style.height = _height + 'px';
    _ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (_projection) {
        _projection.translate([_width / 2, _height / 2])
            .scale(Math.min(_width, _height) * 0.25);
    }
    _resizeParticles();
}

function _startRotation() {
    function frame() {
        if (_zooming) return; // pause during zoom transition
        _rotation[0] += _rotationSpeed;
        _projection.rotate(_rotation);
        _drawGlobe();
        _animFrame = requestAnimationFrame(frame);
    }
    _animFrame = requestAnimationFrame(frame);
}

function _drawGlobe() {
    _ctx.clearRect(0, 0, _width, _height);

    // Sphere (ocean)
    _ctx.beginPath();
    _path({ type: 'Sphere' });
    _ctx.fillStyle = 'rgba(255,255,255,0.03)';
    _ctx.fill();
    _ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    _ctx.lineWidth = 0.5;
    _ctx.stroke();

    // Graticule
    const graticule = d3.geoGraticule10();
    _ctx.beginPath();
    _path(graticule);
    _ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    _ctx.lineWidth = 0.3;
    _ctx.stroke();

    // Land masses
    if (_land) {
        _ctx.beginPath();
        _path(_land);
        _ctx.fillStyle = 'rgba(255,255,255,0.1)';
        _ctx.fill();
        _ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        _ctx.lineWidth = 0.5;
        _ctx.stroke();
    }

    // Andalusia highlight (only visible when globe is oriented towards it)
    if (_land) {
        _ctx.beginPath();
        _path(ANDALUSIA_BBOX);
        _ctx.fillStyle = 'rgba(58,158,150,0.25)';
        _ctx.fill();
        _ctx.strokeStyle = 'rgba(58,158,150,0.5)';
        _ctx.lineWidth = 1;
        _ctx.stroke();
    }
}

function _zoomToAndalusia() {
    return new Promise(resolve => {
        _zooming = true;
        if (_animFrame) cancelAnimationFrame(_animFrame);

        const startRotation = [..._rotation];
        const endRotation = [-ANDALUSIA_CENTER[0], -ANDALUSIA_CENTER[1]];
        const startScale = _projection.scale();
        const endScale = Math.min(_width, _height) * 2.2;
        const duration = 3500;
        const startTime = performance.now();

        const interpRotate = d3.interpolate(startRotation, endRotation);
        const interpScale = d3.interpolate(startScale, endScale);

        function animate(now) {
            const t = Math.min(1, (now - startTime) / duration);
            // Ease: cubic in-out
            const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

            const r = interpRotate(ease);
            const s = interpScale(ease);
            _projection.rotate(r).scale(s);
            _rotation = r;
            _drawGlobe();

            if (t < 1) {
                requestAnimationFrame(animate);
            } else {
                _zooming = false;
                resolve();
            }
        }
        requestAnimationFrame(animate);
    });
}

function _showCTA() {
    const cta = document.getElementById('landing-cta');
    const progress = document.getElementById('landing-progress');
    if (progress) progress.style.display = 'none';
    if (cta) {
        cta.style.display = '';
        // Force reflow to trigger CSS animation
        cta.offsetHeight;
    }
}

function _enterApp() {
    const landing = document.getElementById('landing');
    if (landing) landing.classList.add('hidden');

    // Clean up
    if (_animFrame) cancelAnimationFrame(_animFrame);
    _destroyParticles();
    window.removeEventListener('resize', _resize);

    // Dynamically import and run the app
    import('./app.js').then(() => {
        // app.js IIFE runs on import; after a short delay, remove landing DOM
        setTimeout(() => {
            if (landing) landing.remove();
        }, 800);
    }).catch(err => {
        console.error('Failed to load app:', err);
        if (landing) {
            landing.classList.remove('hidden');
            landing.style.opacity = '1';
            landing.innerHTML = `<div style="color:#fff;text-align:center;padding:40px">
                <h2>Error al cargar la aplicación</h2>
                <p>${err.message}</p>
            </div>`;
        }
    });
}
