// Palco do vídeo: renderiza qualquer quadro f de forma determinística (tempo = f / 30).
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
async function carregarInfos() {
  for (const c of ["hero", "busca", "carrossel", "especialidades", "abas", "servico", "funil", "celular"])
    infos[c] = await (await fetch(`/.work/clipes/${c}/info.json`)).json();
}

await carregarInfos();
for (const u of ["aba-inicio", "aba-servicos", "aba-documentos", "aba-contato", "home-inteira"]) {
  const im = new Image(); im.src = `/.work/img/${u}.png`; await im.decode().catch(() => {});
}
// ---------- fundo permanente ----------
const bg = el(`<div class="bg"><div class="bg__grade"></div><div class="orb" style="width:700px;height:700px;background:#1a7be0;left:-150px;top:-200px"></div><div class="orb" style="width:600px;height:600px;background:#d9b45c;opacity:.18;right:-100px;bottom:-200px"></div></div>`, stage);
const orbs = bg.querySelectorAll(".orb");

// ---------- gerenciador de imagens (quadros do site) ----------
const pend = [];
function setImg(img, url) {
  if (img.__url === url) return;
  img.__url = url; img.src = url;
  pend.push(img.decode().catch(() => {}));
}

// ---------- cenas ----------
const cenas = [];
let T0 = 0;
function add(c) { c.ini = T0; T0 += c.dur - (c.sobra ?? 0.5); c.root = el(`<div class="cena" style="display:none"></div>`, stage); cenas.push(c); c.build?.(c.root, c); return c; }

const aparece = (n, lt, a, b = a + 0.7, { dy = 24, dx = 0, f = E.out3 } = {}) => {
  const p = seg(lt, a, b, f);
  n.style.opacity = p; n.style.transform = `translate(${(1 - p) * dx}px,${(1 - p) * dy}px)`;
};

// --- Abertura ---
add({
  id: "abertura", dur: 7.5, chrome: false,
  build(r, c) {
    c.foto = el(`<div class="abs" style="inset:-40px;background:url(../assets/fachada.webp) center/cover;filter:blur(7px) brightness(.45) saturate(1.1)"></div>`, r);
    el(`<div class="abs" style="inset:0;background:linear-gradient(90deg,rgba(2,20,40,.92),rgba(2,20,40,.35) 60%,rgba(2,20,40,.7))"></div>`, r);
    c.selo = el(`<img src="../assets/selo.svg" class="abs" style="left:150px;top:300px;width:120px;height:120px">`, r);
    c.eye = el(`<div class="abs" style="left:150px;top:450px;font-size:20px;font-weight:700;letter-spacing:.32em;color:#f0d68f;text-transform:uppercase">Apresentação institucional</div>`, r);
    c.t1 = el(`<div class="abs" style="left:150px;top:500px;font-size:96px;font-weight:800;letter-spacing:-.025em;line-height:1.02">Tabelionato<br>de Jaboticaba</div>`, r);
    c.t2 = el(`<div class="abs" style="left:150px;top:742px;font-size:34px;font-weight:500;color:#cfe3f7">Conheça o novo site do cartório</div>`, r);
    c.lin = el(`<div class="abs" style="left:150px;top:722px;height:4px;width:160px;border-radius:4px;background:linear-gradient(90deg,#2b9bff,#f0d68f)"></div>`, r);
    c.moldura = el(`<div class="abs" style="left:1130px;top:250px;width:640px;height:560px;border-radius:28px;overflow:hidden;box-shadow:0 40px 90px rgba(0,10,30,.6),0 0 0 1px rgba(255,255,255,.2)"><div class="abs" style="inset:0;background:url(../assets/fachada.webp) 38% center/auto 112%"></div></div>`, r);
    c.molduraImg = c.moldura.firstElementChild;
  },
  update(lt, c) {
    c.foto.style.transform = `scale(${1.04 + lt * 0.012})`;
    const p = seg(lt, 0.3, 1.3, E.back);
    c.selo.style.opacity = seg(lt, 0.3, 1); c.selo.style.transform = `scale(${0.6 + 0.4 * p}) rotate(${(1 - p) * -90}deg)`;
    aparece(c.eye, lt, 0.9, 1.6, { dy: 14 });
    aparece(c.t1, lt, 1.2, 2.2, { dy: 40, f: E.out5 });
    c.lin.style.width = 160 + 0 * lt + "px"; c.lin.style.opacity = seg(lt, 1.8, 2.3);
    aparece(c.t2, lt, 2.3, 3.1, { dy: 18 });
    const pm = seg(lt, 1.0, 2.4, E.out5);
    c.moldura.style.opacity = pm; c.moldura.style.transform = `translateY(${(1 - pm) * 70}px) scale(${0.94 + 0.06 * pm})`;
    c.molduraImg.style.transform = `scale(${1 + lt * 0.012}) translateX(${-lt * 6}px)`;
  },
});

