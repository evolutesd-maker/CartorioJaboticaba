// Palco do vídeo: renderiza qualquer quadro f de forma determinística (tempo = f / 60).
const W = 1920, H = 1080, FPS = 60;
const stage = document.getElementById("stage");
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const E = {
  lin: (t) => t,
  out3: (t) => 1 - Math.pow(1 - t, 3),
  out5: (t) => 1 - Math.pow(1 - t, 5),
  io3: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  io2: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  back: (t) => { const c1 = 1.5, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
};
const seg = (t, a, b, f = E.out3) => f(clamp((t - a) / (b - a)));
const el = (html, parent) => { const d = document.createElement("div"); d.innerHTML = html.trim(); const n = d.firstElementChild; if (parent) parent.appendChild(n); return n; };
const lerp = (a, b, t) => a + (b - a) * t;
const frameUrl = (clip, i) => `/.work/clipes/${clip}/f/${String(i).padStart(5, "0")}.jpg`;
const infos = {};
for (const c of ["hero", "busca", "paleta", "carrossel", "especialidades", "abas", "servico", "funil", "celular"]) infos[c] = await (await fetch(`/.work/clipes/${c}/info.json`)).json();
for (const u of ["aba-inicio", "aba-servicos", "aba-documentos", "aba-contato", "home-inteira"]) { const im = new Image(); im.src = `/.work/img/${u}.png`; await im.decode().catch(() => {}); }
const SEC = await (await fetch("/.work/img/secoes.json")).json();

// ---------- ícones (traço simples) ----------
const IC = {
  busca: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l5 5"/>',
  teclado: '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M7 10h.01M11 10h.01M15 10h.01M8 14h8"/>',
  cartoes: '<rect x="3" y="5" width="7" height="14" rx="1.5"/><rect x="12" y="5" width="9" height="14" rx="1.5"/>',
  grade: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  camadas: '<path d="M12 3 3 8l9 5 9-5z"/><path d="m3 13 9 5 9-5"/>',
  lista: '<path d="M9 6h11M9 12h11M9 18h11"/><path d="m3.5 6 1.2 1.2L7 5M3.5 12l1.2 1.2L7 11M3.5 18l1.2 1.2L7 17"/>',
  msg: '<path d="M4 5h16v11H9l-5 4z"/>',
  fone: '<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>',
  relogio: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  escudo: '<path d="M12 3 4 6v6c0 5 3.500 8 8 9 4.500-1 8-4 8-9V6z"/><path d="m9 12 2 2 4-4"/>',
  raio: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
  olho: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
};
const svg = (n, extra = "") => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ${extra}>${IC[n]}</svg>`;

// ---------- fundo permanente: degradê, grade, brilhos e partículas ----------
const bg = el(`<div class="bg"><div class="bg__grade"></div><div class="orb" style="width:700px;height:700px;background:#1a7be0;left:-150px;top:-200px"></div><div class="orb" style="width:600px;height:600px;background:#d9b45c;opacity:.18;right:-100px;bottom:-200px"></div></div>`, stage);
const orbs = bg.querySelectorAll(".orb");
const parts = Array.from({ length: 34 }, (_, i) => {
  const r = (n) => { const x = Math.sin(i * 12.9898 + n * 78.233) * 43758.5453; return x - Math.floor(x); };
  const d = el(`<i class="part" style="left:${r(1) * 1920}px;width:${3 + r(2) * 5}px;height:${3 + r(2) * 5}px"></i>`, bg);
  d.__p = { x: r(1) * 1920, v: 12 + r(3) * 26, ph: r(4) * 9, s: 0.25 + r(5) * 0.5 };
  return d;
});

// ---------- gerenciador de imagens (quadros do site) ----------
const pend = [];
function setImg(img, url) { if (img.__url === url) return; img.__url = url; img.src = url; pend.push(img.decode().catch(() => {})); }

// ---------- trilhas: posição real de cada elemento do site, no tempo da gravação ----------
function rectEm(clip, nome, t) {
  const a = infos[clip].trilhas?.[nome];
  if (!a || !a.length) return null;
  let lo = 0, hi = a.length - 1;
  while (lo < hi) { const m = (lo + hi) >> 1; if (a[m][0] < t) lo = m + 1; else hi = m; }
  const p = a[lo], q = a[Math.max(0, lo - 1)];
  if (t < a[0][0] - 0.5 || t > a[a.length - 1][0] + 0.5) return null;
  if (Math.abs(p[0] - t) > 0.45 && Math.abs(q[0] - t) > 0.45) return null; // lacuna (troca de página)
  if (p === q || p[0] === q[0] || Math.abs(p[0] - q[0]) > 0.3) { const o = Math.abs(p[0] - t) < Math.abs(q[0] - t) ? p : q; return { x: o[1], y: o[2], w: o[3], h: o[4] }; }
  const u = clamp((t - q[0]) / (p[0] - q[0]));
  return { x: lerp(q[1], p[1], u), y: lerp(q[2], p[2], u), w: lerp(q[3], p[3], u), h: lerp(q[4], p[4], u) };
}
const evt = (clip, nome) => { const e = infos[clip].eventos.find((x) => x.nome === nome); if (!e) throw new Error("evento ausente: " + clip + "/" + nome); return e.t; };

// ---------- cenas ----------
const cenas = [];
let T0 = 0;
function add(c) { c.ini = T0; T0 += c.dur - (c.sobra ?? 0.5); c.root = el(`<div class="cena" style="display:none"></div>`, stage); cenas.push(c); c.build?.(c.root, c); return c; }
const aparece = (n, lt, a, b = a + 0.7, { dy = 24, dx = 0, f = E.out3 } = {}) => {
  const p = seg(lt, a, b, f); n.style.opacity = p; n.style.transform = `translate(${(1 - p) * dx}px,${(1 - p) * dy}px)`;
};
// sublinhado animado: <u> dentro do texto
const sublinha = (raiz, p) => raiz.querySelectorAll("u").forEach((u) => u.style.setProperty("--w", (clamp(p) * 100).toFixed(1) + "%"));

// --- Abertura ---
add({
  id: "abertura", dur: 7.5, chrome: false,
  build(r, c) {
    c.foto = el(`<div class="abs" style="inset:-40px;background:url(../assets/fachada.webp) center/cover;filter:blur(7px) brightness(.45) saturate(1.1)"></div>`, r);
    el(`<div class="abs" style="inset:0;background:linear-gradient(90deg,rgba(2,20,40,.92),rgba(2,20,40,.35) 60%,rgba(2,20,40,.7))"></div>`, r);
    c.selo = el(`<img src="../assets/selo.svg" class="abs" style="left:150px;top:300px;width:120px;height:120px">`, r);
    c.eye = el(`<div class="abs" style="left:150px;top:450px;font-size:20px;font-weight:700;letter-spacing:.32em;color:#f0d68f;text-transform:uppercase">Apresentação institucional</div>`, r);
    c.t1 = el(`<div class="abs" style="left:150px;top:500px;font-size:96px;font-weight:800;letter-spacing:-.025em;line-height:1.02">Tabelionato<br>de <u class="big">Jaboticaba</u></div>`, r);
    c.t2 = el(`<div class="abs" style="left:150px;top:742px;font-size:34px;font-weight:500;color:#cfe3f7">Conheça o novo site do cartório</div>`, r);
    c.moldura = el(`<div class="abs" style="left:1130px;top:250px;width:640px;height:560px;border-radius:28px;overflow:hidden;box-shadow:0 40px 90px rgba(0,10,30,.6),0 0 0 1px rgba(255,255,255,.2)"><div class="abs" style="inset:0;background:url(../assets/fachada.webp) 38% center/auto 112%"></div></div>`, r);
    c.molduraImg = c.moldura.firstElementChild;
  },
  update(lt, c) {
    c.foto.style.transform = `scale(${1.04 + lt * 0.012})`;
    const p = seg(lt, 0.3, 1.3, E.back);
    c.selo.style.opacity = seg(lt, 0.3, 1); c.selo.style.transform = `scale(${0.6 + 0.4 * p}) rotate(${(1 - p) * -90}deg)`;
    aparece(c.eye, lt, 0.9, 1.6, { dy: 14 });
    aparece(c.t1, lt, 1.2, 2.2, { dy: 40, f: E.out5 });
    sublinha(c.t1, seg(lt, 2.2, 3.2, E.io3));
    aparece(c.t2, lt, 2.5, 3.3, { dy: 18 });
    const pm = seg(lt, 1.0, 2.4, E.out5);
    c.moldura.style.opacity = pm; c.moldura.style.transform = `translateY(${(1 - pm) * 70}px) scale(${0.94 + 0.06 * pm})`;
    c.molduraImg.style.transform = `scale(${1 + lt * 0.012}) translateX(${-lt * 6}px)`;
  },
});

// --- Roteiro (esquema do que será mostrado) ---
const ETAPAS = [
  ["busca", "Busca inteligente"], ["teclado", "Busca rápida"], ["cartoes", "Mais procurados"], ["grade", "Especialidades"],
  ["camadas", "Abas e camadas"], ["lista", "Documentos"], ["msg", "Fale com o cartório"], ["fone", "No celular"],
];
add({
  id: "roteiro", dur: 6.5, chrome: false,
  build(r, c) {
    el(`<div class="grande" style="top:170px;font-size:30px;letter-spacing:.3em;color:#f0d68f;text-transform:uppercase;font-weight:700">Roteiro</div>`, r);
    c.tit = el(`<div class="grande" style="top:225px;font-size:70px">O que você vai <u class="big">ver</u> neste vídeo</div>`, r);
    c.linha = el(`<div class="abs" style="left:216px;top:560px;width:1488px;height:5px;border-radius:5px;background:rgba(255,255,255,.14)"></div>`, r);
    c.linhaF = el(`<div class="abs" style="left:216px;top:560px;width:0;height:5px;border-radius:5px;background:linear-gradient(90deg,#2b9bff,#f0d68f)"></div>`, r);
    c.pontos = ETAPAS.map((_, i) => el(`<div class="abs" style="left:${216 + (1488 / 7) * i - 9}px;top:${560 + 2.5 - 9}px;width:18px;height:18px;border-radius:50%;background:#f0d68f;opacity:0"></div>`, r));
    c.nos = ETAPAS.map(([ic, tx], i) => {
      const x = 216 + (1488 / 7) * i;
      return el(`<div class="no" style="left:${x - 80}px;top:${i % 2 ? 622 : 338}px"><div class="no__ic">${svg(ic)}</div><div class="no__tx"><b>${i + 1}</b>${tx}</div></div>`, r);
    });
    c.ponto = el(`<div class="abs" style="left:0;top:551px;width:24px;height:24px;border-radius:50%;background:#f0d68f;box-shadow:0 0 24px 6px rgba(240,214,143,.7)"></div>`, r);
  },
  update(lt, c) {
    aparece(c.tit, lt, 0.4, 1.2, { dy: 30, f: E.out5 }); sublinha(c.tit, seg(lt, 1.2, 2.2, E.io3));
    c.linha.style.opacity = seg(lt, 0.8, 1.4);
    c.linhaF.style.width = 1488 * seg(lt, 1.2, 4.4, E.io3) + "px";
    c.nos.forEach((n, i) => {
      const p = seg(lt, 1.2 + i * 0.4, 1.9 + i * 0.4, E.back);
      n.style.opacity = clamp(p * 1.5); n.style.transform = `translateY(${(1 - p) * (i % 2 ? 40 : -40)}px) scale(${0.8 + 0.2 * p})`;
    });
    c.pontos.forEach((d, i) => { d.style.opacity = seg(lt, 1.5 + i * 0.4, 1.9 + i * 0.4); });
    c.ponto.style.opacity = seg(lt, 1.2, 1.6) * (1 - seg(lt, 4.4, 4.9));
    c.ponto.style.left = 216 - 12 + 1488 * seg(lt, 1.2, 4.4, E.io3) + "px";
  },
});

// --- Cena com janela do navegador + painel lateral ---
const K = 1344 / 1366; // escala do clipe (1366x768) na janela
function cenaClipe(cfgBase) {
  const cfg = { ...cfgBase };
  const clip = cfg.clip;
  const h = { L: (ev, d = 0) => (evt(clip, ev) - cfg.from) / cfg.speed + d, C: (ev) => evt(clip, ev) };
  Object.assign(cfg, cfg.def(h));
  return add({
    chrome: true, ...cfg,
    build(r, c) {
      c.win = el(`<div class="win"><div class="win__bar"><i></i><i></i><i></i><div class="win__url"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#4f5e6d" stroke-width="2.4"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>Site do Tabelionato de Jaboticaba</div></div><div class="win__view"><div class="cam"><img alt=""></div></div></div>`, r);
      c.cam = c.win.querySelector(".cam"); c.img = c.cam.querySelector("img");
      c.mks = (cfg.marks || []).map((m) => {
        const kind = m.kind || "box";
        const n = el(`<div class="mk2 mk2--${kind}" style="opacity:0"><div class="mk2__anc mk2__anc--${m.pos || "top"}"><div class="mk2__pos"><div class="mk2__pill"><b>${m.n ?? "✓"}</b><span>${m.text}</span></div></div></div></div>`, c.cam);
        n.__m = m; n.__pill = n.querySelector(".mk2__pill"); n.__pos = n.querySelector(".mk2__pos"); n.__anc = n.querySelector(".mk2__anc");
        if (!m.text) n.__anc.style.display = "none";
        return n;
      });
      c.keys = cfg.teclas ? el(`<div class="teclas" style="opacity:0"></div>`, c.win) : null;
      c.lado = el(`<div class="lado"><div class="lado__n">${cfg.n}</div><h2>${cfg.titulo}</h2><p>${cfg.texto}</p><ul>${cfg.bullets.map((b, i) => `<li style="opacity:0"><em>${i + 1}</em><span>${b.txt}</span></li>`).join("")}</ul></div>`, r);
      c.lis = c.lado.querySelectorAll("li");
      c.numEl = c.lado.querySelector(".lado__n"); c.h2 = c.lado.querySelector("h2"); c.pp = c.lado.querySelector("p");
    },
    update(lt, c) {
      const clipT = cfg.from + lt * cfg.speed;
      const fi = Math.min(infos[clip].quadros - 1, Math.max(0, Math.round(clipT * infos[clip].fps)));
      setImg(c.img, frameUrl(clip, fi));
      // câmera
      const ks = cfg.cam || [{ t: 0, cx: 683, cy: 384, s: 1 }];
      let a = ks[0], b = ks[0];
      for (let i = 0; i < ks.length; i++) { if (lt >= ks[i].t) { a = ks[i]; b = ks[Math.min(i + 1, ks.length - 1)]; } }
      const p = b === a ? 0 : E.io3(clamp((lt - a.t) / (b.t - a.t)));
      const s = 1 + (lerp(a.s, b.s, p) - 1) * 0.45, cx = lerp(a.cx, b.cx, p), cy = lerp(a.cy, b.cy, p);
      let tx = 672 - cx * K * s, ty = 378 - cy * K * s;
      tx = clamp(tx, 1344 - 1344 * s, 0); ty = clamp(ty, 756 - 756 * s, 0);
      c.cam.style.transform = `translate(${tx}px,${ty}px) scale(${s})`;
      // janela entra
      const pw = seg(lt, 0.15, 1.2, E.out5);
      c.win.style.opacity = pw; c.win.style.transform = `translateY(${(1 - pw) * 60}px) scale(${0.96 + 0.04 * pw})`;
      // painel lateral
      aparece(c.numEl, lt, 0.4, 1.0, { dx: 30, dy: 0 }); aparece(c.h2, lt, 0.55, 1.2, { dx: 30, dy: 0 }); aparece(c.pp, lt, 0.7, 1.4, { dx: 30, dy: 0 });
      sublinha(c.h2, seg(lt, 1.2, 2.0, E.io3));
      c.lis.forEach((li, i) => { const t0 = cfg.bullets[i].t; aparece(li, lt, t0, t0 + 0.6, { dx: 40, dy: 0, f: E.back }); sublinha(li, seg(lt, t0 + 0.5, t0 + 1.3, E.io3)); });
      // destaques que acompanham o elemento real na tela
      c.mks.forEach((n) => {
        const m = n.__m, kind = m.kind || "box";
        const a0 = m.t0, a1 = m.t1;
        const vis = seg(lt, a0, a0 + 0.4, E.out5) * (1 - seg(lt, a1 - 0.35, a1, E.io2));
        const r = vis > 0.001 ? rectEm(clip, m.track, clipT) : null;
        if (!r) { n.style.opacity = 0; return; }
        const pad = m.pad ?? 10;
        const x = (r.x - pad) * K, y = (r.y - pad) * K, w = (r.w + 2 * pad) * K, hh = (r.h + 2 * pad) * K;
        const pulso = 1 + 0.012 * Math.sin(lt * 6);
        n.style.opacity = vis;
        if (kind === "sub") { n.style.left = (r.x * K) + "px"; n.style.top = ((r.y + r.h) * K + 3) + "px"; n.style.width = (r.w * K * seg(lt, a0, a0 + 0.7, E.io3)) + "px"; n.style.height = "5px"; }
        else { n.style.left = x + "px"; n.style.top = y + "px"; n.style.width = w + "px"; n.style.height = hh + "px"; n.style.transform = `scale(${(1.05 - 0.05 * vis) * pulso})`; }
        // etiqueta: contra-escala para manter o tamanho na tela e mantê-la dentro da janela
        const pill = n.__pill; pill.style.transform = `scale(${1 / s})`;
        const pw2 = pill.offsetWidth, ph2 = pill.offsetHeight;
        const rx0 = x * s + tx, ry0 = y * s + ty, rx1 = (x + w) * s + tx, ry1 = (y + hh) * s + ty;
        const cabe = { top: ry0 - 12 - ph2 >= 8, bottom: ry1 + 12 + ph2 <= 748, left: rx0 - 12 - pw2 >= 8, right: rx1 + 12 + pw2 <= 1336 };
        const opp = { top: "bottom", bottom: "top", left: "right", right: "left", intr: "intr", inbr: "inbr" };
        let pos = m.pos || "top";
        if (!(pos in cabe ? cabe[pos] : true)) { pos = [opp[pos], "top", "bottom", "right", "left"].find((q) => cabe[q]) || pos; }
        if (n.__pos2 !== pos) { n.__anc.className = "mk2__anc mk2__anc--" + pos; n.__pos2 = pos; }
        let off = 0;
        if (pos === "top" || pos === "bottom" || pos === "intr" || pos === "inbr") {
          const centro = pos === "intr" || pos === "inbr" ? rx1 - pw2 / 2 - 14 : (rx0 + rx1) / 2;
          const esq = centro - pw2 / 2, dir = centro + pw2 / 2;
          if (esq < 12) off = (12 - esq) / s; else if (dir > 1332) off = (1332 - dir) / s;
        }
        n.__pill.parentNode.style.setProperty("--off", off.toFixed(1) + "px");
      });
      if (c.keys && cfg.teclas) cfg.teclas(lt, c.keys, h);
      if (cfg.extra) cfg.extra(lt, c, h);
    },
  });
}

