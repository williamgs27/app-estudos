const conteudo = document.getElementById("conteudo-materias");
const breadcrumb = document.getElementById("breadcrumb");
const tituloPagina = document.getElementById("titulo-pagina");
const subtituloPagina = document.getElementById("subtitulo-pagina");

const btnAdicionar = document.getElementById("btn-adicionar");
const modalOverlay = document.getElementById("modal-overlay");
const modalTitulo = document.getElementById("modal-titulo");
const btnFecharModal = document.getElementById("btn-fechar-modal");

const formItem = document.getElementById("form-item");
const nomeItem = document.getElementById("nome-item");
const campoDuracao = document.getElementById("campo-duracao");
const duracaoItem = document.getElementById("duracao-item");
const campoCor = document.getElementById("campo-cor");
const corItem = document.getElementById("cor-item");

const btnTema = document.getElementById("btn-tema");

let nivelAtual = "materias";
let materiaAtual = null;
let topicoAtual = null;

let modoFormulario = "criar";
let itemEditando = null;

document.addEventListener("DOMContentLoaded", async () => {
    configurarEventos();
    await carregarMaterias();
});

function configurarEventos() {
    btnAdicionar?.addEventListener("click", abrirModalCriacao);

    btnFecharModal?.addEventListener("click", fecharModal);

    modalOverlay?.addEventListener("click", event => {
        if (event.target === modalOverlay) {
            fecharModal();
        }
    });

    formItem?.addEventListener("submit", salvarItem);

    btnTema?.addEventListener("click", alternarTema);
}

/* =========================================================
   UTILITÁRIOS
========================================================= */

function escaparHTML(texto) {
    const div = document.createElement("div");
    div.textContent = texto ?? "";
    return div.innerHTML;
}