// --- Cena com janela do navegador + painel lateral ---
function cenaClipe(cfg) {
  return add({
    chrome: true, ...cfg,
    build(r, c) {
      c.win = el(`<div class="win"><div class="win__bar"><i></i><i></i><i></i><div class="win__url"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#4f5e6d" stroke-width="2.4"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>Site do Tabelionato de Jaboticaba</div></div><div class="win__view"><div class="cam"><img alt=""></div></div></div>`, r);
      c.cam = c.win.querySelector(".cam"); c.img = c.cam.querySelector("img");
      c.mks = (cfg.marks || []).map((m) => {
        const n = el(`<div class="mk" style="left:${m.x * 0.7}px;top:${m.y * 0.7}px;opacity:0"></div>`, c.cam);
        let inner = "";
        if (m.box) inner = `<div class="mk__box" style="left:${-m.box[0] * 0.7 + 0}px;top:0;width:0;height:0"></div>`;
        n.__m = m;
        if (m.box) {
          n.style.left = m.box[0] * 0.7 + "px"; n.style.top = m.box[1] * 0.7 + "px";
          n.innerHTML = `<div class="mk__box" style="left:-6px;top:-6px;width:${m.box[2] * 0.7 + 12}px;height:${m.box[3] * 0.7 + 12}px"></div>`;
          if (m.text) { const pl = el(`<div class="mk__pill" style="left:${m.dx ?? 0}px;top:${m.dy ?? -70}px"><b>${m.n ?? "✓"}</b>${m.text}</div>`, n); n.__pill = pl; }
        } else {
          const dx = m.dx ?? 80, dy = m.dy ?? -90;
          n.innerHTML = `<div class="mk__s"><svg class="mk__line" width="2" height="2"><line x1="0" y1="0" x2="${dx}" y2="${dy}" stroke="#f0d68f" stroke-width="3" stroke-linecap="round"/></svg><div class="mk__ring"></div><div class="mk__pill" style="left:${dx < 0 ? "auto" : dx + "px"};right:${dx < 0 ? -dx + "px" : "auto"};top:${dy - 24}px"><b>${m.n ?? "✓"}</b>${m.text}</div></div>`;
          n.__s = n.firstElementChild;
        }
      });
      c.mkEls = Array.from(c.cam.querySelectorAll(".mk"));
      c.lado = el(`<div class="lado"><div class="lado__n">${cfg.n}</div><h2>${cfg.titulo}</h2><p>${cfg.texto}</p><ul>${cfg.bullets.map((b, i) => `<li style="opacity:0"><em>${i + 1}</em><span>${b.txt}</span></li>`).join("")}</ul></div>`, r);
      c.lis = c.lado.querySelectorAll("li");
      c.numEl = c.lado.querySelector(".lado__n"); c.h2 = c.lado.querySelector("h2"); c.pp = c.lado.querySelector("p");
    },
    update(lt, c) {
      // quadro do clipe (com aceleração opcional)
      const fi = Math.min(infos[cfg.clip].quadros - 1, Math.max(0, Math.round((cfg.from + lt * cfg.speed) * infos[cfg.clip].fps)));
      setImg(c.img, frameUrl(cfg.clip, fi));
      // câmera
      const ks = cfg.cam || [{ t: 0, cx: 960, cy: 540, s: 1 }];
      let a = ks[0], b = ks[0];
      for (let i = 0; i < ks.length; i++) { if (lt >= ks[i].t) { a = ks[i]; b = ks[Math.min(i + 1, ks.length - 1)]; } }
      const p = b === a ? 0 : E.io3(clamp((lt - a.t) / (b.t - a.t)));
      const s = lerp(a.s, b.s, p), cx = lerp(a.cx, b.cx, p), cy = lerp(a.cy, b.cy, p);
      const k = 0.7;
      let tx = 672 - cx * k * s, ty = 378 - cy * k * s;
      tx = clamp(tx, 1344 - 1344 * s, 0); ty = clamp(ty, 756 - 756 * s, 0);
      c.cam.style.transform = `translate(${tx}px,${ty}px) scale(${s})`;
      // janela entra
      const pw = seg(lt, 0.15, 1.2, E.out5);
      c.win.style.opacity = pw; c.win.style.transform = `translateY(${(1 - pw) * 60}px) scale(${0.96 + 0.04 * pw})`;
      // painel lateral
      aparece(c.numEl, lt, 0.4, 1.0, { dx: 30, dy: 0 }); aparece(c.h2, lt, 0.55, 1.2, { dx: 30, dy: 0 }); aparece(c.pp, lt, 0.7, 1.4, { dx: 30, dy: 0 });
      c.lis.forEach((li, i) => aparece(li, lt, cfg.bullets[i].t, cfg.bullets[i].t + 0.6, { dx: 40, dy: 0, f: E.back }));
      // marcações
      c.mkEls.forEach((n) => {
        const m = n.__m; const pm = seg(lt, m.t0, m.t0 + 0.5, E.out5) * (1 - seg(lt, m.t1 - 0.4, m.t1));
        n.style.opacity = pm;
        if (n.__s) n.__s.style.transform = `scale(${1 / s * (0.85 + 0.15 * pm)})`;
        else { const sc = 0.96 + 0.04 * pm; n.style.transform = `scale(${sc})`; if (n.__pill) n.__pill.style.transform = `scale(${1 / s})`, n.__pill.style.transformOrigin = "0 100%"; }
      });
    },
  });
}

