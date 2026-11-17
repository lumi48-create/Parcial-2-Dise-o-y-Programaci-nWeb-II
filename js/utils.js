// =====================================================
//  UTILIDADES compartidas (texturas y dibujo en canvas)
// =====================================================
import * as THREE from 'three';

let anisotropia = 1;

// se fija una sola vez desde main.js (limitada a 4 para cuidar el celu)
export function fijarAnisotropia(valor) {
  anisotropia = valor;
}

// crea una textura dibujando en un canvas 2D
export function texturaCanvas(ancho, alto, dibujar, repX, repY) {
  const c = document.createElement('canvas');
  c.width = ancho;
  c.height = alto;
  dibujar(c.getContext('2d'), ancho, alto);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = anisotropia;
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repX || 1, repY || 1);
  return t;
}

// '#ff7a1a' + 0.4 -> 'rgba(255,122,26,0.4)'
export function rgba(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
}

// rectángulo con esquinas redondeadas (trazo, sin pintar)
export function rectRedondo(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
