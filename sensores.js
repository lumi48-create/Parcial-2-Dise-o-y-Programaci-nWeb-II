// =====================================================
//  SENSORES DEL CELU
//  - giroscopio (deviceorientation): la cámara mira hacia donde apuntás
//  - acelerómetro (devicemotion): detecta tus pasos reales
// =====================================================
import * as THREE from 'three';

let alpha = 0;
let beta = 90;
let gamma = 0;
let alphaBase = null;   // hacia dónde mirabas al empezar = "adelante"
let hayGiroscopio = false;
let escuchando = false;

// pasos
let funcionPaso = null;
let promedio = 9.8;     // gravedad promedio (se adapta sola)
let filtrado = 9.8;
let arriba = false;
let ultimoPaso = 0;
let umbral = 1.6;       // cuánto tiene que subir la fuerza para contar un paso

// para convertir los ángulos del celu en la rotación de la cámara
const ejeZ = new THREE.Vector3(0, 0, 1);
const euler = new THREE.Euler();
const q0 = new THREE.Quaternion();
const q1 = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5)); // -90° en X

function leerOrientacion(e) {
  if (e.alpha === null || e.beta === null) return;
  hayGiroscopio = true;
  alpha = e.alpha;
  beta = e.beta;
  gamma = e.gamma || 0;
  if (alphaBase === null) alphaBase = alpha;
}

function leerMovimiento(e) {
  const a = e.accelerationIncludingGravity;
  if (!a || a.x === null) return;
  const fuerza = Math.hypot(a.x, a.y, a.z);

  promedio = promedio * 0.97 + fuerza * 0.03;
  filtrado = filtrado * 0.6 + fuerza * 0.4;

  // un paso = un pico de fuerza por encima del promedio
  const ahora = performance.now();
  if (!arriba && filtrado > promedio + umbral && ahora - ultimoPaso > 330) {
    arriba = true;
    ultimoPaso = ahora;
    if (funcionPaso) funcionPaso();
  } else if (arriba && filtrado < promedio + 0.4) {
    arriba = false;
  }
}

// en iPhone hay que pedir permiso, y SOLO adentro de un toque del usuario
export function pedirPermisos() {
  if (escuchando) return;
  escuchando = true;

  const pedidos = [];
  if (typeof DeviceOrientationEvent !== 'undefined' &&
      typeof DeviceOrientationEvent.requestPermission === 'function') {
    pedidos.push(DeviceOrientationEvent.requestPermission().catch(function () { return 'denied'; }));
  }
  if (typeof DeviceMotionEvent !== 'undefined' &&
      typeof DeviceMotionEvent.requestPermission === 'function') {
    pedidos.push(DeviceMotionEvent.requestPermission().catch(function () { return 'denied'; }));
  }

  Promise.all(pedidos).then(function () {
    window.addEventListener('deviceorientation', leerOrientacion);
    window.addEventListener('devicemotion', leerMovimiento);
  });
}

export function alDarPaso(funcion) {
  funcionPaso = funcion;
}

export function tieneGiroscopio() {
  return hayGiroscopio;
}

// sensibilidad de pasos (menor umbral = más sensible)
export function fijarUmbral(valor) {
  umbral = valor;
}

// lo que tenés adelante ahora pasa a ser "adelante" en el juego
export function recentrar() {
  alphaBase = null;
}

// copia la orientación del celu en el quaternion de la cámara
export function aplicarOrientacion(quaternion) {
  const anguloPantalla = (screen.orientation && screen.orientation.angle) || window.orientation || 0;
  const a = THREE.MathUtils.degToRad(alpha - (alphaBase === null ? alpha : alphaBase));
  const b = THREE.MathUtils.degToRad(beta);
  const g = THREE.MathUtils.degToRad(gamma);
  const o = THREE.MathUtils.degToRad(anguloPantalla);

  euler.set(b, a, -g, 'YXZ');
  quaternion.setFromEuler(euler);
  quaternion.multiply(q1);
  quaternion.multiply(q0.setFromAxisAngle(ejeZ, -o));
}
