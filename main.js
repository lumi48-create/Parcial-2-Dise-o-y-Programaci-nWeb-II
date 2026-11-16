// =====================================================
//  SUBTE MALDITO · POV
//  Graffiti en primera persona por niveles: el celu es tu cabeza.
//  Three.js · mobile-first
//
//  Módulos:
//    utils.js    texturas y dibujo en canvas
//    modelos.js  calabaza, murciélago y guardia fantasma
//    estacion.js andén, vías, lámparas y tren
//    audio.js    sonido con Web Audio
//    sensores.js giroscopio y acelerómetro
//    estela.js   estela del dedo (p5.js)
// =====================================================
import * as THREE from 'three';
import * as sonido from './audio.js';
import * as sensores from './sensores.js';
import { texturaCanvas, rgba, rectRedondo, fijarAnisotropia } from './utils.js';
import { crearModeloCalabaza, crearModeloMurcielago, crearModeloFantasma } from './modelos.js';
import { construirEstacion, construirLamparas, construirTren } from './estacion.js';

// ---------- reglas del juego ----------
const PALABRAS = ['BOO!', 'RIP', '666', 'MALDITO', 'FANTASMA', 'NO SALGAS', 'ESTACIÓN 13', 'HUYE'];
// z de cada pared: de IZQUIERDA a DERECHA (mirando la pared). Una por nivel; al terminar la fila vuelve a empezar
const POSICIONES = [15, 9, 3, -3, -9, -15];
const VIDAS_MAX = 3;            // sustos que aguantás antes del final
const BONUS_CALABAZA = 4;       // segundos extra por calabaza
const ES_MOVIL = window.matchMedia('(pointer: coarse)').matches;   // pantalla táctil
const ALCANCE = ES_MOVIL ? 6 : 4.5;   // metros: más lejos el aerosol no llega (en el celu pintás desde más lejos)
const DIST_PINTAR = ES_MOVIL ? 4.5 : 3;   // metros a la pared donde arrancás a pintar (en el celu, más atrás para ver toda la palabra)
const VELOCIDAD = 1.6;          // m/s con el botón 👣 o el teclado
const ALTURA_OJOS = 1.6;
const YAW_INICIAL = Math.PI / 2;  // arrancás mirando la pared (-X)
const UMBRAL_COMPLETO = 0.9;    // % de la palabra para pasar de nivel
const LIMITE = { xMin: -2.4, xMax: 2.5, zMin: -20, zMax: 20 };
const FUENTE_GRAFFITI = '"Permanent Marker", cursive';

let largoPaso = 0.7;            // metros por paso real (se cambia en Opciones)

// cada nivel tiene menos tiempo: si no lo completás, te asustan
function limiteDeNivel(n) {
  return Math.max(24, 46 - (n - 1) * 3);
}

// a partir del nivel 2 pasa un tren; desde el 4, dos
function horariosTren(n, limite) {
  if (n < 2) return [];
  if (n < 4) return [limite * 0.5];
  return [limite * 0.3, limite * 0.62];
}

function palabraDeNivel(n) {
  return PALABRAS[(n - 1) % PALABRAS.length];
}

// ---------- HTML ----------
const contenedor = document.querySelector('#escena');
const elNivel = document.querySelector('#nivel');
const elTiempo = document.querySelector('#tiempo');
const cajaTiempo = document.querySelector('#caja-tiempo');
const elPasos = document.querySelector('#pasos');
const elMeta = document.querySelector('#meta');
const elPalabra = document.querySelector('#palabra-actual');
const elPorcentaje = document.querySelector('#porcentaje');
const barraRelleno = document.querySelector('#barra-relleno');
const elVidas = document.querySelectorAll('#vidas .vida');
const elAviso = document.querySelector('#aviso');
const elFlecha = document.querySelector('#flecha');
const tinte = document.querySelector('#tinte');
const pantallaInicio = document.querySelector('#pantalla-inicio');
const pantallaNivel = document.querySelector('#pantalla-nivel');
const pantallaFinal = document.querySelector('#pantalla-final');
const pantallaOpciones = document.querySelector('#pantalla-opciones');
const capaSusto = document.querySelector('#susto');
const btnCaminar = document.querySelector('#btn-caminar');
const elBanner = document.querySelector('#banner');
const elBannerSup = document.querySelector('#banner-sup');
const elBannerTexto = document.querySelector('#banner-texto');
const elBannerSub = document.querySelector('#banner-sub');
const elLoader = document.querySelector('#loader');
const elLoaderRelleno = document.querySelector('#loader-relleno');
const elLoaderTexto = document.querySelector('#loader-texto');

// =====================================================
//  RENDER, ESCENA Y CÁMARA
// =====================================================
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });

// PixelRatio limitado a 2 (consigna). Si el celu va lento, baja solo (ver controlarRendimiento)
let ratioPixeles = Math.min(window.devicePixelRatio, 2);
renderer.setPixelRatio(ratioPixeles);
renderer.setSize(window.innerWidth, window.innerHeight);

// sombras optimizadas: un solo mapa suave que sigue al jugador
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
contenedor.appendChild(renderer.domElement);

// anisotropía limitada a 4: se ve bien y no pesa en el celu
const ANISOTROPIA = Math.min(renderer.capabilities.getMaxAnisotropy(), 4);
fijarAnisotropia(ANISOTROPIA);

const scene = new THREE.Scene();
scene.background = new THREE.Color('#05030a');
scene.fog = new THREE.Fog(0x0b0612, 3, 26);

// el "jugador" es un grupo que se mueve; la cámara (tu cabeza) gira adentro
const jugador = new THREE.Group();
jugador.position.set(0, 0, 0);
jugador.rotation.y = YAW_INICIAL;
scene.add(jugador);

const camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.05, 120);
camera.position.y = ALTURA_OJOS;
jugador.add(camera);

// ---------- iluminación ----------
// linterna pegada a la cámara (SpotLight)
const linterna = new THREE.SpotLight(0xffe2b8, 9, 16, 0.55, 0.6, 1);
linterna.position.set(0, 0, 0);
camera.add(linterna);
const objetivoLinterna = new THREE.Object3D();
objetivoLinterna.position.set(0, 0, -1);
camera.add(objetivoLinterna);
linterna.target = objetivoLinterna;

// luz ambiente + hemisférica: que no quede todo negro
scene.add(new THREE.AmbientLight(0x2a1f3d, 0.5));
scene.add(new THREE.HemisphereLight(0x3a2a55, 0x0a0505, 0.45));

// "luna" (DirectionalLight): la única que proyecta sombras, sigue al jugador
const luna = new THREE.DirectionalLight(0x9a86e0, 0.55);
luna.castShadow = true;
luna.shadow.mapSize.set(1024, 1024);
luna.shadow.camera.left = -9;
luna.shadow.camera.right = 9;
luna.shadow.camera.top = 9;
luna.shadow.camera.bottom = -9;
luna.shadow.camera.near = 1;
luna.shadow.camera.far = 16;
luna.shadow.bias = -0.0006;
luna.shadow.normalBias = 0.02;
scene.add(luna, luna.target);

