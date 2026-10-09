/* Melhorias progressivas: o site inteiro funciona sem JavaScript.
   Aqui entram: menu do celular, cabeçalho que reage à rolagem, revelar ao rolar, carrossel,
   busca com sugestões, filtro das listas de serviços e a lista de documentos "marcável". */
(function () {
  "use strict";

  var semMovimento = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---- Utilidades de busca ------------------------------------------------
  // Normaliza (sem acento, minúsculas) e reduz plural simples: "certidões" encontra "certidão".
  function normalizar(texto) {
    return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  }
  function radical(palavra) {
    if (palavra.length > 4 && /oes$|aes$/.test(palavra)) return palavra.replace(/(oes|aes)$/, "ao");
    if (palavra.length > 4 && /ais$/.test(palavra)) return palavra.replace(/ais$/, "al");
    if (palavra.length > 3 && /s$/.test(palavra)) return palavra.slice(0, -1);
    return palavra;
  }
  // Palavras comuns que não ajudam a achar o serviço ("meu filho nasceu" → "filho nasceu").
  var IRRELEVANTES = "a o as os um uma uns umas de da do das dos em no na nos nas para por com sem que e ou me meu minha meus minhas eu quero preciso precisa fazer como onde ter tirar pedir".split(" ");
  function prepara(texto) {
    return normalizar(texto).split(/[^a-z0-9]+/).filter(Boolean).map(radical);
  }
  function termosDaBusca(texto) {
    var todos = prepara(texto);
    var uteis = todos.filter(function (t) { return IRRELEVANTES.indexOf(t) === -1 && t.length > 1; });
    return uteis.length ? uteis : todos;
  }
  /** Quantas palavras da busca aparecem no texto indexado. */
  function pontuar(termos, indice) {
    return termos.filter(function (t) { return indice.indexOf(t) !== -1; }).length;
  }

  // ---- Menu (celular) --------------------------------------------------
  // Fecha ao tocar no botão, fora do menu, ao arrastar para o lado, com Esc e com o "voltar" do celular.
  var botao = document.querySelector(".menu-btn");
  var menu = document.getElementById("menu-principal");
  if (botao && menu) {
    var noHistorico = false; // true quando o menu aberto tem uma entrada própria no histórico
    var estaAberto = function () { return botao.getAttribute("aria-expanded") === "true"; };
    var alternar = function (abrir, viaHistorico) {
      botao.setAttribute("aria-expanded", String(abrir));
      menu.classList.toggle("is-aberto", abrir);
      var topo = menu.closest(".topo");
      if (abrir) {
        if (topo) {
          var y = topo.getBoundingClientRect().top;
          if (y > 0) window.scrollBy({ top: y, behavior: "instant" });
        }
        if (!noHistorico) {
          try { history.pushState({ menu: 1 }, ""); noHistorico = true; } catch (_) { /* sem histórico: só não fecha com "voltar" */ }
        }
      } else if (noHistorico && !viaHistorico) {
        noHistorico = false;
        history.back();
      }
    };
    botao.addEventListener("click", function () { alternar(!estaAberto()); });
    // "Voltar" (botão ou gesto do sistema) fecha o menu em vez de sair da página.
    window.addEventListener("popstate", function () {
      noHistorico = false;
      if (estaAberto()) alternar(false, true);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && estaAberto()) {
        alternar(false);
        botao.focus();
      }
    });
    // Toque fora do cabeçalho: só fecha o menu, sem acionar o que estava embaixo.
    document.addEventListener("click", function (e) {
      if (estaAberto() && !e.target.closest(".topo")) {
        e.preventDefault();
        e.stopPropagation();
        alternar(false);
      }
    }, true);
    // Link do menu: desfaz a entrada do histórico antes de navegar, para o "voltar" da próxima página não precisar de dois toques.
    menu.addEventListener("click", function (e) {
      var a = e.target.closest("a[href]");
      if (!a || !noHistorico || a.target || a.hasAttribute("download") || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var destino = a.href;
      e.preventDefault();
      var ir = function () { window.removeEventListener("popstate", ir); location.href = destino; };
      window.addEventListener("popstate", ir);
      setTimeout(ir, 400);
      noHistorico = false;
      history.back();
    });
    // Arrastar para o lado fecha o menu.
    var toqueX = 0, toqueY = 0;
    document.addEventListener("touchstart", function (e) {
      if (e.touches.length === 1) { toqueX = e.touches[0].clientX; toqueY = e.touches[0].clientY; }
    }, { passive: true });
    document.addEventListener("touchend", function (e) {
      if (!estaAberto() || !e.changedTouches.length) return;
      var dx = e.changedTouches[0].clientX - toqueX, dy = e.changedTouches[0].clientY - toqueY;
      if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.5) alternar(false);
    }, { passive: true });
  }

  // ---- Submenu "O que você procura?" -------------------------------------------
  document.querySelectorAll("[data-sub]").forEach(function (sub) {
    var link = sub.querySelector("[data-sub-link]");
    var painel = sub.querySelector(".submenu");
    if (!link || !painel) return;
    var botaoSub = document.createElement("button");
    botaoSub.type = "button";
    botaoSub.className = link.className;
    botaoSub.setAttribute("aria-expanded", "false");
    botaoSub.setAttribute("aria-controls", painel.id);
    if (link.getAttribute("aria-current")) botaoSub.setAttribute("aria-current", link.getAttribute("aria-current"));
    while (link.firstChild) botaoSub.appendChild(link.firstChild);
    link.replaceWith(botaoSub);

    function alternarSub(abrir) {
      sub.classList.toggle("is-aberto", abrir);
      botaoSub.setAttribute("aria-expanded", String(abrir));
    }
    botaoSub.addEventListener("click", function () { alternarSub(!sub.classList.contains("is-aberto")); });
    document.addEventListener("click", function (e) { if (!sub.contains(e.target)) alternarSub(false); });
    sub.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && sub.classList.contains("is-aberto")) { e.stopPropagation(); alternarSub(false); botaoSub.focus(); }
    });
    sub.addEventListener("focusout", function (e) { if (e.relatedTarget && !sub.contains(e.relatedTarget)) alternarSub(false); });
    sub.querySelectorAll("[data-abrir-paleta]").forEach(function (b) { b.addEventListener("click", function () { alternarSub(false); }); });
  });

  // ---- Cabeçalho reage à rolagem ---------------------------------------
  var topo = document.querySelector(".topo");
  if (topo) {
    var marcarRolagem = function () { topo.classList.toggle("topo--rolou", window.scrollY > 8); };
    window.addEventListener("scroll", marcarRolagem, { passive: true });
    marcarRolagem();
  }

  // ---- Revelar ao rolar ------------------------------------------------
  var revelaveis = document.querySelectorAll("[data-reveal]");
  function limpar(el) {
    // Depois da animação, tira o atributo para o hover do elemento voltar a funcionar normalmente.
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

  // ---- Avisos discretos (toast) ------------------------------------------------
  var areaAvisos = null;
  function aviso(texto) {
    if (!areaAvisos) {
      areaAvisos = document.createElement("div");
      areaAvisos.className = "avisos";
      areaAvisos.setAttribute("role", "status");
      areaAvisos.setAttribute("aria-live", "polite");
      (document.querySelector('aside[aria-label^="Atalhos"]') || document.body).appendChild(areaAvisos);
    }
    var t = document.createElement("p");
    t.className = "aviso";
    t.textContent = texto;
    areaAvisos.appendChild(t);
    requestAnimationFrame(function () { t.classList.add("is-visivel"); });
    setTimeout(function () { t.classList.remove("is-visivel"); setTimeout(function () { t.remove(); }, 400); }, 3500);
  }

  // ---- Índice de serviços ---------------------------------------------------------
  // Na página inicial ele vem embutido; nas demais, é carregado só quando alguém abre a busca.
  var indiceServicos = null;
  var carregandoIndice = false;
  var esperando = [];
  function prepararIndice(lista, raiz) {
    return lista.map(function (s) { return { t: s.t, e: s.e, u: s.x ? s.u : raiz + s.u, x: s.x, d: s.d, i: prepara(s.b).join(" ") }; });
  }
  function obterIndice(pronto) {
    if (indiceServicos) return pronto(indiceServicos);
    var embutido = document.getElementById("indice-busca");
    if (embutido) {
      var bruto = [];
      try { bruto = JSON.parse(embutido.textContent); } catch (_) { bruto = []; }
      indiceServicos = prepararIndice(bruto, "");
      return pronto(indiceServicos);
    }
    var caixa = document.querySelector("[data-paleta]");
    if (!caixa) return pronto([]);
    esperando.push(pronto);
    if (carregandoIndice) return;
    carregandoIndice = true;
    var sc = document.createElement("script");
    sc.src = caixa.getAttribute("data-indice");
    var terminar = function (lista) {
      indiceServicos = prepararIndice(lista, caixa.getAttribute("data-raiz") || "");
      esperando.splice(0).forEach(function (f) { f(indiceServicos); });
    };
    sc.onload = function () { terminar(window.CJ_INDICE || []); };
    sc.onerror = function () { carregandoIndice = false; terminar([]); indiceServicos = null; };
    document.head.appendChild(sc);
  }

  // ---- Busca com sugestões (combobox acessível), usada no hero e na paleta -----------
  function montarBusca(cfg) {
    var campo = cfg.campo, painel = cfg.painel, lista = cfg.lista, vazio = cfg.vazio, status = cfg.status;
    var ativo = -1, opcoes = [];
    var prefixo = cfg.prefixo;

    function abrir(sim) {
      if (cfg.fixo) return;
      painel.hidden = !sim;
      campo.setAttribute("aria-expanded", String(sim));
      if (!sim) { ativo = -1; campo.removeAttribute("aria-activedescendant"); }
    }
    function marcar(i) {
      opcoes.forEach(function (o, k) { o.setAttribute("aria-selected", k === i ? "true" : "false"); });
      ativo = i;
      if (i >= 0) {
        campo.setAttribute("aria-activedescendant", opcoes[i].id);
        opcoes[i].scrollIntoView({ block: "nearest" });
      } else campo.removeAttribute("aria-activedescendant");
    }
    function ir(el) {
      if (!el || !el.getAttribute("data-url")) return;
      if (el.getAttribute("data-externo")) window.open(el.getAttribute("data-url"), "_blank", "noopener,noreferrer");
      else window.location.href = el.getAttribute("data-url");
    }

    function mostrar(achados, mensagem) {
      lista.innerHTML = "";
      achados.forEach(function (s, i) {
        var li = document.createElement("li");
        li.className = "busca__op";
        li.id = prefixo + "-op-" + i;
        li.setAttribute("role", "option");
        li.setAttribute("aria-selected", "false");
        li.setAttribute("data-url", s.u);
        if (s.x) li.setAttribute("data-externo", "1");
        var texto = document.createElement("span");
        var t = document.createElement("strong"); t.textContent = s.t;
        var tag = document.createElement("span"); tag.className = "tag"; tag.textContent = s.e;
        texto.appendChild(t); texto.appendChild(tag);
        li.appendChild(texto);
        if (s.x) li.insertAdjacentHTML("beforeend", '<svg class="icone" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>');
        else li.insertAdjacentHTML("beforeend", '<svg class="icone" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M9 5l7 7-7 7"/></svg>');
        if (s.x) { var av = document.createElement("span"); av.className = "sr-only"; av.textContent = " (abre em outro site)"; t.appendChild(av); }
        lista.appendChild(li);
      });
      opcoes = Array.prototype.slice.call(lista.children);
      lista.hidden = achados.length === 0;
      vazio.hidden = achados.length !== 0 || !!cfg.semVazio;
      ativo = -1;
      campo.removeAttribute("aria-activedescendant");
      status.textContent = mensagem;
    }

    function desenhar() {
      obterIndice(function (indice) {
        var consulta = campo.value.trim();
        if (!consulta) {
          if (cfg.sugestoes) {
            mostrar(indice.filter(function (s) { return s.d; }).slice(0, 6), "Serviços mais procurados.");
            vazio.hidden = true;
          } else { abrir(false); status.textContent = ""; }
          return;
        }
        var termos = termosDaBusca(campo.value);
        var pontos = indice.map(function (s) { return pontuar(termos, s.i); });
        var melhor = Math.max.apply(null, pontos.concat([0]));
        var achados = [];
        if (melhor > 0) indice.forEach(function (s, i) { if (pontos[i] === melhor) achados.push(s); });
        achados = achados.slice(0, 10);
        mostrar(achados, achados.length
          ? achados.length + (achados.length === 1 ? " serviço encontrado." : " serviços encontrados.") + " Use as setas para escolher."
          : "Nenhum serviço encontrado.");
        abrir(true);
      });
    }

    campo.addEventListener("input", desenhar);
    campo.addEventListener("focus", function () { if (campo.value.trim()) desenhar(); });
    campo.addEventListener("keydown", function (e) {
      var aberto = cfg.fixo || !painel.hidden;
      if (e.key === "ArrowDown" && opcoes.length) { e.preventDefault(); if (!aberto) abrir(true); marcar((ativo + 1) % opcoes.length); }
      else if (e.key === "ArrowUp" && opcoes.length) { e.preventDefault(); marcar(ativo <= 0 ? opcoes.length - 1 : ativo - 1); }
      else if (e.key === "Enter") { e.preventDefault(); if (aberto && opcoes.length) ir(opcoes[ativo >= 0 ? ativo : 0]); }
      else if (e.key === "Escape" && !cfg.fixo && aberto) { e.preventDefault(); abrir(false); }
    });
    // mousedown (e não click) mantém o foco no campo e evita fechar antes de navegar.
    lista.addEventListener("mousedown", function (e) { e.preventDefault(); });
    lista.addEventListener("click", function (e) { var op = e.target.closest(".busca__op"); if (op) ir(op); });
    lista.addEventListener("mousemove", function (e) {
      var op = e.target.closest(".busca__op");
      if (op) marcar(opcoes.indexOf(op));
    });
    return { abrir: abrir, desenhar: desenhar, fechar: function () { abrir(false); } };
  }

  // Busca do hero (página inicial)
  var campoBusca = document.querySelector("[data-busca-input]");
  if (campoBusca) {
    var buscaHero = montarBusca({
      campo: campoBusca, prefixo: "busca",
      painel: document.querySelector("[data-busca-painel]"), lista: document.querySelector("[data-busca-lista]"),
      vazio: document.querySelector("[data-busca-vazio]"), status: document.querySelector("[data-busca-status]"),
    });
    document.addEventListener("click", function (e) {
      if (!e.target.closest("[data-busca-servicos]")) buscaHero.fechar();
    });
    // O botão "Encontrar um serviço" leva ao campo e já o deixa pronto para digitar.
    document.querySelectorAll('a[href$="#encontrar"]').forEach(function (a) {
      a.addEventListener("click", function () {
        setTimeout(function () { campoBusca.focus({ preventScroll: true }); }, semMovimento ? 0 : 450);
      });
    });
  }

  // ---- Paleta de busca (atalhos "/" e Ctrl/⌘+K, em qualquer página) --------------------
  var paleta = document.querySelector("[data-paleta]");
  if (paleta && typeof paleta.showModal === "function") {
    var campoPaleta = paleta.querySelector("[data-paleta-input]");
    var buscaPaleta = montarBusca({
      campo: campoPaleta, prefixo: "paleta", fixo: true, sugestoes: true,
      painel: paleta.querySelector("[data-paleta-painel]"), lista: paleta.querySelector("[data-paleta-lista]"),
      vazio: paleta.querySelector("[data-paleta-vazio]"), status: paleta.querySelector("[data-paleta-status]"),
    });
    var abrirPaleta = function () {
      if (paleta.open) return;
      campoPaleta.value = "";
      paleta.showModal();
      buscaPaleta.desenhar();
      campoPaleta.focus();
    };
    document.querySelectorAll("[data-abrir-paleta]").forEach(function (b) { b.hidden = false; b.addEventListener("click", abrirPaleta); });
    paleta.addEventListener("click", function (e) { if (e.target === paleta) paleta.close(); }); // clique no fundo fecha
    document.addEventListener("keydown", function (e) {
      var digitando = e.target.closest && e.target.closest("input, textarea, select, [contenteditable]");
      if ((e.key === "k" || e.key === "K") && (e.ctrlKey || e.metaKey) && !e.altKey) { e.preventDefault(); paleta.open ? paleta.close() : abrirPaleta(); }
      else if (e.key === "/" && !digitando && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); abrirPaleta(); }
    });
  }

  // ---- "Aberto agora" ----------------------------------------------------------------
  var DIAS = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];
  function hm(min) { var h = Math.floor(min / 60), m = min % 60; return h + "h" + (m ? (m < 10 ? "0" : "") + m : ""); }
  function situacao(cfg, agora) {
    var f = new Intl.DateTimeFormat("en-US", { timeZone: cfg.z, weekday: "short", hour: "numeric", minute: "numeric", hourCycle: "h23" }).formatToParts(agora);
    var v = {}; f.forEach(function (p) { v[p.type] = p.value; });
    var dia = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(v.weekday);
    var min = (+v.hour % 24) * 60 + +v.minute;
    if (cfg.d.indexOf(dia) !== -1) {
      for (var i = 0; i < cfg.t.length; i++) {
        if (min >= cfg.t[i][0] && min < cfg.t[i][1]) return { aberto: true, texto: "Fecha às " + hm(cfg.t[i][1]) };
        if (min < cfg.t[i][0]) return { aberto: false, texto: "Abre hoje às " + hm(cfg.t[i][0]) };
      }
    }
    for (var k = 1; k <= 7; k++) {
      var d = (dia + k) % 7;
      if (cfg.d.indexOf(d) !== -1) return { aberto: false, texto: "Abre " + (k === 1 ? "amanhã" : DIAS[d]) + " às " + hm(cfg.t[0][0]) };
    }
    return null;
  }
  var blocosAberto = [];
  document.querySelectorAll("[data-expediente]").forEach(function (el) {
    try { blocosAberto.push({ el: el, cfg: JSON.parse(el.getAttribute("data-expediente")) }); } catch (_) { /* sem expediente válido: mantém o texto estático */ }
  });
  function atualizarAberto() {
    blocosAberto.forEach(function (b) {
      var r = situacao(b.cfg, new Date());
      if (!r) return;
      b.el.setAttribute("data-estado", r.aberto ? "aberto" : "fechado");
      var tit = b.el.querySelector("[data-aberto-titulo]"), det = b.el.querySelector("[data-aberto-detalhe]");
      if (tit) tit.textContent = r.aberto ? "Aberto agora" : "Fechado agora";
      if (det) det.textContent = r.texto;
    });
  }
  if (blocosAberto.length) { atualizarAberto(); setInterval(atualizarAberto, 60000); }

  // ---- Filtro das listas de serviços (páginas Serviços e Documentos) -----------
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

    // Mostra os serviços que combinam com mais palavras digitadas. Se algum combina
    // com todas, só esses aparecem; senão, os que combinam com o maior número possível.
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

  // ---- Mosaico das especialidades: tocar abre os serviços e os outros encolhem ----------
  document.querySelectorAll("[data-eb]").forEach(function (eb) {
    var itens = Array.prototype.slice.call(eb.querySelectorAll("[data-eb-item]"));
    var atual = null;

    // Transição leve: o estado novo entra de uma vez e cada cartão aparece subindo de leve (só opacidade e movimento,
    // que a placa de vídeo faz sem recalcular o layout). Redimensionar os cartões quadro a quadro travava, principalmente em Notas.
    var tempoEntrada = null;
    function entrar() {
      itens.forEach(function (it, i) { it.style.setProperty("--i", String(i)); });
      eb.classList.remove("eb--entra");
      void eb.offsetWidth; // reinicia a animação se o toque vier no meio de outra
      eb.classList.add("eb--entra");
      clearTimeout(tempoEntrada);
      tempoEntrada = setTimeout(function () { eb.classList.remove("eb--entra"); }, 800);
    }

    function aplicar(item, rolar, animado) {
      atual = item;
      eb.classList.toggle("eb--aberto", !!item);
      itens.forEach(function (it) {
        var aberto = it === item;
        it.classList.toggle("is-aberto", aberto);
        it.querySelector("[data-eb-cartao]").setAttribute("aria-expanded", aberto ? "true" : "false");
        it.querySelector(".eb__painel").hidden = !aberto;
      });
      try {
        history.replaceState(null, "", item ? "#" + item.id : location.pathname + location.search);
      } catch (_) { /* sem histórico: segue funcionando */ }
      if (animado && !semMovimento) entrar();
      if (rolar) eb.scrollIntoView({ behavior: semMovimento ? "auto" : "smooth", block: "start" });
    }

    itens.forEach(function (item) {
      var link = item.querySelector("[data-eb-cartao]");
      var painel = item.querySelector(".eb__painel");
      var botao = document.createElement("button");
      botao.type = "button";
      botao.className = link.className;
      botao.setAttribute("data-eb-cartao", "");
      botao.setAttribute("aria-controls", painel.id);
      botao.setAttribute("aria-expanded", "false");
      while (link.firstChild) botao.appendChild(link.firstChild);
      link.replaceWith(botao);
      painel.hidden = true;
      botao.addEventListener("click", function () { aplicar(atual === item ? null : item, true, true); });
    });
    eb.querySelectorAll("[data-eb-fechar]").forEach(function (b) {
      b.addEventListener("click", function () { aplicar(null, true, true); });
    });
    eb.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && atual) { var ant = atual; aplicar(null, false, true); ant.querySelector("[data-eb-cartao]").focus(); }
    });

    var alvo = location.hash && itens.filter(function (it) { return "#" + it.id === location.hash; })[0];
    if (alvo) { aplicar(alvo, false); setTimeout(function () { eb.scrollIntoView({ block: "start" }); }, 0); }
  });

  // ---- Lista de documentos "marcável" ------------------------------------------
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
        try { localStorage.setItem(chave, JSON.stringify(atuais)); } catch (_) { /* navegação privada: segue sem salvar */ }
        pintar();
      });
    });
    pintar();
  }


  // ---- Animações com o mouse e a rolagem ---------------------------------------
  var mouseFino = window.matchMedia && window.matchMedia("(pointer: fine)").matches;
  if (!semMovimento) {
    // Hero: a foto e os chips só se movem com o mouse SOBRE a foto.
    var fotoEl = document.querySelector(".hero__foto");
    if (fotoEl && mouseFino) {
      fotoEl.addEventListener("pointermove", function (e) {
        var r = fotoEl.getBoundingClientRect();
        fotoEl.style.setProperty("--mx", ((e.clientX - r.left) / r.width - 0.5) * 2);
        fotoEl.style.setProperty("--my", ((e.clientY - r.top) / r.height - 0.5) * 2);
      });
      fotoEl.addEventListener("pointerleave", function () { fotoEl.style.setProperty("--mx", 0); fotoEl.style.setProperty("--my", 0); });
    }
  }

  // (A direção e o ponto de origem da troca de página ficam num script mínimo no <head>.)

  // ---- Funil de contato ----------------------------------------------------------
  var funilEl = document.querySelector("[data-funil]");
  var funilDados = document.getElementById("dados-funil");
  if (funilEl && funilDados) {
    var d = JSON.parse(funilDados.textContent);
    var fNome = funilEl.querySelector("[data-f-nome]"), fEsp = funilEl.querySelector("[data-f-esp]"), fAto = funilEl.querySelector("[data-f-ato]");
    var fMsg = funilEl.querySelector("[data-f-msg]"), fDica = funilEl.querySelector("[data-f-dica]");
    var fModo = funilEl.querySelector("[data-f-modo]");
    var bZap = funilEl.querySelector("[data-f-whats]"), bMail = funilEl.querySelector("[data-f-email]"), bCopiar = funilEl.querySelector("[data-f-copiar]");
    var ultimaMsg = "";
    funilEl.querySelector("form").addEventListener("submit", function (e) { e.preventDefault(); });
    d.esps.forEach(function (e, i) { var o = document.createElement("option"); o.value = i; o.textContent = e.nome; fEsp.appendChild(o); });

    function minuscula(t) { return t.toLowerCase(); }
    function atual() {
      // Só letras, espaços, apóstrofo, ponto e hífen: nada de símbolos, links ou quebras de linha na mensagem.
      var nome = fNome.value.replace(/[^\p{L}\p{M}\s'.-]/gu, "").replace(/\s+/g, " ").trim().slice(0, 80);
      var e = fEsp.value !== "" ? d.esps[+fEsp.value] : null;
      var a = e && fAto.value !== "" ? e.atos[+fAto.value] : null;
      var modoEl = fModo ? fModo.querySelector('input[name="f-modo"]:checked') : null;
      var modo = a && a.e && modoEl ? modoEl.value : "";
      return { nome: nome, esp: e, ato: a, modo: modo, pronto: !!(nome && e && a) };
    }
    function mensagem(x) {
      // Em escrituras, a pessoa pode dizer se prefere fazer digitalmente (e-Notariado) ou presencialmente.
      var preferencia = x.modo === "d" ? " Prefiro fazer de forma digital, pelo e-Notariado." : x.modo === "p" ? " Prefiro fazer de forma presencial." : "";
      return "Olá, sou " + x.nome + ". Gostaria de falar com o setor de " + x.esp.nome + ", pois preciso de " + minuscula(x.ato.d) + "." + preferencia + " Aguardo atendimento.";
    }
    function marcar(el, feito) { el.closest(".funil__passo").classList.toggle("is-feito", feito); }
    function liberar(b, sim) { b.setAttribute("aria-disabled", sim ? "false" : "true"); }

    function atualizar() {
      var x = atual();
      if (fModo) fModo.hidden = !(x.ato && x.ato.e);
      marcar(fNome, !!x.nome); marcar(fEsp, !!x.esp); marcar(fAto, !!x.ato);
      if (x.pronto) {
        var m = mensagem(x);
        ultimaMsg = m;
        fMsg.textContent = m; fMsg.classList.remove("is-vazia");
        bZap.href = d.wa ? "https://wa.me/" + d.wa + "?text=" + encodeURIComponent(m) : "#falar";
        bMail.href = "mailto:" + d.mail + "?subject=" + encodeURIComponent("Atendimento: " + x.ato.d) + "&body=" + encodeURIComponent(m);
        fDica.textContent = "Tudo pronto. Escolha por onde quer falar.";
      } else {
        ultimaMsg = "";
        fMsg.textContent = "Preencha os passos ao lado e a sua mensagem aparece aqui.";
        fMsg.classList.add("is-vazia");
        bZap.href = "#falar"; bMail.href = "#falar";
        fDica.textContent = "";
      }
      liberar(bZap, x.pronto && !!d.wa); liberar(bMail, x.pronto); liberar(bCopiar, x.pronto);
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
    fNome.addEventListener("input", atualizar);
    fAto.addEventListener("change", function () {
      if (fModo) fModo.querySelectorAll("input").forEach(function (r) { r.checked = false; });
      atualizar();
    });
    if (fModo) fModo.addEventListener("change", atualizar);
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
    // E-mail: o navegador não avisa quando não há programa de e-mail. Por isso a mensagem é copiada na hora e o endereço fica à vista.
    bMail.addEventListener("click", function () {
      if (bMail.getAttribute("aria-disabled") === "true" || !ultimaMsg) return;
      fDica.textContent = "Abrindo o seu e-mail. Se não abrir, a mensagem já foi copiada: envie para " + d.mail + ".";
      bCopiar.click();
    });
    bCopiar.addEventListener("click", function () {
      if (!ultimaMsg) { fDica.textContent = "Preencha os passos para copiar a mensagem."; return; }
      var ok = function () { aviso("Mensagem copiada"); };
      var falha = function () {
        // Alternativa para navegadores sem permissão de área de transferência: seleciona o texto para copiar à mão.
        var r = document.createRange(); r.selectNodeContents(fMsg);
        var sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r);
        var copiou = false;
        try { copiou = document.execCommand("copy"); } catch (_) { copiou = false; }
        aviso(copiou ? "Mensagem copiada" : "Texto selecionado: use Ctrl+C para copiar");
      };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(ultimaMsg).then(ok, falha); else falha();
    });
    atualizar();
  }

  // ---- Links de e-mail: o navegador não avisa quando não há programa de e-mail; copia o endereço e mostra um aviso ------
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest('a[href^="mailto:"]');
    if (!a || a.hasAttribute("data-f-email")) return;
    var endereco = a.getAttribute("href").slice(7).split("?")[0];
    if (!endereco) return;
    var ok = function () { aviso("Se o e-mail não abrir, o endereço foi copiado: " + endereco); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(endereco).then(ok, function () { aviso("Se o e-mail não abrir, escreva para " + endereco); });
    else aviso("Se o e-mail não abrir, escreva para " + endereco);
  });

  // ---- Voltar ao topo (com anel de progresso de leitura) ---------------------------
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

  // ---- Imprimir ----------------------------------------------------------
  document.querySelectorAll("[data-imprimir]").forEach(function (b) {
    b.addEventListener("click", function () {
      // Imprime só a lista de documentos: a classe esconde o resto da página durante a impressão.
      var raiz = document.documentElement;
      var limpar = function () { raiz.classList.remove("imprime-lista"); window.removeEventListener("afterprint", limpar); };
      raiz.classList.add("imprime-lista");
      window.addEventListener("afterprint", limpar);
      window.print();
      // Navegadores que não disparam "afterprint" (alguns celulares): desfaz pouco depois.
      setTimeout(limpar, 1500);
    });
  });
})();
