// =====================================================
//  AFICHE · generador del código QR
//  El QR apunta a la URL pública del juego.
// =====================================================
const contenedorQR = document.querySelector('#qr');
const campoUrl = document.querySelector('#campo-url');
const textoUrl = document.querySelector('#url-visible');
const avisoUrl = document.querySelector('#aviso-url');

// Por defecto: la carpeta donde está este afiche (donde vive el index.html del juego).
// Si el afiche está desplegado junto al juego, el QR ya apunta bien sin tocar nada.
const urlPorDefecto = new URL('./', window.location.href).href;

function dibujarQR(url) {
  contenedorQR.innerHTML = '';
  // 1024 px: alta resolución para imprimir
  new QRCode(contenedorQR, {
    text: url,
    width: 1024,
    height: 1024,
    colorDark: '#0b0711',
    colorLight: '#ffffff',
    correctLevel: QRCode.CorrectLevel.H
  });
  textoUrl.textContent = url.replace(/^https?:\/\//, '');
}

function actualizar() {
  const url = campoUrl.value.trim();
  if (!url) return;

  if (!/^https:\/\//i.test(url)) {
    avisoUrl.textContent = 'Ojo: los sensores del celu (giroscopio y pasos) solo funcionan con HTTPS.';
  } else {
    avisoUrl.textContent = '';
  }
  dibujarQR(url);
}

function descargarQR() {
  const canvas = contenedorQR.querySelector('canvas');
  const imagen = contenedorQR.querySelector('img');
  const enlace = document.createElement('a');
  enlace.download = 'qr-subte-maldito.png';
  enlace.href = canvas ? canvas.toDataURL('image/png') : imagen.src;
  enlace.click();
}

document.querySelector('#btn-actualizar').addEventListener('click', actualizar);
document.querySelector('#btn-descargar').addEventListener('click', descargarQR);
document.querySelector('#btn-imprimir').addEventListener('click', function () { window.print(); });
campoUrl.addEventListener('keydown', function (e) {
  if (e.key === 'Enter') actualizar();
});

// arranque
if (window.location.protocol === 'file:') {
  avisoUrl.textContent = 'Estás abriendo el archivo desde tu compu: pegá la URL pública del juego para que el QR funcione en otros celulares.';
}
campoUrl.value = urlPorDefecto;
actualizar();