// =====================================================
//  AEROSOL EN TU MANO
//  aparece (sube desde abajo) cada vez que pintás,
//  apunta a donde rociás y suelta niebla de pintura
// =====================================================
const aerosol = new THREE.Group();
const materialLata = new THREE.MeshStandardMaterial({
  color: 0xff7a1a, emissive: 0xff7a1a, emissiveIntensity: 0.18, metalness: 0.5, roughness: 0.35
});

function construirAerosol() {
  const plata = new THREE.MeshStandardMaterial({ color: 0xd9d9e0, metalness: 0.85, roughness: 0.3 });
  const negro = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.6 });
  const etiqueta = new THREE.MeshStandardMaterial({ color: 0xf2ead3, roughness: 0.6 });

  const cuerpo = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.16, 28), materialLata);
  aerosol.add(cuerpo);

  // banda de etiqueta
  const banda = new THREE.Mesh(new THREE.CylinderGeometry(0.0356, 0.0356, 0.045, 28), etiqueta);
  banda.position.y = -0.015;
  aerosol.add(banda);

  // hombros, cuello y tapa
  const hombros = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.035, 0.03, 28), plata);
  hombros.position.y = 0.095;
  aerosol.add(hombros);
  const cuello = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.017, 0.012, 20), plata);
  cuello.position.y = 0.116;
  aerosol.add(cuello);
  const tapa = new THREE.Mesh(new THREE.CylinderGeometry(0.021, 0.021, 0.03, 24), negro);
  tapa.position.y = 0.137;
  aerosol.add(tapa);
  const boquilla = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.014, 12), plata);
  boquilla.position.y = 0.159;
  aerosol.add(boquilla);

  aerosol.scale.setScalar(1.0);
  aerosol.visible = false;
  camera.add(aerosol);
}

// niebla de pintura
function texturaPunto() {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext('2d');
  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.5, 'rgba(255,255,255,0.5)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

const NUM_NIEBLA = 40;
const posNiebla = new Float32Array(NUM_NIEBLA * 3);
const edadNiebla = new Float32Array(NUM_NIEBLA);
const dispersion = new Float32Array(NUM_NIEBLA * 3);
const geoNiebla = new THREE.BufferGeometry();
geoNiebla.setAttribute('position', new THREE.BufferAttribute(posNiebla, 3));
const materialNiebla = new THREE.PointsMaterial({
  map: texturaPunto(),
  size: 0.07,
  color: 0xff7a1a,
  transparent: true,
  opacity: 0.75,
  depthWrite: false
});
const niebla = new THREE.Points(geoNiebla, materialNiebla);
niebla.frustumCulled = false;
niebla.visible = false;
camera.add(niebla);
for (let i = 0; i < NUM_NIEBLA; i++) {
  edadNiebla[i] = Math.random();
  dispersion[i * 3] = Math.random() - 0.5;
  dispersion[i * 3 + 1] = Math.random() - 0.5;
  dispersion[i * 3 + 2] = Math.random() - 0.5;
}

// ojo: en pantalla vertical el campo visible a 0.4 m es angosto (±0.13 m), por eso x chica
const POS_OCULTA = new THREE.Vector3(0.1, -0.62, -0.55);
const POS_ACTIVA = new THREE.Vector3(0.07, -0.22, -0.55);
const EJE_Y = new THREE.Vector3(0, 1, 0);
const qReposo = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.2, 0, -0.1));
const qObjetivo = new THREE.Quaternion();
const qCamara = new THREE.Quaternion();
const dirMira = new THREE.Vector3();      // hacia dónde apunta el dedo (en la cámara)
const puntoMira = new THREE.Vector3();    // punto de la pared que rociás (en la cámara)
const dirBoquilla = new THREE.Vector3();
const dirLata = new THREE.Vector3(0, 1, 0);   // hacia dónde "mira" la lata (casi vertical)
const posBoquilla = new THREE.Vector3();
const puntoBoquilla = new THREE.Vector3();    // dónde está el pico de la lata (en la cámara)
const objetivoLata = new THREE.Vector3();
const qVertical = new THREE.Quaternion();     // sin rotación = lata parada
const PROF_BOQUILLA = 0.55;                   // a qué profundidad delante de la cámara está el pico
const LARGO_LATA = 0.17;                      // del centro de la lata hasta la boquilla
let distMira = 2.5;
let rociando = false;
let aerosolT = 0;                         // 0 = escondido, 1 = en la mano

function actualizarAerosol(dt) {
  const activo = rociando && jugando && dedo.apretado && !enSusto;
  aerosolT += ((activo ? 1 : 0) - aerosolT) * Math.min(1, dt * 12);
  aerosol.visible = aerosolT > 0.02;

  if (aerosol.visible) {
    if (activo) {
      // la BOQUILLA queda justo en el punto de la pantalla donde tenés el dedo:
      // está sobre el mismo rayo que va hasta la pared, así la pintura sale "del pico"
      const k = PROF_BOQUILLA / Math.max(0.2, -dirMira.z);
      puntoBoquilla.copy(dirMira).multiplyScalar(k);
      objetivoLata.copy(puntoBoquilla);
      objetivoLata.y -= LARGO_LATA;                       // la lata cuelga debajo del pico
      objetivoLata.x += (Math.random() - 0.5) * 0.003;    // tiembla al rociar
      puntoMira.copy(dirMira).multiplyScalar(distMira);   // punto de la pared que rociás
    } else {
      objetivoLata.copy(POS_ACTIVA);
    }
    aerosol.position.lerpVectors(POS_OCULTA, objetivoLata, aerosolT);
    dirLata.copy(EJE_Y);                                  // lata siempre vertical
    qObjetivo.copy(activo ? qVertical : qReposo);
    aerosol.quaternion.slerp(qObjetivo, Math.min(1, dt * 14));
  }

  // niebla desde la boquilla hasta la pared
  niebla.visible = activo && aerosolT > 0.5;
  if (niebla.visible) {
    // la niebla sale de la boquilla (arriba de la lata) hacia el punto de la pared
    posBoquilla.copy(puntoBoquilla);
    dirBoquilla.copy(puntoMira).sub(posBoquilla).normalize();
    const largo = Math.min(0.7, Math.max(0.2, puntoMira.distanceTo(posBoquilla)));
    for (let i = 0; i < NUM_NIEBLA; i++) {
      edadNiebla[i] += dt * 4.5;
      if (edadNiebla[i] >= 1) {
        edadNiebla[i] = 0;
        dispersion[i * 3] = Math.random() - 0.5;
        dispersion[i * 3 + 1] = Math.random() - 0.5;
        dispersion[i * 3 + 2] = Math.random() - 0.5;
      }
      const e = edadNiebla[i];
      const abre = e * 0.22;   // el chorro se abre a medida que avanza
      posNiebla[i * 3] = posBoquilla.x + dirBoquilla.x * largo * e + dispersion[i * 3] * abre;
      posNiebla[i * 3 + 1] = posBoquilla.y + dirBoquilla.y * largo * e + dispersion[i * 3 + 1] * abre;
      posNiebla[i * 3 + 2] = posBoquilla.z + dirBoquilla.z * largo * e + dispersion[i * 3 + 2] * abre;
    }
    geoNiebla.attributes.position.needsUpdate = true;
  }
}

// =====================================================
//  PAREDES PARA PINTAR (una por nivel)
// =====================================================
const ANCHO_LIENZO = 1024;
const ALTO_LIENZO = 512;
const PASO_GRILLA = 12;
const paneles = [];
let panelActual = null;
const geoPanel = new THREE.PlaneGeometry(4, 2);