// ---------- tecla (overlay) ----------
const tecla = (t) => `<span class="tecla">${t}</span>`;

// 1. Página inicial
cenaClipe({
  id: "inicio", n: "01", cap: "Página inicial", titulo: "Uma entrada <u>clara</u> e acolhedora", dur: 12.5,
  texto: "Ao abrir o site, o cidadão entende o que o cartório faz e por onde começar.",
  clip: "hero", from: 1.2, speed: 1.1,
  def: (h) => ({
    bullets: [
      { t: h.L("foto-ini", 0.4), txt: "Fachada real do cartório, que <u>se move</u> com o mouse" },
      { t: h.L("selo-ini", 0.1), txt: "Selo <u>Aberto agora</u>, calculado pelo horário" },
      { t: h.L("btn-ini", 0.1), txt: "Botões que <u>acompanham</u> o cursor" },
      { t: h.L("buscar-ini", 0.1), txt: "Botão <u>Buscar</u> sempre no topo" },
    ],
    marks: [
      { track: "foto", t0: h.L("foto-ini", 0.2), t1: h.L("foto-fim"), text: "Foto reage ao mouse", n: 1, pos: "bottom" },
      { track: "selo", t0: h.L("selo-ini"), t1: h.L("selo-fim", 0.4), text: "Aberto ou fechado, em tempo real", n: 2, pos: "left", pad: 8 },
      { track: "btn1", t0: h.L("btn-ini"), t1: h.L("btn-fim"), text: "Botões seguem o cursor", n: 3, pos: "bottom", pad: 8 },
      { track: "btn2", t0: h.L("btn-ini", 1.0), t1: h.L("btn-fim"), n: "", pos: "bottom", pad: 8 },
      { track: "buscar", t0: h.L("buscar-ini"), t1: h.L("buscar-fim", 0.5), text: "Busca em qualquer página", n: 4, pos: "bottom", pad: 8 },
    ],
    cam: [{ t: 0, cx: 683, cy: 384, s: 1 }, { t: h.L("foto-ini", -0.4), cx: 800, cy: 300, s: 1.12 }, { t: h.L("btn-ini", -0.6), cx: 560, cy: 330, s: 1.15 }, { t: h.L("buscar-ini", -0.5), cx: 900, cy: 220, s: 1.15 }, { t: 12, cx: 900, cy: 220, s: 1.15 }],
  }),
});

