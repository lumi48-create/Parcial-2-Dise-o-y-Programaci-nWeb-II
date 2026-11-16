// =====================================================
//  MODELOS 3D compuestos (geometrías propias, sin archivos externos)
//  calabaza · murciélago · guardia fantasma
// =====================================================
import * as THREE from 'three';

// activa las sombras en todas las mallas del modelo (menos las marcadas)
function conSombras(grupo) {
  grupo.traverse(function (o) {
    if (o.isMesh && !o.userData.sinSombra) o.castShadow = true;
  });
  return grupo;
}

export function crearModeloCalabaza() {
  const g = new THREE.Group();

  // cuerpo con gajos
  const geo = new THREE.SphereGeometry(0.3, 32, 24);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const f = 1 + 0.09 * Math.cos(Math.atan2(z, x) * 8);
    pos.setXYZ(i, x * f, y * 0.82, z * f);
  }
  geo.computeVertexNormals();
  g.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0xff7a1a, emissive: 0x5a2000, roughness: 0.55 })));

  // tallito
  const tallo = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.055, 0.13, 10),
    new THREE.MeshStandardMaterial({ color: 0x4a8f3a, roughness: 0.8 })
  );
  tallo.position.set(0.02, 0.27, 0);
  tallo.rotation.z = -0.25;
  g.add(tallo);

  // cara que brilla
  const brillo = new THREE.MeshBasicMaterial({ color: 0xfff08a, side: THREE.DoubleSide });
  const ojo = new THREE.Shape();
  ojo.moveTo(-0.06, -0.045);
  ojo.lineTo(0.06, -0.045);
  ojo.lineTo(0, 0.065);
  ojo.closePath();
  [-1, 1].forEach(function (lado) {
    const o = new THREE.Mesh(new THREE.ShapeGeometry(ojo), brillo);
    o.position.set(lado * 0.1, 0.06, 0.28);
    o.rotation.y = lado * 0.35;
    o.userData.sinSombra = true;
    g.add(o);
  });
  const boca = new THREE.Shape();
  boca.moveTo(-0.15, -0.02);
  boca.lineTo(-0.1, -0.07);
  boca.lineTo(-0.05, -0.03);
  boca.lineTo(0, -0.08);
  boca.lineTo(0.05, -0.03);
  boca.lineTo(0.1, -0.07);
  boca.lineTo(0.15, -0.02);
  boca.quadraticCurveTo(0, 0.05, -0.15, -0.02);
  const b = new THREE.Mesh(new THREE.ShapeGeometry(boca), brillo);
  b.position.set(0, -0.06, 0.285);
  b.userData.sinSombra = true;
  g.add(b);

  // zona invisible más grande para que sea fácil de tocar con el dedo
  const hit = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6), new THREE.MeshBasicMaterial({ visible: false }));
  hit.userData.sinSombra = true;
  g.add(hit);
  return conSombras(g);
}

export function crearModeloMurcielago() {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0x0a0710, roughness: 0.9, side: THREE.DoubleSide });

  const cuerpo = new THREE.Mesh(new THREE.SphereGeometry(0.07, 14, 12), mat);
  cuerpo.scale.set(1, 1.4, 1);
  g.add(cuerpo);
  const cabeza = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 10), mat);
  cabeza.position.y = 0.11;
  g.add(cabeza);
  [-1, 1].forEach(function (lado) {
    const oreja = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.06, 6), mat);
    oreja.position.set(lado * 0.03, 0.16, 0);
    g.add(oreja);
    const ojo = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff1030 }));
    ojo.position.set(lado * 0.02, 0.12, 0.045);
    ojo.userData.sinSombra = true;
    g.add(ojo);
  });

  // alas con borde ondulado
  const ala = new THREE.Shape();
  ala.moveTo(0, 0.04);
  ala.quadraticCurveTo(0.15, 0.24, 0.42, 0.14);
  ala.lineTo(0.34, -0.02);
  ala.quadraticCurveTo(0.28, 0.04, 0.24, -0.08);
  ala.quadraticCurveTo(0.16, -0.02, 0.1, -0.12);
  ala.quadraticCurveTo(0.05, -0.04, 0, -0.08);
  ala.closePath();
  const geoAla = new THREE.ShapeGeometry(ala);
  const alaD = new THREE.Mesh(geoAla, mat);
  alaD.position.x = 0.05;
  const alaI = new THREE.Mesh(geoAla, mat);
  alaI.position.x = -0.05;
  alaI.scale.x = -1;
  g.add(alaD, alaI);
  g.userData.alas = [alaD, alaI];   // main.js las anima (aleteo)
  g.scale.setScalar(1.25);
  return conSombras(g);
}

