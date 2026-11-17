// =====================================================
//  SONIDO con Web Audio (sin archivos externos)
// =====================================================
let audio = null;
let ruidoBuffer = null;
let gananciaSpray = null;
let silenciado = false;

export function iniciarAudio() {
  if (audio) {
    if (!silenciado) audio.resume();
    return;
  }
  audio = new (window.AudioContext || window.webkitAudioContext)();

  // ruido blanco: sirve para el aerosol, el tren y el golpe del susto
  ruidoBuffer = audio.createBuffer(1, audio.sampleRate * 2, audio.sampleRate);
  const datos = ruidoBuffer.getChannelData(0);
  for (let i = 0; i < datos.length; i++) {
    datos[i] = Math.random() * 2 - 1;
  }

  const fuente = audio.createBufferSource();
  fuente.buffer = ruidoBuffer;
  fuente.loop = true;

  const filtro = audio.createBiquadFilter();
  filtro.type = 'bandpass';
  filtro.frequency.value = 5200;
  filtro.Q.value = 0.8;

  gananciaSpray = audio.createGain();
  gananciaSpray.gain.value = 0;

  fuente.connect(filtro).connect(gananciaSpray).connect(audio.destination);
  fuente.start();

  zumbidoAmbiente();
}

// activa o desactiva todo el sonido (opción del juego)
export function silenciar(valor) {
  silenciado = valor;
  if (!audio) return;
  if (valor) {
    audio.suspend();
  } else {
    audio.resume();
  }
}

// zumbido grave del túnel, siempre de fondo
function zumbidoAmbiente() {
  const osc = audio.createOscillator();
  const gan = audio.createGain();
  osc.type = 'sawtooth';
  osc.frequency.value = 48;
  const filtro = audio.createBiquadFilter();
  filtro.type = 'lowpass';
  filtro.frequency.value = 140;
  gan.gain.value = 0.05;
  osc.connect(filtro).connect(gan).connect(audio.destination);
  osc.start();
}

export function sonarSpray(activo) {
  if (!audio) return;
  gananciaSpray.gain.setTargetAtTime(activo ? 0.18 : 0, audio.currentTime, 0.03);
}

export function tono(frecuencia, duracion, tipo, volumen, frecuenciaFinal) {
  if (!audio || silenciado) return;
  const osc = audio.createOscillator();
  const gan = audio.createGain();
  osc.type = tipo;
  osc.frequency.setValueAtTime(frecuencia, audio.currentTime);
  if (frecuenciaFinal) {
    osc.frequency.exponentialRampToValueAtTime(frecuenciaFinal, audio.currentTime + duracion);
  }
  gan.gain.setValueAtTime(volumen, audio.currentTime);
  gan.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + duracion);
  osc.connect(gan).connect(audio.destination);
  osc.start();
  osc.stop(audio.currentTime + duracion);
}

export function paso() {
  tono(95, 0.09, 'sine', 0.35, 50);
}

export function latido() {
  tono(70, 0.18, 'sine', 0.6, 40);
  setTimeout(function () { tono(60, 0.2, 'sine', 0.45, 35); }, 180);
}

export function sonidoCalabaza() {
  tono(520, 0.12, 'triangle', 0.14, 900);
  setTimeout(function () { tono(900, 0.15, 'triangle', 0.12, 1300); }, 90);
}

export function sonidoCompleto() {
  tono(660, 0.12, 'triangle', 0.12);
  setTimeout(function () { tono(880, 0.12, 'triangle', 0.12); }, 110);
  setTimeout(function () { tono(1320, 0.2, 'triangle', 0.12); }, 220);
}

// sube de nivel: arpegio ascendente
export function sonidoNivel() {
  const notas = [523, 659, 784, 1047, 1319];
  notas.forEach(function (f, i) {
    setTimeout(function () { tono(f, 0.22, 'triangle', 0.14); }, i * 110);
  });
}

export function sonidoTren() {
  if (!audio || silenciado) return;
  const fuente = audio.createBufferSource();
  fuente.buffer = ruidoBuffer;
  fuente.loop = true;
  const filtro = audio.createBiquadFilter();
  filtro.type = 'lowpass';
  filtro.frequency.value = 500;
  const gan = audio.createGain();
  gan.gain.setValueAtTime(0.001, audio.currentTime);
  gan.gain.exponentialRampToValueAtTime(0.9, audio.currentTime + 1.4);
  gan.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 3.6);
  fuente.connect(filtro).connect(gan).connect(audio.destination);
  fuente.start();
  fuente.stop(audio.currentTime + 3.7);
  // bocina
  setTimeout(function () {
    tono(220, 0.7, 'sawtooth', 0.14);
    tono(277, 0.7, 'sawtooth', 0.12);
  }, 900);
}

export function gritar() {
  if (!audio || silenciado) return;
  const osc = audio.createOscillator();
  const osc2 = audio.createOscillator();
  const gan = audio.createGain();
  osc.type = 'sawtooth';
  osc2.type = 'square';
  osc.frequency.setValueAtTime(380, audio.currentTime);
  osc.frequency.exponentialRampToValueAtTime(1500, audio.currentTime + 0.25);
  osc.frequency.exponentialRampToValueAtTime(700, audio.currentTime + 1.4);
  osc2.frequency.setValueAtTime(393, audio.currentTime);
  osc2.frequency.exponentialRampToValueAtTime(1440, audio.currentTime + 0.3);
  osc2.frequency.exponentialRampToValueAtTime(650, audio.currentTime + 1.4);
  gan.gain.setValueAtTime(0.5, audio.currentTime);
  gan.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 1.6);
  osc.connect(gan);
  osc2.connect(gan);
  gan.connect(audio.destination);
  osc.start();
  osc2.start();
  osc.stop(audio.currentTime + 1.6);
  osc2.stop(audio.currentTime + 1.6);

  const golpe = audio.createBufferSource();
  golpe.buffer = ruidoBuffer;
  const ganGolpe = audio.createGain();
  ganGolpe.gain.setValueAtTime(0.8, audio.currentTime);
  ganGolpe.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.7);
  golpe.connect(ganGolpe).connect(audio.destination);
  golpe.start();
  golpe.stop(audio.currentTime + 0.8);
}
