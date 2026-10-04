// Sintetiza uma trilha instrumental suave (pad + arpejo + reverb) em WAV, 100% em JavaScript.
import { writeFileSync } from "node:fs";
const SR = 44100, DUR = Number(process.argv[2] || 152), CHIME = Number(process.argv[4] || 143), N = SR * DUR;
const L = new Float32Array(N), R = new Float32Array(N);
const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
const prog = [[57, 60, 64, 67], [53, 57, 60, 64], [48, 55, 60, 64], [55, 59, 62, 67]]; // Am7, Fmaj7, C, G
const CH = 8; // segundos por acorde
const env = (t, a, d) => (t < 0 ? 0 : Math.min(1, t / a) * Math.exp(-t / d));
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
// nível geral: entra devagar, sustenta e fecha em resolução
const nivel = (t) => Math.min(1, t / 5) * (t > DUR - 5 ? Math.max(0, (DUR - t) / 5) : 1) * (0.55 + 0.45 * Math.min(1, t / 60));
for (let i = 0; i < N; i++) {
  const t = i / SR, ci = Math.floor(t / CH), lt = t - ci * CH, acorde = prog[ci % 4];
  const swell = Math.min(1, lt / 2.5) * Math.min(1, (CH - lt) / 2.5 + 0.35);
  let l = 0, r = 0;
  acorde.forEach((m, k) => {
    for (const det of [-0.12, 0.12]) {
      const f = hz(m + 0) * (1 + det * 0.01);
      const v = Math.sin(2 * Math.PI * f * t) + 0.35 * Math.sin(4 * Math.PI * f * t + k) + 0.12 * Math.sin(6 * Math.PI * f * t);
      const a = 0.045 * swell * v;
      l += a * (k % 2 ? 0.8 : 1.1); r += a * (k % 2 ? 1.1 : 0.8);
    }
  });
  // baixo
  const b = 0.12 * Math.sin(2 * Math.PI * hz(acorde[0] - 12) * t) * swell; l += b; r += b;
  // arpejo em colcheias (0,25 s), entra aos poucos
  const bt = Math.floor(t / 0.25), bl = t - bt * 0.25;
  const idx = [0, 2, 1, 3, 2, 1, 3, 2, 0, 3, 1, 2, 3, 1, 2, 1][bt % 16];
  const nota = acorde[idx] + 24 + (bt % 32 === 14 ? 12 : 0);
  const pl = 0.06 * env(bl, 0.004, 0.22) * (Math.sin(2 * Math.PI * hz(nota) * t) + 0.25 * Math.sin(4 * Math.PI * hz(nota) * t)) * Math.min(1, Math.max(0, (t - 4) / 5));
  const pan = 0.5 + 0.35 * Math.sin(bt * 0.7);
  l += pl * (1 - pan) * 1.6; r += pl * pan * 1.6;
  // batida leve: bumbo nos tempos, chimbal nos contratempos, palma suave nos tempos 2 e 4
  const ritmo = t > 10 && t < CHIME - 2.5 ? Math.min(1, (t - 10) / 8) : 0;
  if (ritmo > 0) {
    const be = Math.floor(t / 0.5), bk = t - be * 0.5;
    const kick = 0.34 * Math.sin(2 * Math.PI * (50 * bk + (90 * (1 - Math.exp(-bk * 35))) / 35)) * Math.exp(-bk / 0.1);
    const hk = ((t % 0.5) - 0.25); const chimbal = hk >= 0 ? (rnd() * 2 - 1) * 0.05 * Math.exp(-hk / 0.03) : 0;
    const palma = be % 2 === 1 && ritmo > 0.6 ? (rnd() * 2 - 1) * 0.07 * Math.exp(-bk / 0.07) : 0;
    const pulso = 0.05 * Math.sin(2 * Math.PI * hz(acorde[0] - 12) * t) * (bk < 0.25 ? 1 : 0.6);
    const x = ritmo * (kick + palma + pulso);
    l += x + chimbal * ritmo; r += x - chimbal * ritmo * 0.6;
  }
  // brilho final (assinatura): acorde de C aberto + sinos quando a logo aparece
  if (t > CHIME) {
    const dt = t - CHIME;
    for (const [m, o] of [[72, 0], [76, 0.18], [79, 0.36], [84, 0.54]]) {
      const x = dt - o; if (x > 0) { const s = 0.07 * env(x, 0.004, 1.6) * Math.sin(2 * Math.PI * hz(m) * t); l += s; r += s; }
    }
  }
  const g = nivel(t);
  L[i] = l * g; R[i] = r * g;
}
// reverb de Schroeder
function reverb(x, atrasos, fb, mix) {
  const y = new Float32Array(x.length);
  for (const d of atrasos) { const buf = new Float32Array(d); let p = 0; for (let i = 0; i < x.length; i++) { const o = buf[p]; y[i] += o; buf[p] = x[i] + o * fb; p = (p + 1) % d; } }
  for (const d of [225, 556]) { const buf = new Float32Array(d); let p = 0; for (let i = 0; i < y.length; i++) { const o = buf[p]; const inp = y[i]; buf[p] = inp + o * 0.5; y[i] = o - inp * 0.5; p = (p + 1) % d; } }
  for (let i = 0; i < x.length; i++) y[i] = x[i] * (1 - mix) + (y[i] / atrasos.length) * mix * 3.2;
  return y;
}
const Lr = reverb(L, [1687, 1801, 2053, 2251], 0.84, 0.38), Rr = reverb(R, [1733, 1913, 2111, 2347], 0.84, 0.38);
// normaliza para -3 dBFS
let pico = 0; for (let i = 0; i < N; i++) pico = Math.max(pico, Math.abs(Lr[i]), Math.abs(Rr[i]));
const gn = 0.7 / pico;
const buf = Buffer.alloc(44 + N * 4);
buf.write("RIFF", 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write("WAVEfmt ", 8); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write("data", 36); buf.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) { buf.writeInt16LE(Math.round(Lr[i] * gn * 32767), 44 + i * 4); buf.writeInt16LE(Math.round(Rr[i] * gn * 32767), 46 + i * 4); }
writeFileSync(process.argv[3] || ".work/trilha.wav", buf);
console.log("trilha ok", DUR, "s");
