# AstroEdu - Aplicación Multimedia de Astronomía Básica y Observación del Cielo Nocturno

> **Universidad de las Fuerzas Armadas ESPE**  
> **Departamento de Ciencias de la Computación**  
> **Carrera:** Ingeniería en Tecnologías de la Información  
> **Asignatura:** Interfaces y Multimedia (NRC: 36733)  
> **Docente Titular:** Ing. Germán Ñacato Caiza  
> **Estudiante:** Klever Josué López Quilligana  
> **Repositorio Oficial:** [https://github.com/Klopezxd/astroedu-interfaces](https://github.com/Klopezxd/astroedu-interfaces)  
> **Despliegue Web:** [https://astroedu-interfaces.vercel.app](https://astroedu-interfaces.vercel.app)

---

## 1. Descripción del Proyecto

**AstroEdu** es una aplicación de software multimedia interactiva diseñada para fortalecer el aprendizaje formativo de la astronomía básica, el reconocimiento de constelaciones y la preparación para la observación astronómica de campo nocturna.

La aplicación ha sido desarrollada siguiendo estrictamente los principios de **Interacción Humano-Computador (HCI)**, las **10 Heurísticas de Usabilidad de Jakob Nielsen**, la **regla de los 3 colores armónicos** y el modelo formal de **Zonificación de Pantalla en 7 Zonas** impartidos en la cátedra de Interfaces y Multimedia.

---

## 2. Arquitectura de la Interfaz: Retícula Maestra de 7 Zonas

La interfaz se estructura mediante una cuadrícula fluida en **CSS Grid** de dos columnas maestras con diseño 100% adaptivo:

```
┌────────────────────────────────────────────────────────────────────────┐
│ ZONA 1: Logotipo    │ ZONA 2: Título y Metadatos  │ ZONA 3: Banner/Modo│
├────────────────────────────────────────────────────────────────────────┤
│ ZONA 4: Menú Textual (6 Módulos)   │ ZONA 5: Menú de Íconos + Tooltips │
├────────────────────────────────────────────────────┬───────────────────┤
│                                                    │ ZONA 7:           │
│ ZONA 6: Área de Despliegue de Trabajo              │ Área de           │
│         • Lienzos interactivos HTML5 <canvas> 2D   │ Interactividad    │
│         • Simulador orbital Sol-Tierra-Planetas    │ • Controles       │
│         • Cúpula celeste con estrellas y líneas    │ • Mini-Quiz       │
│         • Simulador lunar y de eclipses            │ • Monitor         │
│         • Generador cinemático de meteoros         │   Afectivo        │
│         • Galería de espacio profundo (JWST)       │                   │
│         • Viewfinder fotográfico manual HUD        │                   │
├────────────────────────────────────────────────────┴───────────────────┤
│ Pie de Página Institucional (ESPE - DCC - Klever López)                │
└────────────────────────────────────────────────────────────────────────┘
```

* **Zona 1 (Logotipo):** Imagotipo vectorial SVG interactivo de AstroEdu / ESPE.
* **Zona 2 (Título):** Tema oficial aprobado del proyecto semestral.
* **Zona 3 (Banner y Control Afectivo):** Estado astronómico del firmamento y conmutador de **Modo Afectivo Nocturno (Luz Roja Escotópica)**.
* **Zona 4 (Menú Textual):** Pestañas de acceso a los 6 módulos temáticos.
* **Zona 4 (Menú de Navegación Principal):** Navegación integrada con íconos y rótulos descriptivos para transicionar de forma instantánea entre módulos.
* **Zona 5 (Barra de Atajos y Utilidades):** Acceso rápido con teclado universal (`Alt+1` a `Alt+6`), control de sonido y conmutación de modo nocturno.
* **Zona 6 (Área de Contenidos / Trabajo):** Viewport interactivo animado a 60 fps gobernado por JavaScript y Canvas 2D.
* **Zona 7 (Navegación e Interactividad):** Panel lateral con controles de simulación, evaluación formativa multipregunta con soporte de reintentos y monitor de confort visual.

---

## 3. Módulos Temáticos Desarrollados

1. **El Sistema Solar y los Planetas:** Modelo orbital dinámico con cálculo de traslación elíptica, planetas interiores y gigantes exteriores, selector de velocidad (1x, 2x, 4x) y fichas de exploración astronómica.
2. **Constelaciones y Reconocimiento Estelar:** Bóveda celeste con más de 200 estrellas de magnitud aparente diferenciada, selector de constelaciones guía (Orión, Osa Mayor, Cruz del Sur) y filtros de líneas de unión y coordenadas.
3. **La Luna, sus Fases y Eclipses:** Deslizador temporal interactivo de 0 a 29.5 días con modelado 3D realista sobre Canvas, cálculo exacto del terminador elíptico, relieve de mares/cráteres y simulador de eclipses solares y lunares (Luna de Sangre).
4. **Lluvias de Estrellas y Cometas:** Simulación cinemática de meteoros y bólidos atmosféricos con síntesis acústica mediante Web Audio API y calendario astronómico anual.
5. **Galaxias y Nebulosas (Espacio Profundo):** Galería visual con objetos astronómicos emblemáticos (Galaxia de Andrómeda M31, Gran Nebulosa de Orión M42, Pilares de la Creación M16 y Galaxia del Sombrero M104) con fotografías reales de alta resolución capturadas por los telescopios Hubble y James Webb (JWST), complementadas con visor modal flotante interactivo de alta definición y archivo científico.
6. **Consejos y Astrofotografía Móvil:** Simulador de cámara profesional con controles manuales calibrados (ISO 100-6400, Exposición 1s-30s y Enfoque), checklist interactivo de campo, cálculo de la Regla de los 500 y clasificador en la Escala de Cielo Oscuro de Bortle.

---

## 4. Innovación: Interfaz Afectiva de Confort y Visión Nocturna

La aplicación integra un **Modo Nocturno de Luz Roja** especialmente diseñado para la observación astronómica:
* Conmuta la interfaz a un espectro rojo suave que evita deslumbrar los ojos del observador bajo el cielo estrellado.
* **Cuidado Visual:** Permite revisar mapas celestes o ajustar parámetros sin anular la adaptación que la pupila humana desarrolla en la penumbra.
* **Ficha Científica Dinámica:** Despliega en la Zona 7 los parámetros astrofísicos verificados del cuerpo celeste activo (diámetro, masa, período, rotación, temperatura y composición).

---

## 5. Stack Tecnológico

* **Front-End:** HTML5 Semántico + CSS3 Moderno (CSS Grid y Flexbox).
* **Lógica de Interacción:** JavaScript Vanilla ES6+ (Cero dependencias externas; máxima velocidad y portabilidad).
* **Motor Gráfico:** HTML5 `<canvas>` 2D para renderizado dinámico a 60 fps.
* **Audio:** Web Audio API (Sintetizador de frecuencias y envolventes armónicas nativas).
* **Despliegue:** Optimizado para Vercel (`vercel.json`) y GitHub Pages.

---

## 6. Ejecución Local

Para ejecutar la aplicación localmente, no se requiere ningún gestor de paquetes ni instalación de servidores:
1. Clona el repositorio:
   ```bash
   git clone https://github.com/Klopezxd/astroedu-interfaces.git
   ```
2. Abre directamente el archivo `index.html` en cualquier navegador web moderno (Chrome, Edge, Firefox, Safari).

---

## 7. Despliegue en Vercel

El repositorio incluye la configuración lista en `vercel.json`. Para desplegar:
1. Importa el repositorio `Klopezxd/astroedu-interfaces` en [Vercel](https://vercel.com).
2. Deja la configuración por defecto y haz clic en **Deploy**.