// 1. Página inicial
cenaClipe({
  id: "inicio", n: "01", cap: "Página inicial", titulo: "Uma entrada clara e acolhedora", dur: 10.5,
  texto: "Ao abrir o site, o cidadão entende o que o cartório faz e por onde começar.",
  clip: "hero", from: 0.7, speed: 1.0,
  bullets: [{ t: 2.0, txt: "Fachada real do cartório, que se move com o mouse" }, { t: 4.2, txt: "Botões que acompanham o cursor" }, { t: 6.4, txt: "Menu fixo e simples: Início, Serviços, Documentos e Contato" }],
  cam: [{ t: 0, cx: 960, cy: 540, s: 1 }, { t: 1.6, cx: 1150, cy: 400, s: 1.22 }, { t: 5.2, cx: 1100, cy: 400, s: 1.22 }, { t: 6.4, cx: 800, cy: 450, s: 1.18 }, { t: 10, cx: 800, cy: 450, s: 1.15 }],
  marks: [
    { t0: 2.3, t1: 5.0, x: 1290, y: 380, dx: -280, dy: -140, text: "Fachada reage ao mouse", n: 1 },
    { t0: 6.2, t1: 9.8, x: 524, y: 542, dx: 100, dy: 90, text: "Botões “puxam” o cursor", n: 2 },
  ],
});
// 2. Busca
cenaClipe({
  id: "busca", n: "02", cap: "Busca inteligente", titulo: "Digite do seu jeito", dur: 13.5,
  texto: "Não é preciso saber o nome jurídico do serviço. O site entende as palavras do dia a dia.",
  clip: "busca", from: 0.6, speed: 1.0,
  bullets: [{ t: 2.4, txt: "Sugestões enquanto a pessoa digita" }, { t: 5.4, txt: "Ignora acentos e plural: “certidões” acha “certidão”" }, { t: 9.2, txt: "“quero casar” leva direto ao casamento civil" }],
  cam: [{ t: 0, cx: 960, cy: 540, s: 1 }, { t: 1.6, cx: 900, cy: 560, s: 1.2 }, { t: 12, cx: 900, cy: 600, s: 1.2 }],
  marks: [],
});
// 3. Carrossel
cenaClipe({
  id: "carrossel", n: "03", cap: "Mais procurados", titulo: "Os serviços mais pedidos, a um toque", dur: 10.5,
  texto: "Um carrossel com os atendimentos mais procurados pela população.",
  clip: "carrossel", from: 0.8, speed: 1.3,
  bullets: [{ t: 1.8, txt: "Setas, arrastar com o mouse ou deslizar no celular" }, { t: 4.2, txt: "Cada cartão leva direto ao serviço" }, { t: 6.6, txt: "Os cartões se inclinam em 3D ao passar o mouse" }],
  cam: [{ t: 0, cx: 960, cy: 540, s: 1 }, { t: 1.4, cx: 960, cy: 600, s: 1.2 }, { t: 9, cx: 960, cy: 600, s: 1.2 }],
  marks: [
    { t0: 2.6, t1: 5.8, x: 1481, y: 325, dx: -300, dy: 0, text: "Avançar nos serviços", n: 1 },
    { t0: 5.9, t1: 8.0, box: [411, 354, 1097, 205], text: "Cada cartão leva direto ao serviço", n: 2, dx: 0, dy: 158 },
    { t0: 8.2, t1: 9.9, x: 1429, y: 325, dx: -300, dy: 0, text: "Voltar", n: 3 },
  ],
});
// 4. Especialidades
cenaClipe({
  id: "especialidades", n: "04", cap: "Especialidades", titulo: "Cinco especialidades, um só endereço", dur: 10.5,
  texto: "Notas, Protesto, Títulos e Documentos, Pessoas Jurídicas e Pessoas Naturais.",
  clip: "especialidades", from: 0.6, speed: 1.3,
  bullets: [{ t: 2.0, txt: "Elementos que surgem suavemente ao rolar a página" }, { t: 4.6, txt: "Cartões reagem ao mouse com brilho e inclinação" }, { t: 7.0, txt: "Cada cartão resume os serviços do setor" }],
  cam: [{ t: 0, cx: 960, cy: 540, s: 1 }, { t: 3, cx: 960, cy: 600, s: 1.25 }, { t: 9.5, cx: 960, cy: 640, s: 1.25 }],
  marks: [],
});
// 5. Abas
cenaClipe({
  id: "abas", n: "05", cap: "Navegação", titulo: "Troca de páginas com transição suave", dur: 10.5,
  texto: "Quatro abas no menu levam a todo o conteúdo, sem complicação.",
  clip: "abas", from: 0.8, speed: 2.1,
  bullets: [{ t: 1.4, txt: "Serviços: tudo organizado por assunto" }, { t: 4.2, txt: "Documentos: o que levar ao cartório" }, { t: 7.0, txt: "Contato: endereço, horário e rota no mapa" }],
  cam: [{ t: 0, cx: 960, cy: 540, s: 1 }, { t: 1.0, cx: 960, cy: 400, s: 1.15 }, { t: 9.5, cx: 960, cy: 400, s: 1.15 }],
  marks: [],
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
        const n = el(`<div class="slab" style="width:${cfg.sw}px;height:${h}px;background-image:url(${l.img});background-size:${cfg.sw}px ${cfg.imgH * cfg.sw / 1920}px;background-position:0 ${-(l.y ?? 0) * cfg.sw / 1920}px"></div>`, c.stack);
        n.__h = h; return n;
      });
      const CW = cfg.cw || 880;
      c.cards = cfg.camadas.map((l, i) => {
        const h = (l.h ?? cfg.sw * 9 / 16) * CW / cfg.sw;
        const n = el(`<div class="destaque" style="width:${CW}px;height:${h}px;left:${cfg.cx}px;top:${cfg.cy}px;opacity:0;background-image:url(${l.img});background-size:${CW}px ${cfg.imgH * CW / 1920}px;background-position:0 ${-(l.y ?? 0) * CW / 1920}px"><span class="destaque__tag"><b>${i + 1}</b>${l.nome}</span></div>`, r);
        n.__w = CW; n.__h = h; return n;
      });
      c.itens = el(`<div class="itens" style="left:${cfg.ix}px;top:${cfg.iy}px;width:${cfg.iw}px"></div>`, r);
      c.itEls = cfg.camadas.map((l, i) => el(`<div class="item"><b>${i + 1}</b><div><strong>${l.nome}</strong><span>${l.desc}</span></div></div>`, c.itens));
    },
    update(lt, c) {
      const n = cfg.camadas.length;
      const rot = seg(lt, 0.2, 2.2 + n * 0.12, E.io3);
      const ativo = lt < cfg.t0 ? -1 : Math.min(n - 1, Math.floor((lt - cfg.t0) / cfg.por));
      const fim = lt > cfg.t0 + n * cfg.por;
      c.stack.style.transform = `rotateX(${lerp(8, cfg.rx, rot)}deg) rotateZ(${lerp(0, cfg.rz, rot)}deg) scale(${lerp(0.9, 1, rot)})`;
      c.slabs.forEach((s, i) => {
        const z = (n - 1 - i) * cfg.gap;
        const drop = seg(lt, 0.3 + i * 0.16, 1.4 + i * 0.16, E.out5);
        const sep = seg(lt, 1.6, 3.0, E.io3);
        const u = lt - (cfg.t0 + i * cfg.por);
        const pin = seg(u, 0, 0.8, E.out5), pout = seg(u, cfg.por - 0.55, cfg.por, E.io3);
        const pc = u < 0 ? 0 : pin * (1 - pout);
        s.style.transform = `translateZ(${z * (0.18 + 0.82 * sep) + (1 - drop) * 380}px)`;
        s.style.opacity = drop * (1 - 0.8 * pc) * (ativo >= 0 && !fim ? 0.7 : 1);
        s.style.filter = "none";
        // cartão que sai da pilha e vem à frente, nítido e de frente
        const cd = c.cards[i];
        if (pc <= 0.001) { cd.style.opacity = 0; return; }
        const bb = s.getBoundingClientRect(); cd.__x = { cx: bb.left + bb.width / 2, cy: bb.top + bb.height / 2, w: bb.width };
        const o = cd.__x; if (!o) return;
        const tx = cfg.cx + cd.__w / 2, ty = cfg.cy + cd.__h / 2;
        const a = 1 - pc;
        const sc = lerp(Math.min(1, o.w / cd.__w * 0.9), 1, pc);
        cd.style.opacity = Math.min(1, pc * 2.2);
        cd.style.transform = `translate(${(o.cx - tx) * a}px,${(o.cy - ty) * a}px) perspective(2600px) rotateX(${a * cfg.rx}deg) rotateZ(${a * cfg.rz}deg) scale(${sc})`;
      });
      c.itEls.forEach((it, i) => {
        aparece(it, lt, 1.8 + i * 0.12, 2.5 + i * 0.12, { dx: 50, dy: 0 });
        const on = ativo === i && !fim; it.classList.toggle("on", on);
      });
    },
  });
}
// 6. Camadas: as 4 abas
cenaCamadas({
  id: "camadas-abas", cap: "Por dentro do site", titulo: "As quatro abas, uma a uma", dur: 15, imgH: 1080,
  texto: "O site é dividido em camadas. Cada aba tem uma função clara dentro da jornada do cidadão.",
  sx: 320, sy: 560, sw: 640, sh: 360, rx: 56, rz: -32, gap: 112, ix: 1180, iy: 250, iw: 640, t0: 4.2, por: 2.4, cx: 180, cy: 400, cw: 860,
  camadas: [
    { img: "../.work/img/aba-inicio.png", nome: "Início", desc: "Apresenta o cartório, a busca e os serviços mais procurados." },
    { img: "../.work/img/aba-servicos.png", nome: "Serviços", desc: "Todos os atendimentos, por assunto ou por especialidade." },
    { img: "../.work/img/aba-documentos.png", nome: "Documentos", desc: "O que levar, orientações e modelos para baixar." },
    { img: "../.work/img/aba-contato.png", nome: "Contato", desc: "Endereço, horário, telefone, WhatsApp, e-mail e rota no mapa." },
  ],
});
// 7. Camadas: anatomia da página inicial (preenchido após carregar secoes.json)
{
  const dados = await (await fetch("/.work/img/secoes.json")).json();
  const S = Object.fromEntries(dados.secoes.map((s) => [s.id, s]));
  const k = 520 / 1920;
  const fatias = [
    ["Cabeçalho e menu", "Marca, navegação e botão de WhatsApp sempre à vista.", 0, 116],
    ["Destaque", "Mensagem principal, fachada e chamadas para ação.", 116, 608 - 116],
    ["Busca e mais procurados", "Encontre o serviço pelas suas palavras.", 608, 1072 - 608],
    ["Especialidades", "Os cinco setores do cartório em cartões.", 1072, 2361 - 1072],
    ["Antes de vir", "Atalhos para documentos, orientações e modelos.", 2361, 2830 - 2361],
    ["Como chegar", "Endereço, horário, contatos e foto da fachada.", 2830, 3823 - 2830],
    ["Fale com o cartório", "Mensagem pronta em três passos.", 3823, 4619 - 3823],
    ["Rodapé", "Links úteis e informações institucionais.", 4619, dados.altura - 4619],
  ];
  cenaCamadas({
    id: "camadas-home", cap: "Por dentro do site", titulo: "Anatomia da página inicial", dur: 19, imgH: dados.altura,
    texto: "Cada seção da página tem um objetivo: informar, orientar ou levar o cidadão ao atendimento.",
    sx: 360, sy: 600, sw: 520, sh: 349, rx: 54, rz: -34, gap: 66, ix: 1130, iy: 160, iw: 700, t0: 4.0, por: 1.75, cx: 150, cy: 360, cw: 860,
    camadas: fatias.map(([nome, desc, y, h]) => ({ img: "../.work/img/home-inteira.png", nome, desc, y, h: Math.max(26, h * k) })),
  });
}