// 2. Busca
cenaClipe({
  id: "busca", n: "02", cap: "Busca inteligente", titulo: "Digite do <u>seu jeito</u>", dur: 13,
  texto: "Não é preciso saber o nome jurídico do serviço. O site entende as palavras do dia a dia.",
  clip: "busca", from: 0.6, speed: 1.0,
  def: (h) => ({
    bullets: [
      { t: h.L("digita1", 0.5), txt: "Sugestões <u>enquanto</u> a pessoa digita" },
      { t: h.L("teclas", -1.2), txt: "Setas do teclado <u>escolhem</u> o serviço" },
      { t: h.L("digita2", 0.8), txt: "“quero casar” leva ao <u>casamento civil</u>" },
    ],
    marks: [
      { track: "campo", t0: h.L("digita1"), t1: h.L("lista1", 0.8), text: "Escreva como falaria", n: 1, pos: "top" },
      { track: "lista", t0: h.L("lista1", 0.2), t1: h.L("teclas", -0.2), text: "Sugestões na hora", n: 2, pos: "intr" },
      { track: "lista", t0: h.L("teclas", -1.1), t1: h.L("teclas", 0.8), text: "↑ ↓ escolhem", n: 3, pos: "intr" },
      { track: "lista", t0: h.L("digita2", 1.4), t1: h.L("fim", 0.2), text: "Casar → casamento civil", n: 4, pos: "bottom" },
    ],
    cam: [{ t: 0, cx: 683, cy: 384, s: 1 }, { t: 1.4, cx: 683, cy: 300, s: 1.12 }, { t: 12, cx: 683, cy: 330, s: 1.12 }],
  }),
});