// marco redondeado con brillo
function texturaMarco() {
  return texturaCanvas(512, 288, function (ctx, w, h) {
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 22;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 7;
    rectRedondo(ctx, 22, 22, w - 44, h - 44, 26);
    ctx.stroke();
  });
}

function crearPanelSlot(z) {
  const lienzo = document.createElement('canvas');
  lienzo.width = ANCHO_LIENZO;
  lienzo.height = ALTO_LIENZO;
  const texPintura = new THREE.CanvasTexture(lienzo);
  texPintura.colorSpace = THREE.SRGBColorSpace;
  texPintura.anisotropy = ANISOTROPIA;

  const guiaCanvas = document.createElement('canvas');
  guiaCanvas.width = ANCHO_LIENZO;
  guiaCanvas.height = ALTO_LIENZO;
  const texGuia = new THREE.CanvasTexture(guiaCanvas);
  texGuia.colorSpace = THREE.SRGBColorSpace;
  texGuia.anisotropy = ANISOTROPIA;

  // guía: contorno punteado que brilla en la oscuridad
  const materialGuia = new THREE.MeshBasicMaterial({ map: texGuia, transparent: true, depthWrite: false });
  const meshGuia = new THREE.Mesh(geoPanel, materialGuia);
  meshGuia.position.set(-2.975, 1.55, z);
  meshGuia.rotation.y = Math.PI / 2;
  meshGuia.visible = false;
  scene.add(meshGuia);

  // lienzo de pintura (lo que rociás)
  const pintura = new THREE.Mesh(geoPanel, new THREE.MeshStandardMaterial({
    map: texPintura,
    transparent: true,
    emissive: 0xffffff,
    emissiveMap: texPintura,     // pintura fluo: se ve aunque esté oscuro
    emissiveIntensity: 0.35,
    roughness: 0.6,
    depthWrite: false
  }));
  pintura.position.set(-2.965, 1.55, z);
  pintura.rotation.y = Math.PI / 2;
  scene.add(pintura);

  // marco que titila hasta que completás la palabra
  const materialMarco = new THREE.MeshBasicMaterial({
    map: texturaMarco(),
    color: 0xff7a1a,
    transparent: true,
    depthWrite: false
  });
  const marco = new THREE.Mesh(new THREE.PlaneGeometry(4.5, 2.53), materialMarco);
  marco.position.set(-2.96, 1.55, z);
  marco.rotation.y = Math.PI / 2;
  marco.visible = false;
  scene.add(marco);

  const panel = {
    palabra: '',
    z: z,
    celdas: [],
    mapa: {},
    pintadas: 0,
    completo: false,
    tieneTinta: false,
    lienzo: lienzo,
    ctx: lienzo.getContext('2d'),
    textura: texPintura,
    malla: pintura,
    guiaCtx: guiaCanvas.getContext('2d'),
    texturaGuia: texGuia,
    guia: materialGuia,
    meshGuia: meshGuia,
    marco: marco,
    materialMarco: materialMarco
  };
  pintura.userData.panel = panel;
  paneles.push(panel);
}

function limpiarPanel(panel) {
  panel.ctx.clearRect(0, 0, ANCHO_LIENZO, ALTO_LIENZO);
  panel.textura.needsUpdate = true;
  panel.celdas = [];
  panel.mapa = {};
  panel.pintadas = 0;
  panel.completo = false;
  panel.tieneTinta = false;
  panel.meshGuia.visible = false;
  panel.marco.visible = false;
}

// pone una palabra nueva en la pared y mide cuánto hay que pintar
function prepararPalabra(panel, palabra) {
  limpiarPanel(panel);
  panel.palabra = palabra;

  const mascara = document.createElement('canvas');
  mascara.width = ANCHO_LIENZO;
  mascara.height = ALTO_LIENZO;
  const cm = mascara.getContext('2d');
  let tam = 300;
  cm.font = tam + 'px ' + FUENTE_GRAFFITI;
  const anchoTexto = cm.measureText(palabra).width;
  tam = Math.min(tam * (ANCHO_LIENZO * 0.86) / anchoTexto, ALTO_LIENZO * 0.7);
  cm.font = tam + 'px ' + FUENTE_GRAFFITI;
  cm.textAlign = 'center';
  cm.textBaseline = 'middle';
  cm.fillStyle = '#fff';
  cm.fillText(palabra, ANCHO_LIENZO / 2, ALTO_LIENZO / 2 + tam * 0.05);
  const datos = cm.getImageData(0, 0, ANCHO_LIENZO, ALTO_LIENZO).data;

  for (let y = PASO_GRILLA / 2; y < ALTO_LIENZO; y += PASO_GRILLA) {
    for (let x = PASO_GRILLA / 2; x < ANCHO_LIENZO; x += PASO_GRILLA) {
      if (datos[(Math.floor(y) * ANCHO_LIENZO + Math.floor(x)) * 4 + 3] > 100) {
        panel.mapa[Math.floor(x / PASO_GRILLA) + ',' + Math.floor(y / PASO_GRILLA)] = panel.celdas.length;
        panel.celdas.push(false);
      }
    }
  }

  // guía punteada
  const gc = panel.guiaCtx;
  gc.clearRect(0, 0, ANCHO_LIENZO, ALTO_LIENZO);
  gc.font = tam + 'px ' + FUENTE_GRAFFITI;
  gc.textAlign = 'center';
  gc.textBaseline = 'middle';
  gc.fillStyle = 'rgba(255,255,255,0.07)';
  gc.fillText(palabra, ANCHO_LIENZO / 2, ALTO_LIENZO / 2 + tam * 0.05);
  gc.setLineDash([16, 12]);
  gc.lineWidth = 4;
  gc.lineJoin = 'round';
  gc.strokeStyle = 'rgba(242,234,211,0.95)';
  gc.strokeText(palabra, ANCHO_LIENZO / 2, ALTO_LIENZO / 2 + tam * 0.05);
  panel.texturaGuia.needsUpdate = true;

  panel.meshGuia.visible = true;
  panel.marco.visible = true;
  panel.materialMarco.color.set(0xff7a1a);
}

function porcentajePanel(panel) {
  if (!panel || !panel.celdas.length) return 0;
  return Math.min(1, panel.pintadas / panel.celdas.length / UMBRAL_COMPLETO);
}

// ---------- aerosol (pintura sobre la pared) ----------
let colorActual = '#ff7a1a';

