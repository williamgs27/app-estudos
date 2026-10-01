const listaCaderno =
    document.getElementById("lista-caderno");

const inputBusca =
    document.getElementById("input-busca");

const btnTema =
    document.getElementById("btn-tema");

const modalCaderno =
    document.getElementById("modal-caderno");

const btnFecharCaderno =
    document.getElementById("btn-fechar-caderno");

const formResumo =
    document.getElementById("form-resumo");

const editorMateria =
    document.getElementById("editor-materia");

const editorAssunto =
    document.getElementById("editor-assunto");

const tituloResumo =
    document.getElementById("titulo-resumo");

const conteudoResumo =
    document.getElementById("conteudo-resumo");

const statusSalvamento =
    document.getElementById("status-salvamento");

const btnNovoResumo =
    document.getElementById("btn-novo-resumo");

const listaResumosAssunto =
    document.getElementById(
        "lista-resumos-assunto"
    );

const editorResumoArea =
    document.getElementById(
        "editor-resumo-area"
    );

const contadorCaracteres =
    document.getElementById(
        "contador-caracteres"
    );


const btnModoEdicao =
    document.getElementById(
        "btn-modo-edicao"
    );

const btnModoVisualizacao =
    document.getElementById(
        "btn-modo-visualizacao"
    );

const areaEdicao =
    document.getElementById(
        "area-edicao"
    );

const areaVisualizacao =
    document.getElementById(
        "area-visualizacao"
    );

const previewResumo =
    document.getElementById(
        "preview-resumo"
    );


const menuComandos =
    document.getElementById(
        "menu-comandos"
    );

let assuntos = [];

let resumos = [];

let assuntoAtual = null;

let resumoAtual = null;

let timerAutosave = null;

let comandoSlashAberto = false;

/* =========================================================
   INICIALIZAÇÃO
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        configurarEventos();

        await carregarDados();

    }
);


/* =========================================================
   EVENTOS
========================================================= */

function configurarEventos() {

    btnTema?.addEventListener(
        "click",
        alternarTema
    );


    btnFecharCaderno?.addEventListener(
        "click",
        fecharEditor
    );


    modalCaderno?.addEventListener(
        "click",
        event => {

            if (
                event.target === modalCaderno
            ) {
                fecharEditor();
            }

        }
    );


    inputBusca?.addEventListener(
        "input",
        renderizarAssuntos
    );


    formResumo?.addEventListener(
        "submit",
        async event => {

            event.preventDefault();

            await salvarResumo();

        }
    );


    tituloResumo?.addEventListener(
        "input",
        () => {

            atualizarContador();

            programarAutosave();

        }
    );


    conteudoResumo?.addEventListener(
        "input",
        () => {

            atualizarContador();

            programarAutosave();


            if (
                areaVisualizacao.style.display !==
                "none"
            ) {

                renderizarPreview();

            }

        }
    );


    btnNovoResumo?.addEventListener(
        "click",
        criarNovoResumo
    );


    document
        .querySelectorAll(".editor-btn")
        .forEach(botao => {

            botao.addEventListener(
                "click",
                () => {

                    aplicarComandoEditor(
                        botao.dataset.comando
                    );

                }
            );

        });

        btnModoEdicao?.addEventListener(
            "click",
            () => mudarModoEditor("edicao")
        );

        btnModoVisualizacao?.addEventListener(
            "click",
            () => mudarModoEditor("visualizacao")
        );

    conteudoResumo?.addEventListener(
        "keydown",
        tratarTecladoEditor
    );

    document
        .querySelectorAll(
            "[data-comando-slash]"
        )
        .forEach(botao => {

            botao.addEventListener(
                "click",
                () => {

                    executarComandoSlash(
                        botao.dataset.comandoSlash
                    );

                }
            );

        });

}


/* =========================================================
   CARREGAMENTO
========================================================= */