// 8. Página de serviço
cenaClipe({
  id: "servico", n: "06", cap: "Documentos antes de vir", titulo: "Venha preparado, sem idas e vindas", dur: 15,
  texto: "Cada serviço tem a sua lista de documentos, explicada em linguagem simples.",
  clip: "servico", from: 0.4, speed: 1.85,
  bullets: [{ t: 3.4, txt: "Marque o que já reuniu: a barra de progresso acompanha" }, { t: 8.4, txt: "Quando tudo está pronto, o site avisa: “Pode vir ao cartório”" }, { t: 11.2, txt: "Como funciona, prazo, custo e perguntas frequentes" }],
  cam: [{ t: 0, cx: 960, cy: 540, s: 1 }, { t: 3.0, cx: 960, cy: 540, s: 1 }, { t: 4.0, cx: 800, cy: 560, s: 1.2 }, { t: 10.2, cx: 800, cy: 560, s: 1.2 }, { t: 11.4, cx: 960, cy: 540, s: 1 }],
  marks: [],
});
// 9. Funil de contato
cenaClipe({
  id: "funil", n: "07", cap: "Fale com o cartório", titulo: "Atendimento em três passos", dur: 16.5,
  texto: "O cidadão responde a três perguntas e a mensagem sai pronta, por WhatsApp ou e-mail.",
  clip: "funil", from: 1.4, speed: 1.2,
  bullets: [{ t: 3.0, txt: "Nome, setor e serviço desejado" }, { t: 7.6, txt: "A mensagem é montada automaticamente" }, { t: 13.0, txt: "Botão “voltar ao topo” com anel de progresso de leitura" }],
  cam: [{ t: 0, cx: 960, cy: 540, s: 1 }, { t: 1.6, cx: 960, cy: 620, s: 1.3 }, { t: 12.4, cx: 960, cy: 620, s: 1.3 }, { t: 13.4, cx: 960, cy: 540, s: 1 }],
  marks: [
    { t0: 8.0, t1: 11.6, box: [1045, 529, 354, 120], text: "Mensagem pronta", n: 1, dx: 262, dy: 30 },
    { t0: 9.5, t1: 12.6, box: [1045, 705, 354, 52], text: "WhatsApp ou e-mail", n: 2, dx: 120, dy: 66 },
    { t0: 13.5, t1: 15.8, x: 1865, y: 950, dx: -330, dy: -90, text: "Voltar ao topo", n: 3 },
  ],
});

