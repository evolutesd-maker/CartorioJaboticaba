/* Melhorias progressivas. O site funciona sem JavaScript: aqui só entram
   o menu recolhível no celular, o filtro do localizador de serviços e o botão de imprimir. */
(function () {
  "use strict";

  // ---- Menu (celular) --------------------------------------------------
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

  // ---- Localizador de serviços ------------------------------------------
  // Normaliza (sem acento, minúsculas) e reduz plural simples, para que
  // "certidões" encontre "certidão" e "casar" encontre "casamento" via palavras-chave.
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
    return normalizar(texto)
      .split(/[^a-z0-9]+/)
      .filter(Boolean)
      .map(radical);
  }
  function termosDaBusca(texto) {
    var todos = prepara(texto);
    var uteis = todos.filter(function (t) { return IRRELEVANTES.indexOf(t) === -1 && t.length > 1; });
    return uteis.length ? uteis : todos;
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

    // Mostra os serviços que combinam com mais palavras digitadas. Se algum combina
    // com todas, só esses aparecem; senão, os que combinam com o maior número possível.
    function filtrar() {
      var termos = termosDaBusca(campo.value);
      var pontos = Array.prototype.map.call(itens, function (_, i) {
        return termos.filter(function (t) { return indice[i].indexOf(t) !== -1; }).length;
      });
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
    // Evita enviar formulário/recarregar com Enter.
    campo.addEventListener("keydown", function (e) { if (e.key === "Enter") e.preventDefault(); });
  });

  // ---- Imprimir ----------------------------------------------------------
  document.querySelectorAll("[data-imprimir]").forEach(function (b) {
    b.addEventListener("click", function () { window.print(); });
  });
})();