async function carregarDados() {

    listaCaderno.innerHTML = `
        <div class="loading">
            Carregando...
        </div>
    `;


    try {

        const [
            resultadoAssuntos,
            resultadoResumos
        ] = await Promise.all([

            db
                .from("assuntos")
                .select(`
                    id,
                    nome,
                    status,
                    ordem,
                    topicos (
                        id,
                        nome,
                        ordem,
                        materias (
                            id,
                            nome,
                            cor
                        )
                    )
                `)
                .order("ordem", {
                    ascending: true
                }),

            db
                .from("resumos")
                .select(`
                    id,
                    assunto_id,
                    titulo,
                    conteudo,
                    data_aula,
                    created_at,
                    updated_at
                `)
                .order("updated_at", {
                    ascending: false
                })

        ]);


        if (resultadoAssuntos.error) {
            throw resultadoAssuntos.error;
        }


        if (resultadoResumos.error) {
            throw resultadoResumos.error;
        }


        assuntos =
            resultadoAssuntos.data || [];


        resumos =
            resultadoResumos.data || [];


        renderizarAssuntos();


    } catch (error) {

        console.error(
            "Erro ao carregar caderno:",
            error
        );


        listaCaderno.innerHTML = `
            <div class="lista-vazia">

                <div class="lista-vazia-icone">
                    !
                </div>

                <h3>
                    Não foi possível carregar
                </h3>

                <p>
                    Verifique sua conexão e tente novamente.
                </p>

            </div>
        `;

    }

}


/* =========================================================
   RENDERIZAR ASSUNTOS
========================================================= */

function renderizarAssuntos() {

    const busca =
        inputBusca.value
            .trim()
            .toLowerCase();


    const filtrados =
        assuntos.filter(assunto => {

            const nome =
                assunto.nome
                    ?.toLowerCase() || "";

            const materia =
                assunto
                    .topicos
                    ?.materias
                    ?.nome
                    ?.toLowerCase() || "";

            const topico =
                assunto
                    .topicos
                    ?.nome
                    ?.toLowerCase() || "";


            const resumosAssunto =
                obterResumosDoAssunto(
                    assunto.id
                );


            const encontrouResumo =
                resumosAssunto.some(resumo => {

                    const titulo =
                        resumo.titulo
                            ?.toLowerCase() || "";

                    const conteudo =
                        resumo.conteudo
                            ?.toLowerCase() || "";


                    return (
                        titulo.includes(busca) ||
                        conteudo.includes(busca)
                    );

                });


            return (
                !busca ||
                nome.includes(busca) ||
                materia.includes(busca) ||
                topico.includes(busca) ||
                encontrouResumo
            );

        });


    if (!filtrados.length) {

        listaCaderno.innerHTML = `
            <div class="lista-vazia">

                <div class="lista-vazia-icone">
                    📖
                </div>

                <h3>
                    Nenhum resultado
                </h3>

                <p>
                    Tente pesquisar outro assunto
                    ou palavra.
                </p>

            </div>
        `;

        return;

    }


    const grupos =
        new Map();


    filtrados.forEach(assunto => {

        const materia =
            assunto
                .topicos
                ?.materias;


        if (!materia) {
            return;
        }


        if (!grupos.has(materia.id)) {

            grupos.set(
                materia.id,
                {
                    materia,
                    assuntos: []
                }
            );

        }


        grupos
            .get(materia.id)
            .assuntos
            .push(assunto);

    });


    listaCaderno.innerHTML =
        [...grupos.values()]
            .map(
                grupo =>
                    criarGrupoMateria(
                        grupo
                    )
            )
            .join("");


    document
        .querySelectorAll(
            ".caderno-assunto"
        )
        .forEach(card => {

            card.addEventListener(
                "click",
                () => {

                    abrirEditor(
                        card.dataset.id
                    );

                }
            );

        });

}


/* =========================================================
   GRUPO
========================================================= */

function criarGrupoMateria(grupo) {

    const materia =
        grupo.materia;


    const cor =
        validarCor(materia.cor)
            ? materia.cor
            : "#8b5cf6";


    return `
        <section class="caderno-materia">

            <div class="caderno-materia-header">

                <div class="caderno-materia-titulo">

                    <span
                        class="caderno-materia-cor"
                        style="background:${escaparAtributo(cor)}"
                    ></span>

                    <h2>
                        ${escaparHTML(
                            materia.nome
                        )}
                    </h2>

                </div>

                <span class="caderno-materia-contador">
                    ${grupo.assuntos.length}
                </span>

            </div>


            <div class="caderno-assuntos">

                ${grupo.assuntos
                    .map(
                        assunto =>
                            criarCardAssunto(
                                assunto
                            )
                    )
                    .join("")}

            </div>

        </section>
    `;

}