// 3. Busca rápida (paleta)
cenaClipe({
  id: "paleta", n: "03", cap: "Busca rápida", titulo: "Buscar em <u>qualquer página</u>", dur: 13.5,
  texto: "Um painel de busca que abre em qualquer lugar do site, com mouse ou teclado.",
  clip: "paleta", from: 1.0, speed: 1.1,
  def: (h) => ({
    bullets: [
      { t: h.L("btn", 0.2), txt: "Botão <u>Buscar</u> no topo de todas as páginas" },
      { t: h.L("teclas", -1.5), txt: "Setas e <u>Enter</u> para escolher" },
      { t: h.L("atalho", 0.0), txt: "Atalho: tecla <u>/</u> ou Ctrl + K" },
    ],
    marks: [
      { track: "buscar", t0: h.L("btn", -0.2), t1: h.L("abre", 0.2), text: "Botão Buscar", n: 1, pos: "bottom", pad: 8 },
      { track: "caixa", t0: h.L("abre", 0.5), t1: h.L("teclas", 0.2), text: "Painel de busca", n: 2, pos: "right", pad: 8 },
    ],
    teclas: (lt, k) => {
      const a = h.L("atalho", -0.1), b = h.L("enter", 1.3);
      const p = seg(lt, a, a + 0.5, E.back) * (1 - seg(lt, b - 0.4, b));
      k.style.opacity = clamp(p * 1.4);
      k.style.transform = `translateY(${(1 - p) * 30}px) scale(${0.9 + 0.1 * p})`;
      const press = lt > a + 0.5 && lt < a + 1.5 ? 1 : 0;
      k.innerHTML = `<span class="teclas__tx">Atalho</span>${tecla("/")}<span class="teclas__tx">ou</span>${tecla("Ctrl")}${tecla("K")}${press ? "" : ""}`;
    },
    cam: [{ t: 0, cx: 683, cy: 384, s: 1 }, { t: h.L("abre", -0.4), cx: 683, cy: 330, s: 1.12 }, { t: 12.8, cx: 683, cy: 330, s: 1.12 }],
  }),
});

// 4. Carrossel
cenaClipe({
  id: "carrossel", n: "04", cap: "Mais procurados", titulo: "Os serviços mais pedidos, <u>a um toque</u>", dur: 12,
  texto: "Um carrossel com os atendimentos mais procurados pela população.",
  clip: "carrossel", from: 0.7, speed: 1.25,
  def: (h) => ({
    bullets: [
      { t: h.L("tilt-ini", 0.3), txt: "Cada cartão se <u>inclina</u> em 3D com o mouse" },
      { t: h.L("seta1", 0.3), txt: "Setas <u>avançam e voltam</u> na lista" },
      { t: h.L("arrasta-ini", 0.3), txt: "Também dá para <u>arrastar</u> ou deslizar no celular" },
    ],
    marks: [
      { track: "pista", t0: h.L("tilt-ini"), t1: h.L("tilt-fim", 0.3), text: "Cartão acompanha o mouse", n: 1, pos: "bottom", pad: 6 },
      { track: "next", t0: h.L("seta1", 0.1), t1: h.L("seta2", 1.3), text: "Avançar", n: 2, pos: "top", pad: 8 },
      { track: "pista", t0: h.L("arrasta-ini"), t1: h.L("arrasta-fim", 0.2), text: "Arraste com o mouse", n: 3, pos: "bottom", pad: 6 },
      { track: "prev", t0: h.L("prev", -0.5), t1: h.L("prev", 1.3), text: "Voltar", n: 4, pos: "top", pad: 8 },
    ],
    cam: [{ t: 0, cx: 683, cy: 384, s: 1 }, { t: 1.2, cx: 683, cy: 340, s: 1.12 }, { t: 11, cx: 683, cy: 340, s: 1.12 }],
  }),
});

// 5. Especialidades
cenaClipe({
  id: "especialidades", n: "05", cap: "Especialidades", titulo: "Cinco especialidades, <u>um só endereço</u>", dur: 11,
  texto: "Notas, Protesto, Títulos e Documentos, Pessoas Jurídicas e Pessoas Naturais.",
  clip: "especialidades", from: 0.6, speed: 1.3,
  def: (h) => ({
    bullets: [
      { t: h.L("rola", 0.5), txt: "Elementos <u>surgem suaves</u> ao rolar a página" },
      { t: h.L("c1", 0.0), txt: "Cartões <u>reagem</u> ao mouse, com brilho e inclinação" },
      { t: h.L("c3", 0.0), txt: "Cada cartão resume os <u>serviços</u> do setor" },
    ],
    marks: [
      { track: "grade", t0: h.L("rola", 1.6), t1: h.L("c1", 0.4), text: "5 especialidades", n: 1, pos: "top", pad: 8 },
      { track: "c1", t0: h.L("c1", 0.1), t1: h.L("c2", 0.0), text: "Notas", n: 2, pos: "top", pad: 6 },
      { track: "c2", t0: h.L("c2", 0.1), t1: h.L("c3", 0.0), text: "Protesto de Títulos", n: 3, pos: "top", pad: 6 },
      { track: "c3", t0: h.L("c3", 0.1), t1: h.L("fim", 0.1), text: "Títulos e Documentos", n: 4, pos: "top", pad: 6 },
    ],
    cam: [{ t: 0, cx: 683, cy: 384, s: 1 }, { t: 3, cx: 683, cy: 420, s: 1.1 }, { t: 10, cx: 683, cy: 430, s: 1.1 }],
  }),
});