function rociar(panel, uv, distancia) {
  const x = uv.x * ANCHO_LIENZO;
  const y = (1 - uv.y) * ALTO_LIENZO;
  const radio = 26 + distancia * 9;   // de lejos el chorro se abre más
  const ctx = panel.ctx;

  // núcleo suave
  const grad = ctx.createRadialGradient(x, y, 0, x, y, radio * 0.75);
  grad.addColorStop(0, rgba(colorActual, 0.4));
  grad.addColorStop(1, rgba(colorActual, 0));
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, radio * 0.75, 0, Math.PI * 2);
  ctx.fill();

  // gotitas de spray
  ctx.fillStyle = colorActual;
  for (let i = 0; i < 40; i++) {
    const ang = Math.random() * Math.PI * 2;
    const dist = Math.random() * Math.random() * radio;
    ctx.globalAlpha = 0.3 + Math.random() * 0.5;
    ctx.beginPath();
    ctx.arc(x + Math.cos(ang) * dist, y + Math.sin(ang) * dist, 1 + Math.random() * 2.6, 0, Math.PI * 2);
    ctx.fill();
  }
  // chorreadas
  if (Math.random() < 0.06) {
    const cx = x + (Math.random() - 0.5) * radio;
    const largo = 30 + Math.random() * 70;
    ctx.globalAlpha = 0.8;
    ctx.fillRect(cx, y, 4, largo);
    ctx.beginPath();
    ctx.arc(cx + 2, y + largo, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  panel.textura.needsUpdate = true;
  panel.tieneTinta = true;

  // marcar celdas cubiertas
  const cx = Math.floor(x / PASO_GRILLA);
  const cy = Math.floor(y / PASO_GRILLA);
  const r = Math.ceil((radio * 0.7) / PASO_GRILLA);
  for (let i = -r; i <= r; i++) {
    for (let j = -r; j <= r; j++) {
      if (i * i + j * j > r * r) continue;
      const indice = panel.mapa[(cx + i) + ',' + (cy + j)];
      if (indice !== undefined && !panel.celdas[indice]) {
        panel.celdas[indice] = true;
        panel.pintadas++;
      }
    }
  }

  if (!panel.completo && panel.celdas.length && panel.pintadas / panel.celdas.length >= UMBRAL_COMPLETO) {
    panel.completo = true;
    panel.materialMarco.color.set(0x7dff3a);
    panel.materialMarco.opacity = 0.7;
    panel.meshGuia.visible = false;
    sonido.sonidoCompleto();
    mostrarTextoFlotante(window.innerWidth / 2, window.innerHeight * 0.4, '¡' + panel.palabra + ' LISTO!', '#7dff3a');
  }
}

// ---------- calabazas (+4 segundos) ----------
let calabazas = [];
let proximaCalabaza = 0;

function crearCalabaza() {
  const grupo = crearModeloCalabaza();
  const ang = Math.random() * Math.PI * 2;
  const dist = 2 + Math.random() * 4;
  grupo.position.set(
    THREE.MathUtils.clamp(jugador.position.x + Math.cos(ang) * dist, -1.5, 2.4),
    1 + Math.random() * 1.5,
    THREE.MathUtils.clamp(jugador.position.z + Math.sin(ang) * dist, -20, 20)
  );
  grupo.userData.esCalabaza = true;
  scene.add(grupo);
  calabazas.push({ grupo: grupo, nacimiento: tiempoJuego, fase: Math.random() * 6, baseY: grupo.position.y });
}

function quitarCalabaza(i) {
  scene.remove(calabazas[i].grupo);
  calabazas.splice(i, 1);
}

function quitarTodasLasCalabazas() {
  for (let i = calabazas.length - 1; i >= 0; i--) quitarCalabaza(i);
}

// ---------- murciélagos ----------
const murcielagos = [];
function construirMurcielagos() {
  for (let i = 0; i < 4; i++) {
    const m = crearModeloMurcielago();
    scene.add(m);
    murcielagos.push({ grupo: m, radio: 2 + Math.random() * 3, velocidad: 0.6 + Math.random() * 0.6, fase: i * 1.7, centroZ: -12 + i * 8 });
  }
}

// ---------- lámparas, tren y guardia fantasma (se crean al cargar) ----------
let lamparas = [];
let tren = null;
let trenInicio = -1;
let trenesPasados = 0;
const DURACION_TREN = 3.4;

let fantasma = null;
const luzFantasma = new THREE.PointLight(0xff1030, 0, 8, 1);

function construirFantasma() {
  fantasma = crearModeloFantasma();
  luzFantasma.position.set(0, -0.8, 1);
  fantasma.add(luzFantasma);
  fantasma.visible = false;
  scene.add(fantasma);
}

// =====================================================
//  ESTADO DEL JUEGO
// =====================================================
let jugando = false;
let reanudarAlCerrar = false;
let tiempoJuego = 0;        // reloj que corre mientras jugás
let nivel = 1;
let vidas = VIDAS_MAX;
let nivelesSuperados = 0;

// del intento actual del nivel
let limiteNivel = 46;
let tiempoNivel = 0;
let bonusNivel = 0;
let restante = 46;
let horarios = [];

// estadísticas
let tiempoTotal = 0;
let pasosTotal = 0;
let metrosTotal = 0;
let tiempoEnNivel = 0;
let pasosNivel = 0;
let metrosNivel = 0;

let avancePendiente = 0;    // metros que faltan recorrer del último paso
let bamboleo = 0;
let temblor = 0;
let ultimoLatido = 0;
let ultimoAvisoLejos = 0;
let linternaActiva = true;

// mirar arrastrando (cuando no hay giroscopio)
let yaw = YAW_INICIAL;
let pitch = 0;

const raycaster = new THREE.Raycaster();
const puntoPantalla = new THREE.Vector2();
const dedo = { x: 0, y: 0, apretado: false, modo: 'pintar' };

function rayoDesde(x, y) {
  puntoPantalla.set((x / window.innerWidth) * 2 - 1, -(y / window.innerHeight) * 2 + 1);
  raycaster.setFromCamera(puntoPantalla, camera);
}

// INTERACCIÓN con Raycaster: tocar una calabaza
function tocarCalabaza() {
  const golpes = raycaster.intersectObjects(calabazas.map(function (c) { return c.grupo; }), true);
  if (!golpes.length) return false;
  let objeto = golpes[0].object;
  while (objeto && !objeto.userData.esCalabaza) objeto = objeto.parent;
  const i = calabazas.findIndex(function (c) { return c.grupo === objeto; });
  if (i === -1) return false;
  quitarCalabaza(i);
  bonusNivel += BONUS_CALABAZA;
  sonido.sonidoCalabaza();
  mostrarTextoFlotante(dedo.x, dedo.y, '+' + BONUS_CALABAZA + 's', '#7dff3a');
  return true;
}

// =====================================================
//  CONTROLES TÁCTILES
// =====================================================
const lienzo3D = renderer.domElement;
lienzo3D.addEventListener('pointerdown', function (e) {
  if (!jugando && !esperandoGiro) return;
  e.preventDefault();
  dedo.x = e.clientX;
  dedo.y = e.clientY;
  // esperando que gires para ver el tren: solo se puede mirar (sin giroscopio, arrastrando)
  if (esperandoGiro) {
    dedo.apretado = true;
    dedo.modo = 'mirar';
    return;
  }
  rayoDesde(dedo.x, dedo.y);
  if (tocarCalabaza()) return;

  dedo.apretado = true;
  dedo.modo = 'pintar';
  // sin giroscopio: si no tocás la pared, arrastrar sirve para mirar
  if (!sensores.tieneGiroscopio() && panelActual) {
    const golpe = raycaster.intersectObject(panelActual.malla);
    if (!golpe.length) dedo.modo = 'mirar';
  }
});

lienzo3D.addEventListener('pointermove', function (e) {
  if (dedo.apretado && dedo.modo === 'mirar') {
    yaw -= (e.clientX - dedo.x) * 0.006;
    pitch -= (e.clientY - dedo.y) * 0.006;
    pitch = THREE.MathUtils.clamp(pitch, -1.2, 1.2);
  }
  dedo.x = e.clientX;
  dedo.y = e.clientY;
});

function soltarDedo() {
  dedo.apretado = false;
  sonido.sonarSpray(false);
}
lienzo3D.addEventListener('pointerup', soltarDedo);
lienzo3D.addEventListener('pointercancel', soltarDedo);
lienzo3D.addEventListener('pointerleave', soltarDedo);

// pasos reales (acelerómetro)
sensores.alDarPaso(function () {
  if (!jugando || dedo.apretado) return;   // mientras pintás no cuenta
  pasosTotal++;
  pasosNivel++;
  avancePendiente += largoPaso;
  sonido.paso();
  if (navigator.vibrate) navigator.vibrate(15);
});

// botón 👣 y teclado
let caminandoBoton = false;
btnCaminar.addEventListener('pointerdown', function (e) { e.preventDefault(); caminandoBoton = true; });
['pointerup', 'pointercancel', 'pointerleave'].forEach(function (ev) {
  btnCaminar.addEventListener(ev, function () { caminandoBoton = false; });
});

const teclas = {};
window.addEventListener('keydown', function (e) { teclas[e.key.toLowerCase()] = true; });
window.addEventListener('keyup', function (e) { teclas[e.key.toLowerCase()] = false; });

// latas de aerosol (elegir color)
document.querySelectorAll('.lata').forEach(function (lata) {
  lata.addEventListener('click', function () {
    document.querySelectorAll('.lata').forEach(function (l) { l.classList.remove('activa'); });
    lata.classList.add('activa');
    colorActual = lata.dataset.color;
    // el aerosol de tu mano y su niebla toman el color elegido
    materialLata.color.set(colorActual);
    materialLata.emissive.set(colorActual);
    materialNiebla.color.set(colorActual);
    sonido.tono(1200, 0.05, 'triangle', 0.08);
  });
});

// =====================================================
//  MOVIMIENTO
// =====================================================
const adelante = new THREE.Vector3();
const lateral = new THREE.Vector3();

function mover(metrosAdelante, metrosCostado) {
  camera.getWorldDirection(adelante);
  adelante.y = 0;
  if (adelante.lengthSq() < 0.0001) return;
  adelante.normalize();
  lateral.set(-adelante.z, 0, adelante.x);

  const antes = jugador.position.clone();
  jugador.position.addScaledVector(adelante, metrosAdelante);
  jugador.position.addScaledVector(lateral, metrosCostado);
  jugador.position.x = THREE.MathUtils.clamp(jugador.position.x, LIMITE.xMin, LIMITE.xMax);
  jugador.position.z = THREE.MathUtils.clamp(jugador.position.z, LIMITE.zMin, LIMITE.zMax);
  const recorrido = antes.distanceTo(jugador.position);
  metrosTotal += recorrido;
  metrosNivel += recorrido;
  bamboleo += recorrido * 9;
}

function actualizarCamara() {
  if (sensores.tieneGiroscopio()) {
    jugador.rotation.y = YAW_INICIAL;
    sensores.aplicarOrientacion(camera.quaternion);
  } else {
    jugador.rotation.y = yaw;
    camera.rotation.set(pitch, 0, 0, 'YXZ');
  }
  camera.position.set(
    (Math.random() - 0.5) * temblor,
    ALTURA_OJOS + Math.sin(bamboleo) * 0.04 + (Math.random() - 0.5) * temblor,
    0
  );
  temblor *= 0.9;
}

// =====================================================
//  TEXTOS, AVISOS Y FLECHA
// =====================================================
function mostrarTextoFlotante(x, y, texto, color) {
  const el = document.createElement('div');
  el.className = 'texto-flotante';
  el.textContent = texto;
  el.style.left = x + 'px';
  el.style.top = y + 'px';
  el.style.color = color;
  document.body.appendChild(el);
  setTimeout(function () { el.remove(); }, 1000);
}

function avisar(texto, chico) {
  elAviso.textContent = texto;
  elAviso.classList.toggle('chico', !!chico);   // letra chica para el aviso del tren
  elAviso.classList.toggle('oculto', !texto);
}

let temporizadorBanner = null;
function mostrarBanner(sup, texto, sub) {
  elBannerSup.textContent = sup;
  elBannerTexto.textContent = texto;
  elBannerSub.textContent = sub || '';
  elBanner.classList.remove('oculto');
  elBanner.style.animation = 'none';
  void elBanner.offsetWidth;
  elBanner.style.animation = '';
  clearTimeout(temporizadorBanner);
  temporizadorBanner = setTimeout(function () { elBanner.classList.add('oculto'); }, 2400);
}

function actualizarVidasHUD() {
  elVidas.forEach(function (v, i) { v.classList.toggle('perdida', i >= vidas); });
}

// flecha que te indica hacia dónde está la pared del nivel
const haciaPanel = new THREE.Vector3();
const posicionCamara = new THREE.Vector3();
function actualizarFlecha() {
  if (!panelActual || panelActual.completo) {
    elFlecha.classList.add('oculto');
    return;
  }
  camera.getWorldPosition(posicionCamara);
  camera.getWorldDirection(adelante);
  haciaPanel.set(-3, 1.55, panelActual.z).sub(posicionCamara).normalize();
  const angulo = adelante.angleTo(haciaPanel);
  if (angulo < 0.6) {
    elFlecha.classList.add('oculto');
    return;
  }
  const giro = adelante.x * haciaPanel.z - adelante.z * haciaPanel.x;
  elFlecha.textContent = giro > 0 ? '▶' : '◀';
  elFlecha.classList.toggle('derecha', giro > 0);
  elFlecha.classList.remove('oculto');
}

// =====================================================
//  LOOP DEL JUEGO
// =====================================================
function actualizarJuego(dt) {
  tiempoJuego += dt;
  tiempoNivel += dt;
  tiempoEnNivel += dt;
  tiempoTotal += dt;
  restante = limiteNivel + bonusNivel - tiempoNivel;
  rociando = false;   // se vuelve true más abajo si estás pintando

  // caminar: pasos reales (suave) + botón / teclado
  if (avancePendiente > 0) {
    const tramo = Math.min(avancePendiente, dt * 2.8);
    mover(tramo, 0);
    avancePendiente -= tramo;
  }
  let adelanteTeclas = 0;
  let costadoTeclas = 0;
  if (caminandoBoton || teclas['w'] || teclas['arrowup']) adelanteTeclas += 1;
  if (teclas['s'] || teclas['arrowdown']) adelanteTeclas -= 1;
  if (teclas['d']) costadoTeclas += 1;
  if (teclas['a']) costadoTeclas -= 1;
  if (teclas['arrowleft']) yaw += dt * 2;
  if (teclas['arrowright']) yaw -= dt * 2;
  if (adelanteTeclas || costadoTeclas) mover(adelanteTeclas * VELOCIDAD * dt, costadoTeclas * VELOCIDAD * dt);

  // tren
  const proximo = horarios[trenesPasados];
  if (proximo !== undefined && tiempoNivel >= proximo - 2 && tiempoNivel < proximo) {
    avisar('⚠ SE ACERCA EL TREN ⚠');
  } else if (proximo !== undefined && tiempoNivel >= proximo && trenInicio < 0) {
    trenInicio = tiempoNivel;
    trenesPasados++;
    sonido.sonidoTren();
    avisar('');
  }
  let trenCerca = false;
  if (trenInicio >= 0) {
    const t = (tiempoNivel - trenInicio) / DURACION_TREN;
    tren.position.z = THREE.MathUtils.lerp(-90, 90, t);
    trenCerca = Math.abs(tren.position.z - jugador.position.z) < 34;
    if (trenCerca) {
      temblor = 0.06;
      if (navigator.vibrate && Math.random() < 0.1) navigator.vibrate(60);
    }
    if (t >= 1) {
      trenInicio = -1;
      tren.position.z = -300;
    }
  }

  // pintar
  if (dedo.apretado && dedo.modo === 'pintar' && panelActual) {
    if (trenCerca) {
      sonido.sonarSpray(false);
      if (performance.now() - ultimoAvisoLejos > 900) {
        ultimoAvisoLejos = performance.now();
        mostrarTextoFlotante(dedo.x, dedo.y - 40, '¡TIEMBLA TODO!', '#ffd84a');
      }
    } else {
      sonido.sonarSpray(true);
      rayoDesde(dedo.x, dedo.y);
      const golpe = raycaster.intersectObject(panelActual.malla)[0];

      // datos para el aerosol de tu mano
      rociando = true;
      camera.getWorldQuaternion(qCamara);
      qCamara.invert();
      dirMira.copy(raycaster.ray.direction).applyQuaternion(qCamara);
      distMira = golpe ? Math.min(golpe.distance, ALCANCE) : 2.5;

      if (golpe && golpe.distance <= ALCANCE) {
        rociar(panelActual, golpe.uv, golpe.distance);
      } else if (golpe && performance.now() - ultimoAvisoLejos > 900) {
        ultimoAvisoLejos = performance.now();
        mostrarTextoFlotante(dedo.x, dedo.y - 40, '¡MUY LEJOS! 👣', '#ff7a1a');
      }
    }
  }

  // calabazas
  if (tiempoJuego > proximaCalabaza && calabazas.length < 3) {
    crearCalabaza();
    proximaCalabaza = tiempoJuego + 3 + Math.random() * 3;
  }
  for (let i = calabazas.length - 1; i >= 0; i--) {
    const cal = calabazas[i];
    if (tiempoJuego - cal.nacimiento > 10) {
      quitarCalabaza(i);
      continue;
    }
    cal.grupo.position.y = cal.baseY + Math.sin(tiempoJuego * 2 + cal.fase) * 0.15;
  }

  // HUD
  const pct = Math.floor(porcentajePanel(panelActual) * 100);
  elTiempo.textContent = Math.max(0, Math.ceil(restante));
  elPasos.textContent = pasosTotal;
  elPorcentaje.textContent = pct + '%';
  barraRelleno.style.width = pct + '%';
  const distancia = Math.hypot(jugador.position.x + 3, jugador.position.z - panelActual.z) - DIST_PINTAR;
  elMeta.textContent = distancia <= 0.5 ? '¡AQUÍ!' : distancia.toFixed(0) + 'm';
  actualizarFlecha();

  // últimos 10 segundos: latidos y luz roja
  if (restante < 10) {
    cajaTiempo.classList.add('peligro');
    tinte.classList.add('activo');
    if (performance.now() - ultimoLatido > (restante < 5 ? 550 : 900)) {
      ultimoLatido = performance.now();
      sonido.latido();
    }
  } else {
    cajaTiempo.classList.remove('peligro');
    tinte.classList.remove('activo');
  }

  // ¿subiste de nivel o se acabó el tiempo?
  if (panelActual.completo) {
    completarNivel();
  } else if (restante <= 0) {
    asustar();
  }
}

function actualizarAmbiente(dt, ahora) {
  // la "luna" (con sombras) acompaña al jugador
  luna.target.position.set(jugador.position.x, 0, jugador.position.z);
  luna.position.set(jugador.position.x + 3, 7, jugador.position.z + 2);

  // lámparas que titilan (más nerviosas cuando queda poco tiempo)
  const nervios = jugando && restante < 10 ? 0.25 : 0.04;
  lamparas.forEach(function (l) {
    const prendida = !enSusto && Math.random() > nervios;
    l.luz.intensity = prendida ? l.base * (0.85 + Math.random() * 0.15) : 0;
    l.tubo.visible = prendida;
  });

  // murciélagos dando vueltas (animación en el bucle requestAnimationFrame)
  murcielagos.forEach(function (m) {
    const a = ahora * m.velocidad + m.fase;
    m.grupo.position.set(Math.cos(a) * m.radio * 0.5, 2.9 + Math.sin(a * 3) * 0.2, m.centroZ + Math.sin(a) * m.radio);
    m.grupo.rotation.y = -a;
    const aleteo = Math.sin(ahora * 20) * 0.7;
    m.grupo.userData.alas[0].rotation.z = aleteo;
    m.grupo.userData.alas[1].rotation.z = -aleteo;
  });

  // la guía y el marco de la pared actual laten
  if (panelActual && !panelActual.completo) {
    const pulso = 0.45 + Math.sin(ahora * 4) * 0.25;
    panelActual.guia.opacity = 0.4 + pulso * 0.6;
    panelActual.materialMarco.opacity = 0.5 + pulso * 0.5;
  }

  // las calabazas te miran
  calabazas.forEach(function (cal) {
    cal.grupo.lookAt(jugador.position.x, cal.grupo.position.y, jugador.position.z);
  });
}

// =====================================================
//  SUSTO
// =====================================================
let enSusto = false;
let esperandoGiro = false;   // se acabó el tiempo: esperando que gires hacia el tren
let inicioEspera = 0;
let inicioSusto = 0;
const origenSusto = new THREE.Vector3();
const direccionSusto = new THREE.Vector3();
let distInicial = 4;   // a qué distancia aparece el fantasma (adelante del tren)

function iniciarSusto(alTerminar) {
  enSusto = true;
  inicioSusto = performance.now();

  // el fantasma aparece justo donde estás mirando
  camera.getWorldPosition(origenSusto);
  camera.getWorldDirection(direccionSusto);
  // que aparezca delante de la ventanilla del tren, no adentro
  distInicial = 4;
  if (direccionSusto.x > 0.1) {
    distInicial = THREE.MathUtils.clamp((3.8 - origenSusto.x) / direccionSusto.x, 2.2, 6);
  }
  fantasma.visible = true;
  luzFantasma.intensity = 12;
  linterna.visible = true;
  linterna.intensity = 3;

  capaSusto.classList.remove('oculto');
  document.body.classList.add('asustado');
  capaSusto.querySelectorAll('.flash, .susto-texto').forEach(function (el) {
    el.style.animation = 'none';
    void el.offsetWidth;
    el.style.animation = '';
  });

  setTimeout(function () {
    sonido.gritar();
    if (navigator.vibrate) navigator.vibrate([400, 80, 400, 80, 600]);
  }, 380);

  setTimeout(function () {
    enSusto = false;
    fantasma.visible = false;
    luzFantasma.intensity = 0;
    linterna.intensity = 9;
    linterna.visible = linternaActiva;
    capaSusto.classList.add('oculto');
    document.body.classList.remove('asustado');
    alTerminar();
  }, 2800);
}

function actualizarSusto() {
  const t = (performance.now() - inicioSusto) / 1000;
  let distancia;
  if (t < 0.35) {
    distancia = distInicial;
    fantasma.visible = Math.random() < 0.5;   // parpadea frente al tren
  } else {
    fantasma.visible = true;
    const avance = Math.min((t - 0.35) / 0.35, 1);
    distancia = distInicial - avance * avance * (distInicial - 1.4);    // se te viene encima
  }
  fantasma.position.copy(origenSusto).addScaledVector(direccionSusto, distancia);
  fantasma.position.y -= 0.1;
  fantasma.lookAt(origenSusto);
  fantasma.position.x += (Math.random() - 0.5) * 0.06;
  fantasma.rotation.z += Math.sin(t * 30) * 0.05;
  luzFantasma.intensity = 8 + Math.random() * 10;
  linterna.intensity = Math.random() < 0.3 ? 0 : 4;
}

// =====================================================
//  FLUJO: NIVELES, SUSTOS, FINAL
// =====================================================
function iniciarNivel(n, reiniciarEstadisticas) {
  nivel = n;
  esperandoGiro = false;
  const palabra = palabraDeNivel(n);
  panelActual = paneles[(n - 1) % paneles.length];
  // al volver a la primera pared de la fila, te llevo de nuevo al extremo izquierdo
  if ((n - 1) % paneles.length === 0) jugador.position.z = POSICIONES[0];
  prepararPalabra(panelActual, palabra);

  limiteNivel = limiteDeNivel(n);
  tiempoNivel = 0;
  bonusNivel = 0;
  restante = limiteNivel;
  horarios = horariosTren(n, limiteNivel);
  trenesPasados = 0;
  trenInicio = -1;
  tren.position.z = -300;

  if (reiniciarEstadisticas) {
    tiempoEnNivel = 0;
    pasosNivel = 0;
    metrosNivel = 0;
  }

  quitarTodasLasCalabazas();
  proximaCalabaza = tiempoJuego + 2.5;
  cajaTiempo.classList.remove('peligro');
  tinte.classList.remove('activo');
  avisar('');

  elNivel.textContent = nivel;
  elPalabra.textContent = palabra;
  elPorcentaje.textContent = '0%';
  barraRelleno.style.width = '0%';
  elTiempo.textContent = limiteNivel;
  actualizarVidasHUD();

  const pista = (n - 1) % paneles.length === 0 ? 'cuidado con el guardia' : 'seguí hacia la derecha →';
  mostrarBanner('NIVEL ' + nivel, palabra, limiteNivel + ' segundos · ' + pista);
  jugando = true;
}

function completarNivel() {
  if (!jugando) return;
  jugando = false;
  dedo.apretado = false;
  sonido.sonarSpray(false);
  sonido.sonidoNivel();
  avisar('');
  elFlecha.classList.add('oculto');
  cajaTiempo.classList.remove('peligro');
  tinte.classList.remove('activo');
  nivelesSuperados++;

  setTimeout(function () {
    document.querySelector('#nivel-superado').textContent = nivel;
    document.querySelector('#nivel-palabra').textContent = panelActual.palabra;
    document.querySelector('#nivel-tiempo').textContent = Math.round(tiempoEnNivel) + ' s';
    document.querySelector('#nivel-pasos').textContent = pasosNivel;
    document.querySelector('#nivel-metros').textContent = metrosNivel.toFixed(1) + ' m';
    document.querySelector('#nivel-vidas').textContent = vidas + ' / ' + VIDAS_MAX;
    document.querySelector('#nivel-siguiente').textContent =
      'Próximo andén: ' + palabraDeNivel(nivel + 1) + ' · ' + limiteDeNivel(nivel + 1) + ' segundos';
    pantallaNivel.classList.remove('oculto');
  }, 900);
}

// se acabó el tiempo del nivel: te asusta el guardia fantasma
function asustar() {
  if (!jugando) return;
  jugando = false;
  dedo.apretado = false;
  sonido.sonarSpray(false);
  elFlecha.classList.add('oculto');
  tinte.classList.remove('activo');
  cajaTiempo.classList.remove('peligro');

  // primero un aviso chiquito: hay que girar para ver el tren (ahí aparece el guardia)
  esperandoGiro = true;
  inicioEspera = performance.now();
  tren.position.set(5.5, 0.35, jugador.position.z);   // el tren se frena frente a vos
  sonido.sonidoTren();
  avisar('Se acabó el tiempo… gira para ver el tren', true);
}

// cuando mirás hacia el tren (o pasan 9 s) aparece el policía fantasma
const haciaTren = new THREE.Vector3();
function actualizarEspera() {
  camera.getWorldPosition(posicionCamara);
  camera.getWorldDirection(adelante);
  haciaTren.set(5.5, 1.2, jugador.position.z).sub(posicionCamara).normalize();
  const miraElTren = adelante.angleTo(haciaTren) < 0.7;
  if (miraElTren || performance.now() - inicioEspera > 9000) lanzarSusto();
}

function lanzarSusto() {
  esperandoGiro = false;
  avisar('');
  vidas--;
  actualizarVidasHUD();

  iniciarSusto(function () {
    tren.position.z = -300;
    tinte.classList.remove('activo');
    cajaTiempo.classList.remove('peligro');
    if (vidas > 0) {
      reanudarTrasSusto();
    } else {
      terminarPartida();
    }
  });
}

// seguís en el mismo nivel, con lo que ya pintaste, pero con el reloj de nuevo
function reanudarTrasSusto() {
  tiempoNivel = 0;
  bonusNivel = 0;
  restante = limiteNivel;
  trenesPasados = 0;
  trenInicio = -1;
  tren.position.z = -300;
  quitarTodasLasCalabazas();
  proximaCalabaza = tiempoJuego + 2;
  mostrarBanner('¡OTRA VEZ!', vidas === 1 ? 'Última vida' : 'Te quedan ' + vidas + ' vidas', 'Terminá ' + panelActual.palabra + ' antes de que vuelva');
  jugando = true;
}

function rangoSegun(n) {
  if (n >= 7) return 'REY DEL SUBTE MALDITO 👑';
  if (n >= 4) return 'LEYENDA DEL ANDÉN';
  if (n >= 2) return 'VÁNDALO ESPECTRAL';
  return 'TOY DEL MÁS ALLÁ';
}

function terminarPartida() {
  document.querySelector('#resultado-niveles').textContent = nivelesSuperados;
  document.querySelector('#resultado-rango').textContent = rangoSegun(nivelesSuperados);
  document.querySelector('#resultado-pasos').textContent = pasosTotal;
  document.querySelector('#resultado-metros').textContent = metrosTotal.toFixed(1) + ' m';
  document.querySelector('#resultado-tiempo').textContent = Math.round(tiempoTotal) + ' s';
  pantallaFinal.classList.remove('oculto');
}

function empezarJuego() {
  sonido.iniciarAudio();
  sensores.pedirPermisos();   // tiene que ser dentro del toque (iPhone)
  sensores.recentrar();

  pantallaInicio.classList.add('oculto');
  pantallaFinal.classList.add('oculto');
  pantallaNivel.classList.add('oculto');

  paneles.forEach(limpiarPanel);
  jugador.position.set(DIST_PINTAR - 3, 0, POSICIONES[0]);   // arrancás en el extremo izquierdo, a DIST_PINTAR de la pared
  yaw = YAW_INICIAL;
  pitch = 0;
  tiempoJuego = 0;
  tiempoTotal = 0;
  pasosTotal = 0;
  metrosTotal = 0;
  avancePendiente = 0;
  nivelesSuperados = 0;
  vidas = VIDAS_MAX;
  iniciarNivel(1, true);
}

// guardar tus tags en una imagen
function guardarTags() {
  const conTinta = paneles.filter(function (p) { return p.tieneTinta; });
  if (!conTinta.length) return;
  const c = document.createElement('canvas');
  c.width = ANCHO_LIENZO;
  c.height = ALTO_LIENZO * conTinta.length;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#1c2228';
  ctx.fillRect(0, 0, c.width, c.height);
  conTinta.forEach(function (panel, i) {
    ctx.drawImage(panel.lienzo, 0, i * ALTO_LIENZO);
  });
  const enlace = document.createElement('a');
  enlace.download = 'mis-tags-subte-maldito.png';
  enlace.href = c.toDataURL('image/png');
  enlace.click();
}

// ---------- botones de pantallas ----------
document.querySelector('#btn-jugar').addEventListener('click', empezarJuego);
document.querySelector('#btn-otra-vez').addEventListener('click', empezarJuego);
document.querySelector('#btn-foto').addEventListener('click', guardarTags);

document.querySelector('#btn-siguiente').addEventListener('click', function () {
  pantallaNivel.classList.add('oculto');
  iniciarNivel(nivel + 1, true);
});

document.querySelector('#btn-reintentar').addEventListener('click', function () {
  pantallaNivel.classList.add('oculto');
  nivelesSuperados = Math.max(0, nivelesSuperados - 1);
  iniciarNivel(nivel, true);
});

// ---------- opciones ----------
document.querySelector('#btn-opciones').addEventListener('click', function () {
  if (!pantallaInicio.classList.contains('oculto') ||
      !pantallaFinal.classList.contains('oculto') ||
      !pantallaNivel.classList.contains('oculto') || enSusto || esperandoGiro) return;
  reanudarAlCerrar = jugando;
  jugando = false;
  dedo.apretado = false;
  sonido.sonarSpray(false);
  pantallaOpciones.classList.remove('oculto');
});

function cerrarOpciones() {
  pantallaOpciones.classList.add('oculto');
  if (reanudarAlCerrar) jugando = true;
  reanudarAlCerrar = false;
}

document.querySelector('#btn-continuar').addEventListener('click', cerrarOpciones);

document.querySelector('#btn-calibrar').addEventListener('click', function () {
  sensores.recentrar();
  mostrarTextoFlotante(window.innerWidth / 2, window.innerHeight * 0.5, 'FRENTE CALIBRADO', '#7dff3a');
});

document.querySelector('#rango-sens').addEventListener('input', function (e) {
  const s = Number(e.target.value);
  document.querySelector('#val-sens').textContent = s;
  sensores.fijarUmbral(2.8 - 0.4 * s);   // más sensible = umbral más bajo
});

document.querySelector('#rango-paso').addEventListener('input', function (e) {
  largoPaso = Number(e.target.value);
  document.querySelector('#val-paso').textContent = largoPaso.toFixed(2) + ' m';
});

document.querySelector('#btn-linterna').addEventListener('click', function (e) {
  linternaActiva = !linternaActiva;
  linterna.visible = linternaActiva;
  e.currentTarget.textContent = '🔦 Linterna: ' + (linternaActiva ? 'ON' : 'OFF');
});

let sonidoActivo = true;
document.querySelector('#btn-sonido').addEventListener('click', function (e) {
  sonidoActivo = !sonidoActivo;
  sonido.silenciar(!sonidoActivo);
  e.currentTarget.textContent = '🔊 Sonido: ' + (sonidoActivo ? 'ON' : 'OFF');
});

document.querySelector('#btn-reiniciar-nivel').addEventListener('click', function () {
  pantallaOpciones.classList.add('oculto');
  reanudarAlCerrar = false;
  iniciarNivel(nivel, true);
});

document.addEventListener('gesturestart', function (e) { e.preventDefault(); });

// =====================================================
//  RESIZE Y RENDIMIENTO
// =====================================================
function ajustarTamano() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  // nunca más de 2, y respetando lo que haya bajado el control de FPS
  ratioPixeles = Math.min(ratioPixeles, Math.min(window.devicePixelRatio, 2));
  renderer.setPixelRatio(ratioPixeles);
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', ajustarTamano);

// si el celu va por debajo de 30 FPS, baja la resolución de a poco (mínimo 1)
let acumulado = 0;
let cuadros = 0;
function controlarRendimiento(dtReal) {
  if (dtReal > 0.5) return;   // pestaña en segundo plano: no cuenta
  acumulado += dtReal;
  cuadros++;
  if (acumulado >= 2) {
    const fps = cuadros / acumulado;
    if (fps < 30 && ratioPixeles > 1) {
      ratioPixeles = Math.max(1, ratioPixeles - 0.25);
      ajustarTamano();
    }
    acumulado = 0;
    cuadros = 0;
  }
}

// =====================================================
//  ARRANQUE (con loader)
// =====================================================
const reloj = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const dtReal = reloj.getDelta();
  const dt = Math.min(dtReal, 0.05);
  const ahora = performance.now() / 1000;

  actualizarCamara();
  if (jugando) {
    actualizarJuego(dt);
    controlarRendimiento(dtReal);
  }
  actualizarAerosol(dt);
  actualizarAmbiente(dt, ahora);
  if (esperandoGiro) actualizarEspera();
  if (enSusto) actualizarSusto();

  renderer.render(scene, camera);
}