/* =========================================================
   CARD ASSUNTO
========================================================= */

function criarCardAssunto(assunto) {

    const topico =
        assunto.topicos;


    const resumosAssunto =
        obterResumosDoAssunto(
            assunto.id
        );


    let statusResumo =
        "Nenhum resumo";


    if (resumosAssunto.length === 1) {

        statusResumo =
            "1 resumo";

    } else if (
        resumosAssunto.length > 1
    ) {

        statusResumo =
            `${resumosAssunto.length} resumos`;

    }


    return `
        <button
            type="button"
            class="caderno-assunto"
            data-id="${assunto.id}"
        >

            <div class="caderno-assunto-icone">
                ✎
            </div>

            <div class="caderno-assunto-info">

                <strong>
                    ${escaparHTML(
                        assunto.nome
                    )}
                </strong>

                <span>
                    ${escaparHTML(
                        topico?.nome ||
                        "Sem tópico"
                    )}
                    ·
                    ${statusResumo}
                </span>

            </div>

            <span class="caderno-assunto-seta">
                ›
            </span>

        </button>
    `;

}


/* =========================================================
   ABRIR EDITOR
========================================================= */

async function abrirEditor(
    assuntoId
) {

    assuntoAtual =
        assuntos.find(
            assunto =>
                assunto.id === assuntoId
        );


    if (!assuntoAtual) {
        return;
    }


    const materia =
        assuntoAtual
            .topicos
            ?.materias;


    editorMateria.textContent =
        materia?.nome || "Matéria";


    editorAssunto.textContent =
        assuntoAtual.nome;


    modalCaderno.classList.add(
        "aberto"
    );


    renderizarListaResumos();

    const lista =
        obterResumosDoAssunto(
            assuntoId
        );


    if (lista.length) {

        selecionarResumo(
            lista[0].id
        );

    } else {

        criarNovoResumo();

    }

}


/* =========================================================
   LISTA DE RESUMOS
========================================================= */

function renderizarListaResumos() {

    if (!assuntoAtual) {
        return;
    }


    const lista =
        obterResumosDoAssunto(
            assuntoAtual.id
        );


    if (!lista.length) {

        listaResumosAssunto.innerHTML = `
            <div class="sem-resumos">
                Nenhum resumo criado ainda.
            </div>
        `;

        return;

    }


    listaResumosAssunto.innerHTML =
        lista.map(resumo => {

            const ativo =
                resumoAtual?.id === resumo.id
                    ? " ativo"
                    : "";


            const titulo =
                resumo.titulo?.trim()
                    || "Sem título";


            const preview =
                removerMarkdown(
                    resumo.conteudo || ""
                )
                .replace(/\s+/g, " ")
                .trim();


            return `
                <article
                    class="resumo-lista-item${ativo}"
                    data-id="${resumo.id}"
                >

                    <button
                        type="button"
                        class="resumo-lista-conteudo"
                        data-acao="abrir"
                    >

                        <strong>
                            ${escaparHTML(
                                titulo
                            )}
                        </strong>

                        <span>
                            ${escaparHTML(
                                preview ||
                                "Resumo vazio"
                            )}
                        </span>

                    </button>


                    <button
                        type="button"
                        class="btn-icone btn-excluir-resumo"
                        data-acao="excluir"
                        aria-label="Excluir resumo"
                    >
                        🗑
                    </button>

                </article>
            `;

        })
        .join("");


    listaResumosAssunto
        .querySelectorAll(
            ".resumo-lista-item"
        )
        .forEach(item => {

            const id =
                item.dataset.id;


            item
                .querySelector(
                    '[data-acao="abrir"]'
                )
                ?.addEventListener(
                    "click",
                    () => {

                        selecionarResumo(id);

                    }
                );


            item
                .querySelector(
                    '[data-acao="excluir"]'
                )
                ?.addEventListener(
                    "click",
                    () => {

                        excluirResumo(id);

                    }
                );

        });

}


