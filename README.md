# 🎃 Graffiti en el Subte Maldito (POV)

Experiencia 3D interactiva para celular hecha con **Three.js**.
Parcial 2 · Diseño y Programación Web II.

> **Demo:** subte-maldito.netlify.app

---

## 1. Concepto y propuesta visual

Una estación de subte embrujada en **primera persona**: tu celular es tu cabeza.
Caminás por el andén, rociás con aerosol las paredes marcadas y, cada vez que
completás una palabra, **subís de nivel**. Si no lo lográs a tiempo, el
**guardia fantasma** te da un susto y perdés una vida (tenés 3).

- **Estética:** Halloween + subte abandonado (azulejos húmedos, lámparas que
  titilan, murciélagos, calabazas, tren fantasma).
- **Paleta:** negro violáceo, naranja calabaza, lila bruja, verde tóxico y blanco hueso.
- **Tipografías:** *Creepster* (títulos), *Permanent Marker* (graffiti) y
  *Plus Jakarta Sans* (interfaz).
- **Niveles:** cada nivel es una pared nueva con una palabra distinta
  (BOO!, RIP, 666, MALDITO…) y **menos tiempo** que el anterior. Desde el nivel 2
  pasa un tren que hace temblar todo e impide pintar.

## 2. Controles e interacciones

| Acción | Celular | Compu |
| --- | --- | --- |
| Mirar alrededor | Mover el celu (giroscopio) | Arrastrar con el mouse |
| Caminar | Dar pasos reales (acelerómetro) o mantener 👣 | W A S D / flechas |
| Pintar | Tocar la pared (aparece el aerosol en tu mano) | Click sobre la pared |
| Cambiar color | Tocar una de las 4 latas | Click en la lata |
| Ganar tiempo | Tocar las calabazas (+4 s, con Raycaster) | Click en la calabaza |
| Opciones | Botón ⚙ (calibrar, sensibilidad, linterna, sonido) | Botón ⚙ |

Interacciones táctiles implementadas: **giroscopio**, **touch + Raycaster**
(pintar y tocar calabazas), **botones superpuestos** (latas, caminar, opciones)
y **acelerómetro** para contar pasos.

## 3. Aspectos técnicos (según la consigna)

| Requisito | Dónde está |
| --- | --- |
| Geometrías compuestas | `js/modelos.js` (calabaza con gajos, murciélago, fantasma con falda ondulada), `js/estacion.js` |
| Iluminación | `AmbientLight` + `HemisphereLight` + `DirectionalLight` (luna) + `PointLight` (lámparas) + `SpotLight` (linterna) |
| Sombras optimizadas | Una sola `DirectionalLight` con mapa de 1024 que sigue al jugador; solo proyectan columnas, calabazas, murciélagos y fantasma |
| Materiales y texturas | `MeshStandardMaterial` (PBR) con texturas generadas en canvas (azulejos, piso, carteles, tren) |
| Animaciones | Bucle `requestAnimationFrame`: murciélagos, calabazas, lámparas, tren, aerosol y susto |
| Cámara | `PerspectiveCamera` controlada por giroscopio o por arrastre táctil |
| Rendimiento | `Math.min(devicePixelRatio, 2)`, reaplicado en `resize`; baja la resolución si hay menos de 30 FPS; durmientes con `InstancedMesh`; anisotropía limitada a 4; texturas chicas (≤ 1024 px) |
| UI superpuesta | HTML/CSS pensado para una mano: controles abajo, botones grandes |
| Loader | Pantalla de carga con barra de progreso (`#loader`) |
| QR | `afiche.html` (gráfica explicativa) + `js/afiche.js` |

## 4. Estructura del proyecto

```
subte-maldito/
├── index.html          Juego
├── afiche.html         Afiche con el QR y las instrucciones
├── README.md
├── css/
│   ├── estilos.css     Estilos del juego
│   ├── loader.css      Pantalla de carga
│   └── afiche.css      Estilos del afiche
├── js/
│   ├── main.js         Escena, bucle del juego, niveles y UI
│   ├── utils.js        Texturas y dibujo en canvas
│   ├── modelos.js      Calabaza, murciélago y fantasma
│   ├── estacion.js     Andén, vías, lámparas y tren
│   ├── audio.js        Sonido sintetizado con Web Audio
│   ├── sensores.js     Giroscopio y acelerómetro
│   ├── three.js       Estela del dedo (p5.js)
│   └── afiche.js       Generador del QR
└── qr/
    └── qr-subte-maldito.png   QR en alta resolución (se descarga desde afiche.html)
```

## 5. Cómo probarlo

El proyecto usa módulos ES, así que **no se abre con doble click**: necesita un servidor.

```bash
npx serve .
```

Los sensores del celular (giroscopio y pasos) **solo funcionan con HTTPS**, por
eso hay que probarlo ya desplegado.

## 6. Despliegue y QR

1. Subir la carpeta a un repositorio de GitHub.
2. Desplegar en **Vercel**, **Netlify** o **GitHub Pages**.
3. Abrir `https://TU-URL/afiche.html`, pegar la URL del juego y tocar
   **Descargar QR (PNG)**. Guardar la imagen en `qr/qr-subte-maldito.png`.
4. Imprimir el afiche (**Imprimir / guardar PDF**) o mostrarlo en pantalla.
5. Escanear con el celular y jugar.

## 7. Créditos

No se usan modelos 3D ni texturas externas: **todo se genera por código**
(geometrías de Three.js, texturas dibujadas en canvas, sonidos sintetizados
con Web Audio).

- [Three.js](https://threejs.org/) v0.160: licencia MIT
- [p5.js](https://p5js.org/) v1.11: licencia LGPL 2.1
- [qrcodejs](https://github.com/davidshimjs/qrcodejs): licencia MIT
- Tipografías de Google Fonts (licencia SIL OFL): Creepster, Permanent Marker, Plus Jakarta Sans

## 8. Autoría

Proyecto de **COMPLETAR NOMBRE** · Diseño y Programación Web II · 2026
