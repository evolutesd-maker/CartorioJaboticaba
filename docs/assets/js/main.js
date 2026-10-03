(function () {
"use strict";
var semMovimento = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
function normalizar(texto) {
return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}
function radical(palavra) {
if (palavra.length > 4 && /oes$|aes$/.test(palavra)) return palavra.replace(/(oes|aes)$/, "ao");
if (palavra.length > 4 && /ais$/.test(palavra)) return palavra.replace(/ais$/, "al");
if (palavra.length > 3 && /s$/.test(palavra)) return palavra.slice(0, -1);
return palavra;
}
var IRRELEVANTES = "a o as os um uma uns umas de da do das dos em no na nos nas para por com sem que e ou me meu minha meus minhas eu quero preciso precisa fazer como onde ter tirar pedir".split(" ");
function prepara(texto) {
return normalizar(texto).split(/[^a-z0-9]+/).filter(Boolean).map(radical);
}
function termosDaBusca(texto) {
var todos = prepara(texto);
var uteis = todos.filter(function (t) { return IRRELEVANTES.indexOf(t) === -1 && t.length > 1; });
return uteis.length ? uteis : todos;
}
function pontuar(termos, indice) {
return termos.filter(function (t) { return indice.indexOf(t) !== -1; }).length;
}
var botao = document.querySelector(".menu-btn");
var menu = document.getElementById("menu-principal");
if (botao && menu) {
var alternar = function (abrir) {
botao.setAttribute("aria-expanded", String(abrir));
menu.classList.toggle("is-aberto", abrir);
};
botao.addEventListener("click", function () {
alternar(botao.getAttribute("aria-expanded") !== "true");
});
document.addEventListener("keydown", function (e) {
if (e.key === "Escape" && botao.getAttribute("aria-expanded") === "true") {
alternar(false);
botao.focus();
}
});
}
var topo = document.querySelector(".topo");
if (topo) {
var marcarRolagem = function () { topo.classList.toggle("topo--rolou", window.scrollY > 8); };
window.addEventListener("scroll", marcarRolagem, { passive: true });
marcarRolagem();
}
var revelaveis = document.querySelectorAll("[data-reveal]");
function limpar(el) {
var feito = false;
var terminar = function () { if (!feito) { feito = true; el.removeAttribute("data-reveal"); } };
el.addEventListener("transitionend", function (e) { if (e.propertyName === "opacity") terminar(); });
setTimeout(terminar, 1600);
}
if (!("IntersectionObserver" in window) || semMovimento) {
revelaveis.forEach(function (el) { el.classList.add("is-visivel"); el.removeAttribute("data-reveal"); });
} else {
var io = new IntersectionObserver(function (entradas) {
entradas.forEach(function (en) {
if (!en.isIntersecting) return;
en.target.classList.add("is-visivel");
io.unobserve(en.target);
limpar(en.target);
});
}, { rootMargin: "0px 0px -6% 0px", threshold: 0.06 });
revelaveis.forEach(function (el) { io.observe(el); });
}
document.querySelectorAll("[data-carrossel]").forEach(function (car) {
var pista = car.querySelector(".carrossel__pista");
var anterior = car.querySelector("[data-car-prev]");
var proximo = car.querySelector("[data-car-next]");
if (!pista) return;
var agendado = false;
function atualizar() {
agendado = false;
var max = pista.scrollWidth - pista.clientWidth;
var esq = pista.scrollLeft > 4;
var dir = pista.scrollLeft < max - 4;
pista.setAttribute("data-fade", (esq ? "esq " : "") + (dir ? "dir" : ""));
if (anterior) anterior.disabled = !esq;
if (proximo) proximo.disabled = !dir;
}
function agendar() { if (!agendado) { agendado = true; requestAnimationFrame(atualizar); } }
function mover(sentido) {
pista.scrollBy({ left: sentido * pista.clientWidth * 0.85, behavior: semMovimento ? "auto" : "smooth" });
}
pista.addEventListener("scroll", agendar, { passive: true });
window.addEventListener("resize", agendar);
if (anterior) anterior.addEventListener("click", function () { mover(-1); });
if (proximo) proximo.addEventListener("click", function () { mover(1); });
pista.addEventListener("keydown", function (e) {
if (e.target !== pista) return;
if (e.key === "ArrowRight") { e.preventDefault(); mover(1); }
if (e.key === "ArrowLeft") { e.preventDefault(); mover(-1); }
});
var inicioX = 0, inicioScroll = 0, apertado = false, arrastou = false;
pista.addEventListener("pointerdown", function (e) {
if (e.pointerType !== "mouse" || e.button !== 0) return;
apertado = true; arrastou = false;
inicioX = e.clientX; inicioScroll = pista.scrollLeft;
});
pista.addEventListener("pointermove", function (e) {
if (!apertado) return;
var dx = e.clientX - inicioX;
if (!arrastou && Math.abs(dx) > 6) {
arrastou = true;
pista.classList.add("is-arrastando");
try { pista.setPointerCapture(e.pointerId); } catch (_) {  }
}
if (arrastou) pista.scrollLeft = inicioScroll - dx;
});
function soltar() {
if (!apertado) return;
apertado = false;
if (arrastou) setTimeout(function () { pista.classList.remove("is-arrastando"); agendar(); }, 0);
}
pista.addEventListener("pointerup", soltar);
pista.addEventListener("pointercancel", soltar);
atualizar();
});
var campoBusca = document.querySelector("[data-busca-input]");
var dadosBusca = document.getElementById("indice-busca");
if (campoBusca && dadosBusca) {
var servicos = [];
try { servicos = JSON.parse(dadosBusca.textContent); } catch (_) { servicos = []; }
servicos.forEach(function (s) { s.i = prepara(s.b).join(" "); });
var painel = document.querySelector("[data-busca-painel]");
var lista = document.querySelector("[data-busca-lista]");
var vazio = document.querySelector("[data-busca-vazio]");
var status = document.querySelector("[data-busca-status]");
var ativo = -1;
var opcoes = [];
function abrir(sim) {
painel.hidden = !sim;
campoBusca.setAttribute("aria-expanded", String(sim));
if (!sim) { ativo = -1; campoBusca.removeAttribute("aria-activedescendant"); }
}
function marcar(i) {
opcoes.forEach(function (o, k) { o.setAttribute("aria-selected", k === i ? "true" : "false"); });
ativo = i;
if (i >= 0) {
campoBusca.setAttribute("aria-activedescendant", opcoes[i].id);
opcoes[i].scrollIntoView({ block: "nearest" });
} else campoBusca.removeAttribute("aria-activedescendant");
}
function ir(el) { if (el && el.getAttribute("data-url")) window.location.href = el.getAttribute("data-url"); }
function desenhar() {
var termos = termosDaBusca(campoBusca.value);
if (!campoBusca.value.trim()) { abrir(false); status.textContent = ""; return; }
var pontos = servicos.map(function (s) { return pontuar(termos, s.i); });
var melhor = Math.max.apply(null, pontos.concat([0]));
var achados = [];
if (melhor > 0) servicos.forEach(function (s, i) { if (pontos[i] === melhor) achados.push(s); });
achados = achados.slice(0, 8);
lista.innerHTML = "";
achados.forEach(function (s, i) {
var li = document.createElement("li");
li.className = "busca__op";
li.id = "busca-op-" + i;
li.setAttribute("role", "option");
li.setAttribute("aria-selected", "false");
li.setAttribute("data-url", s.u);
var texto = document.createElement("span");
var t = document.createElement("strong"); t.textContent = s.t;
var tag = document.createElement("span"); tag.className = "tag"; tag.textContent = s.e;
texto.appendChild(t); texto.appendChild(tag);
li.appendChild(texto);
li.insertAdjacentHTML("beforeend", '<svg class="icone" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M9 5l7 7-7 7"/></svg>');
lista.appendChild(li);
});
opcoes = Array.prototype.slice.call(lista.children);
lista.hidden = achados.length === 0;
vazio.hidden = achados.length !== 0;
ativo = -1;
abrir(true);
status.textContent = achados.length
? achados.length + (achados.length === 1 ? " serviço encontrado." : " serviços encontrados.") + " Use as setas para escolher."
: "Nenhum serviço encontrado.";
}
campoBusca.addEventListener("input", desenhar);
campoBusca.addEventListener("focus", function () { if (campoBusca.value.trim()) desenhar(); });
campoBusca.addEventListener("keydown", function (e) {
var aberto = !painel.hidden;
if (e.key === "ArrowDown" && opcoes.length) { e.preventDefault(); if (!aberto) abrir(true); marcar((ativo + 1) % opcoes.length); }
else if (e.key === "ArrowUp" && opcoes.length) { e.preventDefault(); marcar(ativo <= 0 ? opcoes.length - 1 : ativo - 1); }
else if (e.key === "Enter") { if (aberto && opcoes.length) { e.preventDefault(); ir(opcoes[ativo >= 0 ? ativo : 0]); } else e.preventDefault(); }
else if (e.key === "Escape") { if (aberto) { e.preventDefault(); abrir(false); } }
});
lista.addEventListener("mousedown", function (e) { e.preventDefault(); });
lista.addEventListener("click", function (e) { var op = e.target.closest(".busca__op"); if (op) ir(op); });
lista.addEventListener("mousemove", function (e) {
var op = e.target.closest(".busca__op");
if (op) marcar(opcoes.indexOf(op));
});
document.addEventListener("click", function (e) {
if (!e.target.closest("[data-busca-servicos]")) abrir(false);
});
document.querySelectorAll('a[href$="#encontrar"]').forEach(function (a) {
a.addEventListener("click", function () {
setTimeout(function () { campoBusca.focus({ preventScroll: true }); }, semMovimento ? 0 : 450);
});
});
}
document.querySelectorAll("[data-finder]").forEach(function (finder) {
var campo = finder.querySelector("[data-finder-input]");
if (!campo) return;
var grupos = finder.querySelectorAll("[data-finder-grupo]");
var itens = finder.querySelectorAll("[data-finder-item]");
var vazio = finder.querySelector("[data-finder-vazio]");
var status = finder.querySelector("[data-finder-status]");
var indice = Array.prototype.map.call(itens, function (item) {
return prepara(item.getAttribute("data-busca") || "").join(" ");
});
function filtrar() {
var termos = termosDaBusca(campo.value);
var pontos = Array.prototype.map.call(itens, function (_, i) { return pontuar(termos, indice[i]); });
var melhor = termos.length ? Math.max.apply(null, pontos) : 0;
var visiveis = 0;
itens.forEach(function (item, i) {
var ok = !termos.length || (melhor > 0 && pontos[i] === melhor);
item.hidden = !ok;
if (ok) visiveis++;
});
grupos.forEach(function (grupo) {
grupo.hidden = !grupo.querySelector("[data-finder-item]:not([hidden])");
});
if (vazio) vazio.hidden = visiveis !== 0;
if (status) {
if (!termos.length) status.textContent = "";
else if (visiveis === 0) status.textContent = "Nenhum serviço encontrado.";
else status.textContent = visiveis + (visiveis === 1 ? " serviço encontrado." : " serviços encontrados.");
}
}
campo.addEventListener("input", filtrar);
campo.addEventListener("keydown", function (e) { if (e.key === "Enter") e.preventDefault(); });
});
var painelDocs = document.querySelector("[data-checklist]");
if (painelDocs) {
var caixas = painelDocs.querySelectorAll('.checklist input[type="checkbox"]');
var rotulo = painelDocs.querySelector("[data-progresso-texto]");
var barra = painelDocs.querySelector("[data-progresso-barra]");
var chave = "cj:docs:" + location.pathname;
var marcados = [];
try { marcados = JSON.parse(localStorage.getItem(chave) || "[]"); } catch (_) { marcados = []; }
var pintar = function () {
var n = 0;
caixas.forEach(function (c) { if (c.checked) n++; });
if (rotulo) rotulo.textContent = n === caixas.length && n > 0 ? "Tudo reunido. Pode vir ao cartório." : n + " de " + caixas.length + " reunidos";
if (barra) barra.style.width = (caixas.length ? (n / caixas.length) * 100 : 0) + "%";
};
caixas.forEach(function (c, i) {
c.checked = marcados.indexOf(i) !== -1;
c.addEventListener("change", function () {
var atuais = [];
caixas.forEach(function (x, k) { if (x.checked) atuais.push(k); });
try { localStorage.setItem(chave, JSON.stringify(atuais)); } catch (_) {  }
pintar();
});
});
pintar();
}
var mouseFino = window.matchMedia && window.matchMedia("(pointer: fine)").matches;
if (!semMovimento) {
var fotoEl = document.querySelector(".hero__foto");
if (fotoEl && mouseFino) {
fotoEl.addEventListener("pointermove", function (e) {
var r = fotoEl.getBoundingClientRect();
fotoEl.style.setProperty("--mx", ((e.clientX - r.left) / r.width - 0.5) * 2);
fotoEl.style.setProperty("--my", ((e.clientY - r.top) / r.height - 0.5) * 2);
});
fotoEl.addEventListener("pointerleave", function () { fotoEl.style.setProperty("--mx", 0); fotoEl.style.setProperty("--my", 0); });
}
if (mouseFino) {
document.querySelectorAll(".hero__acoes .btn, .funil__canais .btn").forEach(function (btn) {
btn.addEventListener("pointermove", function (e) {
var r = btn.getBoundingClientRect();
btn.style.translate = ((e.clientX - r.left - r.width / 2) * 0.14).toFixed(1) + "px " + ((e.clientY - r.top - r.height / 2) * 0.22).toFixed(1) + "px";
});
btn.addEventListener("pointerleave", function () { btn.style.translate = ""; });
});
}
if (mouseFino) {
document.querySelectorAll(".esp-card, .ato-card, .cr-card").forEach(function (card) {
card.addEventListener("pointermove", function (e) {
var r = card.getBoundingClientRect();
var x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
card.classList.add("is-inclinando");
card.style.setProperty("--ry", (x * 7).toFixed(2) + "deg");
card.style.setProperty("--rx", (-y * 7).toFixed(2) + "deg");
card.style.setProperty("--sx", (e.clientX - r.left).toFixed(0) + "px");
card.style.setProperty("--sy", (e.clientY - r.top).toFixed(0) + "px");
});
card.addEventListener("pointerleave", function () {
card.classList.remove("is-inclinando");
["--rx", "--ry", "--sx", "--sy"].forEach(function (v) { card.style.removeProperty(v); });
});
});
}
}
var funilEl = document.querySelector("[data-funil]");
var funilDados = document.getElementById("dados-funil");
if (funilEl && funilDados) {
var d = JSON.parse(funilDados.textContent);
var fNome = funilEl.querySelector("[data-f-nome]"), fEsp = funilEl.querySelector("[data-f-esp]"), fAto = funilEl.querySelector("[data-f-ato]");
var fMsg = funilEl.querySelector("[data-f-msg]"), fDica = funilEl.querySelector("[data-f-dica]");
var bZap = funilEl.querySelector("[data-f-whats]"), bMail = funilEl.querySelector("[data-f-email]");
funilEl.querySelector("form").addEventListener("submit", function (e) { e.preventDefault(); });
d.esps.forEach(function (e, i) { var o = document.createElement("option"); o.value = i; o.textContent = e.nome; fEsp.appendChild(o); });
function minuscula(t) { return t.charAt(0).toLowerCase() + t.slice(1); }
function atual() {
var nome = fNome.value.replace(/[^\p{L}\p{M}\s'.-]/gu, "").replace(/\s+/g, " ").trim().slice(0, 80);
var e = fEsp.value !== "" ? d.esps[+fEsp.value] : null;
var a = e && fAto.value !== "" ? e.atos[+fAto.value] : null;
return { nome: nome, esp: e, ato: a, pronto: !!(nome && e && a) };
}
function mensagem(x) {
return "Olá, sou " + x.nome + ". Gostaria de falar com o setor de " + x.esp.nome + ", pois preciso de " + minuscula(x.ato.d) + ". Aguardo atendimento.";
}
function marcar(el, feito) { el.closest(".funil__passo").classList.toggle("is-feito", feito); }
function liberar(b, sim) { b.setAttribute("aria-disabled", sim ? "false" : "true"); }
function atualizar() {
var x = atual();
marcar(fNome, !!x.nome); marcar(fEsp, !!x.esp); marcar(fAto, !!x.ato);
if (x.pronto) {
var m = mensagem(x);
fMsg.textContent = m; fMsg.classList.remove("is-vazia");
bZap.href = d.wa ? "https://wa.me/" + d.wa + "?text=" + encodeURIComponent(m) : "#falar";
bMail.href = "mailto:" + d.mail + "?subject=" + encodeURIComponent("Atendimento: " + x.ato.d) + "&body=" + encodeURIComponent(m);
fDica.textContent = "Tudo pronto. Escolha por onde quer falar.";
} else {
fMsg.textContent = "Preencha os passos ao lado e a sua mensagem aparece aqui.";
fMsg.classList.add("is-vazia");
bZap.href = "#falar"; bMail.href = "#falar";
fDica.textContent = "";
}
liberar(bZap, x.pronto && !!d.wa); liberar(bMail, x.pronto);
}
fEsp.addEventListener("change", function () {
fAto.innerHTML = "";
var ph = document.createElement("option"); ph.value = ""; fAto.appendChild(ph);
if (fEsp.value === "") { ph.textContent = "Escolha antes a especialidade"; fAto.disabled = true; }
else {
ph.textContent = "Escolha o documento ou serviço"; fAto.disabled = false;
d.esps[+fEsp.value].atos.forEach(function (a, i) { var o = document.createElement("option"); o.value = i; o.textContent = a.t; fAto.appendChild(o); });
fAto.focus();
}
atualizar();
});
fNome.addEventListener("input", atualizar); fAto.addEventListener("change", atualizar);
[bZap, bMail].forEach(function (b) {
b.addEventListener("click", function (e) {
if (b.getAttribute("aria-disabled") === "true") {
e.preventDefault();
var x = atual();
fDica.textContent = !x.nome ? "Diga primeiro o seu nome." : !x.esp ? "Escolha o setor." : !x.ato ? "Escolha o documento ou serviço." : "Este canal ainda não está disponível.";
(!x.nome ? fNome : !x.esp ? fEsp : fAto).focus();
}
});
});
atualizar();
}
var voltar = document.querySelector(".topo-voltar");
if (voltar) {
var anel = voltar;
voltar.hidden = false;
var pendente = false;
var medir = function () {
pendente = false;
var altura = document.documentElement.scrollHeight - window.innerHeight;
anel.style.setProperty("--prog", altura > 0 ? Math.min(100, (window.scrollY / altura) * 100).toFixed(1) : 0);
voltar.classList.toggle("is-visivel", window.scrollY > 700);
};
window.addEventListener("scroll", function () { if (!pendente) { pendente = true; requestAnimationFrame(medir); } }, { passive: true });
window.addEventListener("resize", medir);
voltar.addEventListener("click", function () {
window.scrollTo({ top: 0, behavior: semMovimento ? "auto" : "smooth" });
var marca = document.querySelector(".marca");
if (marca) marca.focus({ preventScroll: true });
});
medir();
}
document.querySelectorAll("[data-imprimir]").forEach(function (b) {
b.addEventListener("click", function () { window.print(); });
});
})();