// 6. Abas
cenaClipe({
  id: "abas", n: "06", cap: "Navegação", titulo: "Troca de páginas com <u>transição suave</u>", dur: 12,
  texto: "Quatro abas no menu levam a todo o conteúdo, sem complicação.",
  clip: "abas", from: 0.8, speed: 2.4,
  def: (h) => ({
    bullets: [
      { t: h.L("servicos", 0.2), txt: "<u>Serviços</u>: tudo organizado por assunto" },
      { t: h.L("documentos", 0.2), txt: "<u>Documentos</u>: o que levar ao cartório" },
      { t: h.L("contato", 0.2), txt: "<u>Contato</u>: endereço, horário e rota no mapa" },
      { t: h.L("ligar", -0.3), txt: "Botões para <u>ligar</u> e falar no <u>WhatsApp</u>" },
    ],
    marks: [
      { track: "menu", t0: h.L("servicos", 0.0), t1: h.L("documentos", -0.3), text: "Aba Serviços", n: 1, pos: "bottom", pad: 8 },
      { track: "menu", t0: h.L("documentos", 0.0), t1: h.L("contato", -0.3), text: "Aba Documentos", n: 2, pos: "bottom", pad: 8 },
      { track: "menu", t0: h.L("contato", 0.0), t1: h.L("contato-ok", -0.2), text: "Aba Contato", n: 3, pos: "bottom", pad: 8 },
      { track: "aberto", t0: h.L("contato-ok", 0.3), t1: h.L("btns", 0.2), text: "“Aberto agora”: horário em tempo real", n: 4, pos: "top", pad: 8 },
      { track: "rota", t0: h.L("rota", -0.3), t1: h.L("ligar", -0.2), text: "Abrir a rota no mapa", n: 5, pos: "top", pad: 8 },
      { track: "ligar", t0: h.L("ligar", -0.3), t1: h.L("zap", -0.2), text: "Ligar para o cartório", n: 6, pos: "top", pad: 8 },
      { track: "zap", t0: h.L("zap", -0.3), t1: h.L("fim", 0.3), text: "Falar pelo WhatsApp", n: 7, pos: "top", pad: 8 },
    ],
    cam: [{ t: 0, cx: 683, cy: 384, s: 1 }, { t: 1.0, cx: 683, cy: 300, s: 1.1 }, { t: h.L("contato-ok", 0), cx: 683, cy: 330, s: 1.1 }, { t: 12, cx: 683, cy: 330, s: 1.0 }],
  }),
});

// --- Cena em camadas 3D genérica ---
function cenaCamadas(cfg) {
  return add({
    chrome: true, ...cfg,
    build(r, c) {
      el(`<div class="titulo"><small>${cfg.cap}</small>${cfg.titulo}<p>${cfg.texto}</p></div>`, r);
      const p3 = el(`<div class="p3d"></div>`, r);
      c.stack = el(`<div class="stack" style="left:${cfg.sx}px;top:${cfg.sy}px;width:${cfg.sw}px;height:${cfg.sh}px"></div>`, p3);
      c.slabs = cfg.camadas.map((l) => {
        const h = l.h ?? cfg.sw * 9 / 16;
        const n = el(`<div class="slab" style="width:${cfg.sw}px;height:${h}px;background-image:url(${l.img});background-size:${cfg.sw}px ${cfg.imgH * cfg.sw / (cfg.imgW || 1366)}px;background-position:0 ${-(l.y ?? 0) * cfg.sw / (cfg.imgW || 1366)}px"></div>`, c.stack);
        n.__h = h; return n;
      });
      c.fundo = el(`<div class="abs" style="inset:0;opacity:0;background:radial-gradient(ellipse at 35% 55%,rgba(2,16,34,.35),rgba(2,16,34,.9))"></div>`, r);
      const CW = cfg.cw || 880;
      c.cards = cfg.camadas.map((l, i) => {
        const h = (l.h ?? cfg.sw * 9 / 16) * CW / cfg.sw;
        const n = el(`<div class="destaque" style="width:${CW}px;height:${h}px;left:${cfg.cx}px;top:${cfg.cy}px;opacity:0;background-image:url(${l.img});background-size:${CW}px ${cfg.imgH * CW / (cfg.imgW || 1366)}px;background-position:0 ${-(l.y ?? 0) * CW / (cfg.imgW || 1366)}px"><span class="destaque__tag"><b>${i + 1}</b>${l.nome}</span></div>`, r);
        n.__w = CW; n.__h = h; return n;
      });
      c.itens = el(`<div class="itens" style="left:${cfg.ix}px;top:${cfg.iy}px;width:${cfg.iw}px"></div>`, r);
      c.itEls = cfg.camadas.map((l, i) => el(`<div class="item"><b>${i + 1}</b><div><strong>${l.nome}</strong><span>${l.desc}</span></div></div>`, c.itens));
    },
    update(lt, c) {
      const n = cfg.camadas.length;
      sublinha(c.root, seg(lt, 1.0, 2.0, E.io3));
      const rot = seg(lt, 0.2, 2.2 + n * 0.12, E.io3);
      const ativo = lt < cfg.t0 ? -1 : Math.min(n - 1, Math.floor((lt - cfg.t0) / cfg.por));
      const fim = lt > cfg.t0 + n * cfg.por;
      c.stack.style.transform = `rotateX(${lerp(8, cfg.rx, rot)}deg) rotateZ(${lerp(0, cfg.rz, rot)}deg) scale(${lerp(0.9, 1, rot)})`;
      const PIN = cfg.pin || 1.1, POUT = 0.55;
      const pcs = c.slabs.map((_, i) => { const u = lt - (cfg.t0 + i * cfg.por); if (u < 0) return 0; return seg(u, 0, PIN, E.io3) * (1 - seg(u, cfg.por - POUT, cfg.por, E.io3)); });
      const foco = Math.max(0, ...pcs);
      c.fundo.style.opacity = foco * 0.62;
      c.slabs.forEach((s, i) => {
        const z = (n - 1 - i) * cfg.gap;
        const drop = seg(lt, 0.3 + i * 0.16, 1.4 + i * 0.16, E.out5);
        const sep = seg(lt, 1.6, 3.0, E.io3);
        const pc = pcs[i];
        // camadas acima da escolhida se abrem para o cartão sair do meio da pilha
        let abre = 0; for (let j = i + 1; j < n; j++) abre = Math.max(abre, pcs[j]);
        s.style.transform = `translateZ(${z * (0.18 + 0.82 * sep) + (1 - drop) * 380 + abre * 150}px)`;
        s.style.opacity = drop * (1 - 0.85 * pc) * (1 - 0.55 * abre) * (ativo >= 0 && !fim ? 0.75 : 1);
        s.style.filter = "none";
        const cd = c.cards[i];
        if (pc <= 0.001) { cd.style.opacity = 0; return; }
        const bb = s.getBoundingClientRect();
        const o = { cx: bb.left + bb.width / 2, cy: bb.top + bb.height / 2, w: bb.width };
        const tx = cfg.cx + cd.__w / 2, ty = cfg.cy + cd.__h / 2;
        const a = 1 - pc;
        const uu = lt - (cfg.t0 + i * cfg.por), vida = 1 + 0.025 * clamp((uu - PIN) / Math.max(0.1, cfg.por - PIN - POUT));
        const sc = vida * lerp(Math.min(1, o.w / cd.__w * 0.85), 1, pc) * (1 + 0.035 * Math.sin(Math.PI * Math.min(1, pc)) * (a > 0 ? 1 : 0));
        const arco = -Math.sin(Math.PI * pc) * 70 * (1 - Math.abs(pc - 0.5) * 0.0);
        cd.style.opacity = seg(pc, 0, 0.3, E.out3);
        cd.style.transform = `translate(${(o.cx - tx) * a}px,${(o.cy - ty) * a + (pc < 1 ? arco * (a > 0 ? 1 : 0) : 0)}px) perspective(2600px) rotateX(${a * cfg.rx}deg) rotateZ(${a * cfg.rz}deg) scale(${sc})`;
        cd.style.filter = `brightness(${1 + 0.1 * a})`;
      });
      c.itEls.forEach((it, i) => {
        aparece(it, lt, 1.8 + i * 0.12, 2.5 + i * 0.12, { dx: 50, dy: 0 });
        const on = ativo === i && !fim; it.classList.toggle("on", on);
      });
    },
  });
}
// 7. Camadas: as 4 abas
cenaCamadas({
  id: "camadas-abas", cap: "Por dentro do site", titulo: "As quatro abas, <u>uma a uma</u>", dur: 15.5, imgH: 768, imgW: 1366,
  texto: "O site é dividido em camadas. Cada aba tem uma função clara dentro da jornada do cidadão.",
  sx: 320, sy: 560, sw: 640, sh: 360, rx: 56, rz: -32, gap: 112, ix: 1180, iy: 250, iw: 640, t0: 4.2, por: 2.5, pin: 1.2, cx: 110, cy: 350, cw: 1000,
  camadas: [
    { img: "../.work/img/aba-inicio.png", nome: "Início", desc: "Apresenta o cartório, a busca e os serviços mais procurados." },
    { img: "../.work/img/aba-servicos.png", nome: "Serviços", desc: "Todos os atendimentos, por assunto ou por especialidade." },
    { img: "../.work/img/aba-documentos.png", nome: "Documentos", desc: "O que levar, orientações e modelos para baixar." },
    { img: "../.work/img/aba-contato.png", nome: "Contato", desc: "Endereço, horário, telefone, WhatsApp, e-mail e rota no mapa." },
  ],
});
// 8. Camadas: anatomia da página inicial
{
  const S = Object.fromEntries(SEC.secoes.map((s) => [s.id, s]));
  const W0 = SEC.largura || 1366;
  const k = 520 / W0;
  const ord = ["hero", "busca", "servicos", "antes", "atend", "funil", "rodape"].filter((i) => S[i]);
  const nomes = {
    hero: ["Destaque", "Mensagem principal, fachada, “Aberto agora” e chamadas para ação."],
    busca: ["Busca e mais procurados", "Encontre o serviço pelas suas palavras."],
    servicos: ["Especialidades", "Os cinco setores do cartório em cartões."],
    antes: ["Antes de vir", "Atalhos para documentos, orientações e modelos."],
    atend: ["Como chegar", "Endereço, horário, contatos e foto da fachada."],
    funil: ["Fale com o cartório", "Mensagem pronta em três passos."],
    rodape: ["Rodapé", "Links úteis e informações institucionais."],
  };
  const fatias = [["Cabeçalho e menu", "Marca, navegação, botão Buscar e WhatsApp sempre à vista.", 0, S.hero.y]];
  ord.forEach((id, i) => { const y = S[id].y, y2 = i + 1 < ord.length ? S[ord[i + 1]].y : SEC.altura; fatias.push([nomes[id][0], nomes[id][1], y, y2 - y]); });
  cenaCamadas({
    id: "camadas-home", cap: "Por dentro do site", titulo: "Anatomia da <u>página inicial</u>", dur: 18.5, imgH: SEC.altura, imgW: W0,
    texto: "Cada seção da página tem um objetivo: informar, orientar ou levar o cidadão ao atendimento.",
    sx: 360, sy: 600, sw: 520, sh: 349, rx: 54, rz: -34, gap: 66, ix: 1130, iy: 160, iw: 700, t0: 4.0, por: 1.75, pin: 1.0, cx: 110, cy: 345, cw: 940,
    camadas: fatias.map(([nome, desc, y, h]) => ({ img: "../.work/img/home-inteira.png", nome, desc, y, h: Math.max(26, h * k) })),
  });
}