/* =========================================================
   SELECIONAR RESUMO
========================================================= */

function selecionarResumo(
    resumoId
) {

    clearTimeout(
        timerAutosave
    );


    resumoAtual =
        resumos.find(
            resumo =>
                resumo.id === resumoId
        );


    if (!resumoAtual) {
        return;
    }


    tituloResumo.value =
        resumoAtual.titulo || "";


    conteudoResumo.value =
        resumoAtual.conteudo || "";


    
    renderizarPreview();

    mudarModoEditor("edicao");

    atualizarContador();

    statusSalvamento.textContent =
        "Salvo ✓";


    editorResumoArea.style.display =
        "block";


    renderizarListaResumos();


    setTimeout(
        () =>
            conteudoResumo.focus(),
        50
    );

}


/* =========================================================
   NOVO RESUMO
========================================================= */

function criarNovoResumo() {

    clearTimeout(
        timerAutosave
    );


    resumoAtual = null;


    tituloResumo.value = "";

    conteudoResumo.value = "";


    atualizarContador();

    renderizarPreview();

    mudarModoEditor("edicao");


    statusSalvamento.textContent =
        "Novo resumo";


    editorResumoArea.style.display =
        "block";


    renderizarListaResumos();


    setTimeout(
        () =>
            tituloResumo.focus(),
        50
    );

}

/* =========================================================
   SALVAR
========================================================= */

async function salvarResumo(
    automatico = false
) {

    if (!assuntoAtual) {
        return;
    }


    const titulo =
        tituloResumo.value.trim();


    const conteudo =
        conteudoResumo.value;


    statusSalvamento.textContent =
        "Salvando...";


    try {

        if (resumoAtual?.id) {

            const { data, error } =
                await db
                    .from("resumos")
                    .update({

                        titulo:
                            titulo || null,

                        conteudo,

                        updated_at:
                            new Date()
                                .toISOString()

                    })
                    .eq(
                        "id",
                        resumoAtual.id
                    )
                    .select()
                    .single();


            if (error) {
                throw error;
            }


            resumoAtual = data;


            const index =
                resumos.findIndex(
                    resumo =>
                        resumo.id === data.id
                );


            if (index !== -1) {

                resumos[index] =
                    data;

            }


        } else {

            const { data, error } =
                await db
                    .from("resumos")
                    .insert({

                        assunto_id:
                            assuntoAtual.id,

                        titulo:
                            titulo || null,

                        conteudo,

                        data_aula:
                            obterDataHoje(),

                        updated_at:
                            new Date()
                                .toISOString()

                    })
                    .select()
                    .single();


            if (error) {
                throw error;
            }


            resumoAtual = data;

            resumos.unshift(data);

        }


        statusSalvamento.textContent =
            "Salvo ✓";


        renderizarListaResumos();

        renderizarAssuntos();


    } catch (error) {

        console.error(
            "Erro ao salvar resumo:",
            error
        );


        statusSalvamento.textContent =
            "Erro ao salvar";

    }

}


/* =========================================================
   AUTOSAVE
========================================================= */

function programarAutosave() {

    statusSalvamento.textContent =
        "Alterações não salvas";


    clearTimeout(
        timerAutosave
    );


    timerAutosave =
        setTimeout(
            () => {

                salvarResumo(true);

            },
            1200
        );

}


/* =========================================================
   EXCLUIR
========================================================= */

async function excluirResumo(
    resumoId
) {

    const resumo =
        resumos.find(
            item =>
                item.id === resumoId
        );


    if (!resumo) {
        return;
    }


    const titulo =
        resumo.titulo?.trim()
            || "Sem título";


    const confirmar =
        confirm(
            `Excluir o resumo "${titulo}"?`
        );


    if (!confirmar) {
        return;
    }


    try {

        const { error } =
            await db
                .from("resumos")
                .delete()
                .eq(
                    "id",
                    resumoId
                );


        if (error) {
            throw error;
        }


        resumos =
            resumos.filter(
                item =>
                    item.id !== resumoId
            );


        if (
            resumoAtual?.id === resumoId
        ) {

            resumoAtual = null;

            const restantes =
                obterResumosDoAssunto(
                    assuntoAtual.id
                );


            if (restantes.length) {

                selecionarResumo(
                    restantes[0].id
                );

            } else {

                criarNovoResumo();

            }

        }


        renderizarListaResumos();

        renderizarAssuntos();


    } catch (error) {

        console.error(
            "Erro ao excluir resumo:",
            error
        );


        alert(
            "Não foi possível excluir o resumo."
        );

    }

}


