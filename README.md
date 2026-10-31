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
* **Zona 5 (Menú de Íconos):** Accesos rápidos con encasillamiento lógico, *tooltips* emergentes y atajos universales de teclado (`Alt+1` a `Alt+6`).
* **Zona 6 (Área de Contenidos / Trabajo):** Viewport interactivo animado a 60 fps gobernado por JavaScript y Canvas 2D.
* **Zona 7 (Navegación e Interactividad):** Panel lateral con controles de simulación, evaluación cognitiva formativa y monitor de carga visual.

---

## 3. Módulos Temáticos Desarrollados

1. **El Sistema Solar y los Planetas:** Modelo orbital dinámico con cálculo de traslación elíptica, planetas interiores y gigantes exteriores, selector de velocidad (1x, 2x, 4x) y fichas de exploración astronómica.
2. **Constelaciones y Reconocimiento Estelar:** Bóveda celeste con más de 200 estrellas de magnitud aparente diferenciada, selector de constelaciones guía (Orión, Osa Mayor, Cruz del Sur) y filtros de líneas de unión y coordenadas.
3. **La Luna, sus Fases y Eclipses:** Deslizador temporal interactivo de 0 a 29.5 días con renderizado en tiempo real del terminador solar y simulador de eclipses solares y lunares (Luna de Sangre).
4. **Lluvias de Estrellas y Cometas:** Simulación cinemática de meteoros y bólidos atmosféricos con síntesis acústica mediante Web Audio API y calendario astronómico anual.
5. **Galaxias y Nebulosas (Espacio Profundo):** Galería visual con objetos Messier (Andrómeda, Nebulosa de Orión, Pilares de la Creación, Galaxia del Sombrero) capturados por los telescopios Hubble y James Webb, con visor modal de aumento.
6. **Consejos y Astrofotografía Móvil:** Simulador de cámara profesional con controles manuales calibrados (ISO 100-6400, Exposición 1s-30s y Enfoque), checklist interactivo de campo y clasificador en la Escala de Cielo Oscuro de Bortle.

---

## 4. Innovación: Interfaz Afectiva de Adaptación Escotópica

La aplicación integra un **Modo Afectivo Nocturno** especialmente diseñado para la observación astronómica:
* Conmuta la interfaz a un espectro cromático rojo puro (>650 nm).
* **Fundamento Biológico:** Los bastones fotorreceptores de la retina ocular acumulan *rodopsina* en la oscuridad. La luz roja no descompone la rodopsina, evitando la ceguera nocturna temporal y la fatiga visual.
* **Monitor Afectivo:** Registra el tiempo de interacción y aconseja pausas ergonómicas ante sesiones prolongadas.

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