// 9. Documentos antes de vir
cenaClipe({
  id: "servico", n: "07", cap: "Documentos antes de vir", titulo: "Venha preparado, <u>sem idas e vindas</u>", dur: 14,
  texto: "Cada serviço tem a sua lista de documentos, explicada em linguagem simples.",
  clip: "servico", from: 1.2, speed: 1.95,
  def: (h) => ({
    bullets: [
      { t: h.L("marca-ini", 0.3), txt: "Marque o que já reuniu: a barra <u>acompanha</u>" },
      { t: h.L("pronto", -0.5), txt: "No fim, o site avisa: <u>“Pode vir ao cartório”</u>" },
      { t: h.L("como", 0.0), txt: "Veja <u>como funciona</u>, prazo, custo e dúvidas" },
    ],
    marks: [
      { track: "lista", t0: h.L("marca-ini", 0.2), t1: h.L("marca-fim", -0.3), text: "Marque cada documento", n: 1, pos: "top", pad: 6 },
      { track: "progresso", kind: "sub", t0: h.L("marca-ini", 1.0), t1: h.L("pronto", 1.6), n: "" },
      { track: "progresso", t0: h.L("pronto", -0.4), t1: h.L("pronto", 1.6), text: "Tudo reunido!", n: 2, pos: "right", pad: 8 },
    ],
    cam: [{ t: 0, cx: 683, cy: 384, s: 1 }, { t: h.L("marca-ini", -0.5), cx: 560, cy: 400, s: 1.12 }, { t: h.L("pronto", 1.4), cx: 560, cy: 400, s: 1.12 }, { t: h.L("como", 0.2), cx: 683, cy: 384, s: 1 }],
  }),
});