/* =========================================================
   EDITOR / MARKDOWN SIMPLES
========================================================= */

function aplicarComandoEditor(
    comando
) {

    const inicio =
        conteudoResumo.selectionStart;

    const fim =
        conteudoResumo.selectionEnd;

    const selecionado =
        conteudoResumo.value.substring(
            inicio,
            fim
        );


    let textoAntes = "";
    let textoDepois = "";


    switch (comando) {

        case "titulo":

            textoAntes =
                "## ";

            break;


        case "negrito":

            textoAntes =
                "**";

            textoDepois =
                "**";

            break;


        case "italico":

            textoAntes =
                "*";

            textoDepois =
                "*";

            break;


        case "lista":

            textoAntes =
                "- ";

            break;


        case "lista-numerada":

            textoAntes =
                "1. ";

            break;


        case "codigo":

            textoAntes =
                "```\n";

            textoDepois =
                "\n```";

            break;


        case "citacao":

            textoAntes =
                "> ";

            break;


        case "separador":

            textoAntes =
                "\n---\n";

            break;

    }


    const novoTexto =
        textoAntes +
        selecionado +
        textoDepois;


    conteudoResumo.value =
        conteudoResumo.value.substring(
            0,
            inicio
        ) +
        novoTexto +
        conteudoResumo.value.substring(
            fim
        );


    const novaPosicao =
        inicio +
        novoTexto.length;


    conteudoResumo.focus();

    conteudoResumo.setSelectionRange(
        novaPosicao,
        novaPosicao
    );


    atualizarContador();

    programarAutosave();

}


/* =========================================================
   CONTADOR
========================================================= */

function atualizarContador() {

    const caracteres =
        conteudoResumo.value.length;


    contadorCaracteres.textContent =
        `${caracteres.toLocaleString("pt-BR")} caracteres`;

}


/* =========================================================
   FECHAR
========================================================= */

function fecharEditor() {

    clearTimeout(
        timerAutosave
    );


    modalCaderno.classList.remove(
        "aberto"
    );


    assuntoAtual = null;

    resumoAtual = null;

}


/* =========================================================
   UTILITÁRIOS
========================================================= */

function obterResumosDoAssunto(
    assuntoId
) {

    return resumos
        .filter(
            resumo =>
                resumo.assunto_id === assuntoId
        )
        .sort(
            (a, b) =>
                new Date(b.updated_at || 0) -
                new Date(a.updated_at || 0)
        );

}


function removerMarkdown(texto) {

    return String(texto || "")
        .replace(
            /```[\s\S]*?```/g,
            " "
        )
        .replace(
            /[*_#>`~-]/g,
            " "
        );

}


function obterDataHoje() {

    const agora =
        new Date();


    const ano =
        agora.getFullYear();


    const mes =
        String(
            agora.getMonth() + 1
        ).padStart(2, "0");


    const dia =
        String(
            agora.getDate()
        ).padStart(2, "0");


    return `${ano}-${mes}-${dia}`;

}


function validarCor(cor) {

    return /^#[0-9A-Fa-f]{6}$/.test(
        cor || ""
    );

}


function escaparHTML(texto) {

    return String(texto ?? "")
        .replace(/&/g, "&amp;")
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );

}


function escaparAtributo(texto) {

    return escaparHTML(texto);

}

function mudarModoEditor(modo) {

    const visualizando =
        modo === "visualizacao";


    areaEdicao.style.display =
        visualizando
            ? "none"
            : "block";


    areaVisualizacao.style.display =
        visualizando
            ? "block"
            : "none";


    btnModoEdicao.classList.toggle(
        "ativo",
        !visualizando
    );


    btnModoVisualizacao.classList.toggle(
        "ativo",
        visualizando
    );


    if (visualizando) {

        renderizarPreview();

    }

}