// 10. Celular e qualidades
add({
  id: "celular", cap: "Em qualquer tela", chrome: true, dur: 13.5,
  build(r, c) {
    el(`<div class="grande" style="top:104px;font-size:44px">Pensado para <span style="color:#f0d68f">todas as telas</span> e todas as pessoas</div>`, r);
    c.fone = el(`<div class="fone" style="left:759px;top:196px;transform-origin:50% 0"><div class="fone__tela"><img alt=""></div></div>`, r);
    c.img = c.fone.querySelector("img");
    const ic = {
      tela: '<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>',
      raio: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
      olho: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
      escudo: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.500-1 8-4 8-9V6z"/><path d="m9 12 2 2 4-4"/>',
    };
    const defs = [
      [90, 330, "tela", "Responsivo", "Adapta-se sozinho ao celular, ao tablet e ao computador."],
      [90, 600, "raio", "Leve e rápido", "Cerca de 50 KB no primeiro acesso, sem serviços de terceiros."],
      [1390, 330, "olho", "Acessível", "Aprovado na auditoria de acessibilidade WCAG 2.1 AA."],
      [1390, 600, "escudo", "Seguro", "Sem cookies, sem rastreadores e com política de segurança estrita."],
    ];
    c.cards = defs.map(([x, y, i, t, d]) => el(`<div class="card" style="left:${x}px;top:${y}px"><i><svg viewBox="0 0 24 24">${ic[i]}</svg></i><strong>${t}</strong><span>${d}</span></div>`, r));
  },
  update(lt, c) {
    const fi = Math.min(infos.celular.quadros - 1, Math.max(0, Math.round((0.2 + lt * 0.95) * infos.celular.fps)));
    setImg(c.img, frameUrl("celular", fi));
    const p = seg(lt, 0.3, 1.5, E.out5);
    c.fone.style.opacity = p; c.fone.style.transform = `translateY(${(1 - p) * 80}px) scale(${0.9})`;
    c.cards.forEach((cd, i) => aparece(cd, lt, 1.8 + i * 0.9, 2.6 + i * 0.9, { dx: i < 2 ? -50 : 50, dy: 0, f: E.out5 }));
  },
});

