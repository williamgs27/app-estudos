/* ========================================
   TEMA
======================================== */

function aplicarTema() {
    const temaSalvo = localStorage.getItem("tema");

    const temaEscuro = temaSalvo
        ? temaSalvo === "escuro"
        : window.matchMedia("(prefers-color-scheme: dark)").matches;

    document.documentElement.dataset.tema =
        temaEscuro ? "escuro" : "claro";
}


function alternarTema() {
    const temaAtual =
        document.documentElement.dataset.tema;

    const novoTema =
        temaAtual === "escuro"
            ? "claro"
            : "escuro";

    localStorage.setItem("tema", novoTema);

    aplicarTema();
}


aplicarTema();