function renderizarPreview() {

    if (!previewResumo) {
        return;
    }


    const markdown =
        conteudoResumo.value || "";


    if (!markdown.trim()) {

        previewResumo.innerHTML = `
            <div class="preview-vazio">

                <div>
                    ✎
                </div>

                <h3>
                    Seu resumo está vazio
                </h3>

                <p>
                    Volte para o modo de edição
                    e comece a escrever.
                </p>

            </div>
        `;

        return;
        adicionarBotoesCopiarCodigo();

    }


    try {

        const html =
            marked.parse(
                markdown,
                {
                    breaks: true,
                    gfm: true
                }
            );


        previewResumo.innerHTML =
            DOMPurify.sanitize(html);


    } catch (error) {

        console.error(
            "Erro ao renderizar Markdown:",
            error
        );


        previewResumo.innerHTML = `
            <p>
                Não foi possível visualizar
                este resumo.
            </p>
        `;

    }

}

function tratarTecladoEditor(event) {

    if (!conteudoResumo) {
        return;
    }


    /* =========================
       CTRL + B
    ========================= */

    if (
        event.ctrlKey &&
        event.key.toLowerCase() === "b"
    ) {

        event.preventDefault();

        aplicarComandoEditor("negrito");

        return;

    }


    /* =========================
       CTRL + I
    ========================= */

    if (
        event.ctrlKey &&
        event.key.toLowerCase() === "i"
    ) {

        event.preventDefault();

        aplicarComandoEditor("italico");

        return;

    }


    /* =========================
       CTRL + K
    ========================= */

    if (
        event.ctrlKey &&
        event.key.toLowerCase() === "k"
    ) {

        event.preventDefault();

        inserirLink();

        return;

    }


    /* =========================
       CTRL + SHIFT + 7
    ========================= */

    if (
        event.ctrlKey &&
        event.shiftKey &&
        event.key === "7"
    ) {

        event.preventDefault();

        aplicarComandoEditor(
            "lista-numerada"
        );

        return;

    }


    /* =========================
       CTRL + SHIFT + 8
    ========================= */

    if (
        event.ctrlKey &&
        event.shiftKey &&
        event.key === "8"
    ) {

        event.preventDefault();

        aplicarComandoEditor(
            "lista"
        );

        return;

    }


    /* =========================
       TAB
    ========================= */

    if (event.key === "Tab") {

        event.preventDefault();

        if (event.shiftKey) {

            removerIndentacao();

        } else {

            adicionarIndentacao();

        }

        return;

    }


    /* =========================
       /
    ========================= */

    if (
        event.key === "/" &&
        !event.ctrlKey &&
        !event.altKey
    ) {

        setTimeout(
            verificarComandoSlash,
            0
        );

    }


    /* =========================
       ESC
    ========================= */

    if (event.key === "Escape") {

        fecharMenuComandos();

    }

}

function inserirLink() {

    const inicio =
        conteudoResumo.selectionStart;

    const fim =
        conteudoResumo.selectionEnd;


    const selecionado =
        conteudoResumo.value.substring(
            inicio,
            fim
        );


    const url =
        prompt(
            "Digite a URL:",
            "https://"
        );


    if (!url) {
        return;
    }


    const texto =
        selecionado || "texto do link";


    const markdown =
        `[${texto}](${url})`;


    conteudoResumo.value =
        conteudoResumo.value.substring(
            0,
            inicio
        ) +
        markdown +
        conteudoResumo.value.substring(
            fim
        );


    const novaPosicao =
        inicio + markdown.length;


    conteudoResumo.focus();

    conteudoResumo.setSelectionRange(
        novaPosicao,
        novaPosicao
    );


    atualizarContador();

    programarAutosave();

}

function adicionarIndentacao() {

    const inicio =
        conteudoResumo.selectionStart;

    const fim =
        conteudoResumo.selectionEnd;


    const selecionado =
        conteudoResumo.value.substring(
            inicio,
            fim
        );


    const indentado =
        selecionado
            .split("\n")
            .map(
                linha =>
                    "    " + linha
            )
            .join("\n");


    conteudoResumo.value =
        conteudoResumo.value.substring(
            0,
            inicio
        ) +
        indentado +
        conteudoResumo.value.substring(
            fim
        );


    conteudoResumo.focus();

    conteudoResumo.setSelectionRange(
        inicio,
        inicio + indentado.length
    );


    atualizarContador();

    programarAutosave();

}


