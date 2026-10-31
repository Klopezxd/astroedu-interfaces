/**
 * ============================================================================
 * ASTROEDU - MOTOR MULTIMEDIA INTERACTIVO (JAVASCRIPT ES6)
 * Desarrollado para la Cátedra de Interfaces y Multimedia (ESPE)
 * Estudiante: Klever Josué López Quilligana
 * NRC: 36733 | Docente: Ing. Germán Ñacato Caiza
 * ============================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  // ==========================================================================
  // 1. ESTADO GLOBAL DE LA APLICACIÓN
  // ==========================================================================
  const state = {
    currentModule: 'solar',
    nightMode: false,
    audioEnabled: true,
    solarPaused: false,
    solarSpeed: 1,
    selectedPlanet: null,
    selectedConstellation: 'orion',
    moonDay: 0,
    cameraIso: 1600,
    cameraExp: 15,
    cameraFocus: 100,
    bortleClass: 4,
    interactionCount: 0,
    sessionStartTime: Date.now()
  };

  // ==========================================================================
  // 2. SISTEMA DE AUDIO MULTIMEDIA (WEB AUDIO API - CERO DEPENDENCIAS EXTERNAS)
  // ==========================================================================
  let audioCtx = null;

  function initAudio() {
    if (!audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioContext();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  function playTone(freq, type = 'sine', duration = 0.15, vol = 0.1) {
    if (!state.audioEnabled) return;
    try {
      initAudio();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gain.gain.setValueAtTime(vol, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) {
      // Audio context fallbacks
    }
  }

  function playChime() {
    if (!state.audioEnabled) return;
    [523.25, 659.25, 783.99, 1046.50].forEach((f, i) => {
      setTimeout(() => playTone(f, 'sine', 0.25, 0.08), i * 60);
    });
  }

  function playMeteorSwoosh() {
    if (!state.audioEnabled) return;
    try {
      initAudio();
      const bufferSize = audioCtx.sampleRate * 0.4;
      const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
      }
      const noise = audioCtx.createBufferSource();
      noise.buffer = buffer;
      const filter = audioCtx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(800, audioCtx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(150, audioCtx.currentTime + 0.4);
      const gain = audioCtx.createGain();
      gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(audioCtx.destination);
      noise.start();
    } catch (e) {}
  }

  // ==========================================================================
  // 3. CONMUTACIÓN DE MÓDULOS Y RETÍCULA
  // ==========================================================================
  const menuItems = document.querySelectorAll('.text-menu-list .menu-item');
  const iconBtns = document.querySelectorAll('.icon-toolbar .icon-btn');
  const modulePanels = document.querySelectorAll('.module-panel');
  const breadcrumbCurrent = document.getElementById('breadcrumbCurrent');

  const moduleTitles = {
    solar: '1. Sistema Solar y Planetas',
    constellations: '2. Constelaciones y Reconocimiento',
    moon: '3. La Luna, sus Fases y Eclipses',
    meteors: '4. Lluvias de Estrellas y Cometas',
    galaxies: '5. Galaxias y Nebulosas (Espacio Profundo)',
    astrophoto: '6. Astrofotografía Móvil y Observación'
  };

  function switchModule(modId) {
    if (!moduleTitles[modId]) return;
    state.currentModule = modId;
    state.interactionCount++;
    updateAffectiveMonitor();
    playTone(440, 'triangle', 0.08, 0.05);

    menuItems.forEach(item => {
      item.classList.toggle('active', item.dataset.module === modId);
    });

    iconBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.module === modId);
    });

    modulePanels.forEach(panel => {
      panel.classList.toggle('active', panel.id === `panel-${modId}`);
    });

    breadcrumbCurrent.textContent = moduleTitles[modId];
    updateZone7Controls(modId);
    loadModuleQuiz(modId);

    // Redimensionar lienzos al cambiar de pestaña
    if (modId === 'solar') initSolarCanvas();
    if (modId === 'constellations') initSkyCanvas();
    if (modId === 'meteors') initMeteorCanvas();
    if (modId === 'astrophoto') renderViewfinder();
  }

  menuItems.forEach(item => {
    item.addEventListener('click', () => switchModule(item.dataset.module));
    item.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') switchModule(item.dataset.module); });
  });

  iconBtns.forEach(btn => {
    btn.addEventListener('click', () => switchModule(btn.dataset.module));
  });

  // Atajos de teclado universales (Alt + 1..6)
  window.addEventListener('keydown', (e) => {
    if (e.altKey) {
      if (e.key === '1') switchModule('solar');
      if (e.key === '2') switchModule('constellations');
      if (e.key === '3') switchModule('moon');
      if (e.key === '4') switchModule('meteors');
      if (e.key === '5') switchModule('galaxies');
      if (e.key === '6') switchModule('astrophoto');
      if (e.key.toLowerCase() === 'n') toggleNightMode();
      if (e.key.toLowerCase() === 'm') toggleAudio();
    }
  });

  // ==========================================================================
  // 4. INTERFAZ AFECTIVA: MODO NOCTURNO ESCOTÓPICO (LUZ ROJA)
  // ==========================================================================
  const toggleNightBtn = document.getElementById('toggleNightMode');
  const toggleAudioBtn = document.getElementById('toggleAudio');
  const audioIcon = document.getElementById('audioIcon');
  const bannerEvent = document.getElementById('bannerEvent');

  function toggleNightMode() {
    state.nightMode = !state.nightMode;
    document.body.classList.toggle('affective-night-mode', state.nightMode);
    playTone(state.nightMode ? 320 : 640, 'sine', 0.2, 0.1);

    if (state.nightMode) {
      toggleNightBtn.innerHTML = '<span class="btn-icon">⚪</span><span class="btn-label">Modo Normal</span>';
      bannerEvent.textContent = '🌙 Modo Afectivo Activo: Luz roja activa para proteger la rodopsina ocular.';
    } else {
      toggleNightBtn.innerHTML = '<span class="btn-icon">🔴</span><span class="btn-label">Modo Rojo Nocturno</span>';
      bannerEvent.textContent = 'Cielo Nocturno Despejado • Fase: Cuarto Creciente (42%)';
    }

    // Re-renderizar lienzos con la nueva paleta cromática
    renderSolarSystem();
    drawSky();
    renderViewfinder();
  }

  function toggleAudio() {
    state.audioEnabled = !state.audioEnabled;
    audioIcon.textContent = state.audioEnabled ? '🔊' : '🔇';
    if (state.audioEnabled) playTone(587.33, 'sine', 0.15, 0.1);
  }

  toggleNightBtn.addEventListener('click', toggleNightMode);
  toggleAudioBtn.addEventListener('click', toggleAudio);

  // ==========================================================================
  // 5. MÓDULO 1: SISTEMA SOLAR INTERACTIVO
  // ==========================================================================
  const solarCanvas = document.getElementById('solarCanvas');
  const sCtx = solarCanvas.getContext('2d');
  const planetCardsGrid = document.getElementById('planetCardsGrid');
  const btnPlaySolar = document.getElementById('btnPlaySolar');
  const btnSpeedSolar = document.getElementById('btnSpeedSolar');
  const btnResetSolar = document.getElementById('btnResetSolar');

  const planetsData = [
    { id: 'mercury', name: 'Mercurio', type: 'Rocoso Interior', r: 4, dist: 40, speed: 0.040, color: '#94a3b8', desc: 'El más cercano al Sol, sin atmósfera significativa y temperaturas extremas (-180°C a 430°C).' },
    { id: 'venus', name: 'Venus', type: 'Rocoso Interior', r: 6, dist: 65, speed: 0.028, color: '#fde047', desc: 'Efecto invernadero desbocado, atmósfera densa de CO2 y el más caliente del sistema solar.' },
    { id: 'earth', name: 'Tierra', type: 'Rocoso Interior', r: 7, dist: 95, speed: 0.020, color: '#38bdf8', desc: 'Nuestro hogar. Único planeta conocido con agua líquida superficial y vida biológica activa.' },
    { id: 'mars', name: 'Marte', type: 'Rocoso Interior', r: 5, dist: 125, speed: 0.015, color: '#f87171', desc: 'El planeta rojo. Rico en óxido de hierro, posee el volcán más alto del sistema (Monte Olimpo).' },
    { id: 'jupiter', name: 'Júpiter', type: 'Gigante Gaseoso', r: 15, dist: 175, speed: 0.009, color: '#fbbf24', desc: 'El coloso del sistema solar con más de 90 lunas y su icónica Gran Mancha Roja.' },
    { id: 'saturn', name: 'Saturno', type: 'Gigante Gaseoso', r: 12, dist: 230, speed: 0.006, color: '#fcd34d', hasRings: true, desc: 'Famoso por su espectacular sistema de anillos de hielo y roca de miles de km de ancho.' },
    { id: 'uranus', name: 'Urano', type: 'Gigante Helado', r: 9, dist: 280, speed: 0.004, color: '#67e8f9', desc: 'Gira inclinado casi 98° sobre su plano orbital; atmósfera rica en metano y vientos extremos.' },
    { id: 'neptune', name: 'Neptuno', type: 'Gigante Helado', r: 9, dist: 330, speed: 0.003, color: '#3b82f6', desc: 'El más lejano. Vientos supersónicos que superan los 2.000 km/h y un azul profundo característico.' }
  ];

  let solarAngles = planetsData.map(() => Math.random() * Math.PI * 2);

  function initSolarCanvas() {
    solarCanvas.width = solarCanvas.parentElement.clientWidth || 760;
    solarCanvas.height = 420;
  }

  function renderSolarSystem() {
    const w = solarCanvas.width;
    const h = solarCanvas.height;
    const cx = w / 2;
    const cy = h / 2;

    sCtx.fillStyle = state.nightMode ? '#0a0101' : '#030611';
    sCtx.fillRect(0, 0, w, h);

    // Fondo estelar tenue
    sCtx.fillStyle = state.nightMode ? '#450a0a' : '#ffffff';
    for (let i = 0; i < 60; i++) {
      const sx = (Math.sin(i * 99) * 10000) % w;
      const sy = (Math.cos(i * 33) * 10000) % h;
      sCtx.fillRect(Math.abs(sx), Math.abs(sy), 1, 1);
    }

    // Dibujar el Sol
    const sunGrad = sCtx.createRadialGradient(cx, cy, 4, cx, cy, 26);
    if (state.nightMode) {
      sunGrad.addColorStop(0, '#ff9999');
      sunGrad.addColorStop(0.5, '#dc2626');
      sunGrad.addColorStop(1, 'transparent');
    } else {
      sunGrad.addColorStop(0, '#fffbeb');
      sunGrad.addColorStop(0.3, '#f59e0b');
      sunGrad.addColorStop(1, 'transparent');
    }
    sCtx.beginPath();
    sCtx.arc(cx, cy, 26, 0, Math.PI * 2);
    sCtx.fillStyle = sunGrad;
    sCtx.fill();

    // Dibujar Órbitas y Planetas
    planetsData.forEach((p, idx) => {
      // Órbita elíptica suave
      sCtx.beginPath();
      sCtx.ellipse(cx, cy, p.dist, p.dist * 0.75, 0, 0, Math.PI * 2);
      sCtx.strokeStyle = state.nightMode ? 'rgba(239, 68, 68, 0.15)' : 'rgba(56, 189, 248, 0.12)';
      sCtx.lineWidth = 1;
      sCtx.stroke();

      // Posición del planeta
      const px = cx + Math.cos(solarAngles[idx]) * p.dist;
      const py = cy + Math.sin(solarAngles[idx]) * (p.dist * 0.75);

      // Anillos de Saturno
      if (p.hasRings) {
        sCtx.beginPath();
        sCtx.ellipse(px, py, p.r * 1.9, p.r * 0.7, Math.PI / 6, 0, Math.PI * 2);
        sCtx.strokeStyle = state.nightMode ? '#7f1d1d' : 'rgba(252, 211, 77, 0.6)';
        sCtx.lineWidth = 2.5;
        sCtx.stroke();
      }

      // Cuerpo del planeta
      sCtx.beginPath();
      sCtx.arc(px, py, p.r, 0, Math.PI * 2);
      sCtx.fillStyle = state.nightMode ? '#b91c1c' : p.color;
      sCtx.fill();

      // Resalte de selección
      if (state.selectedPlanet === p.id) {
        sCtx.beginPath();
        sCtx.arc(px, py, p.r + 5, 0, Math.PI * 2);
        sCtx.strokeStyle = state.nightMode ? '#ef4444' : '#38bdf8';
        sCtx.lineWidth = 2;
        sCtx.stroke();
      }
    });

    if (!state.solarPaused) {
      planetsData.forEach((p, idx) => {
        solarAngles[idx] += p.speed * state.solarSpeed;
      });
    }

    if (state.currentModule === 'solar') {
      requestAnimationFrame(renderSolarSystem);
    }
  }

  function populatePlanetCards() {
    planetCardsGrid.innerHTML = '';
    planetsData.forEach(p => {
      const card = document.createElement('div');
      card.className = `planet-card ${state.selectedPlanet === p.id ? 'active' : ''}`;
      card.innerHTML = `
        <div class="planet-card-header">
          <span class="planet-name">${p.name}</span>
          <span class="planet-type">${p.type}</span>
        </div>
        <p class="planet-meta">${p.desc}</p>
      `;
      card.addEventListener('click', () => {
        state.selectedPlanet = p.id;
        populatePlanetCards();
        playTone(520, 'sine', 0.12, 0.08);
        document.getElementById('zone7').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
      planetCardsGrid.appendChild(card);
    });
  }

  btnPlaySolar.addEventListener('click', () => {
    state.solarPaused = !state.solarPaused;
    btnPlaySolar.textContent = state.solarPaused ? '▶ Reanudar Órbitas' : '⏸ Pausar Órbitas';
    playTone(400, 'sine', 0.1, 0.05);
  });

  btnSpeedSolar.addEventListener('click', () => {
    state.solarSpeed = state.solarSpeed === 1 ? 2 : state.solarSpeed === 2 ? 4 : 1;
    btnSpeedSolar.textContent = `⚡ Velocidad: ${state.solarSpeed}x`;
    playTone(600, 'sine', 0.1, 0.05);
  });

  btnResetSolar.addEventListener('click', () => {
    state.selectedPlanet = null;
    populatePlanetCards();
    playTone(350, 'sine', 0.1, 0.05);
  });

  // ==========================================================================
  // 6. MÓDULO 2: CONSTELACIONES Y CÚPULA CELESTE
  // ==========================================================================
  const skyCanvas = document.getElementById('skyCanvas');
  const skCtx = skyCanvas.getContext('2d');
  const chkLines = document.getElementById('chkLines');
  const chkNames = document.getElementById('chkNames');
  const chkGrid = document.getElementById('chkGrid');
  const constellationList = document.getElementById('constellationList');
  const constellationInfo = document.getElementById('constellationInfo');

  const constellationsData = {
    orion: {
      name: 'Orión (El Cazador)',
      stars: [
        { name: 'Betelgeuse', x: 260, y: 140, mag: 0.5, color: '#f97316' },
        { name: 'Bellatrix', x: 380, y: 155, mag: 1.6, color: '#38bdf8' },
        { name: 'Alnitak', x: 295, y: 220, mag: 1.7, color: '#93c5fd' },
        { name: 'Alnilam', x: 320, y: 225, mag: 1.6, color: '#93c5fd' },
        { name: 'Mintaka', x: 345, y: 230, mag: 2.2, color: '#93c5fd' },
        { name: 'Saiph', x: 275, y: 310, mag: 2.0, color: '#38bdf8' },
        { name: 'Rigel', x: 395, y: 295, mag: 0.1, color: '#60a5fa' }
      ],
      lines: [[0, 1], [0, 2], [1, 4], [2, 3], [3, 4], [2, 5], [4, 6]],
      info: 'Orión es la constelación más prominente del ecuador celeste. Betelgeuse (supergigante roja) y Rigel (supergigante azul) forman sus vértices opuestos, con las tres estrellas del "Cinturón de Orión" como guía universal.'
    },
    ursaMajor: {
      name: 'Osa Mayor (El Carro)',
      stars: [
        { name: 'Dubhe', x: 220, y: 160, mag: 1.8, color: '#fde047' },
        { name: 'Merak', x: 230, y: 230, mag: 2.3, color: '#93c5fd' },
        { name: 'Phecda', x: 320, y: 220, mag: 2.4, color: '#93c5fd' },
        { name: 'Megrez', x: 310, y: 170, mag: 3.3, color: '#93c5fd' },
        { name: 'Alioth', x: 380, y: 150, mag: 1.7, color: '#93c5fd' },
        { name: 'Mizar', x: 440, y: 130, mag: 2.2, color: '#93c5fd' },
        { name: 'Alkaid', x: 500, y: 140, mag: 1.8, color: '#60a5fa' }
      ],
      lines: [[0, 1], [1, 2], [2, 3], [3, 0], [3, 4], [4, 5], [5, 6]],
      info: 'El asterismo del Carro permite trazar una línea recta desde Merak hacia Dubhe y prolongarla cinco veces para localizar con precisión matemática a la Estrella Polar (Polaris).'
    },
    crux: {
      name: 'Cruz del Sur (Crux)',
      stars: [
        { name: 'Acrux', x: 350, y: 300, mag: 0.7, color: '#60a5fa' },
        { name: 'Gacrux', x: 350, y: 160, mag: 1.6, color: '#f87171' },
        { name: 'Mimosa', x: 300, y: 230, mag: 1.2, color: '#93c5fd' },
        { name: 'Imai', x: 395, y: 220, mag: 2.7, color: '#93c5fd' },
        { name: 'Ginan', x: 375, y: 260, mag: 3.6, color: '#cbd5e1' }
      ],
      lines: [[0, 1], [2, 3]],
      info: 'La joya del hemisferio sur. Sirve como brújula natural para marinos y exploradores al prolongar 4.5 veces su brazo mayor para ubicar el Polo Sur Celeste.'
    }
  };

  let backgroundStars = [];
  function generateBackgroundStars() {
    backgroundStars = [];
    for (let i = 0; i < 160; i++) {
      backgroundStars.push({
        x: Math.random() * 760,
        y: Math.random() * 420,
        r: Math.random() * 1.5 + 0.5,
        alpha: Math.random() * 0.7 + 0.3
      });
    }
  }

  function initSkyCanvas() {
    skyCanvas.width = skyCanvas.parentElement.clientWidth || 760;
    skyCanvas.height = 420;
    generateBackgroundStars();
    drawSky();
  }

  function drawSky() {
    const w = skyCanvas.width;
    const h = skyCanvas.height;

    skCtx.fillStyle = state.nightMode ? '#0a0101' : '#040714';
    skCtx.fillRect(0, 0, w, h);

    // Rejilla de coordenadas celestes
    if (chkGrid.checked) {
      skCtx.strokeStyle = state.nightMode ? 'rgba(239, 68, 68, 0.1)' : 'rgba(56, 189, 248, 0.08)';
      skCtx.lineWidth = 1;
      for (let x = 0; x < w; x += 60) {
        skCtx.beginPath(); skCtx.moveTo(x, 0); skCtx.lineTo(x, h); skCtx.stroke();
      }
      for (let y = 0; y < h; y += 60) {
        skCtx.beginPath(); skCtx.moveTo(0, y); skCtx.lineTo(w, y); skCtx.stroke();
      }
    }

    // Estrellas de fondo
    backgroundStars.forEach(s => {
      skCtx.beginPath();
      skCtx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      skCtx.fillStyle = state.nightMode ? `rgba(239, 68, 68, ${s.alpha})` : `rgba(255, 255, 255, ${s.alpha})`;
      skCtx.fill();
    });

    const cData = constellationsData[state.selectedConstellation];
    if (cData) {
      // Líneas
      if (chkLines.checked) {
        skCtx.strokeStyle = state.nightMode ? '#ef4444' : 'rgba(56, 189, 248, 0.6)';
        skCtx.lineWidth = 1.8;
        cData.lines.forEach(([i1, i2]) => {
          skCtx.beginPath();
          skCtx.moveTo(cData.stars[i1].x, cData.stars[i1].y);
          skCtx.lineTo(cData.stars[i2].x, cData.stars[i2].y);
          skCtx.stroke();
        });
      }

      // Estrellas principales
      cData.stars.forEach(st => {
        skCtx.beginPath();
        const starRad = Math.max(3.5, 6 - st.mag * 0.8);
        skCtx.arc(st.x, st.y, starRad, 0, Math.PI * 2);
        skCtx.fillStyle = state.nightMode ? '#fca5a5' : st.color;
        skCtx.shadowBlur = 10;
        skCtx.shadowColor = state.nightMode ? '#ef4444' : st.color;
        skCtx.fill();
        skCtx.shadowBlur = 0;

        // Nombres
        if (chkNames.checked) {
          skCtx.fillStyle = state.nightMode ? '#fca5a5' : '#e2e8f0';
          skCtx.font = '11px JetBrains Mono, monospace';
          skCtx.fillText(st.name, st.x + 8, st.y + 4);
        }
      });
    }
  }

  function populateConstellationUI() {
    constellationList.innerHTML = '';
    Object.keys(constellationsData).forEach(key => {
      const c = constellationsData[key];
      const btn = document.createElement('button');
      btn.className = `btn-constellation ${state.selectedConstellation === key ? 'active' : ''}`;
      btn.textContent = c.name;
      btn.addEventListener('click', () => {
        state.selectedConstellation = key;
        populateConstellationUI();
        drawSky();
        playTone(600, 'sine', 0.15, 0.08);
      });
      constellationList.appendChild(btn);
    });

    const curr = constellationsData[state.selectedConstellation];
    constellationInfo.innerHTML = `
      <strong>${curr.name}:</strong> ${curr.info}
    `;
  }

  [chkLines, chkNames, chkGrid].forEach(el => el.addEventListener('change', drawSky));

  // ==========================================================================
  // 7. MÓDULO 3: LA LUNA Y SUS FASES INTERACTIVAS
  // ==========================================================================
  const moonSlider = document.getElementById('moonSlider');
  const moonShadow = document.getElementById('moonShadow');
  const phaseName = document.getElementById('phaseName');
  const phaseDay = document.getElementById('phaseDay');
  const phaseIllum = document.getElementById('phaseIllum');
  const btnEclipseSolar = document.getElementById('btnEclipseSolar');
  const btnEclipseLunar = document.getElementById('btnEclipseLunar');
  const eclipseStatus = document.getElementById('eclipseStatus');
  const phaseButtons = document.querySelectorAll('.phase-buttons-row .btn-tag');

  function updateMoonPhase(day) {
    state.moonDay = parseFloat(day);
    moonSlider.value = state.moonDay;
    const progress = state.moonDay / 29.53; // 0 a 1
    const angle = progress * Math.PI * 2;
    const illum = Math.round(((1 - Math.cos(angle)) / 2) * 100);

    phaseDay.textContent = `Día ${state.moonDay.toFixed(1)} de 29.5 días sinódicos`;
    phaseIllum.textContent = `Iluminación de disco: ${illum}%`;

    let name = '';
    if (state.moonDay < 1.5 || state.moonDay > 28.0) name = 'Luna Nueva (Novilunio)';
    else if (state.moonDay < 6.5) name = 'Luna Creciente Cóncava';
    else if (state.moonDay < 8.5) name = 'Cuarto Creciente';
    else if (state.moonDay < 13.5) name = 'Luna Gibosa Creciente';
    else if (state.moonDay < 16.0) name = 'Luna Llena (Plenilunio)';
    else if (state.moonDay < 21.0) name = 'Luna Gibosa Menguante';
    else if (state.moonDay < 23.5) name = 'Cuarto Menguante';
    else name = 'Luna Menguante Cóncava';

    phaseName.textContent = name;

    // Renderizado visual de la sombra
    const offsetPercent = (Math.cos(angle) * 50) + 50; // 0 a 100
    if (progress <= 0.5) {
      moonShadow.style.background = `linear-gradient(90deg, rgba(7,11,25,0.95) ${offsetPercent}%, transparent ${offsetPercent}%)`;
    } else {
      moonShadow.style.background = `linear-gradient(90deg, transparent ${100 - offsetPercent}%, rgba(7,11,25,0.95) ${100 - offsetPercent}%)`;
    }
  }

  moonSlider.addEventListener('input', (e) => {
    updateMoonPhase(e.target.value);
    playTone(200 + parseFloat(e.target.value) * 15, 'sine', 0.05, 0.02);
  });

  phaseButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const d = parseFloat(btn.dataset.day);
      updateMoonPhase(d);
      playTone(550, 'sine', 0.1, 0.06);
    });
  });

  btnEclipseSolar.addEventListener('click', () => {
    updateMoonPhase(0);
    eclipseStatus.innerHTML = '🌑 <strong>Eclipse Solar Total:</strong> La Luna se interpone exactamente entre el Sol y la Tierra. Su cono de umbra proyecta una franja de oscuridad total.';
    playChime();
  });

  btnEclipseLunar.addEventListener('click', () => {
    updateMoonPhase(14.8);
    moonShadow.style.background = 'radial-gradient(circle, rgba(185, 28, 28, 0.8) 0%, rgba(127, 29, 29, 0.95) 100%)';
    eclipseStatus.innerHTML = '🔴 <strong>Eclipse Lunar (Luna de Sangre):</strong> La Tierra bloquea los rayos directos del Sol. La atmósfera refracta longitudes de onda rojas hacia el disco lunar.';
    playChime();
  });

  // ==========================================================================
  // 8. MÓDULO 4: LLUVIAS DE METEOROS Y COMETAS
  // ==========================================================================
  const meteorCanvas = document.getElementById('meteorCanvas');
  const mCtx = meteorCanvas.getContext('2d');
  const btnSpawnBolide = document.getElementById('btnSpawnBolide');
  const btnShowerStorm = document.getElementById('btnShowerStorm');
  const meteorTableBody = document.getElementById('meteorTableBody');

  let activeMeteors = [];
  let stormActive = false;

  const meteorShowersData = [
    { name: 'Cuadrántidas', date: '3-4 Enero', thz: '110', parent: 'Asteroide 2003 EH1', vis: 'Excelente en hemisferio norte' },
    { name: 'Líridas', date: '21-22 Abril', thz: '18', parent: 'Cometa C/1861 G1 Thatcher', vis: 'Cielo oscuro sin Luna' },
    { name: 'Perseidas (Lágrimas de San Lorenzo)', date: '12-13 Agosto', thz: '100', parent: 'Cometa 109P/Swift-Tuttle', vis: 'Óptima global (muy popular)' },
    { name: 'Oriónidas', date: '21-22 Octubre', thz: '25', parent: 'Cometa 1P/Halley', vis: 'Bólidos rápidos y brillantes' },
    { name: 'Gemínidas', date: '13-14 Diciembre', thz: '120-150', parent: 'Asteroide (3200) Faetón', vis: 'La más intensa y confiable del año' }
  ];

  function initMeteorCanvas() {
    meteorCanvas.width = meteorCanvas.parentElement.clientWidth || 760;
    meteorCanvas.height = 380;
  }

  function createMeteor(isBolide = false) {
    const w = meteorCanvas.width;
    const startX = Math.random() * w;
    const startY = Math.random() * 80;
    const speed = isBolide ? 12 : Math.random() * 8 + 8;
    const len = isBolide ? 140 : Math.random() * 60 + 40;
    const angle = Math.PI / 4 + (Math.random() * 0.2 - 0.1);

    activeMeteors.push({
      x: startX,
      y: startY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      len: len,
      life: 1.0,
      decay: isBolide ? 0.015 : Math.random() * 0.03 + 0.02,
      isBolide: isBolide
    });
  }

  function renderMeteors() {
    const w = meteorCanvas.width;
    const h = meteorCanvas.height;

    mCtx.fillStyle = state.nightMode ? 'rgba(10, 1, 1, 0.25)' : 'rgba(3, 6, 17, 0.25)';
    mCtx.fillRect(0, 0, w, h);

    // Generar meteoros de fondo
    if (Math.random() < (stormActive ? 0.45 : 0.04)) {
      createMeteor(false);
    }

    for (let i = activeMeteors.length - 1; i >= 0; i--) {
      const m = activeMeteors[i];
      m.x += m.vx;
      m.y += m.vy;
      m.life -= m.decay;

      const grad = mCtx.createLinearGradient(m.x, m.y, m.x - m.vx * (m.len / 10), m.y - m.vy * (m.len / 10));
      if (state.nightMode) {
        grad.addColorStop(0, `rgba(254, 202, 202, ${m.life})`);
        grad.addColorStop(1, 'rgba(239, 68, 68, 0)');
      } else {
        grad.addColorStop(0, m.isBolide ? `rgba(254, 240, 138, ${m.life})` : `rgba(224, 242, 254, ${m.life})`);
        grad.addColorStop(1, 'rgba(56, 189, 248, 0)');
      }

      mCtx.beginPath();
      mCtx.moveTo(m.x, m.y);
      mCtx.lineTo(m.x - m.vx * (m.len / 10), m.y - m.vy * (m.len / 10));
      mCtx.strokeStyle = grad;
      mCtx.lineWidth = m.isBolide ? 4.5 : 1.8;
      mCtx.stroke();

      if (m.life <= 0 || m.x > w || m.y > h) {
        activeMeteors.splice(i, 1);
      }
    }

    if (state.currentModule === 'meteors') {
      requestAnimationFrame(renderMeteors);
    }
  }

  function populateMeteorTable() {
    meteorTableBody.innerHTML = '';
    meteorShowersData.forEach(item => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td><strong>${item.name}</strong></td>
        <td>${item.date}</td>
        <td><span class="badge">${item.thz} met/h</span></td>
        <td>${item.parent}</td>
        <td>${item.vis}</td>
      `;
      meteorTableBody.appendChild(row);
    });
  }

  btnSpawnBolide.addEventListener('click', () => {
    createMeteor(true);
    playMeteorSwoosh();
  });

  btnShowerStorm.addEventListener('click', () => {
    stormActive = !stormActive;
    btnShowerStorm.textContent = stormActive ? '🛑 Detener Tormenta' : '☄️ Activar Tormenta de Meteoros';
    playTone(500, 'triangle', 0.2, 0.08);
  });

  // ==========================================================================
  // 9. MÓDULO 5: GALAXIAS Y NEBULOSAS (ESPACIO PROFUNDO)
  // ==========================================================================
  const deepSkyGallery = document.getElementById('deepSkyGallery');
  const viewerModal = document.getElementById('viewerModal');
  const modalClose = document.getElementById('modalClose');
  const modalTitle = document.getElementById('modalTitle');
  const modalDesc = document.getElementById('modalDesc');
  const modalSpecs = document.getElementById('modalSpecs');

  const deepSkyObjects = [
    {
      id: 'andromeda',
      name: 'Galaxia de Andrómeda (M31)',
      type: 'Galaxia Espiral Gigante',
      dist: '2.5 millones de años luz',
      telescope: 'Hubble Space Telescope',
      desc: 'El objeto más lejano visible a simple vista bajo cielos oscuros. Contiene aproximadamente un billón de estrellas y colisionará con la Vía Láctea dentro de 4.500 millones de años.',
      draw: (ctx, w, h) => {
        const cx = w / 2, cy = h / 2;
        const grad = ctx.createRadialGradient(cx, cy, 5, cx, cy, 70);
        grad.addColorStop(0, '#fef08a');
        grad.addColorStop(0.3, '#38bdf8');
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(cx, cy, 80, 30, Math.PI / 6, 0, Math.PI * 2);
        ctx.fill();
      }
    },
    {
      id: 'orion_nebula',
      name: 'Gran Nebulosa de Orión (M42)',
      type: 'Nebulosa Difusa de Emisión y Reflexión',
      dist: '1.344 años luz',
      telescope: 'James Webb Space Telescope (JWST)',
      desc: 'Una de las guarderías estelares más activas y cercanas a la Tierra. En su corazón se halla el Cúmulo del Trapecio iluminando gas de hidrógeno ionizado.',
      draw: (ctx, w, h) => {
        const cx = w / 2, cy = h / 2;
        const grad = ctx.createRadialGradient(cx, cy, 8, cx, cy, 60);
        grad.addColorStop(0, '#f43f5e');
        grad.addColorStop(0.5, '#a855f7');
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, 65, 0, Math.PI * 2);
        ctx.fill();
      }
    },
    {
      id: 'pillars',
      name: 'Pilares de la Creación (M16)',
      type: 'Columnas de Polvo y Gas Interestelar',
      dist: '7.000 años luz',
      telescope: 'James Webb (Infrarrojo Cercano)',
      desc: 'Enormes chimeneas moleculares de gas frío en la Nebulosa del Águila, donde nuevas protoestrellas se condensan por colapso gravitatorio.',
      draw: (ctx, w, h) => {
        const grad = ctx.createLinearGradient(w / 3, h, w / 2, 20);
        grad.addColorStop(0, '#78350f');
        grad.addColorStop(0.6, '#38bdf8');
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.fillRect(w / 2 - 25, 30, 20, 110);
        ctx.fillRect(w / 2, 50, 18, 90);
      }
    },
    {
      id: 'sombrero',
      name: 'Galaxia del Sombrero (M104)',
      type: 'Galaxia Espiral no Barrada',
      dist: '29.3 millones de años luz',
      telescope: 'Hubble Space Telescope',
      desc: 'Destaca por su brillante núcleo bulboso y un disco de polvo oscuro prominente que simula el ala de un sombrero tradicional mexicano.',
      draw: (ctx, w, h) => {
        const cx = w / 2, cy = h / 2;
        ctx.fillStyle = '#fef3c7';
        ctx.beginPath();
        ctx.arc(cx, cy, 22, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(cx - 70, cy - 2, 140, 4);
      }
    }
  ];

  function populateGallery() {
    deepSkyGallery.innerHTML = '';
    deepSkyObjects.forEach(obj => {
      const card = document.createElement('div');
      card.className = 'gallery-card';
      card.innerHTML = `
        <div class="gallery-img-thumb">
          <canvas width="220" height="140" id="thumb-${obj.id}"></canvas>
        </div>
        <div class="gallery-info">
          <h4 class="gallery-title">${obj.name}</h4>
          <p class="gallery-desc">${obj.type} • ${obj.dist}</p>
        </div>
      `;
      card.addEventListener('click', () => {
        modalTitle.textContent = obj.name;
        modalDesc.textContent = obj.desc;
        modalSpecs.innerHTML = `
          <li><strong>Tipo de Objeto:</strong> ${obj.type}</li>
          <li><strong>Distancia Estimada:</strong> ${obj.dist}</li>
          <li><strong>Instrumento Principal:</strong> ${obj.telescope}</li>
        `;
        viewerModal.classList.remove('hidden');
        playTone(620, 'sine', 0.15, 0.08);
      });
      deepSkyGallery.appendChild(card);

      setTimeout(() => {
        const c = document.getElementById(`thumb-${obj.id}`);
        if (c) {
          const tCtx = c.getContext('2d');
          tCtx.fillStyle = '#050816';
          tCtx.fillRect(0, 0, c.width, c.height);
          obj.draw(tCtx, c.width, c.height);
        }
      }, 50);
    });
  }

  modalClose.addEventListener('click', () => viewerModal.classList.add('hidden'));

  // ==========================================================================
  // 10. MÓDULO 6: ASTROFOTOGRAFÍA MÓVIL Y SIMULADOR MANUAL
  // ==========================================================================
  const cameraCanvas = document.getElementById('cameraCanvas');
  const camCtx = cameraCanvas.getContext('2d');
  const sliderIso = document.getElementById('sliderIso');
  const sliderExp = document.getElementById('sliderExp');
  const sliderFocus = document.getElementById('sliderFocus');
  const valIso = document.getElementById('valIso');
  const valExp = document.getElementById('valExp');
  const valFocus = document.getElementById('valFocus');
  const hudIso = document.getElementById('hudIso');
  const hudExp = document.getElementById('hudExp');
  const hudFocus = document.getElementById('hudFocus');
  const bortleSelect = document.getElementById('bortleSelect');
  const bortleFeedback = document.getElementById('bortleFeedback');

  function renderViewfinder() {
    const w = cameraCanvas.width;
    const h = cameraCanvas.height;
    const iso = state.cameraIso;
    const exp = state.cameraExp;
    const focus = state.cameraFocus;

    // Fondo según exposición y Bortle
    const exposureFactor = (exp / 30) * (iso / 1600);
    const bgLight = Math.min(60, 4 + exposureFactor * 12 + state.bortleClass * 2.5);

    camCtx.fillStyle = state.nightMode ? `rgb(${Math.round(bgLight * 1.5)}, 0, 0)` : `rgb(${Math.round(bgLight * 0.4)}, ${Math.round(bgLight * 0.6)}, ${Math.round(bgLight)})`;
    camCtx.fillRect(0, 0, w, h);

    // Renderizar estrellas simuladas
    const starCount = Math.max(10, Math.round(180 * (1 - state.bortleClass / 10) * exposureFactor));
    const blurRadius = Math.abs(100 - focus) / 15;

    for (let i = 0; i < starCount; i++) {
      const sx = ((i * 123) % w);
      const sy = ((i * 321) % (h - 40));
      const brightness = Math.min(1.0, (0.3 + (i % 5) * 0.15) * exposureFactor);

      camCtx.beginPath();
      camCtx.arc(sx, sy, 1.5 + blurRadius, 0, Math.PI * 2);
      camCtx.fillStyle = state.nightMode ? `rgba(254, 202, 202, ${brightness})` : `rgba(255, 255, 255, ${brightness})`;
      camCtx.fill();
    }

    // Ruido digital por alto ISO
    const noiseLevel = (iso / 6400) * 0.25;
    if (noiseLevel > 0.05) {
      const imgData = camCtx.getImageData(0, 0, w, h);
      const d = imgData.data;
      for (let i = 0; i < d.length; i += 16) {
        if (Math.random() < noiseLevel) {
          const grain = (Math.random() - 0.5) * 60;
          d[i] = Math.min(255, Math.max(0, d[i] + grain));
          d[i+1] = Math.min(255, Math.max(0, d[i+1] + grain));
          d[i+2] = Math.min(255, Math.max(0, d[i+2] + grain));
        }
      }
      camCtx.putImageData(imgData, 0, 0);
    }
  }

  sliderIso.addEventListener('input', (e) => {
    state.cameraIso = parseInt(e.target.value);
    valIso.textContent = state.cameraIso;
    hudIso.textContent = `ISO: ${state.cameraIso}`;
    renderViewfinder();
  });

  sliderExp.addEventListener('input', (e) => {
    state.cameraExp = parseInt(e.target.value);
    valExp.textContent = `${state.cameraExp}s`;
    hudExp.textContent = `EXP: ${state.cameraExp}s`;
    renderViewfinder();
  });

  sliderFocus.addEventListener('input', (e) => {
    state.cameraFocus = parseInt(e.target.value);
    valFocus.textContent = state.cameraFocus === 100 ? 'Infinito (100%)' : `${state.cameraFocus}%`;
    hudFocus.textContent = `FOCUS: ${state.cameraFocus === 100 ? '∞' : state.cameraFocus + '%'}`;
    renderViewfinder();
  });

  bortleSelect.addEventListener('change', (e) => {
    state.bortleClass = parseInt(e.target.value);
    const feedbackMap = {
      1: 'Clase 1: Oscuridad total virgen. La Vía Láctea proyecta sombras difusas.',
      2: 'Clase 2: Excelente sitio rural. Estructuras complejas de polvo galáctico visibles.',
      4: 'Clase 4: Zona rural/suburbana. Vía Láctea visible hacia el cenit pero degradada al horizonte.',
      7: 'Clase 7: Suburbio urbano denso. Vía Láctea casi invisible; solo estrellas brillantes.',
      9: 'Clase 9: Centro metropolitano. Solo la Luna y los planetas principales destacan.'
    };
    bortleFeedback.textContent = feedbackMap[state.bortleClass];
    renderViewfinder();
  });

  // ==========================================================================
  // 11. ZONA 7: CONTROLES CONTEXTUALES Y QUIZ COGNITIVO
  // ==========================================================================
  const moduleQuickControls = document.getElementById('moduleQuickControls');
  const quizQuestion = document.getElementById('quizQuestion');
  const quizOptions = document.getElementById('quizOptions');
  const quizFeedback = document.getElementById('quizFeedback');
  const meterFill = document.getElementById('meterFill');
  const meterText = document.getElementById('meterText');

  const quizzesData = {
    solar: {
      q: '¿Qué planeta tiene el período de rotación más largo y gira en sentido retrógrado?',
      opts: ['Mercurio', 'Venus', 'Marte', 'Júpiter'],
      ans: 1,
      why: 'Venus rota sobre su eje en 243 días terrestres (más largo que su año de 225 días) y lo hace en sentido retrógrado (de este a oeste).'
    },
    constellations: {
      q: '¿Cuál es la estrella guía supergigante roja del hombro derecho de Orión?',
      opts: ['Rigel', 'Sirio', 'Betelgeuse', 'Aldebarán'],
      ans: 2,
      why: 'Betelgeuse es una supergigante roja semirregular; su diámetro es unas 700 veces mayor que el Sol.'
    },
    moon: {
      q: '¿Cuánto dura exactamente el ciclo sinódico (de Luna Nueva a Luna Nueva)?',
      opts: ['27.3 días', '28.0 días', '29.5 días', '31.0 días'],
      ans: 2,
      why: 'El mes sinódico dura 29.53 días, a diferencia del mes sideral (27.3 días) debido a la traslación conjunta con la Tierra.'
    },
    meteors: {
      q: '¿Qué cuerpo progenitor da origen a las famosas Perseidas de agosto?',
      opts: ['Cometa 1P/Halley', 'Cometa Swift-Tuttle', 'Asteroide Faetón', 'Cometa Encke'],
      ans: 1,
      why: 'El cometa periódico 109P/Swift-Tuttle deja un anillo de escombros por el que la Tierra pasa cada agosto.'
    },
    galaxies: {
      q: '¿A qué distancia se encuentra la Galaxia de Andrómeda de nosotros?',
      opts: ['100.000 años luz', '1.344 años luz', '2.5 millones de años luz', '14 millones de años luz'],
      ans: 2,
      why: 'Andrómeda (M31) dista 2.537 millones de años luz, siendo la espiral más próxima del Grupo Local.'
    },
    astrophoto: {
      q: '¿Por qué se utiliza luz roja en astronomía de campo nocturno?',
      opts: ['Porque alumbra a mayor distancia', 'Porque no descompone la rodopsina retiniana', 'Para calentar el lente', 'Para ahuyentar insectos'],
      ans: 1,
      why: 'La rodopsina de los bastones oculares es insensible a longitudes de onda rojas (>650 nm), preservando la adaptación a la oscuridad.'
    }
  };

  function updateZone7Controls(modId) {
    if (modId === 'solar') {
      moduleQuickControls.innerHTML = `
        <button class="btn-pill" onclick="document.getElementById('btnPlaySolar').click()">⏯ Alternar Pausa</button>
        <button class="btn-pill" onclick="document.getElementById('btnSpeedSolar').click()">⚡ Alternar Velocidad</button>
      `;
    } else if (modId === 'constellations') {
      moduleQuickControls.innerHTML = `
        <button class="btn-pill" onclick="document.getElementById('chkLines').click()">📐 Alternar Líneas</button>
        <button class="btn-pill" onclick="document.getElementById('chkNames').click()">🏷 Alternar Nombres</button>
      `;
    } else if (modId === 'moon') {
      moduleQuickControls.innerHTML = `
        <button class="btn-pill" onclick="document.getElementById('btnEclipseSolar').click()">🌑 Eclipse Solar</button>
        <button class="btn-pill" onclick="document.getElementById('btnEclipseLunar').click()">🔴 Eclipse Lunar</button>
      `;
    } else if (modId === 'meteors') {
      moduleQuickControls.innerHTML = `
        <button class="btn-pill" onclick="document.getElementById('btnSpawnBolide').click()">✨ Bólido Rápido</button>
      `;
    } else if (modId === 'galaxies') {
      moduleQuickControls.innerHTML = `
        <p style="font-size:0.8rem;color:var(--text-muted)">Haz clic en cualquier tarjeta de la galería para abrir la ficha técnica ampliada.</p>
      `;
    } else if (modId === 'astrophoto') {
      moduleQuickControls.innerHTML = `
        <button class="btn-pill" onclick="document.getElementById('sliderIso').value=3200;document.getElementById('sliderIso').dispatchEvent(new Event('input'))">⚡ ISO 3200 Rápido</button>
      `;
    }
  }

  function loadModuleQuiz(modId) {
    const qData = quizzesData[modId];
    if (!qData) return;
    quizQuestion.textContent = qData.q;
    quizFeedback.textContent = '';
    quizOptions.innerHTML = '';

    qData.opts.forEach((optText, idx) => {
      const b = document.createElement('button');
      b.className = 'btn-quiz';
      b.textContent = `${['A', 'B', 'C', 'D'][idx]}) ${optText}`;
      b.addEventListener('click', () => {
        const isCorrect = (idx === qData.ans);
        Array.from(quizOptions.children).forEach((child, cIdx) => {
          child.disabled = true;
          if (cIdx === qData.ans) child.classList.add('correct');
          else if (cIdx === idx) child.classList.add('wrong');
        });

        if (isCorrect) {
          quizFeedback.textContent = `¡Correcto! ${qData.why}`;
          quizFeedback.style.color = '#10b981';
          playChime();
        } else {
          quizFeedback.textContent = `Incorrecto. ${qData.why}`;
          quizFeedback.style.color = '#ef4444';
          playTone(240, 'sawtooth', 0.25, 0.08);
        }
      });
      quizOptions.appendChild(b);
    });
  }

  function updateAffectiveMonitor() {
    const elapsedMinutes = (Date.now() - state.sessionStartTime) / 60000;
    const loadPercent = Math.min(100, Math.round(20 + elapsedMinutes * 4 + state.interactionCount * 1.5));
    meterFill.style.width = `${loadPercent}%`;

    if (loadPercent < 45) {
      meterText.textContent = 'Estado: Confortable y Relajado';
      meterFill.style.background = 'linear-gradient(90deg, #10b981, #38bdf8)';
    } else if (loadPercent < 75) {
      meterText.textContent = 'Estado: Carga Óptima de Aprendizaje';
      meterFill.style.background = 'linear-gradient(90deg, #38bdf8, #f59e0b)';
    } else {
      meterText.textContent = 'Atención: Sugerida Pausa Visual o Modo Rojo';
      meterFill.style.background = 'linear-gradient(90deg, #f59e0b, #ef4444)';
    }
  }

  // ==========================================================================
  // 12. INICIALIZACIÓN GENERAL AL CARGAR EL DOM
  // ==========================================================================
  initSolarCanvas();
  renderSolarSystem();
  populatePlanetCards();

  populateConstellationUI();
  populateMeteorTable();
  populateGallery();

  updateMoonPhase(7.4);
  renderViewfinder();
  switchModule('solar');

  window.addEventListener('resize', () => {
    initSolarCanvas();
    initSkyCanvas();
    initMeteorCanvas();
    renderViewfinder();
  });
});