// 11. Fechamento
add({
  id: "fechamento", chrome: false, dur: 6.5,
  build(r, c) {
    c.selo = el(`<img src="../assets/selo.svg" class="abs" style="left:900px;top:250px;width:120px;height:120px">`, r);
    c.l1 = el(`<div class="grande" style="top:420px;font-size:74px">Mais clareza para o cidadão.</div>`, r);
    c.l2 = el(`<div class="grande" style="top:530px;font-size:74px;color:#f0d68f">Mais agilidade para o cartório.</div>`, r);
    c.l3 = el(`<div class="grande" style="top:680px;font-size:28px;font-weight:500;color:#cfe3f7;letter-spacing:.02em">Tabelionato de Jaboticaba · Cartório · Jaboticaba/RS</div>`, r);
  },
  update(lt, c) {
    const p = seg(lt, 0.2, 1.1, E.back); c.selo.style.opacity = seg(lt, 0.2, 0.8); c.selo.style.transform = `scale(${0.6 + 0.4 * p})`;
    aparece(c.l1, lt, 0.9, 1.7, { dy: 30, f: E.out5 }); aparece(c.l2, lt, 1.9, 2.7, { dy: 30, f: E.out5 }); aparece(c.l3, lt, 3.1, 3.9, { dy: 14 });
  },
});