function escaparAtributo(texto) {
    return escaparHTML(texto).replace(/"/g, "&quot;");
}

function mostrarErro(mensagem) {
    conteudo.innerHTML = `
        <div class="lista-vazia">
            <div class="lista-vazia-icone">!</div>
            <h3>Ocorreu um erro</h3>
            <p>${escaparHTML(mensagem)}</p>
        </div>
    `;
}

function renderizarLoading() {
    conteudo.innerHTML = `
        <div class="loading">
            Carregando...
        </div>
    `;
}

function formatarDuracao(minutos) {
    if (minutos < 60) {
        return `${minutos} min`;
    }

    const horas = Math.floor(minutos / 60);
    const minutosRestantes = minutos % 60;

    if (!minutosRestantes) {
        return horas === 1
            ? "1 hora"
            : `${horas} horas`;
    }

    return `${horas}h ${minutosRestantes}min`;
}

/* =========================================================
   MATÉRIAS
========================================================= */

async function carregarMaterias() {
    nivelAtual = "materias";
    materiaAtual = null;
    topicoAtual = null;

    atualizarCabecalho();
    renderizarLoading();

    try {
        const { data, error } = await db
            .from("materias")
            .select(`
                id,
                nome,
                cor,
                created_at,
                topicos (
                    id
                )
            `)
            .order("nome");

        if (error) throw error;

        renderizarMaterias(data || []);

    } catch (error) {
        console.error(error);
        mostrarErro("Não foi possível carregar as matérias.");
    }
}

function renderizarMaterias(materias) {
    if (!materias.length) {
        conteudo.innerHTML = `
            <div class="lista-vazia">
                <div class="lista-vazia-icone">📚</div>
                <h3>Nenhuma matéria ainda</h3>
                <p>Comece adicionando sua primeira matéria.</p>
            </div>
        `;
        return;
    }

    conteudo.innerHTML = `
        <div class="lista-estudos">
            ${materias.map(materia => `
                <article
                    class="estudo-card"
                    data-id="${materia.id}"
                >
                    <div
                        class="estudo-cor"
                        data-cor="${escaparAtributo(materia.cor)}"
                    ></div>

                    <div class="estudo-info">
                        <h3>${escaparHTML(materia.nome)}</h3>
                        <p>
                            ${materia.topicos?.length || 0} tópico(s)
                        </p>
                    </div>

                    <button
                        class="btn-icone btn-opcoes"
                        data-tipo="materia"
                        data-id="${materia.id}"
                        aria-label="Opções da matéria"
                    >
                        ⋯
                    </button>

                    <span class="estudo-seta">›</span>
                </article>
            `).join("")}
        </div>
    `;

    aplicarCores();

    document.querySelectorAll(".estudo-card").forEach(card => {
        card.addEventListener("click", event => {
            if (event.target.closest(".btn-opcoes")) {
                return;
            }

            abrirMateria(card.dataset.id);
        });
    });

    document.querySelectorAll(".btn-opcoes").forEach(botao => {
        botao.addEventListener("click", event => {
            event.stopPropagation();

            abrirOpcoes(
                botao.dataset.tipo,
                botao.dataset.id
            );
        });
    });
}

/* =========================================================
   TÓPICOS
========================================================= */

async function abrirMateria(id) {
    try {
        const { data, error } = await db
            .from("materias")
            .select("*")
            .eq("id", id)
            .single();

        if (error) throw error;

        materiaAtual = data;
        topicoAtual = null;
        nivelAtual = "topicos";

        await carregarTopicos();

    } catch (error) {
        console.error(error);
        alert("Não foi possível abrir a matéria.");
    }
}

async function carregarTopicos() {
    atualizarCabecalho();
    renderizarLoading();

    try {
        const { data, error } = await db
            .from("topicos")
            .select(`
                id,
                nome,
                ordem,
                assuntos (
                    id
                )
            `)
            .eq("materia_id", materiaAtual.id)
            .order("ordem")
            .order("nome");

        if (error) throw error;

        renderizarTopicos(data || []);

    } catch (error) {
        console.error(error);
        mostrarErro("Não foi possível carregar os tópicos.");
    }
}

function renderizarTopicos(topicos) {
    if (!topicos.length) {
        conteudo.innerHTML = `
            <div class="lista-vazia">
                <div class="lista-vazia-icone">📂</div>
                <h3>Nenhum tópico</h3>
                <p>Adicione tópicos para organizar esta matéria.</p>
            </div>
        `;
        return;
    }

    conteudo.innerHTML = `
        <div class="lista-estudos">
            ${topicos.map(topico => `
                <article
                    class="estudo-card"
                    data-id="${topico.id}"
                >
                    <div
                        class="estudo-cor"
                        data-cor="${escaparAtributo(materiaAtual.cor)}"
                    ></div>

                    <div class="estudo-info">
                        <h3>${escaparHTML(topico.nome)}</h3>
                        <p>
                            ${topico.assuntos?.length || 0} assunto(s)
                        </p>
                    </div>

                    <button
                        class="btn-icone btn-opcoes"
                        data-tipo="topico"
                        data-id="${topico.id}"
                        aria-label="Opções do tópico"
                    >
                        ⋯
                    </button>

                    <span class="estudo-seta">›</span>
                </article>
            `).join("")}
        </div>
    `;

    aplicarCores();

    document.querySelectorAll(".estudo-card").forEach(card => {
        card.addEventListener("click", event => {
            if (event.target.closest(".btn-opcoes")) {
                return;
            }

            abrirTopico(card.dataset.id);
        });
    });

    document.querySelectorAll(".btn-opcoes").forEach(botao => {
        botao.addEventListener("click", event => {
            event.stopPropagation();

            abrirOpcoes(
                botao.dataset.tipo,
                botao.dataset.id
            );
        });
    });
}

async function abrirTopico(id) {
    try {
        const { data, error } = await db
            .from("topicos")
            .select("*")
            .eq("id", id)
            .single();

        if (error) throw error;

        topicoAtual = data;
        nivelAtual = "assuntos";

        await carregarAssuntos();

    } catch (error) {
        console.error(error);
        alert("Não foi possível abrir o tópico.");
    }
}

/* =========================================================
   ASSUNTOS
========================================================= */

async function carregarAssuntos() {
    atualizarCabecalho();
    renderizarLoading();

    try {
        const { data, error } = await db
            .from("assuntos")
            .select("*")
            .eq("topico_id", topicoAtual.id)
            .order("ordem")
            .order("nome");

        if (error) throw error;

        renderizarAssuntos(data || []);

    } catch (error) {
        console.error(error);
        mostrarErro("Não foi possível carregar os assuntos.");
    }
}

function renderizarAssuntos(assuntos) {
    if (!assuntos.length) {
        conteudo.innerHTML = `
            <div class="lista-vazia">
                <div class="lista-vazia-icone">📝</div>
                <h3>Nenhum assunto</h3>
                <p>
                    Adicione os assuntos que você precisa estudar.
                </p>
            </div>
        `;
        return;
    }

    conteudo.innerHTML = `
        <div class="lista-estudos">
            ${assuntos.map(assunto => `
                <article class="assunto-card">

                    <input
                        type="checkbox"
                        class="checkbox"
                        ${assunto.status === "concluido" ? "checked" : ""}
                        data-id="${assunto.id}"
                        aria-label="Concluir assunto"
                    >

                    <div class="assunto-info">
                        <div class="assunto-nome">
                            ${escaparHTML(assunto.nome)}
                        </div>

                        <div class="assunto-duracao">
                            ${formatarDuracao(assunto.duracao_min)}
                        </div>
                    </div>

                    <div class="assunto-acoes">
                        <button
                            class="btn-icone btn-editar"
                            data-id="${assunto.id}"
                            aria-label="Editar assunto"
                        >
                            ✎
                        </button>

                        <button
                            class="btn-icone btn-excluir"
                            data-id="${assunto.id}"
                            aria-label="Excluir assunto"
                        >
                            🗑
                        </button>
                    </div>

                </article>
            `).join("")}
        </div>
    `;

    configurarEventosAssuntos();
}

function configurarEventosAssuntos() {
    document.querySelectorAll(".checkbox").forEach(checkbox => {
        checkbox.addEventListener("change", async () => {
            await alterarStatusAssunto(
                checkbox.dataset.id,
                checkbox.checked
            );
        });
    });

    document.querySelectorAll(".btn-editar").forEach(botao => {
        botao.addEventListener("click", () => {
            editarAssunto(botao.dataset.id);
        });
    });

    document.querySelectorAll(".btn-excluir").forEach(botao => {
        botao.addEventListener("click", () => {
            excluirAssunto(botao.dataset.id);
        });
    });
}

async function alterarStatusAssunto(id, concluido) {
    const novoStatus = concluido
        ? "concluido"
        : "pendente";

    try {
        const { error } = await db
            .from("assuntos")
            .update({
                status: novoStatus
            })
            .eq("id", id);

        if (error) throw error;

    } catch (error) {
        console.error(error);

        alert("Não foi possível atualizar o assunto.");

        await carregarAssuntos();
    }
}

/* =========================================================
   EDITAR
========================================================= */

async function editarAssunto(id) {
    try {
        const { data, error } = await db
            .from("assuntos")
            .select("*")
            .eq("id", id)
            .single();

        if (error) throw error;

        itemEditando = data;
        modoFormulario = "editar";

        abrirModal();

    } catch (error) {
        console.error(error);
        alert("Não foi possível carregar o assunto.");
    }
}

async function editarMateria(id) {
    try {
        const { data, error } = await db
            .from("materias")
            .select("*")
            .eq("id", id)
            .single();

        if (error) throw error;

        itemEditando = data;
        modoFormulario = "editar";

        abrirModal();

    } catch (error) {
        console.error(error);
        alert("Não foi possível carregar a matéria.");
    }
}

async function editarTopico(id) {
    try {
        const { data, error } = await db
            .from("topicos")
            .select("*")
            .eq("id", id)
            .single();

        if (error) throw error;

        itemEditando = data;
        modoFormulario = "editar";

        abrirModal();

    } catch (error) {
        console.error(error);
        alert("Não foi possível carregar o tópico.");
    }
}

/* =========================================================
   MENU DE OPÇÕES
========================================================= */

function abrirOpcoes(tipo, id) {
    const nomeTipo =
        tipo === "materia"
            ? "matéria"
            : "tópico";

    const acao = prompt(
        `O que deseja fazer com este ${nomeTipo}?\n\n` +
        `1 - Editar\n` +
        `2 - Excluir`
    );

    if (acao === "1") {
        if (tipo === "materia") {
            editarMateria(id);
        } else {
            editarTopico(id);
        }
    }

    if (acao === "2") {
        if (tipo === "materia") {
            excluirMateria(id);
        } else {
            excluirTopico(id);
        }
    }
}

/* =========================================================
   EXCLUSÃO
========================================================= */

async function excluirMateria(id) {
    const confirmar = confirm(
        "Excluir esta matéria?\n\n" +
        "ATENÇÃO: todos os tópicos e assuntos desta matéria " +
        "também serão excluídos."
    );

    if (!confirmar) return;

    try {
        const { error } = await db
            .from("materias")
            .delete()
            .eq("id", id);

        if (error) throw error;

        await carregarMaterias();

    } catch (error) {
        console.error(error);
        alert("Não foi possível excluir a matéria.");
    }
}

async function excluirTopico(id) {
    const confirmar = confirm(
        "Excluir este tópico?\n\n" +
        "Todos os assuntos deste tópico também serão excluídos."
    );

    if (!confirmar) return;

    try {
        const { error } = await db
            .from("topicos")
            .delete()
            .eq("id", id);

        if (error) throw error;

        await carregarTopicos();

    } catch (error) {
        console.error(error);
        alert("Não foi possível excluir o tópico.");
    }
}

async function excluirAssunto(id) {
    const confirmar = confirm(
        "Excluir este assunto?\n\n" +
        "Essa ação não poderá ser desfeita."
    );

    if (!confirmar) return;

    try {
        const { error } = await db
            .from("assuntos")
            .delete()
            .eq("id", id);

        if (error) throw error;

        await carregarAssuntos();

    } catch (error) {
        console.error(error);
        alert("Não foi possível excluir o assunto.");
    }
}

/* =========================================================
   CABEÇALHO / BREADCRUMB
========================================================= */

function atualizarCabecalho() {
    if (nivelAtual === "materias") {
        tituloPagina.textContent = "Matérias";
        subtituloPagina.textContent =
            "Organize sua estrutura de estudos.";
    }

    if (nivelAtual === "topicos") {
        tituloPagina.textContent = materiaAtual.nome;
        subtituloPagina.textContent =
            "Tópicos desta matéria.";
    }

    if (nivelAtual === "assuntos") {
        tituloPagina.textContent = topicoAtual.nome;
        subtituloPagina.textContent =
            "Assuntos para estudar.";
    }

    atualizarBreadcrumb();
}

function atualizarBreadcrumb() {
    let html = `
        <span
            class="breadcrumb-item ${
                nivelAtual === "materias" ? "ativo" : ""
            }"
            data-nivel="materias"
        >
            Matérias
        </span>
    `;

    if (materiaAtual) {
        html += `
            <span class="breadcrumb-separador">/</span>

            <span
                class="breadcrumb-item ${
                    nivelAtual === "topicos"
                        ? "ativo"
                        : ""
                }"
                data-nivel="topicos"
            >
                ${escaparHTML(materiaAtual.nome)}
            </span>
        `;
    }

    if (topicoAtual) {
        html += `
            <span class="breadcrumb-separador">/</span>

            <span class="breadcrumb-item ativo">
                ${escaparHTML(topicoAtual.nome)}
            </span>
        `;
    }

    breadcrumb.innerHTML = html;

    breadcrumb
        .querySelectorAll(".breadcrumb-item:not(.ativo)")
        .forEach(item => {

            item.addEventListener("click", () => {

                if (item.dataset.nivel === "materias") {
                    carregarMaterias();
                }

                if (item.dataset.nivel === "topicos") {
                    nivelAtual = "topicos";
                    topicoAtual = null;
                    carregarTopicos();
                }

            });

        });
}

/* =========================================================
   MODAL
========================================================= */

function abrirModalCriacao() {
    modoFormulario = "criar";
    itemEditando = null;

    abrirModal();
}

function abrirModal() {
    modalOverlay.classList.add("aberto");

    nomeItem.value =
        itemEditando?.nome || "";

    duracaoItem.value =
        itemEditando?.duracao_min || 60;

    corItem.value =
        itemEditando?.cor ||
        materiaAtual?.cor ||
        "#8b5cf6";

    atualizarModal();

    setTimeout(() => {
        nomeItem.focus();
    }, 100);
}

function atualizarModal() {
    if (nivelAtual === "materias") {

        modalTitulo.textContent =
            modoFormulario === "editar"
                ? "Editar matéria"
                : "Nova matéria";

        campoCor.style.display = "flex";
        campoDuracao.style.display = "none";
    }

    if (nivelAtual === "topicos") {

        modalTitulo.textContent =
            modoFormulario === "editar"
                ? "Editar tópico"
                : "Novo tópico";

        campoCor.style.display = "none";
        campoDuracao.style.display = "none";
    }

    if (nivelAtual === "assuntos") {

        modalTitulo.textContent =
            modoFormulario === "editar"
                ? "Editar assunto"
                : "Novo assunto";

        campoCor.style.display = "none";
        campoDuracao.style.display = "flex";
    }
}

function fecharModal() {
    modalOverlay.classList.remove("aberto");

    formItem.reset();

    itemEditando = null;
    modoFormulario = "criar";
}

/* =========================================================
   SALVAR
========================================================= */

async function salvarItem(event) {
    event.preventDefault();

    const nome = nomeItem.value.trim();

    if (!nome) {
        nomeItem.focus();
        return;
    }

    try {

        /* MATÉRIA */

        if (nivelAtual === "materias") {

            if (modoFormulario === "editar") {

                const { error } = await db
                    .from("materias")
                    .update({
                        nome,
                        cor: corItem.value
                    })
                    .eq("id", itemEditando.id);

                if (error) throw error;

            } else {

                const { error } = await db
                    .from("materias")
                    .insert({
                        nome,
                        cor: corItem.value
                    });

                if (error) throw error;
            }

            fecharModal();
            await carregarMaterias();

            return;
        }

        /* TÓPICO */

        if (nivelAtual === "topicos") {

            if (modoFormulario === "editar") {

                const { error } = await db
                    .from("topicos")
                    .update({
                        nome
                    })
                    .eq("id", itemEditando.id);

                if (error) throw error;

            } else {

                const { error } = await db
                    .from("topicos")
                    .insert({
                        nome,
                        materia_id: materiaAtual.id
                    });

                if (error) throw error;
            }

            fecharModal();
            await carregarTopicos();

            return;
        }

        /* ASSUNTO */

        if (nivelAtual === "assuntos") {

            if (modoFormulario === "editar") {

                const { error } = await db
                    .from("assuntos")
                    .update({
                        nome,
                        duracao_min:
                            Number(duracaoItem.value)
                    })
                    .eq("id", itemEditando.id);

                if (error) throw error;

            } else {

                const { error } = await db
                    .from("assuntos")
                    .insert({
                        nome,
                        topico_id: topicoAtual.id,
                        duracao_min:
                            Number(duracaoItem.value)
                    });

                if (error) throw error;
            }

            fecharModal();
            await carregarAssuntos();
        }

    } catch (error) {

        console.error(error);

        alert(
            "Não foi possível salvar. " +
            "Verifique sua conexão e tente novamente."
        );
    }
}

/* =========================================================
   CORES
========================================================= */

function aplicarCores() {
    document
        .querySelectorAll(".estudo-cor")
        .forEach(elemento => {

            const cor = elemento.dataset.cor;

            if (/^#[0-9A-Fa-f]{6}$/.test(cor)) {
                elemento.style.backgroundColor = cor;
            }

        });
}