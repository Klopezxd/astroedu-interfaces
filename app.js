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
    showPlanetLabels: true,
    selectedPlanet: 'earth',
    selectedConstellation: 'orion',
    constellationViewMode: 'chart',
    moonDay: 7.4,
    moonEclipse: null,
    eclipseType: 'solar',
    moduleQuizIndex: { solar: 0, constellations: 0, moon: 0, meteors: 0, galaxies: 0, astrophoto: 0 },
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
  const navTabs = document.querySelectorAll('.nav-tabs-list .nav-tab');
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

  let solarAnimId = null;
  let meteorAnimId = null;

  function switchModule(modId) {
    if (!moduleTitles[modId]) return;
    state.currentModule = modId;
    state.interactionCount++;
    playTone(440, 'triangle', 0.08, 0.05);

    navTabs.forEach(tab => {
      tab.classList.toggle('active', tab.dataset.module === modId);
    });

    modulePanels.forEach(panel => {
      panel.classList.toggle('active', panel.id === `panel-${modId}`);
    });

    breadcrumbCurrent.textContent = moduleTitles[modId];
    updateAstroDataCard(modId);
    loadModuleQuiz(modId);

    // Cancelar bucles de animación activos para reiniciar limpiamente
    if (solarAnimId) {
      cancelAnimationFrame(solarAnimId);
      solarAnimId = null;
    }
    if (meteorAnimId) {
      cancelAnimationFrame(meteorAnimId);
      meteorAnimId = null;
    }

    // Inicializar y reactivar renderizado continuo según el módulo activo
    if (modId === 'solar') {
      initSolarCanvas();
      renderSolarSystem();
    } else if (modId === 'constellations') {
      initSkyCanvas();
      drawSky();
    } else if (modId === 'moon') {
      updateMoonPhase(state.moonDay, state.moonEclipse);
      renderEclipseGeometryCanvas(state.eclipseType);
    } else if (modId === 'meteors') {
      initMeteorCanvas();
      renderMeteors();
    } else if (modId === 'astrophoto') {
      renderViewfinder();
    }
  }

  navTabs.forEach(tab => {
    tab.addEventListener('click', () => switchModule(tab.dataset.module));
    tab.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        switchModule(tab.dataset.module);
      }
    });
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
  // 4. INTERFAZ AFECTIVA: MODO NOCTURNO (LUZ ROJA SUAVE)
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
      bannerEvent.textContent = '🌙 Modo Nocturno Activo: Luz roja suave para cuidar tus ojos en la oscuridad sin encandilarte.';
    } else {
      toggleNightBtn.innerHTML = '<span class="btn-icon">🔴</span><span class="btn-label">Modo Rojo Nocturno</span>';
      bannerEvent.textContent = 'Cielo Nocturno Despejado • Observación Óptima • Fase: Cuarto Creciente (50%)';
    }

    // Re-renderizar lienzos con la nueva paleta cromática
    if (state.currentModule === 'solar') renderSolarSystem();
    if (state.currentModule === 'constellations') drawSky();
    if (state.currentModule === 'moon') updateMoonPhase(state.moonDay, state.moonEclipse);
    if (state.currentModule === 'astrophoto') renderViewfinder();
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
  const btnTogglePlanetLabels = document.getElementById('btnTogglePlanetLabels');

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

      // Rótulos con nombres de planetas
      if (state.showPlanetLabels) {
        sCtx.font = '10px Outfit, sans-serif';
        const txtWidth = sCtx.measureText(p.name).width;
        sCtx.fillStyle = state.nightMode ? 'rgba(43, 7, 7, 0.85)' : 'rgba(15, 23, 42, 0.8)';
        sCtx.fillRect(px + p.r + 4, py - 9, txtWidth + 6, 15);
        sCtx.fillStyle = state.nightMode ? '#fca5a5' : '#f8fafc';
        sCtx.fillText(p.name, px + p.r + 7, py + 2);
      }
    });

    if (!state.solarPaused) {
      planetsData.forEach((p, idx) => {
        solarAngles[idx] += p.speed * state.solarSpeed;
      });
    }

    if (state.currentModule === 'solar') {
      solarAnimId = requestAnimationFrame(renderSolarSystem);
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
        updateAstroDataCard('solar');
        playTone(520, 'sine', 0.12, 0.08);
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

  btnTogglePlanetLabels.addEventListener('click', () => {
    state.showPlanetLabels = !state.showPlanetLabels;
    btnTogglePlanetLabels.textContent = state.showPlanetLabels ? '🏷️ Ocultar Nombres' : '🏷️ Mostrar Nombres';
    playTone(520, 'sine', 0.1, 0.05);
  });

  // ==========================================================================
  // 6. MÓDULO 2: CONSTELACIONES Y RECURSOS MULTIMEDIA
  // ==========================================================================
  const skyCanvas = document.getElementById('skyCanvas');
  const skCtx = skyCanvas.getContext('2d');
  const chkLines = document.getElementById('chkLines');
  const chkNames = document.getElementById('chkNames');
  const chkGrid = document.getElementById('chkGrid');
  const constellationList = document.getElementById('constellationList');
  const constellationInfo = document.getElementById('constellationInfo');

  const btnViewSkyMap = document.getElementById('btnViewSkyMap');
  const btnViewAstroPhoto = document.getElementById('btnViewAstroPhoto');
  const constellationPhotoCard = document.getElementById('constellationPhotoCard');
  const constellationPhotoImg = document.getElementById('constellationPhotoImg');
  const constellationPhotoTitle = document.getElementById('constellationPhotoTitle');
  const constellationPhotoCredit = document.getElementById('constellationPhotoCredit');
  const constellationStellariumLink = document.getElementById('constellationStellariumLink');
  const constellationCanvasControls = document.getElementById('constellationCanvasControls');

  const constellationsData = {
    orion: {
      name: 'Orión (El Cazador)',
      stars: [
        { name: 'Betelgeuse', x: 250, y: 140, mag: 0.5, color: '#f97316', tox: -82, toy: -4 },
        { name: 'Bellatrix', x: 450, y: 150, mag: 1.6, color: '#38bdf8', tox: 10, toy: -4 },
        { name: 'Alnitak', x: 310, y: 235, mag: 1.7, color: '#93c5fd', tox: -52, toy: 16 },
        { name: 'Alnilam', x: 350, y: 230, mag: 1.6, color: '#93c5fd', tox: -22, toy: -14 },
        { name: 'Mintaka', x: 390, y: 225, mag: 2.2, color: '#93c5fd', tox: 10, toy: -10 },
        { name: 'Saiph', x: 270, y: 335, mag: 2.0, color: '#38bdf8', tox: -46, toy: 16 },
        { name: 'Rigel', x: 440, y: 325, mag: 0.1, color: '#60a5fa', tox: 12, toy: 14 },
        { name: 'Meissa', x: 350, y: 95, mag: 3.4, color: '#e2e8f0', tox: -20, toy: -12 }
      ],
      lines: [
        [7, 0], [7, 1],
        [0, 2], [1, 4],
        [2, 3], [3, 4],
        [2, 5], [4, 6],
        [5, 6]
      ],
      photoUrl: 'https://images-assets.nasa.gov/image/PIA13083/PIA13083~medium.jpg',
      photoTitle: 'Complejo de Orión: Betelgeuse, Rigel y Nebulosa M42 (NASA/JPL)',
      credit: 'Telescopio Espacial Infrarrojo WISE • NASA / JPL-Caltech / UCLA',
      stellariumUrl: 'https://stellarium-web.org/',
      info: 'Orión es la constelación más prominente del ecuador celeste. Betelgeuse (supergigante roja) y Rigel (supergigante azul) forman sus vértices opuestos, con las tres estrellas del "Cinturón de Orión" como guía universal hacia Sirio y las Pléyades.'
    },
    ursaMajor: {
      name: 'Osa Mayor (El Carro)',
      stars: [
        { name: 'Dubhe', x: 230, y: 150, mag: 1.8, color: '#fde047', tox: -55, toy: -8 },
        { name: 'Merak', x: 240, y: 235, mag: 2.3, color: '#93c5fd', tox: -52, toy: 16 },
        { name: 'Phecda', x: 335, y: 225, mag: 2.4, color: '#93c5fd', tox: -15, toy: 20 },
        { name: 'Megrez', x: 325, y: 165, mag: 3.3, color: '#93c5fd', tox: -48, toy: -10 },
        { name: 'Alioth', x: 410, y: 145, mag: 1.7, color: '#93c5fd', tox: -18, toy: -14 },
        { name: 'Mizar', x: 485, y: 130, mag: 2.2, color: '#93c5fd', tox: -15, toy: -14 },
        { name: 'Alkaid', x: 565, y: 145, mag: 1.8, color: '#60a5fa', tox: 12, toy: 4 }
      ],
      lines: [[0, 1], [1, 2], [2, 3], [3, 0], [3, 4], [4, 5], [5, 6]],
      photoUrl: 'https://images-assets.nasa.gov/image/GSFC_20171208_Archive_e001427/GSFC_20171208_Archive_e001427~medium.jpg',
      photoTitle: 'Gran Bóveda de la Osa Mayor y Galaxias Satélite (NASA)',
      credit: 'NASA APOD / Digitized Sky Survey • Telescopio Hubble',
      stellariumUrl: 'https://stellarium-web.org/',
      info: 'El asterismo del Carro permite trazar una línea recta imaginaria desde Merak hacia Dubhe y prolongarla cinco veces para localizar con precisión matemática a la Estrella Polar (Polaris) en el hemisferio norte.'
    },
    crux: {
      name: 'Cruz del Sur (Crux)',
      stars: [
        { name: 'Acrux', x: 360, y: 310, mag: 0.7, color: '#60a5fa', tox: -52, toy: 18 },
        { name: 'Gacrux', x: 360, y: 150, mag: 1.6, color: '#f87171', tox: -54, toy: -12 },
        { name: 'Mimosa', x: 290, y: 235, mag: 1.2, color: '#93c5fd', tox: -65, toy: 4 },
        { name: 'Imai', x: 415, y: 220, mag: 2.7, color: '#93c5fd', tox: 12, toy: 4 },
        { name: 'Ginan', x: 390, y: 265, mag: 3.6, color: '#cbd5e1', tox: 12, toy: 14 }
      ],
      lines: [[0, 1], [2, 3]],
      photoUrl: 'https://images-assets.nasa.gov/image/PIA14112/PIA14112~medium.jpg',
      photoTitle: 'La Cruz del Sur y la Nebulosa Oscura Saco de Carbón (NASA/JPL)',
      credit: 'NASA / JPL-Caltech / Observatorio Europeo Austral (ESO)',
      stellariumUrl: 'https://stellarium-web.org/',
      info: 'La joya estelar del hemisferio sur. Sirve como brújula natural para marinos y exploradores al prolongar 4.5 veces su brazo mayor para ubicar el Polo Sur Celeste.'
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

    // Rejilla de coordenadas celestes visible y contrastada
    if (chkGrid && chkGrid.checked) {
      skCtx.save();
      skCtx.strokeStyle = state.nightMode ? 'rgba(239, 68, 68, 0.28)' : 'rgba(56, 189, 248, 0.25)';
      skCtx.lineWidth = 1;
      skCtx.setLineDash([5, 5]);

      // Paralelos de Declinación
      const decs = [
        { y: 80, label: '+30° Dec' },
        { y: 210, label: '0° (Ecuador Celeste)' },
        { y: 340, label: '-30° Dec' }
      ];
      decs.forEach(d => {
        skCtx.beginPath();
        skCtx.moveTo(0, d.y);
        skCtx.lineTo(w, d.y);
        skCtx.stroke();
        skCtx.fillStyle = state.nightMode ? '#fca5a5' : '#38bdf8';
        skCtx.font = '10px JetBrains Mono, monospace';
        skCtx.fillText(d.label, 12, d.y - 5);
      });

      // Meridianos de Ascensión Recta (RA)
      const ras = [
        { x: 180, label: 'RA 5h 00m' },
        { x: 370, label: 'RA 5h 30m' },
        { x: 560, label: 'RA 6h 00m' }
      ];
      ras.forEach(r => {
        skCtx.beginPath();
        skCtx.moveTo(r.x, 0);
        skCtx.lineTo(r.x, h);
        skCtx.stroke();
        skCtx.fillStyle = state.nightMode ? '#fca5a5' : '#38bdf8';
        skCtx.font = '10px JetBrains Mono, monospace';
        skCtx.fillText(r.label, r.x + 6, 18);
      });

      skCtx.restore();
    }

    // Estrellas tenues de fondo
    backgroundStars.forEach(s => {
      skCtx.beginPath();
      skCtx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      skCtx.fillStyle = state.nightMode ? `rgba(239, 68, 68, ${s.alpha})` : `rgba(255, 255, 255, ${s.alpha})`;
      skCtx.fill();
    });

    const cData = constellationsData[state.selectedConstellation];
    if (cData) {
      // Líneas de la constelación
      if (chkLines && chkLines.checked) {
        skCtx.strokeStyle = state.nightMode ? 'rgba(239, 68, 68, 0.75)' : 'rgba(56, 189, 248, 0.65)';
        skCtx.lineWidth = 2;
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
        const starRad = Math.max(3.8, 6.5 - st.mag * 0.85);
        skCtx.arc(st.x, st.y, starRad, 0, Math.PI * 2);
        skCtx.fillStyle = state.nightMode ? '#fca5a5' : st.color;
        skCtx.shadowBlur = 12;
        skCtx.shadowColor = state.nightMode ? '#ef4444' : st.color;
        skCtx.fill();
        skCtx.shadowBlur = 0;

        // Rótulos con nombres de estrellas (sin solapamiento)
        if (chkNames && chkNames.checked) {
          skCtx.fillStyle = state.nightMode ? '#fca5a5' : '#f8fafc';
          skCtx.font = '11px Outfit, sans-serif';
          const tox = st.tox !== undefined ? st.tox : 8;
          const toy = st.toy !== undefined ? st.toy : 4;
          skCtx.fillText(st.name, st.x + tox, st.y + toy);
        }
      });
    }
  }

  function updateConstellationViewMode() {
    const isPhoto = (state.constellationViewMode === 'photo');
    if (btnViewSkyMap) btnViewSkyMap.classList.toggle('active', !isPhoto);
    if (btnViewAstroPhoto) btnViewAstroPhoto.classList.toggle('active', isPhoto);
    if (skyCanvas) skyCanvas.classList.toggle('hidden', isPhoto);
    if (constellationCanvasControls) constellationCanvasControls.classList.toggle('hidden', isPhoto);
    if (constellationPhotoCard) constellationPhotoCard.classList.toggle('hidden', !isPhoto);

    const curr = constellationsData[state.selectedConstellation];
    if (curr && isPhoto) {
      if (constellationPhotoImg) constellationPhotoImg.src = curr.photoUrl;
      if (constellationPhotoTitle) constellationPhotoTitle.textContent = curr.photoTitle;
      if (constellationPhotoCredit) constellationPhotoCredit.textContent = curr.credit;
      if (constellationStellariumLink) constellationStellariumLink.href = curr.stellariumUrl;
    }
  }

  if (btnViewSkyMap) {
    btnViewSkyMap.addEventListener('click', () => {
      state.constellationViewMode = 'chart';
      updateConstellationViewMode();
      drawSky();
      playTone(520, 'sine', 0.1, 0.05);
    });
  }

  if (btnViewAstroPhoto) {
    btnViewAstroPhoto.addEventListener('click', () => {
      state.constellationViewMode = 'photo';
      updateConstellationViewMode();
      playTone(600, 'sine', 0.1, 0.05);
    });
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
        if (state.constellationViewMode === 'photo') {
          updateConstellationViewMode();
        } else {
          drawSky();
        }
        updateAstroDataCard('constellations');
        playTone(600, 'sine', 0.15, 0.08);
      });
      constellationList.appendChild(btn);
    });

    const curr = constellationsData[state.selectedConstellation];
    constellationInfo.innerHTML = `
      <strong>${curr.name}:</strong> ${curr.info}
    `;
    updateConstellationViewMode();
  }

  if (chkLines) chkLines.addEventListener('change', drawSky);
  if (chkNames) chkNames.addEventListener('change', drawSky);
  if (chkGrid) chkGrid.addEventListener('change', drawSky);

  // ==========================================================================
  // 7. MÓDULO 3: LA LUNA Y SUS FASES INTERACTIVAS (MODELO 3D REAL)
  // ==========================================================================
  const moonSlider = document.getElementById('moonSlider');
  const moonCanvas = document.getElementById('moonCanvas');
  const moonCtx = moonCanvas ? moonCanvas.getContext('2d') : null;
  const phaseName = document.getElementById('phaseName');
  const phaseDay = document.getElementById('phaseDay');
  const phaseIllum = document.getElementById('phaseIllum');
  const btnEclipseSolar = document.getElementById('btnEclipseSolar');
  const btnEclipseLunar = document.getElementById('btnEclipseLunar');
  const eclipseStatus = document.getElementById('eclipseStatus');
  const phaseButtons = document.querySelectorAll('.phase-buttons-row .btn-tag');

  function renderMoonCanvas(day, eclipseMode = null) {
    if (!moonCtx) return;
    const w = moonCanvas.width;
    const h = moonCanvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const R = 78;

    moonCtx.clearRect(0, 0, w, h);

    // CASO 1: MODO SIMULADOR DE ECLIPSE SOLAR
    if (eclipseMode === 'solar') {
      // Espacio profundo
      moonCtx.fillStyle = '#030712';
      moonCtx.fillRect(0, 0, w, h);

      // Resplandor de la Corona Solar detrás del disco lunar
      const corona = moonCtx.createRadialGradient(cx, cy, R - 6, cx, cy, R + 26);
      corona.addColorStop(0, '#ffffff');
      corona.addColorStop(0.2, '#fde047');
      corona.addColorStop(0.55, '#f59e0b');
      corona.addColorStop(0.85, 'rgba(239, 68, 68, 0.35)');
      corona.addColorStop(1, 'transparent');

      moonCtx.fillStyle = corona;
      moonCtx.beginPath();
      moonCtx.arc(cx, cy, R + 26, 0, Math.PI * 2);
      moonCtx.fill();

      // Destellos radiales de la atmósfera exterior del Sol
      for (let i = 0; i < 20; i++) {
        const ang = (i / 20) * Math.PI * 2;
        const len = R + 14 + (Math.sin(i * 3.7) * 10);
        moonCtx.beginPath();
        moonCtx.moveTo(cx + Math.cos(ang) * (R + 2), cy + Math.sin(ang) * (R + 2));
        moonCtx.lineTo(cx + Math.cos(ang) * len, cy + Math.sin(ang) * len);
        moonCtx.strokeStyle = 'rgba(254, 240, 138, 0.45)';
        moonCtx.lineWidth = 2;
        moonCtx.stroke();
      }

      // Disco lunar opaco que eclipsa la fotosfera
      moonCtx.beginPath();
      moonCtx.arc(cx, cy, R, 0, Math.PI * 2);
      moonCtx.fillStyle = '#030712';
      moonCtx.fill();

      // Efecto "Anillo de Diamante" característico en el limbo
      const flareX = cx + Math.cos(-Math.PI / 4) * R;
      const flareY = cy + Math.sin(-Math.PI / 4) * R;
      const flareGrad = moonCtx.createRadialGradient(flareX, flareY, 1, flareX, flareY, 16);
      flareGrad.addColorStop(0, '#ffffff');
      flareGrad.addColorStop(0.3, '#fef08a');
      flareGrad.addColorStop(1, 'transparent');
      moonCtx.fillStyle = flareGrad;
      moonCtx.beginPath();
      moonCtx.arc(flareX, flareY, 16, 0, Math.PI * 2);
      moonCtx.fill();
      return;
    }

    // CASO 2: MODO SIMULADOR DE ECLIPSE LUNAR (LUNA DE SANGRE)
    if (eclipseMode === 'lunar') {
      // Resplandor cobrizo atmosférico refractado
      const redGlow = moonCtx.createRadialGradient(cx, cy, R, cx, cy, R + 18);
      redGlow.addColorStop(0, 'rgba(239, 68, 68, 0.35)');
      redGlow.addColorStop(1, 'transparent');
      moonCtx.fillStyle = redGlow;
      moonCtx.beginPath();
      moonCtx.arc(cx, cy, R + 18, 0, Math.PI * 2);
      moonCtx.fill();

      // Esfera iluminada por la dispersión atmosférica terrestre
      const bloodGrad = moonCtx.createRadialGradient(cx - 20, cy - 20, 15, cx, cy, R);
      bloodGrad.addColorStop(0, '#f87171');
      bloodGrad.addColorStop(0.35, '#dc2626');
      bloodGrad.addColorStop(0.7, '#991b1b');
      bloodGrad.addColorStop(1, '#450a0a');

      moonCtx.beginPath();
      moonCtx.arc(cx, cy, R, 0, Math.PI * 2);
      moonCtx.fillStyle = bloodGrad;
      moonCtx.fill();

      // Relieve de mares lunares visibles bajo la luz roja
      drawLunarRelief(moonCtx, cx, cy, R, 'rgba(69, 10, 10, 0.55)', 'rgba(254, 202, 202, 0.25)');
      return;
    }

    // CASO 3: FASES LUNARES REGULARES (TERMINADOR ELÍPTICO ASTRONÓMICO)
    const p = (day % 29.53) / 29.53;
    const phi = p * Math.PI * 2;
    const cosPhi = Math.cos(phi);
    const isWaxing = p <= 0.5;
    const rx = Math.max(0.1, Math.abs(R * cosPhi));

    // Aura exterior muy sutil
    const outerAura = moonCtx.createRadialGradient(cx, cy, R, cx, cy, R + 12);
    outerAura.addColorStop(0, state.nightMode ? 'rgba(239, 68, 68, 0.12)' : 'rgba(224, 242, 254, 0.12)');
    outerAura.addColorStop(1, 'transparent');
    moonCtx.fillStyle = outerAura;
    moonCtx.beginPath();
    moonCtx.arc(cx, cy, R + 12, 0, Math.PI * 2);
    moonCtx.fill();

    // Disco base en sombra (lado nocturno con suave luz cenicienta esférica)
    const darkSide = moonCtx.createRadialGradient(cx - 20, cy - 20, 10, cx, cy, R);
    if (state.nightMode) {
      darkSide.addColorStop(0, 'rgba(69, 10, 10, 0.6)');
      darkSide.addColorStop(0.65, 'rgba(28, 4, 4, 0.8)');
      darkSide.addColorStop(1, 'rgba(10, 1, 1, 0.95)');
    } else {
      darkSide.addColorStop(0, 'rgba(30, 41, 59, 0.5)');
      darkSide.addColorStop(0.65, 'rgba(15, 23, 42, 0.75)');
      darkSide.addColorStop(1, 'rgba(2, 6, 23, 0.92)');
    }
    moonCtx.beginPath();
    moonCtx.arc(cx, cy, R, 0, Math.PI * 2);
    moonCtx.fillStyle = darkSide;
    moonCtx.fill();

    // Relieve tenue en la cara oculta a la luz
    drawLunarRelief(moonCtx, cx, cy, R, 'rgba(3, 7, 18, 0.5)', 'rgba(255, 255, 255, 0.05)');

    // Región iluminada mediante recorte con terminador elíptico exacto
    if (day > 0.4 && day < 29.1) {
      moonCtx.save();
      moonCtx.beginPath();

      if (isWaxing) {
        // Creciente: semicírculo derecho
        moonCtx.arc(cx, cy, R, -Math.PI / 2, Math.PI / 2, false);
        // Terminador de regreso del polo sur al polo norte
        moonCtx.ellipse(cx, cy, rx, R, 0, Math.PI / 2, -Math.PI / 2, cosPhi >= 0);
      } else {
        // Menguante: semicírculo izquierdo
        moonCtx.arc(cx, cy, R, Math.PI / 2, -Math.PI / 2, false);
        // Terminador de regreso del polo norte al polo sur
        moonCtx.ellipse(cx, cy, rx, R, 0, -Math.PI / 2, Math.PI / 2, cosPhi >= 0);
      }

      moonCtx.closePath();
      moonCtx.clip();

      // Gradiente de iluminación esférica
      const litGrad = moonCtx.createRadialGradient(
        cx + (isWaxing ? 25 : -25),
        cy - 20,
        15,
        cx,
        cy,
        R
      );
      if (state.nightMode) {
        litGrad.addColorStop(0, '#fca5a5');
        litGrad.addColorStop(0.4, '#ef4444');
        litGrad.addColorStop(0.8, '#b91c1c');
        litGrad.addColorStop(1, '#7f1d1d');
      } else {
        litGrad.addColorStop(0, '#ffffff');
        litGrad.addColorStop(0.35, '#f8fafc');
        litGrad.addColorStop(0.7, '#cbd5e1');
        litGrad.addColorStop(1, '#94a3b8');
      }
      moonCtx.fillStyle = litGrad;
      moonCtx.fill();

      // Mares y cráteres detallados en la región iluminada
      drawLunarRelief(moonCtx, cx, cy, R, state.nightMode ? 'rgba(127, 29, 29, 0.6)' : 'rgba(71, 85, 105, 0.45)', 'rgba(255, 255, 255, 0.45)');

      moonCtx.restore();

      // Penumbra sutil a lo largo del terminador
      moonCtx.save();
      moonCtx.beginPath();
      if (isWaxing) {
        moonCtx.ellipse(cx, cy, rx, R, 0, Math.PI / 2, -Math.PI / 2, cosPhi >= 0);
      } else {
        moonCtx.ellipse(cx, cy, rx, R, 0, -Math.PI / 2, Math.PI / 2, cosPhi >= 0);
      }
      moonCtx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
      moonCtx.lineWidth = 3;
      moonCtx.stroke();
      moonCtx.restore();
    }

    // Borde perimetral tenue
    moonCtx.beginPath();
    moonCtx.arc(cx, cy, R, 0, Math.PI * 2);
    moonCtx.strokeStyle = state.nightMode ? 'rgba(239, 68, 68, 0.3)' : 'rgba(255, 255, 255, 0.15)';
    moonCtx.lineWidth = 1;
    moonCtx.stroke();
  }

  function drawLunarRelief(ctx, cx, cy, R, darkColor, lightColor) {
    // Parches de mares lunares (Oceanus Procellarum, Mare Imbrium, Tranquillitatis, etc.)
    const maria = [
      { x: cx - 28, y: cy - 6, rx: 22, ry: 28, rot: 0.1 },
      { x: cx - 12, y: cy - 32, rx: 18, ry: 16, rot: -0.1 },
      { x: cx + 18, y: cy - 25, rx: 14, ry: 13, rot: 0.2 },
      { x: cx + 28, y: cy - 8, rx: 16, ry: 15, rot: 0.0 },
      { x: cx + 46, y: cy - 12, rx: 10, ry: 8, rot: 0.1 },
      { x: cx - 6, y: cy + 18, rx: 15, ry: 12, rot: 0.3 }
    ];

    ctx.fillStyle = darkColor;
    maria.forEach(m => {
      ctx.beginPath();
      ctx.ellipse(m.x, m.y, m.rx, m.ry, m.rot, 0, Math.PI * 2);
      ctx.fill();
    });

    // Cráter Tycho con sus rayos brillantes radiales en el polo sur
    const tychoX = cx - 4;
    const tychoY = cy + 44;
    ctx.strokeStyle = lightColor;
    ctx.lineWidth = 1;
    for (let i = 0; i < 7; i++) {
      const rayAng = (i / 7) * Math.PI + Math.PI;
      ctx.beginPath();
      ctx.moveTo(tychoX, tychoY);
      ctx.lineTo(tychoX + Math.cos(rayAng) * 34, tychoY + Math.sin(rayAng) * 34);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(tychoX, tychoY, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = lightColor;
    ctx.fill();

    // Cráter Copérnico
    ctx.beginPath();
    ctx.arc(cx - 16, cy - 4, 3, 0, Math.PI * 2);
    ctx.fillStyle = lightColor;
    ctx.fill();
  }

  function updateMoonPhase(day, eclipseMode = null) {
    state.moonDay = parseFloat(day);
    state.moonEclipse = eclipseMode;
    moonSlider.value = state.moonDay;
    const progress = state.moonDay / 29.53;
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

    if (eclipseMode === 'solar') {
      name = 'Eclipse Solar Total (Alineación Umbral)';
    } else if (eclipseMode === 'lunar') {
      name = 'Eclipse Lunar Total (Luna de Sangre)';
    }

    phaseName.textContent = name;
    renderMoonCanvas(state.moonDay, eclipseMode);
  }

  moonSlider.addEventListener('input', (e) => {
    eclipseStatus.textContent = 'Mueve el deslizador o pulsa una fase cardinal para simular el ciclo sinódico.';
    updateMoonPhase(e.target.value, null);
    playTone(200 + parseFloat(e.target.value) * 15, 'sine', 0.05, 0.02);
  });

  phaseButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const d = parseFloat(btn.dataset.day);
      eclipseStatus.textContent = 'Mueve el deslizador o pulsa una fase cardinal para simular el ciclo sinódico.';
      updateMoonPhase(d, null);
      playTone(550, 'sine', 0.1, 0.06);
    });
  });

  const eclipseGeometryCanvas = document.getElementById('eclipseGeometryCanvas');
  const egCtx = eclipseGeometryCanvas ? eclipseGeometryCanvas.getContext('2d') : null;
  const eclipseGeometryTitle = document.getElementById('eclipseGeometryTitle');
  const eclipseGeometryDesc = document.getElementById('eclipseGeometryDesc');
  const eclipseVideoFrame = document.getElementById('eclipseVideoFrame');
  const videoTitleLabel = document.getElementById('videoTitleLabel');
  const eclipseRealPhotoImg = document.getElementById('eclipseRealPhotoImg');
  const photoTitleLabel = document.getElementById('photoTitleLabel');
  const eclipsePhotoCaption = document.getElementById('eclipsePhotoCaption');

  function renderEclipseGeometryCanvas(type = 'solar') {
    if (!egCtx) return;
    const w = eclipseGeometryCanvas.width;
    const h = eclipseGeometryCanvas.height;
    const cy = h / 2;

    egCtx.clearRect(0, 0, w, h);
    egCtx.fillStyle = '#020617';
    egCtx.fillRect(0, 0, w, h);

    if (type === 'solar') {
      // 1. Sol a la izquierda
      const sunX = 85;
      const sunR = 36;
      const sunGrad = egCtx.createRadialGradient(sunX, cy, 6, sunX, cy, sunR);
      sunGrad.addColorStop(0, '#fffbeb');
      sunGrad.addColorStop(0.4, '#fde047');
      sunGrad.addColorStop(1, '#f59e0b');
      egCtx.beginPath();
      egCtx.arc(sunX, cy, sunR, 0, Math.PI * 2);
      egCtx.fillStyle = sunGrad;
      egCtx.fill();

      // 2. Luna en medio (bloqueando el Sol)
      const moonX = 350;
      const moonR = 12;

      // 3. Tierra a la derecha
      const earthX = 600;
      const earthR = 28;

      // Cono de Penumbra
      egCtx.beginPath();
      egCtx.moveTo(sunX, cy - sunR);
      egCtx.lineTo(moonX, cy + moonR);
      egCtx.lineTo(earthX, cy + earthR + 25);
      egCtx.lineTo(earthX, cy - earthR - 25);
      egCtx.lineTo(moonX, cy - moonR);
      egCtx.closePath();
      egCtx.fillStyle = 'rgba(148, 163, 184, 0.12)';
      egCtx.fill();

      // Cono de Umbra (sombra total que toca la Tierra)
      egCtx.beginPath();
      egCtx.moveTo(sunX, cy - sunR);
      egCtx.lineTo(moonX, cy - moonR);
      egCtx.lineTo(earthX - earthR + 4, cy);
      egCtx.lineTo(moonX, cy + moonR);
      egCtx.lineTo(sunX, cy + sunR);
      egCtx.closePath();
      egCtx.fillStyle = 'rgba(0, 0, 0, 0.75)';
      egCtx.fill();

      // Líneas de rayos luminosos tangentes
      egCtx.strokeStyle = 'rgba(253, 224, 71, 0.35)';
      egCtx.lineWidth = 1;
      egCtx.beginPath();
      egCtx.moveTo(sunX, cy - sunR); egCtx.lineTo(moonX, cy - moonR); egCtx.lineTo(earthX - earthR + 4, cy);
      egCtx.moveTo(sunX, cy + sunR); egCtx.lineTo(moonX, cy + moonR); egCtx.lineTo(earthX - earthR + 4, cy);
      egCtx.moveTo(sunX, cy - sunR); egCtx.lineTo(moonX, cy + moonR); egCtx.lineTo(earthX, cy + earthR + 25);
      egCtx.moveTo(sunX, cy + sunR); egCtx.lineTo(moonX, cy - moonR); egCtx.lineTo(earthX, cy - earthR - 25);
      egCtx.stroke();

      // Dibujar Luna
      egCtx.beginPath();
      egCtx.arc(moonX, cy, moonR, 0, Math.PI * 2);
      egCtx.fillStyle = '#0f172a';
      egCtx.strokeStyle = '#64748b';
      egCtx.lineWidth = 1.5;
      egCtx.fill();
      egCtx.stroke();

      // Dibujar Tierra
      const earthGrad = egCtx.createRadialGradient(earthX - 8, cy - 8, 4, earthX, cy, earthR);
      earthGrad.addColorStop(0, '#38bdf8');
      earthGrad.addColorStop(0.6, '#0284c7');
      earthGrad.addColorStop(1, '#075985');
      egCtx.beginPath();
      egCtx.arc(earthX, cy, earthR, 0, Math.PI * 2);
      egCtx.fillStyle = earthGrad;
      egCtx.fill();

      // Mancha de totalidad umbral
      egCtx.beginPath();
      egCtx.arc(earthX - earthR + 3, cy, 3.5, 0, Math.PI * 2);
      egCtx.fillStyle = '#000000';
      egCtx.fill();

      // Rótulos explicativos
      egCtx.fillStyle = '#f8fafc';
      egCtx.font = '11px Outfit, sans-serif';
      egCtx.fillText('Sol', sunX - 10, cy + sunR + 18);
      egCtx.fillText('Luna (Novilunio)', moonX - 35, cy + moonR + 20);
      egCtx.fillText('Tierra', earthX - 14, cy + earthR + 20);

      egCtx.fillStyle = '#ef4444';
      egCtx.fillText('● Franja de Totalidad (Umbra)', earthX - 170, cy - 10);
      egCtx.fillStyle = '#94a3b8';
      egCtx.fillText('Zona de Penumbra (Eclipse Parcial)', earthX - 190, cy + 50);

    } else {
      // ECLIPSE LUNAR (TIERRA EN EL CENTRO)
      const sunX = 85;
      const sunR = 36;
      const sunGrad = egCtx.createRadialGradient(sunX, cy, 6, sunX, cy, sunR);
      sunGrad.addColorStop(0, '#fffbeb');
      sunGrad.addColorStop(0.4, '#fde047');
      sunGrad.addColorStop(1, '#f59e0b');
      egCtx.beginPath();
      egCtx.arc(sunX, cy, sunR, 0, Math.PI * 2);
      egCtx.fillStyle = sunGrad;
      egCtx.fill();

      // Tierra en medio
      const earthX = 350;
      const earthR = 30;

      // Luna a la derecha
      const moonX = 620;
      const moonR = 14;

      // Cono de Umbra de la Tierra
      egCtx.beginPath();
      egCtx.moveTo(sunX, cy - sunR);
      egCtx.lineTo(earthX, cy - earthR);
      egCtx.lineTo(w, cy - 10);
      egCtx.lineTo(w, cy + 10);
      egCtx.lineTo(earthX, cy + earthR);
      egCtx.lineTo(sunX, cy + sunR);
      egCtx.closePath();
      egCtx.fillStyle = 'rgba(69, 10, 10, 0.45)';
      egCtx.fill();

      // Cono de Penumbra
      egCtx.beginPath();
      egCtx.moveTo(sunX, cy - sunR);
      egCtx.lineTo(earthX, cy + earthR);
      egCtx.lineTo(w, cy + 70);
      egCtx.lineTo(w, cy - 70);
      egCtx.lineTo(earthX, cy - earthR);
      egCtx.closePath();
      egCtx.fillStyle = 'rgba(148, 163, 184, 0.1)';
      egCtx.fill();

      // Rayos luminosos
      egCtx.strokeStyle = 'rgba(239, 68, 68, 0.35)';
      egCtx.lineWidth = 1;
      egCtx.beginPath();
      egCtx.moveTo(sunX, cy - sunR); egCtx.lineTo(earthX, cy - earthR); egCtx.lineTo(w, cy - 10);
      egCtx.moveTo(sunX, cy + sunR); egCtx.lineTo(earthX, cy + earthR); egCtx.lineTo(w, cy + 10);
      egCtx.stroke();

      // Dibujar Tierra
      const earthGrad = egCtx.createRadialGradient(earthX - 8, cy - 8, 4, earthX, cy, earthR);
      earthGrad.addColorStop(0, '#38bdf8');
      earthGrad.addColorStop(0.6, '#0284c7');
      earthGrad.addColorStop(1, '#075985');
      egCtx.beginPath();
      egCtx.arc(earthX, cy, earthR, 0, Math.PI * 2);
      egCtx.fillStyle = earthGrad;
      egCtx.fill();

      // Atmósfera refractante
      egCtx.beginPath();
      egCtx.arc(earthX, cy, earthR + 3, 0, Math.PI * 2);
      egCtx.strokeStyle = 'rgba(239, 68, 68, 0.6)';
      egCtx.lineWidth = 2;
      egCtx.stroke();

      // Dibujar Luna de Sangre
      const bloodGrad = egCtx.createRadialGradient(moonX - 4, cy - 4, 2, moonX, cy, moonR);
      bloodGrad.addColorStop(0, '#f87171');
      bloodGrad.addColorStop(0.5, '#dc2626');
      bloodGrad.addColorStop(1, '#7f1d1d');
      egCtx.beginPath();
      egCtx.arc(moonX, cy, moonR, 0, Math.PI * 2);
      egCtx.fillStyle = bloodGrad;
      egCtx.strokeStyle = 'rgba(239, 68, 68, 0.8)';
      egCtx.lineWidth = 1.5;
      egCtx.fill();
      egCtx.stroke();

      // Textos
      egCtx.fillStyle = '#f8fafc';
      egCtx.font = '11px Outfit, sans-serif';
      egCtx.fillText('Sol', sunX - 10, cy + sunR + 18);
      egCtx.fillText('Tierra (Bloqueo Directo)', earthX - 55, cy + earthR + 20);
      egCtx.fillStyle = '#ef4444';
      egCtx.fillText('Luna Llena en Umbra (Luna de Sangre)', moonX - 95, cy + moonR + 20);
      egCtx.fillStyle = '#fca5a5';
      egCtx.fillText('Luz roja refractada por la atmósfera', earthX + 45, cy - 20);
    }
  }

  function selectEclipse(type) {
    state.eclipseType = type;
    btnEclipseSolar.classList.toggle('active', type === 'solar');
    btnEclipseLunar.classList.toggle('active', type === 'lunar');

    if (type === 'solar') {
      updateMoonPhase(0, 'solar');
      if (eclipseGeometryTitle) eclipseGeometryTitle.textContent = 'Eclipse Solar: La Luna entre el Sol y la Tierra (Conos de Umbra y Penumbra)';
      if (eclipseGeometryDesc) eclipseGeometryDesc.textContent = 'La Luna se interpone en la línea de visión Sol-Tierra. Su sombra proyecta una estrecha franja de totalidad (umbra, ~150 km) donde la fotosfera queda oculta y se observa la corona solar, y una penumbra más ancha de eclipse parcial.';
      if (eclipseVideoFrame) eclipseVideoFrame.src = 'https://www.youtube-nocookie.com/embed/cxrLRbkOwKs?rel=0';
      if (videoTitleLabel) videoTitleLabel.textContent = 'Totalidad del Eclipse Solar • NASA SVS';
      if (eclipseRealPhotoImg) eclipseRealPhotoImg.src = 'https://images-assets.nasa.gov/image/PIA13083/PIA13083~medium.jpg';
      if (photoTitleLabel) photoTitleLabel.textContent = 'Corona Solar y Anillo de Diamante';
      if (eclipsePhotoCaption) eclipsePhotoCaption.textContent = 'Estructura magnética de la corona solar visible exclusivamente durante los minutos de totalidad umbral.';
    } else {
      updateMoonPhase(14.8, 'lunar');
      if (eclipseGeometryTitle) eclipseGeometryTitle.textContent = 'Eclipse Lunar: La Tierra entre el Sol y la Luna Llena (Refracción Atmosférica)';
      if (eclipseGeometryDesc) eclipseGeometryDesc.textContent = 'La Tierra bloquea la radiación directa del Sol. Los rayos solares atraviesan el borde atmosférico terrestre, el cual dispersa las longitudes azules (filtro Rayleigh) y desvía la luz roja hacia la Luna, otorgándole su característico tono cobrizo.';
      if (eclipseVideoFrame) eclipseVideoFrame.src = 'https://www.youtube-nocookie.com/embed/wuhNZejHeBg?rel=0';
      if (videoTitleLabel) videoTitleLabel.textContent = 'Dispersión Atmosférica y Luna de Sangre • NASA SVS';
      if (eclipseRealPhotoImg) eclipseRealPhotoImg.src = 'https://images-assets.nasa.gov/image/GSFC_20171208_Archive_e001427/GSFC_20171208_Archive_e001427~medium.jpg';
      if (photoTitleLabel) photoTitleLabel.textContent = 'Secuencia Fotográfica de Luna de Sangre';
      if (eclipsePhotoCaption) eclipsePhotoCaption.textContent = 'Entrada del disco lunar en el cono de umbra de la Tierra durante la totalidad.';
    }
    renderEclipseGeometryCanvas(type);
    updateAstroDataCard('moon');
    playChime();
  }

  btnEclipseSolar.addEventListener('click', () => selectEclipse('solar'));
  btnEclipseLunar.addEventListener('click', () => selectEclipse('lunar'));

  // ==========================================================================
  // 8. MÓDULO 4: LLUVIAS DE METEOROS Y COMETAS
  // ==========================================================================
  const meteorCanvas = document.getElementById('meteorCanvas');
  const mCtx = meteorCanvas.getContext('2d');
  const btnSpawnBolide = document.getElementById('btnSpawnBolide');
  const btnShowerStorm = document.getElementById('btnShowerStorm');
  const meteorStatusBadge = document.getElementById('meteorStatusBadge');
  const meteorTableBody = document.getElementById('meteorTableBody');

  let activeMeteors = [];
  let meteorParticles = [];
  let meteorBgStars = [];
  let stormActive = false;
  let flashAlpha = 0;

  const meteorShowersData = [
    { name: 'Cuadrántidas', date: '3-4 Enero', thz: '110', parent: 'Asteroide 2003 EH1', vis: 'Excelente en hemisferio norte' },
    { name: 'Líridas', date: '21-22 Abril', thz: '18', parent: 'Cometa C/1861 G1 Thatcher', vis: 'Cielo oscuro sin Luna' },
    { name: 'Perseidas (Lágrimas de San Lorenzo)', date: '12-13 Agosto', thz: '100', parent: 'Cometa 109P/Swift-Tuttle', vis: 'Óptima global (muy popular)' },
    { name: 'Oriónidas', date: '21-22 Octubre', thz: '25', parent: 'Cometa 1P/Halley', vis: 'Bólidos rápidos y brillantes' },
    { name: 'Gemínidas', date: '13-14 Diciembre', thz: '120-150', parent: 'Asteroide (3200) Faetón', vis: 'La más intensa y confiable del año' }
  ];

  function initMeteorCanvas() {
    const parentW = meteorCanvas.parentElement ? meteorCanvas.parentElement.clientWidth : 0;
    meteorCanvas.width = parentW > 100 ? parentW : 760;
    meteorCanvas.height = 380;

    // Generar 120 estrellas de fondo fijas con titileo
    meteorBgStars = [];
    for (let i = 0; i < 120; i++) {
      meteorBgStars.push({
        x: Math.random() * meteorCanvas.width,
        y: Math.random() * (meteorCanvas.height - 50),
        r: Math.random() * 1.5 + 0.5,
        alpha: Math.random() * 0.7 + 0.3,
        twinkleSpeed: Math.random() * 0.04 + 0.01,
        phase: Math.random() * Math.PI * 2
      });
    }

    // Inicializar con algunos meteoros activos de inmediato
    activeMeteors = [];
    for (let i = 0; i < 4; i++) {
      createMeteor(false);
    }
  }

  function createMeteor(isBolide = false) {
    const w = meteorCanvas.width;
    const h = meteorCanvas.height;
    // El radiante de las Perseidas se ubica en el cuadrante superior izquierdo (Perseo)
    const radX = w * 0.22;
    const radY = h * 0.20;

    const startX = isBolide ? radX + (Math.random() * 40 - 20) : radX + (Math.random() * 160 - 80);
    const startY = isBolide ? radY + (Math.random() * 30 - 15) : radY + (Math.random() * 80 - 40);

    const baseAngle = Math.PI / 4; // Dirección 45 grados (abajo a la derecha)
    const angleSpread = (Math.random() - 0.5) * 0.35;
    const angle = baseAngle + angleSpread;

    const speed = isBolide ? 13 : Math.random() * 8 + 8;
    const len = isBolide ? 160 : Math.random() * 70 + 40;

    activeMeteors.push({
      x: startX,
      y: startY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      len: len,
      life: 1.0,
      decay: isBolide ? 0.016 : Math.random() * 0.03 + 0.02,
      isBolide: isBolide,
      sparkTimer: 0
    });

    if (isBolide) {
      flashAlpha = 0.45; // Destello momentáneo en el firmamento
    }
  }

  function drawMeteorHorizon(w, h) {
    // Silueta de cordillera montañosa en el horizonte con cúpula de observatorio
    mCtx.save();
    mCtx.beginPath();
    mCtx.moveTo(0, h);
    mCtx.lineTo(0, h - 35);
    mCtx.lineTo(w * 0.15, h - 55);
    mCtx.lineTo(w * 0.32, h - 30);
    mCtx.lineTo(w * 0.50, h - 65);
    mCtx.lineTo(w * 0.68, h - 40);

    // Cúpula del observatorio astronómico
    const obsX = w * 0.82;
    const obsY = h - 38;
    mCtx.lineTo(obsX - 22, h - 32);
    mCtx.lineTo(obsX - 16, obsY);
    mCtx.arc(obsX, obsY, 14, Math.PI, 0, false);
    mCtx.lineTo(obsX + 16, obsY);
    mCtx.lineTo(obsX + 22, h - 32);

    mCtx.lineTo(w, h - 45);
    mCtx.lineTo(w, h);
    mCtx.closePath();

    mCtx.fillStyle = state.nightMode ? '#150202' : '#040714';
    mCtx.fill();

    // Línea de horizonte tenue
    mCtx.strokeStyle = state.nightMode ? 'rgba(239, 68, 68, 0.25)' : 'rgba(56, 189, 248, 0.2)';
    mCtx.lineWidth = 1;
    mCtx.stroke();

    // Luz guía tenue del telescopio (faro de observación)
    mCtx.beginPath();
    mCtx.arc(obsX, obsY - 14, 2, 0, Math.PI * 2);
    mCtx.fillStyle = state.nightMode ? '#ef4444' : '#38bdf8';
    mCtx.fill();

    mCtx.restore();
  }

  function renderMeteors() {
    const w = meteorCanvas.width;
    const h = meteorCanvas.height;

    // 1. Cielo nocturno con gradiente de profundidad
    const skyGrad = mCtx.createLinearGradient(0, 0, 0, h);
    if (state.nightMode) {
      skyGrad.addColorStop(0, '#0a0101');
      skyGrad.addColorStop(1, '#1c0404');
    } else {
      skyGrad.addColorStop(0, '#02040a');
      skyGrad.addColorStop(0.65, '#050b1d');
      skyGrad.addColorStop(1, '#0c152e');
    }
    mCtx.fillStyle = skyGrad;
    mCtx.fillRect(0, 0, w, h);

    // 2. Destello de bólido en atmósfera
    if (flashAlpha > 0.01) {
      mCtx.fillStyle = state.nightMode ? `rgba(254, 202, 202, ${flashAlpha})` : `rgba(224, 242, 254, ${flashAlpha})`;
      mCtx.fillRect(0, 0, w, h);
      flashAlpha *= 0.88;
    }

    // 3. Estrellas de fondo fijas y titilantes
    meteorBgStars.forEach(st => {
      st.phase += st.twinkleSpeed;
      const curAlpha = Math.max(0.2, Math.min(1.0, st.alpha + Math.sin(st.phase) * 0.3));
      mCtx.beginPath();
      mCtx.arc(st.x, st.y, st.r, 0, Math.PI * 2);
      mCtx.fillStyle = state.nightMode ? `rgba(254, 202, 202, ${curAlpha})` : `rgba(255, 255, 255, ${curAlpha})`;
      mCtx.fill();
    });

    // 4. Marcador visual del Radiante de Perseidas
    const radX = w * 0.22;
    const radY = h * 0.20;
    const pulse = (Math.sin(Date.now() * 0.003) + 1) / 2;

    mCtx.beginPath();
    mCtx.arc(radX, radY, 9 + pulse * 4, 0, Math.PI * 2);
    mCtx.strokeStyle = state.nightMode ? `rgba(239, 68, 68, ${0.3 + pulse * 0.4})` : `rgba(56, 189, 248, ${0.3 + pulse * 0.4})`;
    mCtx.lineWidth = 1.2;
    mCtx.stroke();

    mCtx.beginPath();
    mCtx.arc(radX, radY, 2.5, 0, Math.PI * 2);
    mCtx.fillStyle = state.nightMode ? '#ef4444' : '#38bdf8';
    mCtx.fill();

    mCtx.font = '10px Outfit, sans-serif';
    mCtx.fillStyle = state.nightMode ? '#fca5a5' : '#93c5fd';
    mCtx.fillText('★ Radiante Perseidas', radX + 14, radY + 3);

    // 5. Tasa de generación de meteoros
    const spawnRate = stormActive ? 0.38 : 0.045;
    if (Math.random() < spawnRate) {
      createMeteor(false);
    }

    // 6. Actualización y dibujo de meteoros
    for (let i = activeMeteors.length - 1; i >= 0; i--) {
      const m = activeMeteors[i];
      m.x += m.vx;
      m.y += m.vy;
      m.life -= m.decay;

      // Generación de chispas secundarias en bólidos
      if (m.isBolide) {
        m.sparkTimer++;
        if (m.sparkTimer % 2 === 0) {
          meteorParticles.push({
            x: m.x,
            y: m.y,
            vx: (Math.random() - 0.5) * 2 - m.vx * 0.15,
            vy: (Math.random() - 0.5) * 2 - m.vy * 0.15,
            life: 1.0,
            decay: Math.random() * 0.06 + 0.04,
            size: Math.random() * 2.5 + 1.2
          });
        }
      }

      const tailX = m.x - m.vx * (m.len / 10);
      const tailY = m.y - m.vy * (m.len / 10);

      const grad = mCtx.createLinearGradient(m.x, m.y, tailX, tailY);
      if (state.nightMode) {
        grad.addColorStop(0, `rgba(254, 226, 226, ${m.life})`);
        grad.addColorStop(0.3, `rgba(239, 68, 68, ${m.life * 0.8})`);
        grad.addColorStop(1, 'rgba(239, 68, 68, 0)');
      } else {
        if (m.isBolide) {
          grad.addColorStop(0, `rgba(255, 255, 255, ${m.life})`);
          grad.addColorStop(0.25, `rgba(253, 224, 71, ${m.life})`);
          grad.addColorStop(0.65, `rgba(249, 115, 22, ${m.life * 0.8})`);
          grad.addColorStop(1, 'rgba(239, 68, 68, 0)');
        } else {
          grad.addColorStop(0, `rgba(255, 255, 255, ${m.life})`);
          grad.addColorStop(0.3, `rgba(56, 189, 248, ${m.life * 0.8})`);
          grad.addColorStop(1, 'rgba(14, 165, 233, 0)');
        }
      }

      mCtx.beginPath();
      mCtx.moveTo(m.x, m.y);
      mCtx.lineTo(tailX, tailY);
      mCtx.strokeStyle = grad;
      mCtx.lineWidth = m.isBolide ? 5 : 1.8;
      mCtx.stroke();

      // Cabeza brillante de ionización
      mCtx.beginPath();
      mCtx.arc(m.x, m.y, m.isBolide ? 3.5 : 1.4, 0, Math.PI * 2);
      mCtx.fillStyle = '#ffffff';
      mCtx.fill();

      if (m.life <= 0 || m.x > w || m.y > h) {
        activeMeteors.splice(i, 1);
      }
    }

    // 7. Partículas de chispas incandescentes
    for (let pIdx = meteorParticles.length - 1; pIdx >= 0; pIdx--) {
      const p = meteorParticles[pIdx];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= p.decay;

      mCtx.beginPath();
      mCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      mCtx.fillStyle = state.nightMode ? `rgba(254, 202, 202, ${p.life})` : `rgba(253, 224, 71, ${p.life})`;
      mCtx.fill();

      if (p.life <= 0) {
        meteorParticles.splice(pIdx, 1);
      }
    }

    // 8. Silueta del horizonte con observatorio
    drawMeteorHorizon(w, h);

    if (state.currentModule === 'meteors') {
      meteorAnimId = requestAnimationFrame(renderMeteors);
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
    if (meteorStatusBadge) {
      meteorStatusBadge.textContent = stormActive ? '⚡ Tormenta Activa: Tasa THZ > 150 met/h (Intensa)' : 'Radiante Activo: Perseidas (100 met/h)';
      meteorStatusBadge.style.color = stormActive ? '#facc15' : '#38bdf8';
    }
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
  const modalImg = document.getElementById('modalImg');

  const deepSkyObjects = [
    {
      id: 'andromeda',
      name: 'Galaxia de Andrómeda (M31)',
      type: 'Galaxia Espiral Gigante',
      dist: '2.5 millones de años luz',
      telescope: 'Hubble Space Telescope',
      telescopeShort: 'Hubble / Spitzer',
      imgUrl: 'img/andromeda.jpg',
      desc: 'El objeto astronómico más distante visible a simple vista bajo cielos oscuros. Alberga aproximadamente un billón de estrellas y una densa población de cúmulos globulares; se aproxima a la Vía Láctea a 110 km/s hacia una colisión dentro de 4.500 millones de años.'
    },
    {
      id: 'orion_nebula',
      name: 'Gran Nebulosa de Orión (M42)',
      type: 'Nebulosa Difusa de Emisión y Reflexión',
      dist: '1.344 años luz',
      telescope: 'James Webb Space Telescope (JWST) / Hubble',
      telescopeShort: 'JWST / Hubble',
      imgUrl: 'img/orion_nebula.jpg',
      desc: 'Una de las incubadoras estelares más activas y cercanas a nuestro sistema solar. En su centro reside el Cúmulo del Trapecio, cuyas jóvenes estrellas masivas ionizan el gas de hidrógeno y oxígeno circundante haciéndolo brillar intensamente.'
    },
    {
      id: 'pillars',
      name: 'Pilares de la Creación (M16)',
      type: 'Columnas Moleculares de Polvo y Gas Frío',
      dist: '7.000 años luz',
      telescope: 'James Webb Space Telescope (Cámara Infrarroja NIRCam)',
      telescopeShort: 'James Webb (JWST)',
      imgUrl: 'img/pillars.jpg',
      desc: 'Monumentales torres de gas y polvo interestelar situadas en el corazón de la Nebulosa del Águila. La radiación ultravioleta de estrellas jóvenes esculpe las columnas donde nuevas protoestrellas continúan condensándose por colapso gravitatorio.'
    },
    {
      id: 'sombrero',
      name: 'Galaxia del Sombrero (M104)',
      type: 'Galaxia Espiral no Barrada (SAa)',
      dist: '29.3 millones de años luz',
      telescope: 'Hubble Space Telescope (ACS / WFPC2)',
      telescopeShort: 'Hubble Heritage',
      imgUrl: 'img/sombrero.jpg',
      desc: 'Famosa por su brillante bulbo central sobredimensionado y un prominente anillo de polvo oscuro interestelar que cruza su disco, otorgándole la silueta inconfundible de un sombrero de ala ancha. En su núcleo alberga un agujero negro supermasivo de mil millones de masas solares.'
    }
  ];

  function populateGallery() {
    deepSkyGallery.innerHTML = '';
    deepSkyObjects.forEach(obj => {
      const card = document.createElement('div');
      card.className = 'gallery-card';
      card.innerHTML = `
        <div class="gallery-img-thumb">
          <img src="${obj.imgUrl}" alt="${obj.name}" class="gallery-thumb-img" loading="lazy">
          <span class="gallery-telescope-tag">${obj.telescopeShort}</span>
        </div>
        <div class="gallery-info">
          <h4 class="gallery-title">${obj.name}</h4>
          <p class="gallery-desc">${obj.type} • ${obj.dist}</p>
        </div>
      `;
      card.addEventListener('click', () => {
        if (modalImg) {
          modalImg.src = obj.imgUrl;
          modalImg.alt = obj.name;
        }
        modalTitle.textContent = obj.name;
        modalDesc.textContent = obj.desc;
        modalSpecs.innerHTML = `
          <li><strong>Tipo de Objeto:</strong> ${obj.type}</li>
          <li><strong>Distancia Estimada:</strong> ${obj.dist}</li>
          <li><strong>Instrumento Principal:</strong> ${obj.telescope}</li>
          <li><strong>Archivo Científico:</strong> NASA / ESA / STScI / JPL</li>
        `;
        viewerModal.classList.remove('hidden');
        playTone(620, 'sine', 0.15, 0.08);
      });
      deepSkyGallery.appendChild(card);
    });
  }

  if (modalClose) {
    modalClose.addEventListener('click', () => viewerModal.classList.add('hidden'));
  }

  if (viewerModal) {
    viewerModal.addEventListener('click', (e) => {
      if (e.target === viewerModal) {
        viewerModal.classList.add('hidden');
      }
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && viewerModal && !viewerModal.classList.contains('hidden')) {
      viewerModal.classList.add('hidden');
    }
  });

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
  // 11. ZONA 7: FICHA CIENTÍFICA DEL OBJETO Y QUIZ FORMATIVO MULTIPREGUNTA
  // ==========================================================================
  const astroDataCard = document.getElementById('astroDataCard');
  const quizCounter = document.getElementById('quizCounter');
  const quizQuestion = document.getElementById('quizQuestion');
  const quizOptions = document.getElementById('quizOptions');
  const quizFeedback = document.getElementById('quizFeedback');
  const btnRetryQuiz = document.getElementById('btnRetryQuiz');
  const btnNextQuiz = document.getElementById('btnNextQuiz');

  const scientificCatalog = {
    planets: {
      mercury: { name: 'Mercurio', dSun: '57.9 M km (0.39 UA)', diam: '4.879 km', mass: '3.30 × 10²³ kg', period: '88 días terrestres', rot: '58.6 días', temp: '-180 °C a 430 °C', moons: '0', comp: 'Núcleo de hierro metálico (70%) y corteza de silicatos' },
      venus: { name: 'Venus', dSun: '108.2 M km (0.72 UA)', diam: '12.104 km', mass: '4.87 × 10²⁴ kg', period: '224.7 días', rot: '-243 días (retrógrado)', temp: '465 °C constante', moons: '0', comp: 'Atmósfera supercrítica (96.5% CO₂) con nubes de ácido sulfúrico' },
      earth: { name: 'Tierra', dSun: '149.6 M km (1.00 UA)', diam: '12.742 km', mass: '5.97 × 10²⁴ kg', period: '365.25 días', rot: '23h 56m 04s', temp: '15 °C promedio', moons: '1 (Luna)', comp: 'Corteza granítica/basáltica, manto peridotítico y núcleo Fe-Ni' },
      mars: { name: 'Marte', dSun: '227.9 M km (1.52 UA)', diam: '6.779 km', mass: '6.42 × 10²³ kg', period: '687 días', rot: '24h 37m 22s', temp: '-63 °C promedio', moons: '2 (Fobos, Deimos)', comp: 'Regolito basáltico rico en óxidos de hierro (III) y casquetes polares' },
      jupiter: { name: 'Júpiter', dSun: '778.5 M km (5.20 UA)', diam: '139.820 km', mass: '1.90 × 10²⁷ kg (318 Tierras)', period: '11.86 años', rot: '9h 55m (diferencial)', temp: '-110 °C en nubes', moons: '95 confirmadas', comp: '90% Hidrógeno molecular, 10% Helio y núcleo rocoso difuso' },
      saturn: { name: 'Saturno', dSun: '1.433 M km (9.58 UA)', diam: '116.460 km', mass: '5.68 × 10²⁶ kg (95 Tierras)', period: '29.45 años', rot: '10h 33m', temp: '-140 °C', moons: '146 confirmadas', comp: 'Envoltura gaseosa de H y He, sistema anular de partículas de hielo' },
      uranus: { name: 'Urano', dSun: '2.871 M km (19.2 UA)', diam: '50.724 km', mass: '8.68 × 10²⁵ kg (14.5 Tierras)', period: '84.02 años', rot: '-17h 14m (inclinación 97.8°)', temp: '-195 °C', moons: '28 confirmadas', comp: 'Manto de hielos volátiles (agua, metano, amoníaco) sobre núcleo rocoso' },
      neptune: { name: 'Neptuno', dSun: '4.495 M km (30.1 UA)', diam: '49.244 km', mass: '1.02 × 10²⁶ kg (17.1 Tierras)', period: '164.8 años', rot: '16h 06m', temp: '-201 °C (vientos 2.100 km/h)', moons: '16 confirmadas', comp: 'Atmósfera rica en metano con manto superiónico conductor' }
    },
    constellations: {
      orion: { name: 'Orión (El Cazador)', area: '594 grados cuadrados', quadrant: 'Ecuador Celeste (Visibilidad global)', brightest: 'Rigel (β Orionis, supergigante azul)', redSuper: 'Betelgeuse (α Orionis, supergigante roja)', guide: 'Cinturón de 3 estrellas (Alnitak, Alnilam, Mintaka)', bestSeason: 'Diciembre a Marzo' },
      ursa_major: { name: 'Osa Mayor (El Carro)', area: '1.280 grados cuadrados (Puesto 3)', quadrant: 'Hemisferio Norte (Circumpolar)', brightest: 'Alioth (ε UMa, magnitud 1.77)', redSuper: 'Mizar y Alcor (par binario observable)', guide: 'Punteros Merak y Dubhe (apuntan a Polaris)', bestSeason: 'Abril a Junio' },
      crux: { name: 'Cruz del Sur (Crux)', area: '68 grados cuadrados (La menor del cielo)', quadrant: 'Hemisferio Sur (Guía polar austral)', brightest: 'Ácrux (α Crucis, magnitud 0.77)', redSuper: 'Gacrux (γ Crucis, gigante roja cálida)', guide: 'Eje vertical extendido 4.5 veces señala el Polo Sur', bestSeason: 'Mayo a Julio' }
    }
  };

  function updateAstroDataCard(modId) {
    if (!astroDataCard) return;

    if (modId === 'solar') {
      const p = scientificCatalog.planets[state.selectedPlanet] || scientificCatalog.planets.earth;
      astroDataCard.innerHTML = `
        <table class="astro-data-table">
          <tr><th>Cuerpo</th><td><strong>${p.name}</strong></td></tr>
          <tr><th>Distancia al Sol</th><td>${p.dSun}</td></tr>
          <tr><th>Diámetro</th><td>${p.diam}</td></tr>
          <tr><th>Masa</th><td>${p.mass}</td></tr>
          <tr><th>Órbita (Período)</th><td>${p.period}</td></tr>
          <tr><th>Rotación</th><td>${p.rot}</td></tr>
          <tr><th>Temperatura</th><td>${p.temp}</td></tr>
          <tr><th>Satélites</th><td>${p.moons}</td></tr>
          <tr><th>Composición</th><td>${p.comp}</td></tr>
        </table>
      `;
    } else if (modId === 'constellations') {
      const c = scientificCatalog.constellations[state.selectedConstellation] || scientificCatalog.constellations.orion;
      astroDataCard.innerHTML = `
        <table class="astro-data-table">
          <tr><th>Constelación</th><td><strong>${c.name}</strong></td></tr>
          <tr><th>Extensión</th><td>${c.area}</td></tr>
          <tr><th>Cuadrante</th><td>${c.quadrant}</td></tr>
          <tr><th>Estrella Principal</th><td>${c.brightest}</td></tr>
          <tr><th>Vértice Característico</th><td>${c.redSuper}</td></tr>
          <tr><th>Guía de Orientación</th><td>${c.guide}</td></tr>
          <tr><th>Mejor Época</th><td>${c.bestSeason}</td></tr>
        </table>
      `;
    } else if (modId === 'moon') {
      const isEclipse = state.eclipseType;
      astroDataCard.innerHTML = `
        <table class="astro-data-table">
          <tr><th>Cuerpo</th><td><strong>Luna (Satélite Natural)</strong></td></tr>
          <tr><th>Día del Ciclo</th><td>${state.moonDay.toFixed(1)} / 29.53 días sinódicos</td></tr>
          <tr><th>Distancia Media</th><td>384.400 km (Perigeo 363k / Apogeo 405k)</td></tr>
          <tr><th>Diámetro Ecuatorial</th><td>3.474 km (27% del terrestre)</td></tr>
          <tr><th>Gravedad Superficial</th><td>1.62 m/s² (0.166 g)</td></tr>
          <tr><th>Estado Orbital</th><td>${state.moonEclipse === 'solar' ? 'Eclipse Solar Total (Alineación Fotosférica)' : state.moonEclipse === 'lunar' ? 'Eclipse Lunar Total (Refracción Rayleigh Cobriza)' : 'Fase Lunar Estándar'}</td></tr>
          <tr><th>Geometría de Sombra</th><td>${state.moonEclipse ? 'Sicigia perfecta Sol-Tierra-Luna' : 'Inclinación orbital de 5.14° respecto a la eclíptica'}</td></tr>
        </table>
      `;
    } else if (modId === 'meteors') {
      astroDataCard.innerHTML = `
        <table class="astro-data-table">
          <tr><th>Fenómeno</th><td><strong>Lluvia de Meteoros (Perseidas)</strong></td></tr>
          <tr><th>Cuerpo Progenitor</th><td>Cometa periódico 109P/Swift-Tuttle</td></tr>
          <tr><th>Velocidad de Ingreso</th><td>59 km/s (aprox. 212.000 km/h)</td></tr>
          <tr><th>Zona de Ionización</th><td>Mesosfera terrestre (85 a 100 km)</td></tr>
          <tr><th>Naturaleza del Grano</th><td>Partículas micrométricas de polvo y hielo</td></tr>
          <tr><th>Bólidos (Fireballs)</th><td>Meteoroides >1 cm con estela persistente</td></tr>
          <tr><th>Régimen Actual</th><td>${stormActive ? 'Tormenta Activa (>150 met/h)' : 'Flujo Estándar (100 met/h)'}</td></tr>
        </table>
      `;
    } else if (modId === 'galaxies') {
      astroDataCard.innerHTML = `
        <table class="astro-data-table">
          <tr><th>Catálogo</th><td><strong>Espacio Profundo (Messier / NGC)</strong></td></tr>
          <tr><th>Objetos Clave</th><td>Andrómeda (M31), Nebulosa de Orión (M42)</td></tr>
          <tr><th>Rango de Distancias</th><td>1.344 a 2.500.000 años luz</td></tr>
          <tr><th>Morfología Galáctica</th><td>Espirales, elípticas e irregulares</td></tr>
          <tr><th>Instrumentos Ópticos</th><td>Hubble (Visible/UV) y James Webb (Infrarrojo)</td></tr>
          <tr><th>Física de Guarderías</th><td>Gas molecular frío y colapso protoestelar</td></tr>
        </table>
      `;
    } else if (modId === 'astrophoto') {
      astroDataCard.innerHTML = `
        <table class="astro-data-table">
          <tr><th>Técnica</th><td><strong>Astrofotografía de Gran Campo</strong></td></tr>
          <tr><th>Regla de los 500</th><td>T_max = 500 / Focal (evita trazas estelares)</td></tr>
          <tr><th>Ejemplo Focal 24mm</th><td>500 / 24 ≈ 20.8 segundos de exposición máx.</td></tr>
          <tr><th>Sensibilidad ISO</th><td>ISO 1600 - 3200 (balance ruido/captación)</td></tr>
          <tr><th>Enfoque Óptimo</th><td>Modo manual fijado exactamente en Infinito (∞)</td></tr>
          <tr><th>Modo Nocturno</th><td>Luz roja suave para no alterar la pupila humana</td></tr>
        </table>
      `;
    }
  }

  function loadModuleQuiz(modId) {
    const qList = quizzesData[modId];
    if (!qList || qList.length === 0) return;

    if (state.moduleQuizIndex[modId] === undefined) {
      state.moduleQuizIndex[modId] = 0;
    }
    const idx = state.moduleQuizIndex[modId];
    const qData = qList[idx];

    if (quizCounter) quizCounter.textContent = `Pregunta ${idx + 1} de ${qList.length}`;
    quizQuestion.textContent = qData.q;
    quizFeedback.textContent = '';
    quizOptions.innerHTML = '';

    if (btnRetryQuiz) btnRetryQuiz.classList.add('hidden');
    if (btnNextQuiz) btnNextQuiz.classList.add('hidden');

    qData.opts.forEach((optText, optIdx) => {
      const b = document.createElement('button');
      b.className = 'btn-quiz';
      b.textContent = `${['A', 'B', 'C', 'D'][optIdx]}) ${optText}`;
      b.addEventListener('click', () => {
        const isCorrect = (optIdx === qData.ans);
        Array.from(quizOptions.children).forEach((child, cIdx) => {
          child.disabled = true;
          if (cIdx === qData.ans) child.classList.add('correct');
          else if (cIdx === optIdx) child.classList.add('wrong');
        });

        if (isCorrect) {
          quizFeedback.textContent = `¡Correcto! ${qData.why}`;
          quizFeedback.style.color = '#10b981';
          playChime();
          if (btnRetryQuiz) btnRetryQuiz.classList.add('hidden');

          if (btnNextQuiz) {
            btnNextQuiz.textContent = (idx < qList.length - 1) ? 'Siguiente pregunta ➔' : '↺ Reiniciar cuestionario';
            btnNextQuiz.classList.remove('hidden');
          }
        } else {
          quizFeedback.textContent = `Respuesta incorrecta. ${qData.why}`;
          quizFeedback.style.color = '#ef4444';
          playTone(240, 'sawtooth', 0.25, 0.08);

          // Permitir reintentar de inmediato
          if (btnRetryQuiz) btnRetryQuiz.classList.remove('hidden');

          if (btnNextQuiz && idx < qList.length - 1) {
            btnNextQuiz.textContent = 'Saltar a la siguiente ➔';
            btnNextQuiz.classList.remove('hidden');
          }
        }
      });
      quizOptions.appendChild(b);
    });
  }

  if (btnRetryQuiz) {
    btnRetryQuiz.addEventListener('click', () => {
      loadModuleQuiz(state.currentModule);
      playTone(480, 'sine', 0.1, 0.05);
    });
  }

  if (btnNextQuiz) {
    btnNextQuiz.addEventListener('click', () => {
      const qList = quizzesData[state.currentModule];
      if (!qList) return;
      state.moduleQuizIndex[state.currentModule] = (state.moduleQuizIndex[state.currentModule] + 1) % qList.length;
      loadModuleQuiz(state.currentModule);
      playTone(550, 'sine', 0.1, 0.06);
    });
  }

  // ==========================================================================
  // 12. INICIALIZACIÓN GENERAL AL CARGAR EL DOM
  // ==========================================================================
  populatePlanetCards();
  populateConstellationUI();
  populateMeteorTable();
  populateGallery();

  switchModule('solar');
  updateMoonPhase(7.4);

  window.addEventListener('resize', () => {
    if (state.currentModule === 'solar') initSolarCanvas();
    if (state.currentModule === 'constellations') { initSkyCanvas(); drawSky(); }
    if (state.currentModule === 'meteors') initMeteorCanvas();
    if (state.currentModule === 'astrophoto') renderViewfinder();
  });
});