// 10. Funil de contato
cenaClipe({
  id: "funil", n: "08", cap: "Fale com o cartório", titulo: "Atendimento em <u>três passos</u>", dur: 18.5,
  texto: "O cidadão responde a três perguntas e a mensagem sai pronta, por WhatsApp, e-mail ou copiada.",
  clip: "funil", from: 1.4, speed: 1.5,
  def: (h) => ({
    bullets: [
      { t: h.L("nome", 0.5), txt: "Nome, setor e serviço: <u>três passos</u>" },
      { t: h.L("esp-lista", 0.2), txt: "As listas mostram <u>todas as opções</u>" },
      { t: h.L("msg", 0.2), txt: "A mensagem é <u>montada sozinha</u>" },
      { t: h.L("topo", -0.6), txt: "Botão <u>voltar ao topo</u> com anel de leitura" },
    ],
    marks: [
      { track: "nome", t0: h.L("nome", 0.2), t1: h.L("esp", 0.1), text: "1 · Seu nome", n: 1, pos: "right", pad: 6 },
      { track: "esp", t0: h.L("esp", 0.0), t1: h.L("esp-lista", 0.1), text: "2 · Setor", n: 2, pos: "right", pad: 6 },
      { track: "dd", t0: h.L("esp-lista", 0.1), t1: h.L("esp-ok", 0.1), text: "Escolha a especialidade", n: 2, pos: "right", pad: 4 },
      { track: "ato", t0: h.L("ato", 0.0), t1: h.L("ato-lista", 0.1), text: "3 · Serviço", n: 3, pos: "right", pad: 6 },
      { track: "dd", t0: h.L("ato-lista", 0.1), t1: h.L("ato-ok", 0.1), text: "Escolha o serviço", n: 3, pos: "right", pad: 4 },
      { track: "msg", t0: h.L("msg", 0.3), t1: h.L("copiar-ini", 0.3), text: "Mensagem pronta", n: 4, pos: "top", pad: 8 },
      { track: "copiar", t0: h.L("copiar-ini", 0.0), t1: h.L("copiar-fim", -0.2), text: "Copiar mensagem", n: 5, pos: "top", pad: 8 },
      { track: "aviso", t0: h.L("copiar-ini", 0.9), t1: h.L("copiar-fim", -0.2), text: "Copiada!", n: "✓", pos: "top", pad: 8 },
      { track: "canais", t0: h.L("canais-ini", 0.0), t1: h.L("canais-fim", 0.0), text: "WhatsApp ou e-mail", n: 6, pos: "top", pad: 8 },
      { track: "topo", t0: h.L("topo", 0.0), t1: h.L("topo", 1.8), text: "Voltar ao topo", n: 7, pos: "left", pad: 8 },
    ],
    cam: [{ t: 0, cx: 683, cy: 384, s: 1 }, { t: h.L("nome", -0.3), cx: 683, cy: 400, s: 1.18 }, { t: h.L("canais-fim", 0.3), cx: 683, cy: 400, s: 1.18 }, { t: h.L("topo", -0.5), cx: 683, cy: 384, s: 1 }],
  }),
});

// 11. Celular e qualidades
add({
  id: "celular", cap: "Em qualquer tela", chrome: true, dur: 12,
  build(r, c) {
    c.tit = el(`<div class="grande" style="top:104px;font-size:44px">Pensado para <u>todas as telas</u> e todas as pessoas</div>`, r);
    c.fone = el(`<div class="fone" style="left:759px;top:196px;transform-origin:50% 0"><div class="fone__tela"><img alt=""></div></div>`, r);
    c.img = c.fone.querySelector("img");
    const defs = [
      [90, 330, "fone", "Responsivo", "Adapta-se sozinho ao celular, ao tablet e ao computador."],
      [90, 600, "raio", "Leve e rápido", "Cerca de 50 KB no primeiro acesso, sem serviços de terceiros."],
      [1390, 330, "olho", "Acessível", "Aprovado na auditoria de acessibilidade WCAG 2.1 AA."],
      [1390, 600, "escudo", "Seguro", "Sem cookies, sem rastreadores e com política de segurança estrita."],
    ];
    c.cards = defs.map(([x, y, i, t, d]) => el(`<div class="card" style="left:${x}px;top:${y}px"><i>${svg(i)}</i><strong>${t}</strong><span>${d}</span></div>`, r));
  },
  update(lt, c) {
    const fi = Math.min(infos.celular.quadros - 1, Math.max(0, Math.round((0.2 + lt * 0.95) * infos.celular.fps)));
    setImg(c.img, frameUrl("celular", fi));
    sublinha(c.tit, seg(lt, 1.0, 2.0, E.io3));
    aparece(c.tit, lt, 0.2, 0.9, { dy: 20 });
    const p = seg(lt, 0.3, 1.5, E.out5);
    c.fone.style.opacity = p; c.fone.style.transform = `translateY(${(1 - p) * 80 + Math.sin(lt * 1.6) * 4}px) scale(0.9)`;
    c.cards.forEach((cd, i) => aparece(cd, lt, 1.6 + i * 0.8, 2.4 + i * 0.8, { dx: i < 2 ? -50 : 50, dy: 0, f: E.out5 }));
  },
});

// 12. Resumo (esquema final)
const RESUMO = [
  ["busca", "Busca inteligente", "Entende o jeito de falar de cada pessoa."],
  ["teclado", "Busca rápida", "Botão Buscar ou tecla / em qualquer página."],
  ["grade", "5 especialidades", "Tudo do cartório no mesmo endereço."],
  ["lista", "Documentos antes de vir", "Lista marcável, com barra de progresso."],
  ["msg", "Fale com o cartório", "Mensagem pronta: WhatsApp, e-mail ou copiar."],
  ["relogio", "Aberto agora", "Horário de atendimento em tempo real."],
];
add({
  id: "resumo", cap: "Resumo", chrome: true, dur: 9.5,
  build(r, c) {
    c.tit = el(`<div class="grande" style="top:128px;font-size:58px">Tudo isso em <u>um só site</u></div>`, r);
    c.cards = RESUMO.map(([ic, t, d], i) => el(`<div class="rc" style="left:${150 + (i % 3) * 560}px;top:${300 + Math.floor(i / 3) * 300}px"><div class="rc__ic">${svg(ic)}</div><strong>${t}</strong><span>${d}</span></div>`, r));
  },
  update(lt, c) {
    aparece(c.tit, lt, 0.2, 0.9, { dy: 24, f: E.out5 }); sublinha(c.tit, seg(lt, 0.9, 1.8, E.io3));
    c.cards.forEach((n, i) => {
      const p = seg(lt, 0.9 + i * 0.35, 1.7 + i * 0.35, E.back);
      n.style.opacity = clamp(p * 1.6); n.style.transform = `translateY(${(1 - p) * 50}px) scale(${0.9 + 0.1 * p})`;
      n.style.setProperty("--glow", (0.5 + 0.5 * Math.sin(lt * 2 + i)).toFixed(2));
    });
  },
});

// 13. Fechamento
add({
  id: "fechamento", chrome: false, dur: 6.5,
  build(r, c) {
    c.selo = el(`<img src="../assets/selo.svg" class="abs" style="left:900px;top:250px;width:120px;height:120px">`, r);
    c.l1 = el(`<div class="grande" style="top:420px;font-size:74px">Mais <u>clareza</u> para o cidadão.</div>`, r);
    c.l2 = el(`<div class="grande" style="top:530px;font-size:74px;color:#f0d68f">Mais <u>agilidade</u> para o cartório.</div>`, r);
    c.l3 = el(`<div class="grande" style="top:680px;font-size:28px;font-weight:500;color:#cfe3f7;letter-spacing:.02em">Tabelionato de Jaboticaba · Cartório · Jaboticaba/RS</div>`, r);
  },
  update(lt, c) {
    const p = seg(lt, 0.2, 1.1, E.back); c.selo.style.opacity = seg(lt, 0.2, 0.8); c.selo.style.transform = `scale(${0.6 + 0.4 * p})`;
    aparece(c.l1, lt, 0.9, 1.7, { dy: 30, f: E.out5 }); sublinha(c.l1, seg(lt, 1.7, 2.5, E.io3));
    aparece(c.l2, lt, 1.9, 2.7, { dy: 30, f: E.out5 }); sublinha(c.l2, seg(lt, 2.7, 3.5, E.io3));
    aparece(c.l3, lt, 3.1, 3.9, { dy: 14 });
  },
});

