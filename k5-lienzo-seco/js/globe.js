/* ---- CAHE Globe Animation with Climate Ring ---- */
(function () {
  'use strict';

  var canvas = document.getElementById('globe-canvas');
  if (!canvas) return;

  var dpr = window.devicePixelRatio || 1;
  var container = canvas.parentElement;

  function resize() {
    var vhSize = window.innerHeight * 0.38;
    var size = Math.min(container.offsetWidth, Math.max(210, Math.min(vhSize, 500)));
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = size + 'px';
    canvas.style.height = size + 'px';
  }
  resize();

  var ctx = canvas.getContext('2d');
  var w, h;

  function updateDimensions() {
    w = canvas.width / dpr;
    h = canvas.height / dpr;
  }
  updateDimensions();

  // Globe colors
  var OCEAN = 'rgba(20, 30, 42, 0.4)';
  var GRID = 'rgba(126, 200, 184, 0.07)';
  var BORDER = 'rgba(126, 200, 184, 0.2)';
  var LAND = 'rgba(255, 255, 255, 0.06)';
  var LAND_STROKE = 'rgba(255, 255, 255, 0.12)';
  var SPAIN_FILL = 'rgba(126, 200, 184, 0.55)';
  var SPAIN_STROKE = 'rgba(126, 200, 184, 0.95)';

  // Spain center (negated for d3 rotation)
  var SPAIN_LON = 3.7;
  var SPAIN_LAT = -40.4;

  var projection = d3.geoOrthographic().clipAngle(90);
  var path = d3.geoPath(projection, ctx);
  var graticule = d3.geoGraticule10();

  // Globe state
  var worldFeatures = null;
  var spainFeature = null;
  var angle = 40;
  var latAngle = -20;
  var phase = 'rotating';
  var phaseStart = 0;
  var slowStart = 0;
  var startTime = Date.now();

  var ROTATE_DURATION = 2500;
  var SETTLE_DURATION = 2000;

  // --- Climate warming ring ---
  // 5-year average global temperature anomalies (C vs 1961-1990 baseline)
  // Approximate values from HadCRUT5 / NASA GISS
  var CLIMATE_DATA = [
    -0.33, -0.28, -0.27, -0.21, -0.20,  // 1850-74
    -0.19, -0.23, -0.21, -0.26, -0.16,  // 1875-99
    -0.22, -0.40, -0.39, -0.30, -0.22,  // 1900-24
    -0.16, -0.10, -0.07,  0.02,  0.08,  // 1925-49
    -0.09,  0.00,  0.02, -0.02,  0.00,  // 1950-74
     0.03,  0.14,  0.22,  0.34,  0.39,  // 1975-99
     0.52,  0.56,  0.65,  0.90,  1.15   // 2000-24
  ];

  var climateSweep = 0; // sweep angle from top (0 → PI = full circle)
  var animTime = 0;     // continuous animation time (seconds) after stripes complete

  function tempColor(val, alpha) {
    var t = (val + 0.5) / 1.8;
    t = Math.max(0, Math.min(1, t));
    var r, g, b;
    if (t < 0.5) {
      var s = t * 2;
      r = Math.round(20 + s * 235);
      g = Math.round(50 + s * 205);
      b = Math.round(180 + s * 75);
    } else {
      var s = (t - 0.5) * 2;
      r = 255;
      g = Math.round(255 - s * 220);
      b = Math.round(255 - s * 240);
    }
    return 'rgba(' + r + ',' + g + ',' + b + ',' + (alpha !== undefined ? alpha : 0.8) + ')';
  }

  // Noise function — integer frequencies guarantee seamless wrapping at 2PI
  function stripeNoise(a, seed, ta) {
    return Math.sin(a * 4 + seed) * 4.5
         + Math.sin(a * 11 - seed * 1.7 + ta * 0.22) * 3.0
         + Math.cos(a * 2 + seed * 0.4 - ta * 0.15) * 2.8
         + Math.sin(a * 19 + seed * 3 + ta * 0.09) * 1.4
         + Math.cos(a * 7 - seed * 2.3 + ta * 0.28) * 2.2
         + Math.sin(a * 31 + seed * 0.7 + ta * 0.06) * 0.7;
  }

  // Draw a single wavy, organic stripe arc
  function drawWavyStripe(cx, cy, baseR, lw, color, sweep, time) {
    if (sweep < 0.03) return;

    var clampedSweep = Math.min(sweep, Math.PI);
    var isFullCircle = clampedSweep >= Math.PI - 0.05;
    // When full circle, OVERLAP by 0.15 rad so ends cross — eliminates any gap
    var drawSweep = isFullCircle ? Math.PI + 0.15 : clampedSweep;
    var steps = Math.max(100, Math.floor(drawSweep * 50));
    var seed = baseR * 0.13;
    var ta = time || 0;

    ctx.beginPath();
    for (var j = 0; j <= steps; j++) {
      var t = j / steps;
      var a = -Math.PI / 2 - drawSweep + t * drawSweep * 2;

      var n = stripeNoise(a, seed, ta);
      var r = baseR + n;
      var x = cx + Math.cos(a) * r;
      var y = cy + Math.sin(a) * r;

      if (j === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }

    ctx.strokeStyle = color;
    ctx.lineWidth = lw;
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  function drawClimateRing() {
    if (climateSweep <= 0) return;

    // El anillo crece junto al globo (usa zoomScale en vivo)
    var globeScale = Math.min(w, h) * zoomScale;
    var cx = w / 2;
    var cy = h / 2;
    var gap = globeScale * 0.03;
    var innerR = globeScale + gap;
    var outerMax = Math.min(w, h) / 2 - 4;
    var available = outerMax - innerR;
    if (available < 6) return;

    var spacing = available / CLIMATE_DATA.length;
    var lw = Math.max(spacing * 0.8, 0.5);

    for (var i = 0; i < CLIMATE_DATA.length; i++) {
      var delay = i * 0.05;
      var stripeSweep = climateSweep - delay;
      if (stripeSweep < 0.03) continue;

      // Gentle radial breathing after stripes complete
      var breathe = animTime > 0 ? Math.sin(animTime * 0.4 + i * 0.35) * 0.7 : 0;
      var r = innerR + i * spacing + spacing * 0.5 + breathe;

      // Intensity pulsing — each stripe has its own phase for a "wave" effect
      var alphaBase = 0.8;
      var valOffset = 0;
      if (animTime > 0) {
        // Alpha wave across stripes: creates a shimmer/glow that moves through the ring
        var wave = Math.sin(animTime * 0.6 - i * 0.3) * 0.15
                 + Math.sin(animTime * 1.0 + i * 0.5) * 0.08;
        alphaBase = 0.8 + wave;
        // Color temperature micro-shift
        valOffset = Math.sin(animTime * 0.5 + i * 0.4) * 0.08
                  + Math.sin(animTime * 0.9 - i * 0.55) * 0.05;
      }
      var pulsedVal = CLIMATE_DATA[i] + valOffset;

      // Glow alpha also pulses
      var glowAlpha = 0.2;
      if (animTime > 0) {
        glowAlpha += Math.sin(animTime * 0.45 + i * 0.3) * 0.08;
      }

      drawWavyStripe(cx, cy, r, lw + 1.5, tempColor(pulsedVal, glowAlpha), stripeSweep, animTime);
      drawWavyStripe(cx, cy, r, lw, tempColor(pulsedVal, alphaBase), stripeSweep, animTime);
    }
  }

  // Load world data
  var WORLD_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';
  var TOPOJSON_URL = 'https://cdn.jsdelivr.net/npm/topojson-client@3/dist/topojson-client.min.js';

  function loadScript(url, cb) {
    var s = document.createElement('script');
    s.src = url;
    s.onload = cb;
    document.head.appendChild(s);
  }

  loadScript(TOPOJSON_URL, function () {
    fetch(WORLD_URL)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var countries = topojson.feature(data, data.objects.countries);
        worldFeatures = countries.features;
        spainFeature = worldFeatures.find(function (f) { return f.id === '724'; });
        startTime = Date.now();
        animate();
      })
      .catch(function () {
        animate();
      });
  });

  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  // Zoom progresivo hacia España. Mantener el radio por debajo de medio canvas
  // evita que la esfera se recorte como un rectangulo al asentarse.
  var zoomScale = 0.36;
  function draw() {
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    if (phase === 'slow' && zoomScale < 0.43) zoomScale += 0.0009;
    var scale = Math.min(w, h) * zoomScale;
    projection
      .scale(scale)
      .translate([w / 2, h / 2]);

    // Climate ring (drawn first, behind globe)
    drawClimateRing();

    // Sphere
    ctx.beginPath();
    path({ type: 'Sphere' });
    ctx.fillStyle = OCEAN;
    ctx.fill();
    ctx.strokeStyle = BORDER;
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // Graticule
    ctx.beginPath();
    path(graticule);
    ctx.strokeStyle = GRID;
    ctx.lineWidth = 0.4;
    ctx.stroke();

    // Countries
    if (worldFeatures) {
      worldFeatures.forEach(function (f) {
        if (f === spainFeature) return;
        ctx.beginPath();
        path(f);
        ctx.fillStyle = LAND;
        ctx.fill();
        ctx.strokeStyle = LAND_STROKE;
        ctx.lineWidth = 0.3;
        ctx.stroke();
      });

      if (spainFeature) {
        ctx.beginPath();
        path(spainFeature);
        ctx.fillStyle = SPAIN_FILL;
        ctx.fill();
        ctx.strokeStyle = SPAIN_STROKE;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  function animate() {
    var elapsed = Date.now() - startTime;

    if (phase === 'rotating') {
      angle += 0.25;
      latAngle += (SPAIN_LAT - latAngle) * 0.01;
      projection.rotate([angle, latAngle, 0]);

      if (elapsed > ROTATE_DURATION) {
        phase = 'settling';
        phaseStart = Date.now();
      }
    } else if (phase === 'settling') {
      var t = Math.min((Date.now() - phaseStart) / SETTLE_DURATION, 1);
      var ease = easeInOutCubic(t);

      var currentRot = projection.rotate();
      var newLon = currentRot[0] + (SPAIN_LON - currentRot[0]) * ease * 0.06;
      var newLat = currentRot[1] + (SPAIN_LAT - currentRot[1]) * ease * 0.06;

      var speed = 0.25 * (1 - ease) + 0.03 * ease;
      newLon += speed;

      projection.rotate([newLon, newLat, 0]);

      if (t >= 1) {
        phase = 'slow';
        slowStart = Date.now();
      }
    } else {
      // Slow phase: gentle wobble keeping Spain centered
      var slowElapsed = (Date.now() - slowStart) * 0.001;
      var currentRot2 = projection.rotate();
      var pull = (SPAIN_LON - currentRot2[0]) * 0.003;

      // Gentle rocking/tilting motion — Spain stays centered
      // Multi-layer wobble for more organic, living feel
      var roll = Math.sin(slowElapsed * 0.3) * 2.5
               + Math.sin(slowElapsed * 0.17) * 1.5;
      var latWobble = Math.sin(slowElapsed * 0.13) * 0.8
                    + Math.cos(slowElapsed * 0.21) * 0.5;

      projection.rotate([
        currentRot2[0] + 0.03 + pull,
        currentRot2[1] + (SPAIN_LAT - currentRot2[1]) * 0.015 + latWobble * 0.02,
        roll
      ]);

      // Climate stripes sweep — faster reveal (~3.5 seconds)
      var maxSweep = Math.PI + CLIMATE_DATA.length * 0.05;
      if (climateSweep < maxSweep) {
        climateSweep += 0.035;
      }

      // Start intensity animation as soon as stripes are complete
      if (climateSweep >= maxSweep) {
        animTime = slowElapsed;
      }
    }

    draw();
    requestAnimationFrame(animate);
  }

  // Handle resize
  window.addEventListener('resize', function () {
    resize();
    updateDimensions();
  });

  // Text animation triggers
  setTimeout(function () {
    var title = document.querySelector('.hero-globe-title');
    var subtitle = document.querySelector('.hero-globe-subtitle');
    var cards = document.querySelectorAll('.hero-nav-card');

    if (title) title.classList.add('visible');
    setTimeout(function () {
      if (subtitle) subtitle.classList.add('visible');
    }, 400);
    setTimeout(function () {
      cards.forEach(function (card, i) {
        setTimeout(function () { card.classList.add('visible'); }, i * 120);
      });
    }, 800);
  }, 300);
})();
