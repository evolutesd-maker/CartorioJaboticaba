// Sintetiza uma trilha eletrônica leve (pad + baixo + arpejo + batida 4x4 com sidechain) em WAV, só com JavaScript.
// Uso: node scripts/trilha.mjs [duração_s] [saida.wav] [instante_do_brilho_final_s]
import { writeFileSync } from "node:fs";
const SR = 44100, DUR = Number(process.argv[2] || 152), CHIME = Number(process.argv[4] || 143), N = Math.round(SR * DUR);
const BPM = 126, B = 60 / BPM;
const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
const TAU = Math.PI * 2;
const prog = [[57, 60, 64, 67], [53, 57, 60, 64], [48, 55, 60, 64], [55, 59, 62, 67]]; // Am7, Fmaj7, C, G
const raiz = [45, 41, 36, 43];
const wetL = new Float32Array(N), wetR = new Float32Array(N), dryL = new Float32Array(N), dryR = new Float32Array(N);
const arpBus = new Float32Array(N);
let seed = 11; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
const ease = (x) => Math.min(1, Math.max(0, x));
let pn = 0, pn2 = 0; // memória do filtro passa-altas do ruído
const padrao = [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0]; // baixo em semicolcheias
const seqArp = [0, 1, 2, 3, 2, 1, 2, 3, 0, 2, 1, 3, 2, 1, 3, 2];
for (let i = 0; i < N; i++) {
  const t = i / SR, tb = t / B, beat = Math.floor(tb), ph = tb - beat, bk = ph * B;
  const ci = Math.floor(tb / 8) % 4, acorde = prog[ci];
  const final = t > CHIME - 0.45;
  const ritmo = final ? 0 : ease((t - 5) / 3) * (t > CHIME - 3.2 ? 0 : 1);
  const duck = 1 - 0.62 * ritmo * Math.exp(-bk / 0.14);
  // pad
  let pad = 0;
  acorde.forEach((m, k) => { for (const d of [-0.07, 0.07]) { const f = hz(m) * (1 + d * 0.01); pad += Math.sin(TAU * f * t) + 0.3 * Math.sin(TAU * 2 * f * t + k); } });
  pad *= 0.014 * duck * ease(t / 3);
  wetL[i] += pad * 1.1; wetR[i] += pad * 0.9;
  // arpejo (semicolcheias), com eco
  const s16 = Math.floor(tb * 4), a16 = (tb * 4 - s16) * B / 4;
  const nota = acorde[seqArp[s16 % 16]] + 24 + (s16 % 32 === 30 ? 12 : 0);
  const f = hz(nota);
  const pl = Math.exp(-a16 / 0.12) * Math.min(1, a16 / 0.003) * (Math.sin(TAU * f * t) + 0.5 * Math.sin(TAU * 2 * f * t) + 0.3 * Math.sin(TAU * 3 * f * t));
  arpBus[i] = 0.05 * pl * ease((t - 2.5) / 4) * (final ? 0.6 : 1);
  // baixo
  if (ritmo > 0) {
    const sb = Math.floor(tb * 4) % 16, ab = (tb * 4 - Math.floor(tb * 4)) * B / 4;
    if (padrao[sb]) {
      const fb = hz(raiz[ci] + (sb === 6 || sb === 14 ? 12 : 0));
      const g = Math.exp(-ab / 0.13) * 0.9 + 0.1;
      let bs = 0; for (let h = 1; h <= 5; h++) bs += Math.sin(TAU * fb * h * t) / h;
      const x = 0.15 * ritmo * g * bs * Math.min(1, ab / 0.004) * duck;
      dryL[i] += x; dryR[i] += x;
    }
    // bumbo 4x4
    const kick = 0.40 * Math.sin(TAU * (48 * bk + (95 * (1 - Math.exp(-bk * 38))) / 38)) * Math.exp(-bk / 0.11);
    dryL[i] += kick * ritmo; dryR[i] += kick * ritmo;
    // palma nos tempos 2 e 4
    const n = rnd(); const hp = n - pn; pn = n;
    if (beat % 2 === 1) { const c = hp * 0.16 * Math.exp(-bk / 0.075) * ritmo; dryL[i] += c; dryR[i] += c; wetL[i] += c * 0.5; wetR[i] += c * 0.5; }
    // chimbal fechado (semicolcheias) e aberto (contratempo)
    const n2 = rnd(); const hp2 = n2 - pn2; pn2 = n2;
    const q = (tb * 4 - Math.floor(tb * 4)) * B / 4, off = Math.floor(tb * 4) % 4;
    const fech = hp2 * (off === 2 ? 0.07 : 0.032) * Math.exp(-q / (off === 2 ? 0.07 : 0.022)) * ritmo;
    dryL[i] += fech * 0.9; dryR[i] += fech * 1.1;
  }
  // subida de ruído antes da assinatura e impacto + sinos no final
  if (t > CHIME - 3.2 && t < CHIME - 0.45) { const u = (t - (CHIME - 3.2)) / 2.75; const r = rnd() * 0.05 * u * u; wetL[i] += r; wetR[i] += r; }
  if (t > CHIME) {
    const dt = t - CHIME;
    const sub = 0.35 * Math.sin(TAU * 52 * t) * Math.exp(-dt / 1.1); dryL[i] += sub; dryR[i] += sub;
    for (const [m, o] of [[72, 0], [76, 0.16], [79, 0.32], [84, 0.48]]) {
      const x = dt - o; if (x > 0) { const s = 0.06 * Math.exp(-x / 1.7) * Math.min(1, x / 0.004) * Math.sin(TAU * hz(m) * t); wetL[i] += s; wetR[i] += s; }
    }
  }
}
// eco pingue-pongue do arpejo (3/16 de tempo)
const d1 = Math.round(SR * B * 0.75);
for (let i = 0; i < N; i++) {
  const a = arpBus[i];
  wetL[i] += a * 0.8; wetR[i] += a * 0.8;
  if (i + d1 < N) { wetR[i + d1] += a * 0.45; }
  if (i + 2 * d1 < N) { wetL[i + 2 * d1] += a * 0.3; }
  if (i + 3 * d1 < N) { wetR[i + 3 * d1] += a * 0.15; }
}
function reverb(x, atrasos, fb, mix) {
  const y = new Float32Array(x.length);
  for (const d of atrasos) { const buf = new Float32Array(d); let p = 0; for (let i = 0; i < x.length; i++) { const o = buf[p]; y[i] += o; buf[p] = x[i] + o * fb; p = (p + 1) % d; } }
  for (const d of [225, 556]) { const buf = new Float32Array(d); let p = 0; for (let i = 0; i < y.length; i++) { const o = buf[p]; const inp = y[i]; buf[p] = inp + o * 0.5; y[i] = o - inp * 0.5; p = (p + 1) % d; } }
  for (let i = 0; i < x.length; i++) y[i] = x[i] * (1 - mix) + (y[i] / atrasos.length) * mix * 3.2;
  return y;
}
const Lw = reverb(wetL, [1687, 1801, 2053, 2251], 0.8, 0.3), Rw = reverb(wetR, [1733, 1913, 2111, 2347], 0.8, 0.3);
const sc = (x) => Math.tanh(x * 1.5) / Math.tanh(1.5);
const L = new Float32Array(N), R = new Float32Array(N);
let pico = 0;
for (let i = 0; i < N; i++) {
  const t = i / SR;
  const g = Math.min(1, t / 2) * (t > DUR - 4 ? Math.max(0, (DUR - t) / 4) : 1);
  L[i] = sc((Lw[i] + dryL[i]) * g * 1.4); R[i] = sc((Rw[i] + dryR[i]) * g * 1.4);
  pico = Math.max(pico, Math.abs(L[i]), Math.abs(R[i]));
}
const gn = 0.5 / pico;
const buf = Buffer.alloc(44 + N * 4);
buf.write("RIFF", 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write("WAVEfmt ", 8); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write("data", 36); buf.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) { buf.writeInt16LE(Math.round(L[i] * gn * 32767), 44 + i * 4); buf.writeInt16LE(Math.round(R[i] * gn * 32767), 46 + i * 4); }
writeFileSync(process.argv[3] || ".work/trilha.wav", buf);
console.log("trilha ok", DUR, "s @", BPM, "bpm");