// 14. Assinatura: Evolute
const LOGO = { bars: [[54, 126], [144, 216], [231, 309]], texto: [410, 90, 1155, 262], sub: [410, 272, 1155, 345] };
add({
  id: "evolute", chrome: false, dur: 11, sobra: 0.5,
  build(r, c) {
    c.r = r; r.classList.add("fim");
    el(`<div class="fim__grade"></div>`, r);
    el(`<div class="abs" style="left:0;top:0;right:0;height:10px;background:linear-gradient(90deg,#0b2545,#1d5fa8,#17c3e6)"></div>`, r);
    c.frase = el(`<div class="frase" style="top:250px">${["Desenvolvido", "por"].map((w) => `<span>${w}</span>`).join("")}<b>${["Evolute", "soluções", "digitais"].map((w) => `<span>${w}</span>`).join("")}</b></div>`, r);
    c.palavras = c.frase.querySelectorAll("span");
    c.logo = el(`<div class="logo" style="left:370px;top:400px"></div>`, r);
    const parte = (bound) => { const d = el(`<div class="abs" style="left:0;top:0;width:1180px;height:360px"><img src="../assets/evolute-logo.png"></div>`, c.logo); d.__b = bound; return d; };
    c.barras = LOGO.bars.map(([a, b]) => parte([a - 4, 40, b + 4, 345]));
    c.txt = parte(LOGO.texto);
    c.sub = parte(LOGO.sub);
    c.brilho = el(`<div class="brilho"></div>`, c.logo);
  },
  update(lt, c) {
    c.palavras.forEach((w, i) => aparece(w, lt, 0.5 + i * 0.28, 1.1 + i * 0.28, { dy: 24, f: E.out5 }));
    const clip = (n, [x0, y0, x1, y1], inset) => { n.style.clipPath = `inset(${y0 + inset.t}px ${1180 - x1 + inset.r}px ${360 - y1 + inset.b}px ${x0 + inset.l}px)`; };
    c.barras.forEach((b, i) => {
      const [, y0, , y1] = b.__b; const p = seg(lt, 2.0 + i * 0.35, 3.1 + i * 0.35, E.out5);
      clip(b, b.__b, { t: (1 - p) * (y1 - y0), r: 0, b: 0, l: 0 }); b.style.opacity = p > 0 ? 1 : 0;
    });
    const pt = seg(lt, 3.5, 4.8, E.out5); clip(c.txt, c.txt.__b, { t: 0, r: (1 - pt) * (c.txt.__b[2] - c.txt.__b[0]), b: 0, l: 0 });
    c.txt.style.transform = `translateX(${(1 - pt) * -40}px)`;
    const ps = seg(lt, 4.6, 5.8, E.out5); clip(c.sub, c.sub.__b, { t: 0, r: (1 - ps) * (c.sub.__b[2] - c.sub.__b[0]), b: 0, l: 0 });
    c.sub.style.transform = `translateX(${(1 - ps) * -30}px)`;
    c.brilho.style.backgroundPosition = `${lerp(100, -20, seg(lt, 6.2, 7.6, E.io2))}% 0`;
    c.brilho.style.opacity = lt > 6.2 && lt < 7.7 ? 0.8 : 0;
    const fl = Math.sin(lt * 1.8) * 4;
    c.logo.style.transform = `translateY(${lt > 5.8 ? fl : 0}px) scale(${1 + seg(lt, 2, 11, E.lin) * 0.03})`;
  },
});

// ---------- cromo permanente (marca, capítulo, progresso) e transições ----------
const chrome = el(`<div class="chrome" style="opacity:0"></div>`, stage);
chrome.innerHTML = `<div class="chrome__marca"><img src="../assets/selo.svg" alt=""><div>Tabelionato de Jaboticaba<small>APRESENTAÇÃO DO NOVO SITE</small></div></div><div class="chrome__cap"></div><div class="chrome__prog"><i></i></div>`;
const capEl = chrome.querySelector(".chrome__cap"), progI = chrome.querySelector(".chrome__prog i");
const TOTAL = T0 + 0.5;
const marcos = cenas.filter((c) => c.chrome && c.cap);
const pts = marcos.map((c) => el(`<div class="chrome__pt" style="left:${96 + (1728 * c.ini) / TOTAL}px"></div>`, chrome));
const faixa = el(`<div class="faixa"></div>`, stage);
const faixa2 = el(`<div class="faixa faixa--b"></div>`, stage);

window.TOTAL_FRAMES = Math.ceil(TOTAL * FPS);
window.CENAS = cenas.map((c) => [c.id, +c.ini.toFixed(2), c.dur]);
window.renderFrame = async (f) => {
  const t = f / FPS;
  let cromoA = 0, cap = "";
  cenas.forEach((c, i) => {
    const lt = t - c.ini;
    const vis = lt >= -0.001 && lt <= c.dur;
    c.root.style.display = vis ? "block" : "none";
    if (!vis) return;
    const entra = i === 0 ? 1 : seg(lt, 0, 0.5, E.lin);
    const sai = i === cenas.length - 1 ? 0 : seg(lt, c.dur - 0.5, c.dur, E.lin);
    const a = entra * (1 - sai);
    c.root.style.opacity = a;
    c.update(lt, c);
    if (c.chrome) { cromoA = Math.max(cromoA, a); if (a > 0.5) cap = c.cap; }
  });
  chrome.style.opacity = cromoA; capEl.textContent = cap;
  progI.style.width = (100 * t) / TOTAL + "%";
  pts.forEach((p, i) => p.classList.toggle("on", t >= marcos[i].ini));
  orbs[0].style.transform = `translate(${Math.sin(t * 0.25) * 90}px,${Math.cos(t * 0.2) * 60}px)`;
  orbs[1].style.transform = `translate(${Math.cos(t * 0.22) * -80}px,${Math.sin(t * 0.3) * 50}px)`;
  parts.forEach((d) => { const q = d.__p; const y = 1100 - ((t * q.v + q.ph * 140) % 1200); d.style.transform = `translateY(${y}px)`; d.style.opacity = (0.25 + 0.25 * Math.sin(t * 1.2 + q.ph)) * q.s * 1.6; });
  // faixa dourada que varre a tela a cada troca de cena
  let fp = -1;
  for (let i = 1; i < cenas.length; i++) { const u = (t - (cenas[i].ini - 0.2)) / 0.85; if (u > 0 && u < 1) { fp = u; break; } }
  if (fp >= 0) { const e = E.io3(fp); faixa.style.opacity = 1; faixa.style.transform = `translateX(${lerp(-2300, 2300, e)}px) skewX(-18deg)`; faixa2.style.opacity = 1; faixa2.style.transform = `translateX(${lerp(-2300, 2300, E.io3(clamp(fp * 1.08 - 0.06)))}px) skewX(-18deg)`; }
  else { faixa.style.opacity = 0; faixa2.style.opacity = 0; }
  await Promise.all(pend.splice(0));
  await document.fonts.ready;
};
window.__pronto = true;
