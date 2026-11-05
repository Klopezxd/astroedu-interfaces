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
    moonSimMode: 'moon',
    moonDay: 7.4,
    solarProgress: 50,
    lunarProgress: 50,
    eclipseType: 'solar',
    eclipseVideoIndex: 0,
    eclipsePhotoIndex: 0,
    moduleQuizIndex: { solar: 0, constellations: 0, moon: 0, meteors: 0, galaxies: 0, astrophoto: 0 },
    cameraIso: 1600,
    cameraExp: 15,
    cameraFocus: 100,
    bortleClass: 4
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

    if (modId !== 'moon') {
      if (eclipseVideoFrame && eclipseVideoFrame.src && eclipseVideoFrame.src.includes('youtube')) {
        eclipseVideoFrame.src = 'about:blank';
      }
    }

    // Inicializar y reactivar renderizado continuo según el módulo activo
    if (modId === 'solar') {
      initSolarCanvas();
      renderSolarSystem();
    } else if (modId === 'constellations') {
      displaySelectedConstellation();
    } else if (modId === 'moon') {
      setMoonSimulationMode('moon');
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
    if (state.currentModule === 'constellations') displaySelectedConstellation();
    if (state.currentModule === 'moon') {
      if (state.moonSimMode === 'solar') updateSolarEclipseProgress(state.solarProgress || 50);
      else if (state.moonSimMode === 'lunar') updateLunarEclipseProgress(state.lunarProgress || 50);
      else updateMoonPhase(state.moonDay || 7.4);
    }
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
    { id: 'mercury', name: 'Mercurio', type: 'Rocoso Interior', r: 3.5, dist: 38, speed: 0.040, color: '#94a3b8', desc: 'El más cercano al Sol, sin atmósfera significativa y temperaturas extremas (-180°C a 430°C).' },
    { id: 'venus', name: 'Venus', type: 'Rocoso Interior', r: 5.5, dist: 64, speed: 0.028, color: '#fde047', desc: 'Efecto invernadero desbocado, atmósfera densa de CO2 y el más caliente del sistema solar.' },
    { id: 'earth', name: 'Tierra', type: 'Rocoso Interior', r: 6.5, dist: 94, speed: 0.020, color: '#38bdf8', desc: 'Nuestro hogar. Único planeta conocido con agua líquida superficial y vida biológica activa.' },
    { id: 'mars', name: 'Marte', type: 'Rocoso Interior', r: 5.0, dist: 126, speed: 0.015, color: '#f87171', desc: 'El planeta rojo. Rico en óxido de hierro, posee el volcán más alto del sistema (Monte Olimpo).' },
    { id: 'jupiter', name: 'Júpiter', type: 'Gigante Gaseoso', r: 13, dist: 168, speed: 0.009, color: '#fbbf24', desc: 'El coloso del sistema solar con más de 90 lunas y su icónica Gran Mancha Roja.' },
    { id: 'saturn', name: 'Saturno', type: 'Gigante Gaseoso', r: 10.5, dist: 216, speed: 0.006, color: '#fcd34d', hasRings: true, desc: 'Famoso por su espectacular sistema de anillos de hielo y roca de miles de km de ancho.' },
    { id: 'uranus', name: 'Urano', type: 'Gigante Helado', r: 8, dist: 262, speed: 0.004, color: '#67e8f9', desc: 'Gira inclinado casi 98° sobre su plano orbital; atmósfera rica en metano y vientos extremos.' },
    { id: 'neptune', name: 'Neptuno', type: 'Gigante Helado', r: 8, dist: 310, speed: 0.003, color: '#3b82f6', desc: 'El más lejano. Vientos supersónicos que superan los 2.000 km/h y un azul profundo característico.' }
  ];

  let solarAngles = planetsData.map(() => Math.random() * Math.PI * 2);

  function initSolarCanvas() {
    solarCanvas.width = solarCanvas.parentElement.clientWidth || 760;
    solarCanvas.height = 420;
  }

  function renderSolarSystem() {
    if (solarAnimId) {
      cancelAnimationFrame(solarAnimId);
      solarAnimId = null;
    }

    const w = solarCanvas.width;
    const h = solarCanvas.height;
    const cx = w / 2;
    // Centro óptico elevado para dejar espacio holgado a la botonera inferior
    const cy = Math.round((h - 55) / 2);

    // Ajuste dinámico de escala para que el 100% de las órbitas quepan sin desbordar
    const maxAvailableX = (w - 70) / 2;
    const maxAvailableY = (h - 95) / 2;
    const scale = Math.min(1.0, maxAvailableX / 315, maxAvailableY / 145);
    const orbitYRatio = 0.46; // Inclinación en perspectiva realista del plano orbital

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
    const sunR = Math.max(14, Math.round(22 * scale));
    const sunGrad = sCtx.createRadialGradient(cx, cy, 3, cx, cy, sunR);
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
    sCtx.arc(cx, cy, sunR, 0, Math.PI * 2);
    sCtx.fillStyle = sunGrad;
    sCtx.fill();

    // Dibujar Órbitas y Planetas
    planetsData.forEach((p, idx) => {
      const rx = p.dist * scale;
      const ry = p.dist * orbitYRatio * scale;
      const pr = Math.max(3, p.r * Math.sqrt(scale));

      // Órbita elíptica suave y contenida
      sCtx.beginPath();
      sCtx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      sCtx.strokeStyle = state.nightMode ? 'rgba(239, 68, 68, 0.18)' : 'rgba(56, 189, 248, 0.15)';
      sCtx.lineWidth = 1;
      sCtx.stroke();

      // Posición del planeta
      const px = cx + Math.cos(solarAngles[idx]) * rx;
      const py = cy + Math.sin(solarAngles[idx]) * ry;

      // Anillos de Saturno
      if (p.hasRings) {
        sCtx.beginPath();
        sCtx.ellipse(px, py, pr * 2.0, pr * 0.7, Math.PI / 6, 0, Math.PI * 2);
        sCtx.strokeStyle = state.nightMode ? '#7f1d1d' : 'rgba(252, 211, 77, 0.7)';
        sCtx.lineWidth = 2.5;
        sCtx.stroke();
      }

      // Cuerpo del planeta
      sCtx.beginPath();
      sCtx.arc(px, py, pr, 0, Math.PI * 2);
      sCtx.fillStyle = state.nightMode ? '#b91c1c' : p.color;
      sCtx.fill();

      // Resalte de selección
      if (state.selectedPlanet === p.id) {
        sCtx.beginPath();
        sCtx.arc(px, py, pr + 5, 0, Math.PI * 2);
        sCtx.strokeStyle = state.nightMode ? '#ef4444' : '#38bdf8';
        sCtx.lineWidth = 2;
        sCtx.stroke();
      }

      // Rótulos con nombres de planetas
      if (state.showPlanetLabels) {
        sCtx.font = '10px Outfit, sans-serif';
        const txtWidth = sCtx.measureText(p.name).width;
        sCtx.fillStyle = state.nightMode ? 'rgba(43, 7, 7, 0.85)' : 'rgba(15, 23, 42, 0.85)';
        sCtx.fillRect(px + pr + 4, py - 9, txtWidth + 6, 15);
        sCtx.fillStyle = state.nightMode ? '#fca5a5' : '#f8fafc';
        sCtx.fillText(p.name, px + pr + 7, py + 2);
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
  const constellationList = document.getElementById('constellationList');
  const constellationInfo = document.getElementById('constellationInfo');
  const constellationPhotoCard = document.getElementById('constellationPhotoCard');
  const constellationPhotoImg = document.getElementById('constellationPhotoImg');
  const constellationPhotoTitle = document.getElementById('constellationPhotoTitle');
  const constellationPhotoCredit = document.getElementById('constellationPhotoCredit');
  const constellationStellariumLink = document.getElementById('constellationStellariumLink');

  const constellationsData = {
    orion: {
      name: 'Orión (El Cazador)',
      photoUrl: 'img/constelacion_orion.jpg',
      photoTitle: 'Astrofotografía de Orión: Cinturón, Betelgeuse y Rigel',
      credit: 'Astrofotografía de Gran Campo • Constelación de Orión',
      stellariumUrl: 'https://stellarium-web.org/',
      info: 'Orión es la constelación más prominente del ecuador celeste. Betelgeuse (supergigante roja) y Rigel (supergigante azul) forman sus vértices opuestos, con las tres estrellas del "Cinturón de Orión" como guía universal hacia Sirio y las Pléyades.'
    },
    ursaMajor: {
      name: 'Osa Mayor (El Carro)',
      photoUrl: 'img/constelacion_osa_mayor.jpg',
      photoTitle: 'Astrofotografía de la Osa Mayor y el Asterismo del Carro',
      credit: 'Astrofotografía de Cielo Nocturno • Las 7 Estrellas del Carro',
      stellariumUrl: 'https://stellarium-web.org/',
      info: 'El asterismo del Carro permite trazar una línea recta imaginaria desde Merak hacia Dubhe y prolongarla cinco veces para localizar con precisión matemática a la Estrella Polar (Polaris) en el hemisferio norte.'
    },
    crux: {
      name: 'Cruz del Sur (Crux)',
      photoUrl: 'img/constelacion_cruz_sur.jpg',
      photoTitle: 'Astrofotografía de la Cruz del Sur (Crux) y Firmamento Austral',
      credit: 'Astrofotografía Austral • Guía de Orientación Polar Sur',
      stellariumUrl: 'https://stellarium-web.org/',
      info: 'La joya estelar del hemisferio sur. Sirve como brújula natural para marinos y exploradores al prolongar 4.5 veces su brazo mayor para ubicar el Polo Sur Celeste.'
    }
  };

  function displaySelectedConstellation() {
    const curr = constellationsData[state.selectedConstellation];
    if (!curr) return;
    if (constellationPhotoImg) constellationPhotoImg.src = curr.photoUrl;
    if (constellationPhotoTitle) constellationPhotoTitle.textContent = curr.photoTitle;
    if (constellationPhotoCredit) constellationPhotoCredit.textContent = curr.credit;
    if (constellationStellariumLink) constellationStellariumLink.href = curr.stellariumUrl;
    if (constellationInfo) {
      constellationInfo.innerHTML = `<strong>${curr.name}:</strong> ${curr.info}`;
    }
  }

  function populateConstellationUI() {
    if (!constellationList) return;
    constellationList.innerHTML = '';
    Object.keys(constellationsData).forEach(key => {
      const c = constellationsData[key];
      const btn = document.createElement('button');
      btn.className = `btn-constellation ${state.selectedConstellation === key ? 'active' : ''}`;
      btn.textContent = c.name;
      btn.addEventListener('click', () => {
        state.selectedConstellation = key;
        populateConstellationUI();
        displaySelectedConstellation();
        updateAstroDataCard('constellations');
        playTone(600, 'sine', 0.15, 0.08);
      });
      constellationList.appendChild(btn);
    });

    displaySelectedConstellation();
  }

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
  const eclipseMultimediaSection = document.getElementById('eclipseMultimediaSection');
  const moonPhasesGuideSection = document.getElementById('moonPhasesGuideSection');
  const eclipseStatus = document.getElementById('eclipseStatus');
  const btnModeMoonPhases = document.getElementById('btnModeMoonPhases');
  const btnModeSolarEclipse = document.getElementById('btnModeSolarEclipse');
  const btnModeLunarEclipse = document.getElementById('btnModeLunarEclipse');
  const sliderLabel = document.getElementById('sliderLabel');
  const phaseButtonsRow = document.getElementById('phaseButtonsRow');
  const eclipseGeometryCanvas = document.getElementById('eclipseGeometryCanvas');
  const egCtx = eclipseGeometryCanvas ? eclipseGeometryCanvas.getContext('2d') : null;
  const eclipseGeometryTitle = document.getElementById('eclipseGeometryTitle');
  const eclipseGeometryDesc = document.getElementById('eclipseGeometryDesc');
  const eclipseVideoFrame = document.getElementById('eclipseVideoFrame');
  const videoTitleLabel = document.getElementById('videoTitleLabel');
  const eclipseRealPhotoImg = document.getElementById('eclipseRealPhotoImg');
  const photoTitleLabel = document.getElementById('photoTitleLabel');
  const eclipsePhotoCaption = document.getElementById('eclipsePhotoCaption');
  const btnVideoOption1 = document.getElementById('btnVideoOption1');
  const btnVideoOption2 = document.getElementById('btnVideoOption2');
  const btnPhotoOption1 = document.getElementById('btnPhotoOption1');
  const btnPhotoOption2 = document.getElementById('btnPhotoOption2');

  function renderSolarEclipseCanvas(progress) {
    if (!moonCtx) return;
    const w = moonCanvas.width;
    const h = moonCanvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const R = 72;

    moonCtx.clearRect(0, 0, w, h);
    moonCtx.fillStyle = '#020617';
    moonCtx.fillRect(0, 0, w, h);

    const p = parseFloat(progress);
    const moonOffsetX = ((p - 50) / 50) * (2.1 * R);
    const moonX = cx + moonOffsetX;
    const moonY = cy;

    const isTotality = (p >= 49.2 && p <= 50.8);

    if (isTotality) {
      const coronaGrad = moonCtx.createRadialGradient(cx, cy, R - 5, cx, cy, R + 34);
      coronaGrad.addColorStop(0, '#fef08a');
      coronaGrad.addColorStop(0.2, '#facc15');
      coronaGrad.addColorStop(0.55, 'rgba(234, 88, 12, 0.45)');
      coronaGrad.addColorStop(1, 'transparent');
      moonCtx.fillStyle = coronaGrad;
      moonCtx.beginPath();
      moonCtx.arc(cx, cy, R + 34, 0, Math.PI * 2);
      moonCtx.fill();

      for (let i = 0; i < 28; i++) {
        const ang = (i / 28) * Math.PI * 2;
        const len = R + 14 + (Math.sin(i * 3.3) * 16);
        moonCtx.beginPath();
        moonCtx.moveTo(cx + Math.cos(ang) * (R + 2), cy + Math.sin(ang) * (R + 2));
        moonCtx.lineTo(cx + Math.cos(ang) * len, cy + Math.sin(ang) * len);
        moonCtx.strokeStyle = 'rgba(254, 240, 138, 0.55)';
        moonCtx.lineWidth = 1.5;
        moonCtx.stroke();
      }
    } else {
      const sunGlow = moonCtx.createRadialGradient(cx, cy, R * 0.7, cx, cy, R * 1.35);
      sunGlow.addColorStop(0, 'rgba(253, 224, 71, 0.3)');
      sunGlow.addColorStop(1, 'transparent');
      moonCtx.fillStyle = sunGlow;
      moonCtx.beginPath();
      moonCtx.arc(cx, cy, R * 1.35, 0, Math.PI * 2);
      moonCtx.fill();
    }

    const sunGrad = moonCtx.createRadialGradient(cx - 15, cy - 15, 10, cx, cy, R);
    sunGrad.addColorStop(0, '#ffffff');
    sunGrad.addColorStop(0.25, '#fef08a');
    sunGrad.addColorStop(0.7, '#f59e0b');
    sunGrad.addColorStop(1, '#d97706');
    moonCtx.beginPath();
    moonCtx.arc(cx, cy, R, 0, Math.PI * 2);
    moonCtx.fillStyle = sunGrad;
    moonCtx.fill();

    moonCtx.beginPath();
    moonCtx.arc(moonX, moonY, R + 1, 0, Math.PI * 2);
    moonCtx.fillStyle = '#030712';
    moonCtx.fill();

    moonCtx.beginPath();
    moonCtx.arc(moonX, moonY, R + 1, 0, Math.PI * 2);
    moonCtx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    moonCtx.lineWidth = 1;
    moonCtx.stroke();

    if (p >= 47 && p <= 49.1) {
      const flareAng = -Math.PI / 4;
      const flareX = cx + Math.cos(flareAng) * R;
      const flareY = cy + Math.sin(flareAng) * R;
      const fGrad = moonCtx.createRadialGradient(flareX, flareY, 1, flareX, flareY, 20);
      fGrad.addColorStop(0, '#ffffff');
      fGrad.addColorStop(0.3, '#fef08a');
      fGrad.addColorStop(1, 'transparent');
      moonCtx.fillStyle = fGrad;
      moonCtx.beginPath();
      moonCtx.arc(flareX, flareY, 20, 0, Math.PI * 2);
      moonCtx.fill();
    } else if (p >= 50.9 && p <= 53) {
      const flareAng = (3 * Math.PI) / 4;
      const flareX = cx + Math.cos(flareAng) * R;
      const flareY = cy + Math.sin(flareAng) * R;
      const fGrad = moonCtx.createRadialGradient(flareX, flareY, 1, flareX, flareY, 20);
      fGrad.addColorStop(0, '#ffffff');
      fGrad.addColorStop(0.3, '#fef08a');
      fGrad.addColorStop(1, 'transparent');
      moonCtx.fillStyle = fGrad;
      moonCtx.beginPath();
      moonCtx.arc(flareX, flareY, 20, 0, Math.PI * 2);
      moonCtx.fill();
    }
  }

  function renderLunarEclipseCanvas(progress) {
    if (!moonCtx) return;
    const w = moonCanvas.width;
    const h = moonCanvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const R = 72;

    moonCtx.clearRect(0, 0, w, h);
    moonCtx.fillStyle = '#020617';
    moonCtx.fillRect(0, 0, w, h);

    const p = parseFloat(progress);
    // Totalidad exacta únicamente cuando la Luna se encuentra 100% inmersa en la umbra
    const isTotality = (p >= 48.8 && p <= 51.2);
    const umbraCoverage = Math.max(0, Math.min(100, Math.round(100 - Math.abs(p - 50) * 2.8)));

    // 1. Resplandor exterior: blanco en fase parcial, rojo SOLO en totalidad completa
    const halo = moonCtx.createRadialGradient(cx, cy, R, cx, cy, R + 16);
    if (isTotality) {
      halo.addColorStop(0, 'rgba(239, 68, 68, 0.45)');
      halo.addColorStop(1, 'transparent');
    } else {
      halo.addColorStop(0, 'rgba(224, 242, 254, 0.12)');
      halo.addColorStop(1, 'transparent');
    }
    moonCtx.fillStyle = halo;
    moonCtx.beginPath();
    moonCtx.arc(cx, cy, R + 16, 0, Math.PI * 2);
    moonCtx.fill();

    // 2. CASO TOTALIDAD: LA LUNA ESTÁ 100% TAPADA POR LA UMBRA
    // ÚNICAMENTE EN ESTA FASE SE PONE ROJA (LUNA DE SANGRE POR DISPERSIÓN RAYLEIGH)
    if (isTotality) {
      const bloodGrad = moonCtx.createRadialGradient(cx - 20, cy - 20, 15, cx, cy, R);
      bloodGrad.addColorStop(0, '#f87171');
      bloodGrad.addColorStop(0.3, '#dc2626');
      bloodGrad.addColorStop(0.7, '#991b1b');
      bloodGrad.addColorStop(1, '#450a0a');
      moonCtx.beginPath();
      moonCtx.arc(cx, cy, R, 0, Math.PI * 2);
      moonCtx.fillStyle = bloodGrad;
      moonCtx.fill();

      // Relieve lunar visible bajo la tenue luz roja refractada
      drawLunarRelief(moonCtx, cx, cy, R, 'rgba(69, 10, 10, 0.65)', 'rgba(254, 202, 202, 0.35)');

      moonCtx.beginPath();
      moonCtx.arc(cx, cy, R, 0, Math.PI * 2);
      moonCtx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
      moonCtx.lineWidth = 1;
      moonCtx.stroke();
      return;
    }

    // 3. CASO PARCIAL O PENUMBRAL: LA SOMBRA ES OSCURA / NEGRA (SIN LUZ ROJA)
    // Base de Luna Llena brillante en la porción iluminada directamente por el Sol
    const fullGrad = moonCtx.createRadialGradient(cx - 15, cy - 15, 12, cx, cy, R);
    fullGrad.addColorStop(0, '#ffffff');
    fullGrad.addColorStop(0.4, '#f8fafc');
    fullGrad.addColorStop(0.75, '#cbd5e1');
    fullGrad.addColorStop(1, '#94a3b8');
    moonCtx.beginPath();
    moonCtx.arc(cx, cy, R, 0, Math.PI * 2);
    moonCtx.fillStyle = fullGrad;
    moonCtx.fill();

    drawLunarRelief(moonCtx, cx, cy, R, 'rgba(71, 85, 105, 0.45)', 'rgba(255, 255, 255, 0.45)');

    // Atenuación penumbral tenue
    if (p > 15 && p < 85 && umbraCoverage === 0) {
      moonCtx.fillStyle = 'rgba(15, 23, 42, 0.25)';
      moonCtx.beginPath();
      moonCtx.arc(cx, cy, R, 0, Math.PI * 2);
      moonCtx.fill();
    }

    // Proyección de la umbra terrestre OSCURA (negro y carbón, CERO luz roja)
    if (umbraCoverage > 0) {
      const shadowOffsetX = ((p - 50) / 50) * (2.2 * R);
      const shadowX = cx + shadowOffsetX;
      const shadowR = R * 1.45;

      moonCtx.save();
      moonCtx.beginPath();
      moonCtx.arc(cx, cy, R, 0, Math.PI * 2);
      moonCtx.clip();

      const shadowGrad = moonCtx.createRadialGradient(shadowX, cy, 10, shadowX, cy, shadowR);
      shadowGrad.addColorStop(0, '#020617');
      shadowGrad.addColorStop(0.7, '#090d16');
      shadowGrad.addColorStop(0.9, 'rgba(15, 23, 42, 0.98)');
      shadowGrad.addColorStop(1, 'rgba(30, 41, 59, 0.4)');

      moonCtx.beginPath();
      moonCtx.arc(shadowX, cy, shadowR, 0, Math.PI * 2);
      moonCtx.fillStyle = shadowGrad;
      moonCtx.fill();

      moonCtx.restore();
    }

    moonCtx.beginPath();
    moonCtx.arc(cx, cy, R, 0, Math.PI * 2);
    moonCtx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    moonCtx.lineWidth = 1;
    moonCtx.stroke();
  }

  function renderMoonCanvas(day) {
    if (!moonCtx) return;
    const w = moonCanvas.width;
    const h = moonCanvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const R = 78;

    moonCtx.clearRect(0, 0, w, h);

    const p = (day % 29.53) / 29.53;
    const phi = p * Math.PI * 2;
    const cosPhi = Math.cos(phi);
    const isWaxing = p <= 0.5;
    const rx = Math.max(0.1, Math.abs(R * cosPhi));

    const outerAura = moonCtx.createRadialGradient(cx, cy, R, cx, cy, R + 12);
    outerAura.addColorStop(0, state.nightMode ? 'rgba(239, 68, 68, 0.12)' : 'rgba(224, 242, 254, 0.12)');
    outerAura.addColorStop(1, 'transparent');
    moonCtx.fillStyle = outerAura;
    moonCtx.beginPath();
    moonCtx.arc(cx, cy, R + 12, 0, Math.PI * 2);
    moonCtx.fill();

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

    drawLunarRelief(moonCtx, cx, cy, R, 'rgba(3, 7, 18, 0.5)', 'rgba(255, 255, 255, 0.05)');

    if (day > 0.4 && day < 29.1) {
      moonCtx.save();
      moonCtx.beginPath();

      if (isWaxing) {
        moonCtx.arc(cx, cy, R, -Math.PI / 2, Math.PI / 2, false);
        moonCtx.ellipse(cx, cy, rx, R, 0, Math.PI / 2, -Math.PI / 2, cosPhi >= 0);
      } else {
        moonCtx.arc(cx, cy, R, Math.PI / 2, -Math.PI / 2, false);
        moonCtx.ellipse(cx, cy, rx, R, 0, -Math.PI / 2, Math.PI / 2, cosPhi >= 0);
      }

      moonCtx.closePath();
      moonCtx.clip();

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

      drawLunarRelief(moonCtx, cx, cy, R, state.nightMode ? 'rgba(127, 29, 29, 0.6)' : 'rgba(71, 85, 105, 0.45)', 'rgba(255, 255, 255, 0.45)');

      moonCtx.restore();

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

    moonCtx.beginPath();
    moonCtx.arc(cx, cy, R, 0, Math.PI * 2);
    moonCtx.strokeStyle = state.nightMode ? 'rgba(239, 68, 68, 0.3)' : 'rgba(255, 255, 255, 0.15)';
    moonCtx.lineWidth = 1;
    moonCtx.stroke();
  }

  function drawLunarRelief(ctx, cx, cy, R, darkColor, lightColor) {
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

    ctx.beginPath();
    ctx.arc(cx - 16, cy - 4, 3, 0, Math.PI * 2);
    ctx.fillStyle = lightColor;
    ctx.fill();
  }

  function updateMoonPhase(day) {
    state.moonDay = parseFloat(day);
    if (moonSlider && state.moonSimMode === 'moon') moonSlider.value = state.moonDay;
    const progress = state.moonDay / 29.53;
    const angle = progress * Math.PI * 2;
    const illum = Math.round(((1 - Math.cos(angle)) / 2) * 100);

    if (phaseDay) phaseDay.textContent = `Día ${state.moonDay.toFixed(1)} de 29.5 días sinódicos`;
    if (phaseIllum) phaseIllum.textContent = `Iluminación de disco: ${illum}%`;

    let name = '';
    if (state.moonDay < 1.5 || state.moonDay > 28.0) name = 'Luna Nueva (Novilunio)';
    else if (state.moonDay < 6.5) name = 'Luna Creciente Cóncava';
    else if (state.moonDay < 8.5) name = 'Cuarto Creciente';
    else if (state.moonDay < 13.5) name = 'Luna Gibosa Creciente';
    else if (state.moonDay < 16.0) name = 'Luna Llena (Plenilunio)';
    else if (state.moonDay < 21.0) name = 'Luna Gibosa Menguante';
    else if (state.moonDay < 23.5) name = 'Cuarto Menguante';
    else name = 'Luna Menguante Cóncava';

    if (phaseName) phaseName.textContent = name;
    renderMoonCanvas(state.moonDay);
  }

  function updateSolarEclipseProgress(val) {
    state.solarProgress = parseFloat(val);
    const p = state.solarProgress;
    const coverage = Math.max(0, Math.min(100, Math.round(100 - Math.abs(p - 50) * 2)));

    let name = '';
    if (p >= 49.2 && p <= 50.8) {
      name = 'Eclipse Solar Total (Corona y Alineación Umbral)';
    } else if ((p >= 47 && p < 49.2) || (p > 50.8 && p <= 53)) {
      name = 'Eclipse Solar: Fase de Anillo de Diamante';
    } else if (coverage > 0) {
      name = `Eclipse Solar Parcial (${coverage}% Cobertura)`;
    } else {
      name = 'Fotosfera Solar Directa (Tránsito no iniciado / finalizado)';
    }

    if (phaseName) phaseName.textContent = name;
    if (phaseDay) phaseDay.textContent = `Tránsito Lunar: ${p.toFixed(1)}% del Evento`;
    if (phaseIllum) phaseIllum.textContent = `Oscurecimiento Solar: ${coverage}%`;

    renderSolarEclipseCanvas(p);
  }

  function updateLunarEclipseProgress(val) {
    state.lunarProgress = parseFloat(val);
    const p = state.lunarProgress;
    const isTotality = (p >= 48.8 && p <= 51.2);
    const umbraCoverage = Math.max(0, Math.min(100, Math.round(100 - Math.abs(p - 50) * 2.8)));

    let name = '';
    if (isTotality) {
      name = 'Eclipse Lunar Total: Luna de Sangre (100% Umbra)';
    } else if (umbraCoverage > 0) {
      name = `Eclipse Lunar Parcial (${umbraCoverage}% en Sombra Umbral)`;
    } else if (p > 15 && p < 85) {
      name = 'Eclipse Lunar Penumbral (Atenuación Leve)';
    } else {
      name = 'Luna Llena Plena (Fuera de Sombra Terrestre)';
    }

    if (phaseName) phaseName.textContent = name;
    if (phaseDay) phaseDay.textContent = `Tránsito Umbral: ${p.toFixed(1)}% del Evento`;
    if (phaseIllum) {
      phaseIllum.textContent = isTotality
        ? 'Totalidad (100% Cubierta): Dispersión Rayleigh Activa (Luna de Sangre)'
        : `Sombra Terrestre: ${umbraCoverage}% del disco en oscuridad umbral`;
    }

    renderLunarEclipseCanvas(p);
  }

  function renderPhaseButtons(buttons) {
    if (!phaseButtonsRow) return;
    phaseButtonsRow.innerHTML = '';
    buttons.forEach(b => {
      const btn = document.createElement('button');
      btn.className = 'btn-tag';
      btn.textContent = b.label;
      btn.addEventListener('click', () => {
        moonSlider.value = b.val;
        if (state.moonSimMode === 'moon') {
          updateMoonPhase(b.val);
        } else if (state.moonSimMode === 'solar') {
          updateSolarEclipseProgress(b.val);
        } else if (state.moonSimMode === 'lunar') {
          updateLunarEclipseProgress(b.val);
        }
        playTone(550, 'sine', 0.1, 0.06);
      });
      phaseButtonsRow.appendChild(btn);
    });
  }

  function setMoonSimulationMode(mode, initialVal = null) {
    state.moonSimMode = mode;
    if (btnModeMoonPhases) btnModeMoonPhases.classList.toggle('active', mode === 'moon');
    if (btnModeSolarEclipse) btnModeSolarEclipse.classList.toggle('active', mode === 'solar');
    if (btnModeLunarEclipse) btnModeLunarEclipse.classList.toggle('active', mode === 'lunar');

    if (mode === 'moon') {
      if (eclipseMultimediaSection) {
        eclipseMultimediaSection.classList.add('hidden');
        eclipseMultimediaSection.style.display = 'none';
      }
      if (moonPhasesGuideSection) {
        moonPhasesGuideSection.classList.remove('hidden');
        moonPhasesGuideSection.style.display = 'flex';
      }
      if (eclipseVideoFrame) {
        eclipseVideoFrame.src = 'about:blank';
      }
      if (sliderLabel) sliderLabel.textContent = 'Desplazamiento del Ciclo Lunar:';
      moonSlider.min = '0';
      moonSlider.max = '29.5';
      moonSlider.step = '0.2';
      const val = initialVal !== null ? initialVal : (state.moonDay !== undefined ? state.moonDay : 7.4);
      moonSlider.value = val;
      renderPhaseButtons([
        { label: 'Nueva (0d)', val: 0 },
        { label: 'Creciente (7.4d)', val: 7.4 },
        { label: 'Llena (14.8d)', val: 14.8 },
        { label: 'Menguante (22.1d)', val: 22.1 }
      ]);
      if (eclipseStatus) eclipseStatus.textContent = 'Arrastra el deslizador para apreciar la curvatura del terminador elíptico y el relieve de mares y cráteres.';
      updateMoonPhase(val);
      updateAstroDataCard('moon');
    } else if (mode === 'solar') {
      if (eclipseMultimediaSection) {
        eclipseMultimediaSection.classList.remove('hidden');
        eclipseMultimediaSection.style.display = 'flex';
      }
      if (moonPhasesGuideSection) {
        moonPhasesGuideSection.classList.add('hidden');
        moonPhasesGuideSection.style.display = 'none';
      }
      state.eclipseType = 'solar';
      if (btnEclipseSolar) btnEclipseSolar.classList.add('active');
      if (btnEclipseLunar) btnEclipseLunar.classList.remove('active');
      if (eclipseGeometryTitle) eclipseGeometryTitle.textContent = 'Eclipse Solar: La Luna entre el Sol y la Tierra (Conos de Umbra y Penumbra)';
      if (eclipseGeometryDesc) eclipseGeometryDesc.textContent = 'La Luna se interpone en la línea de visión Sol-Tierra. Su sombra proyecta una estrecha franja de totalidad (umbra, ~150 km) donde la fotosfera queda oculta y se observa la corona solar, y una penumbra más ancha de eclipse parcial.';
      if (sliderLabel) sliderLabel.textContent = 'Progresión del Tránsito Lunar (Eclipse Solar):';
      moonSlider.min = '0';
      moonSlider.max = '100';
      moonSlider.step = '0.5';
      const val = initialVal !== null ? initialVal : (state.solarProgress !== undefined ? state.solarProgress : 50);
      moonSlider.value = val;
      renderPhaseButtons([
        { label: 'Entrada (20%)', val: 20 },
        { label: 'Anillo Diamante (48%)', val: 48 },
        { label: 'Totalidad (50%)', val: 50 },
        { label: 'Salida (80%)', val: 80 }
      ]);
      if (eclipseStatus) eclipseStatus.textContent = 'Desplaza la Luna a través del disco solar para experimentar el tránsito, el anillo de diamante y la corona de totalidad.';
      updateSolarEclipseProgress(val);
      updateEclipseMedia(state.eclipseVideoIndex || 0, state.eclipsePhotoIndex || 0);
      renderEclipseGeometryCanvas('solar');
      updateAstroDataCard('moon');
    } else if (mode === 'lunar') {
      if (eclipseMultimediaSection) {
        eclipseMultimediaSection.classList.remove('hidden');
        eclipseMultimediaSection.style.display = 'flex';
      }
      if (moonPhasesGuideSection) {
        moonPhasesGuideSection.classList.add('hidden');
        moonPhasesGuideSection.style.display = 'none';
      }
      state.eclipseType = 'lunar';
      if (btnEclipseSolar) btnEclipseSolar.classList.remove('active');
      if (btnEclipseLunar) btnEclipseLunar.classList.add('active');
      if (eclipseGeometryTitle) eclipseGeometryTitle.textContent = 'Eclipse Lunar: La Tierra entre el Sol y la Luna Llena (Refracción Atmosférica)';
      if (eclipseGeometryDesc) eclipseGeometryDesc.textContent = 'La Tierra bloquea la radiación directa del Sol. Los rayos solares atraviesan el borde atmosférico terrestre, el cual dispersa las longitudes azules (filtro Rayleigh) y desvía la luz roja hacia la Luna, otorgándole su característico tono cobrizo.';
      if (sliderLabel) sliderLabel.textContent = 'Progresión del Tránsito en Umbra (Eclipse Lunar):';
      moonSlider.min = '0';
      moonSlider.max = '100';
      moonSlider.step = '0.5';
      const val = initialVal !== null ? initialVal : (state.lunarProgress !== undefined ? state.lunarProgress : 50);
      moonSlider.value = val;
      renderPhaseButtons([
        { label: 'Penumbral (15%)', val: 15 },
        { label: 'Entrada Umbra (35%)', val: 35 },
        { label: 'Luna de Sangre (50%)', val: 50 },
        { label: 'Salida Umbra (70%)', val: 70 }
      ]);
      if (eclipseStatus) eclipseStatus.textContent = 'Mueve la Luna a través del cono de sombra de la Tierra para observar la entrada a la penumbra y la dispersión Rayleigh cobriza.';
      updateLunarEclipseProgress(val);
      updateEclipseMedia(state.eclipseVideoIndex || 0, state.eclipsePhotoIndex || 0);
      renderEclipseGeometryCanvas('lunar');
      updateAstroDataCard('moon');
    }
  }

  moonSlider.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    if (state.moonSimMode === 'solar') {
      updateSolarEclipseProgress(val);
      playTone(200 + val * 3, 'sine', 0.04, 0.02);
    } else if (state.moonSimMode === 'lunar') {
      updateLunarEclipseProgress(val);
      playTone(200 + val * 3, 'sine', 0.04, 0.02);
    } else {
      updateMoonPhase(val);
      playTone(200 + val * 15, 'sine', 0.04, 0.02);
    }
  });

  if (btnModeMoonPhases) {
    btnModeMoonPhases.addEventListener('click', () => {
      setMoonSimulationMode('moon');
      playTone(520, 'sine', 0.1, 0.05);
    });
  }
  if (btnModeSolarEclipse) {
    btnModeSolarEclipse.addEventListener('click', () => {
      selectEclipse('solar');
      playTone(600, 'sine', 0.1, 0.05);
    });
  }
  if (btnModeLunarEclipse) {
    btnModeLunarEclipse.addEventListener('click', () => {
      selectEclipse('lunar');
      playTone(550, 'sine', 0.1, 0.05);
    });
  }

  const eclipseMediaData = {
    solar: {
      videos: [
        { url: 'https://www.youtube-nocookie.com/embed/21lNzeoSbS4?rel=0', label: 'Time-lapse Total España (VideoFromSpace)', btnText: 'Video 1 (Time-lapse)' },
        { url: 'https://www.youtube-nocookie.com/embed/79SPgKtvwKc?rel=0', label: 'Guía: Eclipse Anular vs Total vs Parcial (Exploratorium)', btnText: 'Video 2 (Guía Corta)' }
      ],
      photos: [
        {
          url: 'img/eclipse_solar_1.jpg',
          title: 'Corona Solar y Campo Completo',
          caption: 'Estructura magnética de plasma coronal visible exclusivamente durante los minutos de totalidad umbral.',
          btnText: 'Toma 1'
        },
        {
          url: 'img/eclipse_solar_2.jpg',
          title: 'Secuencia de Fases y Anillo de Diamante',
          caption: 'Alineación precisa entre la fotosfera solar y el disco lunar con desprendimiento de luz coronal.',
          btnText: 'Toma 2'
        }
      ]
    },
    lunar: {
      videos: [
        { url: 'https://www.youtube-nocookie.com/embed/LK_44AbfH2Q?rel=0', label: 'Time-lapse 4K: Eclipse Lunar Total y Luna de Sangre', btnText: 'Video 1 (Time-lapse)' },
        { url: 'https://www.youtube-nocookie.com/embed/2vGr1VifPyg?rel=0', label: 'Eclipse Lunar Total en 20 Segundos (BBC Earth)', btnText: 'Video 2 (En 20s)' }
      ],
      photos: [
        {
          url: 'img/eclipse_lunar_1.jpg',
          title: 'Luna de Sangre en Umbra Total',
          caption: 'Disco lunar inmerso en la umbra terrestre adquiriendo el característico tono cobrizo por dispersión Rayleigh.',
          btnText: 'Toma 1'
        },
        {
          url: 'img/eclipse_lunar_2.jpg',
          title: 'Gradiente de Entrada en la Umbra',
          caption: 'Registro secuencial del avance de la sombra terrestre sobre la superficie lunar.',
          btnText: 'Toma 2'
        }
      ]
    }
  };

  function updateEclipseMedia(videoIdx = 0, photoIdx = 0) {
    const curType = state.eclipseType || 'solar';
    const media = eclipseMediaData[curType];
    if (!media) return;

    state.eclipseVideoIndex = videoIdx;
    state.eclipsePhotoIndex = photoIdx;

    if (btnVideoOption1) {
      btnVideoOption1.textContent = media.videos[0].btnText;
      btnVideoOption1.classList.toggle('active', videoIdx === 0);
    }
    if (btnVideoOption2) {
      btnVideoOption2.textContent = media.videos[1].btnText;
      btnVideoOption2.classList.toggle('active', videoIdx === 1);
    }

    if (btnPhotoOption1) {
      btnPhotoOption1.textContent = media.photos[0].btnText;
      btnPhotoOption1.classList.toggle('active', photoIdx === 0);
    }
    if (btnPhotoOption2) {
      btnPhotoOption2.textContent = media.photos[1].btnText;
      btnPhotoOption2.classList.toggle('active', photoIdx === 1);
    }

    const vid = media.videos[videoIdx];
    if (vid && eclipseVideoFrame) {
      eclipseVideoFrame.src = vid.url;
      if (videoTitleLabel) videoTitleLabel.textContent = vid.label;
    }

    const pic = media.photos[photoIdx];
    if (pic && eclipseRealPhotoImg) {
      eclipseRealPhotoImg.src = pic.url;
      if (photoTitleLabel) photoTitleLabel.textContent = pic.title;
      if (eclipsePhotoCaption) eclipsePhotoCaption.textContent = pic.caption;
    }
  }

  if (btnVideoOption1) {
    btnVideoOption1.addEventListener('click', () => {
      updateEclipseMedia(0, state.eclipsePhotoIndex !== undefined ? state.eclipsePhotoIndex : 0);
      playTone(520, 'sine', 0.08, 0.03);
    });
  }
  if (btnVideoOption2) {
    btnVideoOption2.addEventListener('click', () => {
      updateEclipseMedia(1, state.eclipsePhotoIndex !== undefined ? state.eclipsePhotoIndex : 0);
      playTone(580, 'sine', 0.08, 0.03);
    });
  }
  if (btnPhotoOption1) {
    btnPhotoOption1.addEventListener('click', () => {
      updateEclipseMedia(state.eclipseVideoIndex !== undefined ? state.eclipseVideoIndex : 0, 0);
      playTone(520, 'sine', 0.08, 0.03);
    });
  }
  if (btnPhotoOption2) {
    btnPhotoOption2.addEventListener('click', () => {
      updateEclipseMedia(state.eclipseVideoIndex !== undefined ? state.eclipseVideoIndex : 0, 1);
      playTone(580, 'sine', 0.08, 0.03);
    });
  }

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
    setMoonSimulationMode(type, 50);
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
    if (meteorAnimId) {
      cancelAnimationFrame(meteorAnimId);
      meteorAnimId = null;
    }

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
  const modalViewOptions = document.getElementById('modalViewOptions');

  const deepSkyObjects = [
    {
      id: 'andromeda',
      name: 'Galaxia de Andrómeda (M31)',
      type: 'Galaxia Espiral Gigante',
      dist: '2.5 millones de años luz',
      telescope: 'Hubble Space Telescope',
      telescopeShort: 'Hubble / Gran Campo',
      imgUrl: 'img/andromeda.jpg',
      wideImgUrl: 'img/andromeda_desde_latierra.jpg',
      remoteFallback: 'https://images-assets.nasa.gov/image/PIA04921/PIA04921~medium.jpg',
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
      remoteFallback: 'https://images-assets.nasa.gov/image/PIA08006/PIA08006~medium.jpg',
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
      remoteFallback: 'https://images-assets.nasa.gov/image/PIA19830/PIA19830~medium.jpg',
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
      remoteFallback: 'https://images-assets.nasa.gov/image/PIA01449/PIA01449~medium.jpg',
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
          <img src="${obj.imgUrl}" alt="${obj.name}" class="gallery-thumb-img" loading="lazy" onerror="this.onerror=null;this.src='${obj.remoteFallback}';">
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
          modalImg.onerror = () => { modalImg.src = obj.remoteFallback; };
          modalImg.alt = obj.name;
        }
        modalTitle.textContent = obj.name;
        modalDesc.textContent = obj.desc;
        modalSpecs.innerHTML = `
          <li><strong>Tipo de Objeto:</strong> ${obj.type}</li>
          <li><strong>Distancia Estimada:</strong> ${obj.dist}</li>
          <li><strong>Instrumento Principal:</strong> ${obj.telescope}</li>
          <li><strong>Archivo Científico:</strong> NASA / ESA / STScI / JPL / Astrofotografía Real</li>
        `;

        if (modalViewOptions) {
          modalViewOptions.innerHTML = '';
          if (obj.wideImgUrl) {
            const btnCore = document.createElement('button');
            btnCore.className = 'btn-micro active';
            btnCore.textContent = '🔭 Vista Telescópica Núcleo';

            const btnWide = document.createElement('button');
            btnWide.className = 'btn-micro';
            btnWide.textContent = '🌌 Vista Gran Campo desde la Tierra';

            btnCore.addEventListener('click', () => {
              btnCore.classList.add('active');
              btnWide.classList.remove('active');
              modalImg.src = obj.imgUrl;
              modalDesc.textContent = obj.desc;
              playTone(520, 'sine', 0.08, 0.03);
            });

            btnWide.addEventListener('click', () => {
              btnWide.classList.add('active');
              btnCore.classList.remove('active');
              modalImg.src = obj.wideImgUrl;
              modalDesc.textContent = 'Astrofotografía capturada desde la superficie terrestre mediante exposición prolongada de gran campo. Muestra el firmamento nocturno completo con la galaxia de Andrómeda brillando como una suave espiral difusa entre el inmenso mar de estrellas de nuestra Vía Láctea.';
              playTone(600, 'sine', 0.08, 0.03);
            });

            modalViewOptions.appendChild(btnCore);
            modalViewOptions.appendChild(btnWide);
          }
        }

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
      const isSolar = state.moonSimMode === 'solar';
      const isLunar = state.moonSimMode === 'lunar';
      const orbitalState = isSolar ? 'Eclipse Solar Total (Alineación Fotosférica Sol-Luna-Tierra)'
                         : isLunar ? 'Eclipse Lunar Total (Refracción Rayleigh Cobriza)'
                         : 'Ciclo Sinódico (Fases Lunares)';
      const shadowGeometry = (isSolar || isLunar) ? 'Sicigia perfecta Sol-Tierra-Luna (Nodos orbitales)'
                           : 'Inclinación orbital de 5.14° respecto a la eclíptica';
      const cycleInfo = isSolar ? `Tránsito Solar: ${state.solarProgress || 50}% del evento`
                      : isLunar ? `Inmersión en Umbra: ${state.lunarProgress || 50}%`
                      : `${state.moonDay.toFixed(1)} / 29.53 días sinódicos`;
      astroDataCard.innerHTML = `
        <table class="astro-data-table">
          <tr><th>Cuerpo</th><td><strong>Luna (Satélite Natural)</strong></td></tr>
          <tr><th>Día del Ciclo / Estado</th><td>${cycleInfo}</td></tr>
          <tr><th>Distancia Media</th><td>384.400 km (Perigeo 363k / Apogeo 405k)</td></tr>
          <tr><th>Diámetro Ecuatorial</th><td>3.474 km (27% del terrestre)</td></tr>
          <tr><th>Gravedad Superficial</th><td>1.62 m/s² (0.166 g)</td></tr>
          <tr><th>Estado Orbital</th><td>${orbitalState}</td></tr>
          <tr><th>Geometría de Sombra</th><td>${shadowGeometry}</td></tr>
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

  const quizzesData = {
    solar: [
      {
        q: '¿Cuál es el planeta rocoso más grande y con mayor densidad del Sistema Solar?',
        opts: ['Mercurio', 'Venus', 'La Tierra', 'Marte'],
        ans: 2,
        why: 'La Tierra es el planeta telúrico de mayor diámetro (12.742 km) y mayor densidad media (5.51 g/cm³) del Sistema Solar.'
      },
      {
        q: '¿Qué planeta tiene el período de rotación más lento y gira en sentido retrógrado?',
        opts: ['Mercurio', 'Venus', 'Marte', 'Júpiter'],
        ans: 1,
        why: 'Venus tarda 243 días terrestres en completar un giro sobre su propio eje y lo hace en sentido horario (de este a oeste).'
      },
      {
        q: '¿Cuál es el planeta gigante gaseoso con mayor masa del Sistema Solar?',
        opts: ['Saturno', 'Júpiter', 'Urano', 'Neptuno'],
        ans: 1,
        why: 'Júpiter posee una masa colosal de 1.90 × 10²⁷ kg, equivalente a más de 318 veces la masa de la Tierra.'
      }
    ],
    constellations: [
      {
        q: '¿Cuál es la estrella guía supergigante roja del hombro derecho de Orión?',
        opts: ['Rigel', 'Sirio', 'Betelgeuse', 'Aldebarán'],
        ans: 2,
        why: 'Betelgeuse es una supergigante roja inconfundible por su tonalidad cálida anaranjada en el vértice de Orión.'
      },
      {
        q: '¿Cuál es la estrella más brillante de todo el firmamento nocturno vista desde la Tierra?',
        opts: ['Polaris (Estrella Polar)', 'Sirio (Can Mayor)', 'Vega (Lira)', 'Rigel (Orión)'],
        ans: 1,
        why: 'Sirio (α Canis Majoris) ostenta una magnitud aparente de -1.46, la más luminosa del cielo observable.'
      },
      {
        q: '¿Qué constelación es la referencia principal de orientación astronómica en el Hemisferio Sur?',
        opts: ['Osa Mayor', 'Cruz del Sur (Crux)', 'Casiopea', 'Cisne'],
        ans: 1,
        why: 'La Cruz del Sur permite localizar el polo sur celeste prolongando 4.5 veces la longitud de su brazo vertical principal.'
      }
    ],
    moon: [
      {
        q: '¿Cuánto dura exactamente el ciclo sinódico lunar completo (de Luna Nueva a Luna Nueva)?',
        opts: ['27.3 días', '28.0 días', '29.5 días', '31.0 días'],
        ans: 2,
        why: 'El ciclo sinódico o lunación dura 29.53 días debido al avance combinado de la Tierra y la Luna alrededor del Sol.'
      },
      {
        q: '¿Qué alineación geométrica orbital produce un eclipse solar total?',
        opts: ['La Tierra entre el Sol y la Luna', 'La Luna situada exactamente entre el Sol y la Tierra', 'El Sol entre la Tierra y la Luna', 'Marte alineado con la Luna'],
        ans: 1,
        why: 'En un eclipse solar, la Luna en fase de novilunio se interpone en la línea visual proyectando su sombra umbral sobre la Tierra.'
      },
      {
        q: '¿Por qué la Luna adquiere una tonalidad cobriza durante un eclipse lunar total?',
        opts: ['Por calentamiento en su corteza', 'La atmósfera de la Tierra refracta y dispersa longitudes de onda rojas hacia el cono de umbra', 'La sombra de la Tierra es roja', 'Reflejo de la luz solar en Marte'],
        ans: 1,
        why: 'La dispersión de Rayleigh en el limbo atmosférico terrestre filtra la luz azul y desvía la luz rojiza crepuscular hacia el disco lunar.'
      }
    ],
    meteors: [
      {
        q: '¿Qué cuerpo progenitor da origen a la lluvia de meteoros Perseidas de agosto?',
        opts: ['Cometa 1P/Halley', 'Cometa 109P/Swift-Tuttle', 'Asteroide Faetón', 'Cometa Encke'],
        ans: 1,
        why: 'El cometa periódico 109P/Swift-Tuttle deposita un anillo de escombros micrométricos por el cual la Tierra transita cada agosto.'
      },
      {
        q: '¿En qué capa atmosférica se desintegran e ionizan la mayoría de meteoroides?',
        opts: ['Troposfera (0-12 km)', 'Estratosfera (12-50 km)', 'Mesosfera (80-100 km)', 'Exosfera (>500 km)'],
        ans: 2,
        why: 'Los meteoroides ingresan a 20-70 km/s colisionando con la mesosfera a 85-100 km, donde el aire comprimido se ioniza incandescentemente.'
      },
      {
        q: '¿Cómo se clasifica a un meteoro sumamente brillante con magnitud superior a Venus?',
        opts: ['Micrometeorito', 'Bólido o bola de fuego', 'Cometa enano', 'Púlsar'],
        ans: 1,
        why: 'Los bólidos son masas rocosas más densas que pueden generar explosiones sónicas y dejar estelas persistentes durante varios segundos.'
      }
    ],
    galaxies: [
      {
        q: '¿A qué distancia aproximada se encuentra la Galaxia de Andrómeda (M31) de la Vía Láctea?',
        opts: ['100.000 años luz', '1.344 años luz', '2.5 millones de años luz', '14 millones de años luz'],
        ans: 2,
        why: 'Andrómeda dista 2.5 millones de años luz y es el objeto astronómico más distante visible a simple vista bajo cielos oscuros.'
      },
      {
        q: '¿Qué estructura morfológica posee nuestra galaxia, la Vía Láctea?',
        opts: ['Espiral barrada (SBbc)', 'Elíptica gigante (E0)', 'Irregular enana (Irr)', 'Lenticular (S0)'],
        ans: 0,
        why: 'La Vía Láctea presenta una barra estelar central con brazos espirales poblados de polvo, gas molecular y cúmulos estelares.'
      },
      {
        q: '¿Qué representa la Gran Nebulosa de Orión (M42) en astrofísica?',
        opts: ['Un remanente frío de supernova', 'Una guardería estelar activa de gas ionizado', 'Un cúmulo globular extinto', 'Un agujero negro supermasivo'],
        ans: 1,
        why: 'M42 es una nube de hidrógeno ionizado e incubadora de estrellas jóvenes iluminada por el Cúmulo del Trapecio.'
      }
    ],
    astrophoto: [
      {
        q: '¿Por qué los observadores astronómicos utilizan linternas con filtro de luz roja en el campo?',
        opts: ['Porque la luz roja alumbra a mayor distancia', 'Porque no deslumbra ni destruye la adaptación natural del ojo a la oscuridad', 'Para evitar que se empañen las ópticas', 'Para ahuyentar animales nocturnos'],
        ans: 1,
        why: 'La luz roja preserva la sensibilidad de los fotorreceptores retinianos, que tardan hasta 30 minutos en adaptarse plenamente a la penumbra.'
      },
      {
        q: 'Al capturar el cielo nocturno con un smartphone, ¿cuál es el soporte fundamental indispensable?',
        opts: ['El flash a máxima potencia', 'Un trípode o montura firme para eliminar cualquier trepidación', 'Un zoom digital 30x', 'Un filtro polarizador diurno'],
        ans: 1,
        why: 'En exposiciones largas de 10 a 30 segundos, el más mínimo movimiento manual genera vibraciones y borronea las estrellas.'
      },
      {
        q: 'En la escala Bortle de contaminación lumínica, ¿qué caracteriza a una zona Clase 1 o 2?',
        opts: ['Centro urbano muy iluminado', 'Cielo rural completamente oscuro donde la Vía Láctea se aprecia con gran nitidez', 'Zona con niebla diurna', 'Cielo nublado sin visibilidad'],
        ans: 1,
        why: 'Las clases 1 y 2 representan sitios de cielo oscuro prístino donde las estructuras de polvo galáctico proyectan sombras sutiles.'
      }
    ]
  };

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
  setMoonSimulationMode('moon', 7.4);

  window.addEventListener('resize', () => {
    if (state.currentModule === 'solar') initSolarCanvas();
    if (state.currentModule === 'constellations') displaySelectedConstellation();
    if (state.currentModule === 'meteors') initMeteorCanvas();
    if (state.currentModule === 'astrophoto') renderViewfinder();
  });
});
