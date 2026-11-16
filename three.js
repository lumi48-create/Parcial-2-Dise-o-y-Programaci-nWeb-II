// =====================================================
//  ESTELA DEL DEDO (estelaPagina, en Instance Mode de p5.js)
//  círculos con brillo suave que se desvanecen
// =====================================================
let dedoX = -1000;
let dedoY = -1000;

document.addEventListener('pointermove', function (e) {
  dedoX = e.clientX;
  dedoY = e.clientY;
});
document.addEventListener('pointerup', function () {
  dedoX = -1000;
  dedoY = -1000;
});

function estelaPagina(p) {
  const colores = [
    [255, 122, 26],
    [180, 77, 255],
    [125, 255, 58],
    [242, 234, 211]
  ];
  let puntos = [];

  p.setup = function () {
    const c = p.createCanvas(p.windowWidth, p.windowHeight);
    c.style('pointer-events', 'none');
    p.pixelDensity(1);   // la estela no necesita alta resolución: ahorra GPU
  };
  p.windowResized = function () {
    p.resizeCanvas(p.windowWidth, p.windowHeight);
  };
  p.draw = function () {
    p.clear();
    p.noStroke();
    const ctx = p.drawingContext;

    if (dedoX > -999) {
      puntos.push({ x: dedoX, y: dedoY, vida: 255, color: colores[p.frameCount % colores.length] });
    }

    for (let i = puntos.length - 1; i >= 0; i--) {
      const punto = puntos[i];
      const c = punto.color;
      ctx.shadowBlur = 14;
      ctx.shadowColor = 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + (punto.vida / 255) + ')';
      p.fill(c[0], c[1], c[2], punto.vida);
      p.circle(punto.x, punto.y, p.map(punto.vida, 0, 255, 3, 16));
      punto.vida -= 12;
      if (punto.vida <= 0) puntos.splice(i, 1);
    }
    ctx.shadowBlur = 0;
  };
}

new p5(estelaPagina, 'pagina-trail');