function removerIndentacao() {

    const inicio =
        conteudoResumo.selectionStart;

    const fim =
        conteudoResumo.selectionEnd;


    const selecionado =
        conteudoResumo.value.substring(
            inicio,
            fim
        );


    const removido =
        selecionado
            .split("\n")
            .map(
                linha =>
                    linha.startsWith("    ")
                        ? linha.substring(4)
                        : linha
            )
            .join("\n");


    conteudoResumo.value =
        conteudoResumo.value.substring(
            0,
            inicio
        ) +
        removido +
        conteudoResumo.value.substring(
            fim
        );


    conteudoResumo.focus();

    conteudoResumo.setSelectionRange(
        inicio,
        inicio + removido.length
    );


    atualizarContador();

    programarAutosave();

}

function verificarComandoSlash() {

    const posicao =
        conteudoResumo.selectionStart;


    const texto =
        conteudoResumo.value.substring(
            0,
            posicao
        );


    const ultimaLinha =
        texto.split("\n").pop();


    if (
        ultimaLinha.trim() === "/"
    ) {

        abrirMenuComandos();

    } else {

        fecharMenuComandos();

    }

}

function abrirMenuComandos() {

    if (!menuComandos) {
        return;
    }


    menuComandos.style.display =
        "block";


    comandoSlashAberto = true;

}

function fecharMenuComandos() {

    if (!menuComandos) {
        return;
    }


    menuComandos.style.display =
        "none";


    comandoSlashAberto = false;

}

function executarComandoSlash(
    comando
) {

    const posicao =
        conteudoResumo.selectionStart;


    const texto =
        conteudoResumo.value;


    const inicioLinha =
        texto.lastIndexOf(
            "\n",
            posicao - 1
        ) + 1;


    const linhaAtual =
        texto.substring(
            inicioLinha,
            posicao
        );


    if (
        linhaAtual.trim() === "/"
    ) {

        conteudoResumo.value =
            texto.substring(
                0,
                inicioLinha
            ) +
            texto.substring(
                posicao
            );

    }


    const comandos = {

        titulo: "## ",

        texto: "",

        lista: "- ",

        checklist: "- [ ] ",

        codigo: "```\n\n```",

        citacao: "> ",

        separador: "\n---\n"

    };


    const insercao =
        comandos[comando] || "";


    const novaPosicao =
        inicioLinha + insercao.length;


    conteudoResumo.value =
        conteudoResumo.value.substring(
            0,
            inicioLinha
        ) +
        insercao +
        conteudoResumo.value.substring(
            inicioLinha
        );


    fecharMenuComandos();


    conteudoResumo.focus();


    conteudoResumo.setSelectionRange(
        novaPosicao,
        novaPosicao
    );


    atualizarContador();

    programarAutosave();

}

previewResumo?.addEventListener(
    "change",
    event => {

        if (
            !event.target.matches(
                'input[type="checkbox"]'
            )
        ) {
            return;
        }


        alternarCheckboxMarkdown(
            event.target
        );

    }
);

function alternarCheckboxMarkdown(
    checkbox
) {

    const item =
        checkbox.closest(
            "li"
        );


    if (!item) {
        return;
    }


    const textoItem =
        item.textContent
            .trim();


    const linhas =
        conteudoResumo.value.split("\n");


    const index =
        linhas.findIndex(
            linha => {

                const texto =
                    linha
                        .replace(
                            /^[-*+]\s+\[[ xX]\]\s+/,
                            ""
                        )
                        .trim();


                return texto === textoItem;

            }
        );


    if (index === -1) {
        return;
    }


    if (checkbox.checked) {

        linhas[index] =
            linhas[index].replace(
                /^(\s*[-*+]\s+)\[\s\]/,
                "$1[x]"
            );

    } else {

        linhas[index] =
            linhas[index].replace(
                /^(\s*[-*+]\s+)\[[xX]\]/,
                "$1[ ]"
            );

    }


    conteudoResumo.value =
        linhas.join("\n");


    programarAutosave();

    renderizarPreview();

}