// 12. Assinatura: Evolute
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
    const parte = (cl, bound) => { const d = el(`<div class="abs" style="left:0;top:0;width:1180px;height:360px"><img src="../assets/evolute-logo.png"></div>`, c.logo); d.__b = bound; return d; };
    c.barras = LOGO.bars.map(([a, b]) => { const d = parte("b", [a - 4, 40, b + 4, 345]); return d; });
    c.txt = parte("t", LOGO.texto);
    c.sub = parte("s", LOGO.sub);
    c.brilho = el(`<div class="brilho"></div>`, c.logo);
  },
  update(lt, c) {
    c.palavras.forEach((w, i) => aparece(w, lt, 0.5 + i * 0.28, 1.1 + i * 0.28, { dy: 24, f: E.out5 }));
    const clip = (n, [x0, y0, x1, y1], inset) => { n.style.clipPath = `inset(${y0 + inset.t}px ${1180 - x1 + inset.r}px ${360 - y1 + inset.b}px ${x0 + inset.l}px)`; };
    c.barras.forEach((b, i) => {
      const [x0, y0, x1, y1] = b.__b; const p = seg(lt, 2.0 + i * 0.35, 3.1 + i * 0.35, E.out5);
      clip(b, b.__b, { t: (1 - p) * (y1 - y0), r: 0, b: 0, l: 0 });
      b.style.opacity = p > 0 ? 1 : 0;
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

// ---------- cromo permanente (marca, capítulo e progresso) ----------
const chrome = el(`<div class="chrome" style="opacity:0"></div>`, stage);
chrome.innerHTML = `<div class="chrome__marca"><img src="../assets/selo.svg" alt=""><div>Tabelionato de Jaboticaba<small>APRESENTAÇÃO DO NOVO SITE</small></div></div><div class="chrome__cap"></div><div class="chrome__prog"><i></i></div>`;
const capEl = chrome.querySelector(".chrome__cap"), progI = chrome.querySelector(".chrome__prog i"), progBar = chrome.querySelector(".chrome__prog");
const TOTAL = T0 + 0.5;
const marcos = cenas.filter((c) => c.chrome && c.cap);
const pts = marcos.map((c) => el(`<div class="chrome__pt" style="left:${96 + (1728 * c.ini) / TOTAL}px"></div>`, chrome));

window.TOTAL_FRAMES = Math.ceil(TOTAL * FPS);
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
  await Promise.all(pend.splice(0));
  await document.fonts.ready;
};
window.__pronto = true;