function setProgreso(porcentaje, texto) {
  elLoaderRelleno.style.width = porcentaje + '%';
  elLoaderTexto.textContent = texto;
}

// deja respirar al navegador para que se pinte el loader entre pasos
function pausa(ms) {
  return new Promise(function (resolver) { setTimeout(resolver, ms || 40); });
}

async function iniciar() {
  try {
    setProgreso(5, 'Cargando tipografías…');
    await Promise.race([
      Promise.all([
        document.fonts.load('40px "Permanent Marker"'),
        document.fonts.load('40px "Creepster"')
      ]),
      pausa(3000)
    ]);

    setProgreso(25, 'Construyendo el andén…');
    await pausa();
    construirEstacion(scene);
    lamparas = construirLamparas(scene);

    setProgreso(55, 'Preparando las paredes…');
    await pausa();
    POSICIONES.forEach(function (z) { crearPanelSlot(z); });

    setProgreso(75, 'Despertando a los habitantes del subte…');
    await pausa();
    construirMurcielagos();
    tren = construirTren(scene);
    construirFantasma();
    construirAerosol();
    actualizarVidasHUD();

    setProgreso(92, 'Compilando luces y sombras…');
    await pausa();
    renderer.compile(scene, camera);

    setProgreso(100, '¡Listo!');
    await pausa(350);

    document.querySelector('#btn-jugar').disabled = false;
    document.querySelector('#btn-jugar').textContent = '¡A PINTAR!';
    elLoader.classList.add('listo');
    setTimeout(function () { elLoader.remove(); }, 700);
    animate();
  } catch (error) {
    // si algo falla, se ve en pantalla (además de la consola)
    console.error(error);
    setProgreso(100, 'Error: ' + error.message);
  }
}

iniciar();
