// =====================================================
//  LA ESTACIÓN (andén, vías, túnel, lámparas y tren)
//  andén: x de -3 (pared) a 3 (borde) · vías: x de 3 a 8 · largo en z
// =====================================================
import * as THREE from 'three';
import { texturaCanvas, rectRedondo } from './utils.js';

export const LARGO = 46;

// textura de azulejos viejos y húmedos
function azulejos(ctx, w, h, oscuro) {
  ctx.fillStyle = '#07060a';
  ctx.fillRect(0, 0, w, h);
  const aw = 32;
  const ah = 16;
  for (let y = 0; y < h; y += ah) {
    const desfase = (y / ah) % 2 ? aw / 2 : 0;
    for (let x = -aw; x < w; x += aw) {
      const n = Math.random();
      let r = 48 + n * 24;
      let g = 56 + n * 20;
      let b = 64 + n * 24;
      if (oscuro) { r *= 0.55; g *= 0.5; b *= 0.62; }
      if (Math.random() < 0.07) { g += 26; r -= 10; }   // humedad verde
      const grad = ctx.createLinearGradient(0, y, 0, y + ah);
      grad.addColorStop(0, 'rgb(' + ((r + 14) | 0) + ',' + ((g + 14) | 0) + ',' + ((b + 14) | 0) + ')');
      grad.addColorStop(1, 'rgb(' + (r | 0) + ',' + (g | 0) + ',' + (b | 0) + ')');
      ctx.fillStyle = grad;
      ctx.fillRect(x + desfase + 1, y + 1, aw - 2, ah - 2);
    }
  }
  // manchas de humedad suaves
  for (let i = 0; i < 7; i++) {
    const cx = Math.random() * w;
    const cy = Math.random() * h;
    const rad = 14 + Math.random() * 30;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
    grad.addColorStop(0, 'rgba(0,0,0,0.35)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
  }
  // chorreaduras
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  for (let i = 0; i < 6; i++) {
    ctx.fillRect(Math.random() * w, Math.random() * h * 0.6, 2, 10 + Math.random() * 40);
  }
}

export function construirEstacion(scene) {
  // pared del andén (donde pintás)
  const pared = new THREE.Mesh(
    new THREE.PlaneGeometry(LARGO, 3.6),
    new THREE.MeshStandardMaterial({
      map: texturaCanvas(256, 128, function (ctx, w, h) { azulejos(ctx, w, h, false); }, LARGO / 2, 3.6),
      roughness: 0.85
    })
  );
  pared.position.set(-3, 1.8, 0);
  pared.rotation.y = Math.PI / 2;
  pared.receiveShadow = true;
  scene.add(pared);

  // franja de color a la altura de la cabeza
  const franja = new THREE.Mesh(
    new THREE.PlaneGeometry(LARGO, 0.18),
    new THREE.MeshStandardMaterial({ color: 0x6a2a14, roughness: 0.5 })
  );
  franja.position.set(-2.99, 2.85, 0);
  franja.rotation.y = Math.PI / 2;
  scene.add(franja);

  // piso del andén
  const piso = new THREE.Mesh(
    new THREE.PlaneGeometry(6, LARGO),
    new THREE.MeshStandardMaterial({
      map: texturaCanvas(128, 128, function (ctx, w, h) {
        ctx.fillStyle = '#17131b';
        ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < 2400; i++) {
          const n = 20 + Math.random() * 28;
          ctx.fillStyle = 'rgba(' + (n | 0) + ',' + ((n * 0.92) | 0) + ',' + ((n * 1.1) | 0) + ',0.6)';
          ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
        }
        ctx.strokeStyle = 'rgba(0,0,0,0.35)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 5; i++) {
          ctx.beginPath();
          ctx.moveTo(Math.random() * w, Math.random() * h);
          ctx.lineTo(Math.random() * w, Math.random() * h);
          ctx.stroke();
        }
      }, 3, LARGO / 2),
      roughness: 0.9
    })
  );
  piso.rotation.x = -Math.PI / 2;
  piso.receiveShadow = true;
  scene.add(piso);

  // borde amarillo y negro
  const borde = new THREE.Mesh(
    new THREE.PlaneGeometry(0.35, LARGO),
    new THREE.MeshStandardMaterial({
      map: texturaCanvas(32, 64, function (ctx) {
        ctx.fillStyle = '#f7c948'; ctx.fillRect(0, 0, 32, 32);
        ctx.fillStyle = '#16120a'; ctx.fillRect(0, 32, 32, 32);
      }, 1, LARGO / 0.8),
      emissive: 0x332d08
    })
  );
  borde.rotation.x = -Math.PI / 2;
  borde.position.set(2.82, 0.005, 0);
  scene.add(borde);

  // frente del andén que cae a las vías
  const frenteAnden = new THREE.Mesh(
    new THREE.PlaneGeometry(LARGO, 1.2),
    new THREE.MeshStandardMaterial({ color: 0x15111a })
  );
  frenteAnden.position.set(3, -0.6, 0);
  frenteAnden.rotation.y = Math.PI / 2;
  scene.add(frenteAnden);

  // lecho de las vías y rieles
  const lecho = new THREE.Mesh(
    new THREE.PlaneGeometry(5, LARGO + 60),
    new THREE.MeshStandardMaterial({ color: 0x120e14, roughness: 1 })
  );
  lecho.rotation.x = -Math.PI / 2;
  lecho.position.set(5.5, -1.2, 0);
  scene.add(lecho);

  const materialRiel = new THREE.MeshStandardMaterial({ color: 0x6b6470, metalness: 0.7, roughness: 0.3 });
  [4.7, 6.3].forEach(function (x) {
    const riel = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, LARGO + 60), materialRiel);
    riel.position.set(x, -1.15, 0);
    scene.add(riel);
  });

  // durmientes: UN solo InstancedMesh (1 draw call en vez de ~100)
  const largoVias = LARGO + 60;
  const cantidad = Math.floor(largoVias);
  const durmientes = new THREE.InstancedMesh(
    new THREE.BoxGeometry(2.4, 0.06, 0.25),
    new THREE.MeshStandardMaterial({ color: 0x2a1d16 }),
    cantidad
  );
  const matriz = new THREE.Matrix4();
  for (let i = 0; i < cantidad; i++) {
    matriz.makeTranslation(5.5, -1.18, -largoVias / 2 + i);
    durmientes.setMatrixAt(i, matriz);
  }
  durmientes.instanceMatrix.needsUpdate = true;
  scene.add(durmientes);

  // pared del túnel (del otro lado de las vías)
  const paredTunel = new THREE.Mesh(
    new THREE.PlaneGeometry(LARGO + 60, 4.8),
    new THREE.MeshStandardMaterial({
      map: texturaCanvas(256, 128, function (ctx, w, h) { azulejos(ctx, w, h, true); }, (LARGO + 60) / 2, 4.8),
      roughness: 1
    })
  );
  paredTunel.position.set(8, 1.2, 0);
  paredTunel.rotation.y = -Math.PI / 2;
  scene.add(paredTunel);

  // techo
  const techo = new THREE.Mesh(
    new THREE.PlaneGeometry(11, LARGO + 60),
    new THREE.MeshStandardMaterial({ color: 0x0c0910, roughness: 1 })
  );
  techo.rotation.x = Math.PI / 2;
  techo.position.set(2.5, 3.6, 0);
  scene.add(techo);

  // paredes de los extremos del andén
  [-LARGO / 2, LARGO / 2].forEach(function (z) {
    const fin = new THREE.Mesh(
      new THREE.PlaneGeometry(6, 3.6),
      new THREE.MeshStandardMaterial({ color: 0x0d0a10 })
    );
    fin.position.set(0, 1.8, z);
    fin.rotation.y = z < 0 ? 0 : Math.PI;
    scene.add(fin);
  });

  // columnas redondas (proyectan sombra sobre el piso y la pared)
  const materialColumna = new THREE.MeshStandardMaterial({ color: 0x2b2230, roughness: 0.7 });
  [-18, -6, 6, 18].forEach(function (z) {
    const columna = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.26, 3.6, 24), materialColumna);
    columna.position.set(2.1, 1.8, z);
    columna.castShadow = true;
    columna.receiveShadow = true;
    scene.add(columna);
  });

  // carteles "ESTACIÓN 13" con sangre chorreando
  const texturaCartel = texturaCanvas(512, 96, function (ctx, w) {
    ctx.fillStyle = '#d8cfb4';
    ctx.fillRect(0, 0, w, 70);
    ctx.fillStyle = '#1a1a1a';
    ctx.font = '46px "Creepster", cursive';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ESTACIÓN 13', w / 2, 38);
    ctx.fillStyle = '#8a0f1f';
    for (let i = 0; i < 8; i++) {
      const x = 20 + Math.random() * (w - 40);
      const largo = 8 + Math.random() * 22;
      ctx.fillRect(x, 66, 5, largo);
      ctx.beginPath();
      ctx.arc(x + 2.5, 66 + largo, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
  });
  [-6, 6].forEach(function (z) {
    const cartel = new THREE.Mesh(
      new THREE.PlaneGeometry(2.6, 0.5),
      new THREE.MeshStandardMaterial({ map: texturaCartel, transparent: true, emissive: 0x221c10 })
    );
    cartel.position.set(-2.97, 3.15, z);
    cartel.rotation.y = Math.PI / 2;
    scene.add(cartel);
  });
}

// ---------- lámparas que titilan (PointLight + tubo) ----------
export function construirLamparas(scene) {
  const lamparas = [];
  [-15, -5, 5, 15].forEach(function (z) {
    const luz = new THREE.PointLight(0xff9a4a, 5, 11, 1);
    luz.position.set(0.5, 3.2, z);
    scene.add(luz);
    const tubo = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.04, 1.1, 4, 10),
      new THREE.MeshBasicMaterial({ color: 0xffd08a })
    );
    tubo.rotation.x = Math.PI / 2;
    tubo.position.copy(luz.position);
    tubo.position.y = 3.5;
    scene.add(tubo);
    lamparas.push({ luz: luz, tubo: tubo, base: 5 });
  });
  return lamparas;
}