export function crearModeloFantasma() {
  const g = new THREE.Group();
  const interior = new THREE.Group();
  interior.position.y = -0.55;
  g.add(interior);

  // silueta: cúpula + cuerpo + falda ondulada
  const perfil = [];
  for (let i = 0; i <= 12; i++) {
    const t = (i / 12) * (Math.PI / 2);
    perfil.push(new THREE.Vector2(Math.sin(t) * 0.55, 0.5 + Math.cos(t) * 0.55));
  }
  perfil.push(new THREE.Vector2(0.55, 0.0));
  perfil.push(new THREE.Vector2(0.55, -0.45));
  perfil.push(new THREE.Vector2(0.5, -0.55));
  perfil.push(new THREE.Vector2(0.25, -0.55));
  perfil.push(new THREE.Vector2(0.0, -0.55));
  const geo = new THREE.LatheGeometry(perfil, 56);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    if (y < -0.4) {
      const ondas = 0.5 + 0.5 * Math.cos(Math.atan2(z, x) * 6);
      const radio = Math.hypot(x, z) / 0.55;
      pos.setY(i, y - ondas * 0.2 * radio);
    }
  }
  geo.computeVertexNormals();
  const materialCuerpo = new THREE.MeshStandardMaterial({
    color: 0xe8e2cf, emissive: 0x2a2438, roughness: 0.7, transparent: true, opacity: 0.96
  });
  interior.add(new THREE.Mesh(geo, materialCuerpo));

  // brazos
  [-1, 1].forEach(function (lado) {
    const brazo = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.45, 6, 10), materialCuerpo);
    brazo.position.set(lado * 0.52, 0.12, 0.2);
    brazo.rotation.x = Math.PI / 2 * 0.85;
    brazo.rotation.z = lado * 0.3;
    interior.add(brazo);
  });

  // cara
  const negro = new THREE.MeshBasicMaterial({ color: 0x050505 });
  const rojo = new THREE.MeshBasicMaterial({ color: 0xff1030 });
  [-1, 1].forEach(function (lado) {
    const ojo = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), negro);
    ojo.scale.set(0.1, 0.17, 0.05);
    ojo.position.set(lado * 0.2, 0.62, 0.5);
    ojo.rotation.y = lado * 0.4;
    ojo.userData.sinSombra = true;
    interior.add(ojo);
    const pupila = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8), rojo);
    pupila.position.set(lado * 0.2, 0.6, 0.535);
    pupila.userData.sinSombra = true;
    interior.add(pupila);
  });
  const boca = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 14), negro);
  boca.scale.set(0.14, 0.22, 0.06);
  boca.position.set(0, 0.17, 0.53);
  boca.userData.sinSombra = true;
  interior.add(boca);

  // gorra de guardia
  const azul = new THREE.MeshStandardMaterial({ color: 0x1b2a55, roughness: 0.6 });
  const gorra = new THREE.Mesh(new THREE.SphereGeometry(0.6, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), azul);
  gorra.scale.y = 0.55;
  gorra.position.y = 0.8;
  interior.add(gorra);
  const visera = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.03, 28), new THREE.MeshStandardMaterial({ color: 0x0e1630 }));
  visera.scale.z = 0.6;
  visera.position.set(0, 0.8, 0.52);
  interior.add(visera);
  const chapa = new THREE.Mesh(
    new THREE.SphereGeometry(0.05, 12, 10),
    new THREE.MeshStandardMaterial({ color: 0xffd84a, emissive: 0xffd84a, emissiveIntensity: 0.9 })
  );
  chapa.position.set(0, 0.93, 0.58);
  chapa.userData.sinSombra = true;
  interior.add(chapa);

  g.scale.setScalar(0.85);
  return conSombras(g);
}