// ---------- tren fantasma ----------
export function construirTren(scene) {
  const tren = new THREE.Group();
  const largoTren = 60;
  const cuerpo = new THREE.Mesh(
    new THREE.BoxGeometry(2.6, 2.9, largoTren),
    new THREE.MeshStandardMaterial({ color: 0x1e1b24, roughness: 0.45, metalness: 0.45 })
  );
  tren.add(cuerpo);

  const texCostado = texturaCanvas(512, 128, function (ctx, w, h) {
    ctx.fillStyle = '#1e1b24';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#8a0f1f';
    ctx.fillRect(0, 88, w, 10);
    for (let x = 24; x < w; x += 124) {
      // ventana con luz
      const luz = ctx.createLinearGradient(0, 20, 0, 72);
      luz.addColorStop(0, '#fff3a0');
      luz.addColorStop(1, '#e2a82a');
      ctx.fillStyle = luz;
      rectRedondo(ctx, x, 20, 80, 52, 10);
      ctx.fill();
      // fantasma en la ventana
      ctx.fillStyle = '#f2ead3';
      ctx.beginPath();
      ctx.arc(x + 40, 40, 14, Math.PI, 0);
      ctx.lineTo(x + 54, 66);
      ctx.lineTo(x + 47, 61);
      ctx.lineTo(x + 40, 66);
      ctx.lineTo(x + 33, 61);
      ctx.lineTo(x + 26, 66);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#000';
      ctx.beginPath(); ctx.arc(x + 34, 42, 2.6, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(x + 46, 42, 2.6, 0, Math.PI * 2); ctx.fill();
    }
  }, 8, 1);
  const costado = new THREE.Mesh(
    new THREE.PlaneGeometry(largoTren, 2.9),
    new THREE.MeshStandardMaterial({ map: texCostado, emissive: 0xffffff, emissiveMap: texCostado, emissiveIntensity: 0.8 })
  );
  costado.position.x = -1.31;
  costado.rotation.y = -Math.PI / 2;
  tren.add(costado);

  tren.position.set(5.5, 0.35, -300);
  scene.add(tren);
  return tren;
}
