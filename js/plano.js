const listaPlano = document.getElementById("lista-plano");

const totalEstudos = document.getElementById("total-estudos");
const totalMinutos = document.getElementById("total-minutos");
const totalConcluidos = document.getElementById("total-concluidos");

const dataTitulo = document.getElementById("data-titulo");
const dataSubtitulo = document.getElementById("data-subtitulo");

const btnHoje = document.getElementById("btn-hoje");
const btnDiaAnterior = document.getElementById("btn-dia-anterior");
const btnProximoDia = document.getElementById("btn-proximo-dia");

const semanaDias = document.getElementById("semana-dias");
const semanaTitulo = document.getElementById("semana-titulo");
const semanaSubtitulo = document.getElementById("semana-subtitulo");

const btnSemanaAnterior =
    document.getElementById("btn-semana-anterior");

const btnSemanaProxima =
    document.getElementById("btn-semana-proxima");

let dadosSemana = [];

const btnAdicionar = document.getElementById("btn-adicionar-estudo");
const fabAdicionar = document.getElementById("fab-adicionar");

const btnTema = document.getElementById("btn-tema");

const modalOverlay = document.getElementById("modal-overlay");
const btnFecharModal = document.getElementById("btn-fechar-modal");

const formPlano = document.getElementById("form-plano");
const assuntoSelect = document.getElementById("assunto-select");
const dataEstudo = document.getElementById("data-estudo");
const duracaoEstudo = document.getElementById("duracao-estudo");

const btnGerarPlano =
    document.getElementById("btn-gerar-plano");

const modalGerador =
    document.getElementById("modal-gerador");

const btnFecharGerador =
    document.getElementById("btn-fechar-gerador");

const formGerador =
    document.getElementById("form-gerador");

const geradorInicio =
    document.getElementById("gerador-inicio");

const geradorFim =
    document.getElementById("gerador-fim");

const geradorMinutos =
    document.getElementById("gerador-minutos");

const geradorModo =
    document.getElementById("gerador-modo");

const btnConfirmarGerador =
    document.getElementById("btn-confirmar-gerador");

const btnReplanejar =
    document.getElementById("btn-replanejar");

const totalAtrasados =
    document.getElementById("total-atrasados");


const CONFIG_GERADOR_PADRAO = {
    minutosPorDia: 120,
    diasSemana: [1, 2, 3, 4, 5],
    modo: "intercalado"
};

const btnSalvarConfigGerador =
    document.getElementById(
        "btn-salvar-config-gerador"
    );

const CHAVE_CONFIG_GERADOR = "config-gerador-estudos";

let modoModal = "criar";
let planoEditando = null;

let dataSelecionada = obterDataHoje();
let planosDoDia = [];


/* =========================================================
   INICIALIZAÇÃO
========================================================= */

document.addEventListener("DOMContentLoaded", async () => {
    configurarEventos();

    atualizarDataInterface();

    await carregarSemana();
    await carregarPlano();
});


/* =========================================================
   EVENTOS
========================================================= */

function configurarEventos() {
    btnHoje?.addEventListener("click", irParaHoje);

    btnDiaAnterior?.addEventListener("click", () => {
        mudarDia(-1);
    });

    btnProximoDia?.addEventListener("click", () => {
        mudarDia(1);
    });

    btnAdicionar?.addEventListener("click", abrirModalCriacao);

    fabAdicionar?.addEventListener("click", abrirModalCriacao);

    btnFecharModal?.addEventListener("click", fecharModal);


    btnReplanejar?.addEventListener(
        "click",
        replanejarPendencias
    );

    modalOverlay?.addEventListener("click", event => {
        if (event.target === modalOverlay) {
            fecharModal();
        }
    });

    formPlano?.addEventListener("submit", adicionarEstudo);

    btnTema?.addEventListener("click", alternarTema);

    btnGerarPlano?.addEventListener(
    "click",
    abrirGerador
    );

    btnFecharGerador?.addEventListener(
        "click",
        fecharGerador
    );

    modalGerador?.addEventListener("click", event => {

        if (event.target === modalGerador) {
            fecharGerador();
        }

    });

    formGerador?.addEventListener(
        "submit",
        gerarPlanoAutomaticamente
    );

    btnSalvarConfigGerador?.addEventListener(
        "click",
        () => {

            const dias =
                obterDiasSelecionados();

            if (!dias.length) {

                alert(
                    "Selecione pelo menos um dia da semana."
                );

                return;
            }

            salvarConfiguracaoGerador();

            alert(
                "Configuração salva! ✓"
            );
        }
    );
}

geradorMinutos?.addEventListener(
    "change",
    salvarConfiguracaoGerador
);

geradorModo?.addEventListener(
    "change",
    salvarConfiguracaoGerador
);

document
    .querySelectorAll(
        ".dia-checkbox input"
    )
    .forEach(input => {

        input.addEventListener(
            "change",
            () => {

                if (
                    obterDiasSelecionados()
                        .length > 0
                ) {
                    salvarConfiguracaoGerador();
                }

            }
        );

    });


async function buscarEstudosAtrasados() {

    const hoje = obterDataHoje();

    const { data, error } = await db
        .from("plano_estudos")
        .select(`
            id,
            assunto_id,
            data,
            ordem,
            duracao_min,
            status,
            origem,
            assuntos (
                id,
                nome,
                status,
                duracao_min,
                topicos (
                    id,
                    nome,
                    materias (
                        id,
                        nome,
                        cor
                    )
                )
            )
        `)
        .lt("data", hoje)
        .eq("status", "pendente")
        .eq("origem", "auto")
        .order("data", {
            ascending: true
        })
        .order("ordem", {
            ascending: true
        });

    if (error) {
        throw error;
    }

    return data || [];
}

function obterProximosDias(
    quantidade,
    minutosPorDia = 120
) {

    const dias = [];

    const hoje = new Date();

    hoje.setHours(
        0,
        0,
        0,
        0
    );

    let atual = new Date(hoje);

    while (dias.length < quantidade) {

        const diaSemana =
            atual.getDay();

        // Segunda até sexta
        if (
            diaSemana >= 1 &&
            diaSemana <= 5
        ) {

            dias.push({
                data: formatarDataISO(atual),
                minutosDisponiveis:
                    minutosPorDia
            });
        }

        atual.setDate(
            atual.getDate() + 1
        );
    }

    return dias;
}

async function replanejarPendencias() {

    const atrasados =
        await buscarEstudosAtrasados();

    if (!atrasados.length) {

        alert("Você não possui estudos atrasados. ✓");

        return;
    }


    const config =
        carregarConfiguracaoGerador();


    const diasSemana =
        config.diasSemana?.length
            ? config.diasSemana
            : [1, 2, 3, 4, 5];


    const minutosPorDia =
        Number(config.minutosPorDia) || 120;


    const primeiroDia =
        obterDataComDeslocamento(
            obterDataHoje(),
            1
        );


    /*
     * Procuramos dias futuros suficientes
     * para acomodar todos os atrasados.
     */

    let diasDisponiveis = [];

    let dataTeste = primeiroDia;

    let limiteDias = 180;


    while (
        diasDisponiveis.length < 180 &&
        limiteDias > 0
    ) {

        const diaSemana =
            converterData(dataTeste).getDay();

        if (
            diasSemana.includes(diaSemana)
        ) {
            diasDisponiveis.push(dataTeste);
        }

        dataTeste =
            obterDataComDeslocamento(
                dataTeste,
                1
            );

        limiteDias--;

    }


    /*
     * Corrige caso diasSemana tenha vindo
     * com valores inválidos.
     */

    if (!diasSemana.length) {

        alert(
            "Sua configuração não possui dias válidos para estudo."
        );

        return;
    }


    /*
     * Confirmação.
     */

    const totalMinutos =
        atrasados.reduce(
            (total, item) =>
                total + Number(item.duracao_min || 0),
            0
        );


    const confirmar =
        confirm(
            `Você possui ${atrasados.length} estudo(s) atrasado(s), totalizando ${totalMinutos} minutos.\n\n` +
            `Eles serão redistribuídos a partir de amanhã usando sua configuração atual.\n\n` +
            `Deseja continuar?`
        );


    if (!confirmar) {
        return;
    }


    /*
     * Descobrimos a ordem atual dos planos futuros.
     */

    const { data: planosFuturos, error: erroOrdem } =
        await db
            .from("plano_estudos")
            .select("ordem")
            .gte("data", primeiroDia)
            .order("ordem", { ascending: false })
            .limit(1);


    if (erroOrdem) {
        console.error(erroOrdem);
    }


    let proximaOrdem =
        Number(
            planosFuturos?.[0]?.ordem || -1
        ) + 1;


    /*
     * Vamos montar novos blocos.
     */

    const novosPlanos = [];

    let indiceDia = 0;

    let minutosDisponiveisNoDia =
        minutosPorDia;


    for (const estudo of atrasados) {

        let restante =
            Number(
                estudo.duracao_min || 0
            );


        while (restante > 0) {

            /*
             * Se acabaram os minutos do dia,
             * passamos para o próximo dia.
             */

            if (
                minutosDisponiveisNoDia <= 0
            ) {

                indiceDia++;

                minutosDisponiveisNoDia =
                    minutosPorDia;

            }


            /*
             * Se acabaram os dias calculados,
             * interrompe.
             */

            if (
                !diasDisponiveis[indiceDia]
            ) {

                throw new Error(
                    "Não foi possível encontrar dias suficientes para replanejar os estudos."
                );

            }


            const quantidade =
                Math.min(
                    restante,
                    minutosDisponiveisNoDia
                );


            novosPlanos.push({

                assunto_id:
                    estudo.assunto_id,

                data:
                    diasDisponiveis[indiceDia],

                duracao_min:
                    quantidade,

                ordem:
                    proximaOrdem++,

                status:
                    "pendente",

                origem:
                    "auto"

            });


            restante -= quantidade;

            minutosDisponiveisNoDia -= quantidade;

        }

    }


    /*
     * Só apagamos os antigos depois
     * que conseguimos montar tudo.
     */

    const idsAntigos =
        atrasados.map(
            item => item.id
        );


    const { error: erroDelete } =
        await db
            .from("plano_estudos")
            .delete()
            .in("id", idsAntigos);


    if (erroDelete) {
        throw erroDelete;
    }


    /*
     * Inserimos os novos blocos.
     */

    if (novosPlanos.length) {

        const {
            error: erroInsert
        } = await db
            .from("plano_estudos")
            .insert(novosPlanos);


        if (erroInsert) {
            throw erroInsert;
        }

    }


    /*
     * Atualizamos a tela.
     */

    await carregarSemana();

    await carregarPlano();


    alert(
        `${atrasados.length} estudo(s) replanejado(s)! ✓`
    );

}

/* =========================================================
   DATA
========================================================= */

function obterDataHoje() {
    const agora = new Date();

    const ano = agora.getFullYear();

    const mes = String(
        agora.getMonth() + 1
    ).padStart(2, "0");

    const dia = String(
        agora.getDate()
    ).padStart(2, "0");

    return `${ano}-${mes}-${dia}`;
}


function formatarData(data) {
    const [ano, mes, dia] = data
        .split("-")
        .map(Number);

    const dataObj = new Date(
        ano,
        mes - 1,
        dia
    );

    return dataObj.toLocaleDateString(
        "pt-BR",
        {
            weekday: "long",
            day: "2-digit",
            month: "long"
        }
    );
}


async function mudarDia(dias) {
    const [ano, mes, dia] =
        dataSelecionada
            .split("-")
            .map(Number);

    const novaData = new Date(
        ano,
        mes - 1,
        dia
    );

    const semanaAntes =
        obterInicioSemana(dataSelecionada);

    novaData.setDate(
        novaData.getDate() + dias
    );

    const novaDataISO =
        formatarDataISO(novaData);

    const semanaDepois =
        obterInicioSemana(novaDataISO);

    dataSelecionada =
        novaDataISO;

    atualizarDataInterface();

    if (semanaAntes !== semanaDepois) {
        await carregarSemana();
    } else {
        // Apenas atualiza o destaque
        renderizarSemana(
            semanaAntes,
            obterFimSemana(semanaAntes)
        );
    }

    await carregarPlano();

    rolarDiaSelecionadoParaVisao();
}

function obterFimSemana(inicioISO) {
    const [ano, mes, dia] =
        inicioISO.split("-").map(Number);

    const data = new Date(
        ano,
        mes - 1,
        dia
    );

    data.setDate(
        data.getDate() + 6
    );

    return formatarDataISO(data);
}

async function irParaHoje() {
    dataSelecionada = obterDataHoje();

    atualizarDataInterface();

    await carregarSemana();
    await carregarPlano();

    rolarDiaSelecionadoParaVisao();
}


function atualizarDataInterface() {
    const hoje = obterDataHoje();

    const ehHoje =
        dataSelecionada === hoje;

    dataTitulo.textContent = ehHoje
        ? "Hoje"
        : capitalizar(
            formatarData(dataSelecionada)
        );

    dataSubtitulo.textContent =
        formatarDataNumerica(dataSelecionada);
}


function formatarDataNumerica(data) {
    const [ano, mes, dia] = data.split("-");

    return `${dia}/${mes}/${ano}`;
}


function capitalizar(texto) {
    if (!texto) {
        return "";
    }

    return texto.charAt(0).toUpperCase()
        + texto.slice(1);
}


/* =========================================================
   CARREGAR PLANO
========================================================= */

async function carregarPlano() {
    listaPlano.innerHTML = `
        <div class="loading">
            Carregando...
        </div>
    `;

    try {
        const { data, error } = await db
            .from("plano_estudos")
            .select(`
                id,
                assunto_id,
                data,
                ordem,
                duracao_min,
                status,
                origem,
                assuntos (
                    id,
                    nome,
                    status,
                    topicos (
                        id,
                        nome,
                        materias (
                            id,
                            nome,
                            cor
                        )
                    )
                )
            `)
            .eq("data", dataSelecionada)
            .order("ordem", {
                ascending: true
            });

        if (error) {
            throw error;
        }

        planosDoDia = data || [];

        renderizarPlano();

    } catch (error) {
        console.error("Erro ao carregar plano:", error);

        listaPlano.innerHTML = `
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
   RENDERIZAR PLANO
========================================================= */

function renderizarPlano() {
    atualizarResumo();

    if (!planosDoDia.length) {
        listaPlano.innerHTML = `
            <div class="lista-vazia">
                <div class="lista-vazia-icone">📅</div>
                <h3>Nada planejado para este dia</h3>
                <p>Adicione um assunto ao seu plano de estudos.</p>
            </div>
        `;
        return;
    }

    listaPlano.innerHTML = `
        <div class="lista-plano" id="lista-plano-itens">
            ${planosDoDia.map(item => criarCardPlano(item)).join("")}
        </div>
    `;

    configurarEventosCards();
    configurarArrastar();
}


function criarCardPlano(item) {
    const assunto = item.assuntos;
    const topico = assunto?.topicos;
    const materia = topico?.materias;

    const concluido =
        item.status === "concluido";

    const nomeMateria =
        materia?.nome || "Matéria";

    const nomeAssunto =
        assunto?.nome || "Assunto";

    const corMateria =
        materia?.cor || "#8b5cf6";

    return `
        <article
            class="plano-card ${concluido ? "concluido" : ""}"
            data-id="${item.id}"
        >

            <div class="plano-drag" aria-label="Arrastar estudo" title="Arrastar para reorganizar">
                ☰
            </div>

            <div class="plano-check">

                <input
                    type="checkbox"
                    class="checkbox"
                    data-id="${item.id}"
                    ${concluido ? "checked" : ""}
                    aria-label="Concluir estudo"
                >

            </div>


            <div class="plano-info">

                <div class="plano-materia">

                    <span
                        class="plano-cor"
                        data-cor="${escaparAtributo(corMateria)}"
                    ></span>

                    ${escaparHTML(nomeMateria)}

                </div>


                <h3 class="plano-assunto">
                    ${escaparHTML(nomeAssunto)}
                </h3>


                <div class="plano-meta">

                    <span>
                        ⏱️ ${formatarDuracao(item.duracao_min)}
                    </span>

                    ${
                        item.origem === "manual"
                            ? `
                                <span>
                                    Manual
                                </span>
                            `
                            : ""
                    }

                </div>

            </div>


            <div class="plano-acoes">

                <button
                    type="button"
                    class="btn-icone btn-editar-plano"
                    data-id="${item.id}"
                    aria-label="Editar estudo"
                >
                    ✎
                </button>

                <button
                    type="button"
                    class="btn-icone btn-excluir-plano"
                    data-id="${item.id}"
                    aria-label="Excluir estudo"
                >
                    🗑
                </button>

            </div>

        </article>
    `;
}


/* =========================================================
   EVENTOS DOS CARDS
========================================================= */

function configurarEventosCards() {
    document
        .querySelectorAll(".plano-check .checkbox")
        .forEach(checkbox => {

            checkbox.addEventListener(
                "change",
                async () => {

                    await alterarStatusPlano(
                        checkbox.dataset.id,
                        checkbox.checked
                    );

                }
            );

        });


    document
        .querySelectorAll(".btn-editar-plano")
        .forEach(botao => {

            botao.addEventListener(
                "click",
                () => {
                    editarPlano(botao.dataset.id);
                }
            );

        });


    document
        .querySelectorAll(".btn-excluir-plano")
        .forEach(botao => {

            botao.addEventListener(
                "click",
                () => {
                    excluirPlano(botao.dataset.id);
                }
            );

        });


    aplicarCores();
}


/* =========================================================
   RESUMO
========================================================= */

async function atualizarResumo() {

    const total =
        planosDoDia.length;

    const minutos =
        planosDoDia.reduce(
            (soma, item) =>
                soma +
                Number(
                    item.duracao_min || 0
                ),
            0
        );

    const concluidos =
        planosDoDia.filter(
            item =>
                item.status === "concluido"
        ).length;

    totalEstudos.textContent =
        total;

    totalMinutos.textContent =
        minutos;

    totalConcluidos.textContent =
        concluidos;

    try {

        const hoje =
            obterDataHoje();

        const {
            count,
            error
        } = await db
            .from("plano_estudos")
            .select(
                "id",
                {
                    count: "exact",
                    head: true
                }
            )
            .lt("data", hoje)
            .eq("status", "pendente");

        if (error) {
            throw error;
        }

        totalAtrasados.textContent =
            count || 0;

    } catch (error) {

        console.error(
            "Erro ao contar atrasados:",
            error
        );

        totalAtrasados.textContent =
            "—";
    }
}

/* =========================================================
   ALTERAR STATUS
========================================================= */

async function alterarStatusPlano(id, concluido) {

    const novoStatus =
        concluido
            ? "concluido"
            : "pendente";

    try {

        const {
            data: plano,
            error
        } = await db
            .from("plano_estudos")
            .update({
                status: novoStatus
            })
            .eq("id", id)
            .select("assunto_id")
            .single();

        if (error) {
            throw error;
        }

        if (plano?.assunto_id) {

            await atualizarStatusAssunto(
                plano.assunto_id
            );
        }

        await carregarPlano();

        await carregarSemana();

    } catch (error) {

        console.error(
            "Erro ao alterar status:",
            error
        );

        alert(
            "Não foi possível atualizar o estudo."
        );

        await carregarPlano();
    }
}


/* =========================================================
   MODAL
========================================================= */

async function abrirModalCriacao() {
    modoModal = "criar";
    planoEditando = null;

    document.getElementById("modal-titulo").textContent =
        "Adicionar estudo";

    document.getElementById("btn-salvar-plano").textContent =
        "Adicionar ao plano";

    assuntoSelect.disabled = false;

    formPlano.reset();

    dataEstudo.value = dataSelecionada;

    duracaoEstudo.value = "60";

    await carregarAssuntosDisponiveis();

    modalOverlay.classList.add("aberto");

    setTimeout(() => {
        assuntoSelect.focus();
    }, 100);
}


function fecharModal() {
    modalOverlay.classList.remove("aberto");

    formPlano.reset();

    assuntoSelect.disabled = false;

    modoModal = "criar";

    planoEditando = null;
}

/* =========================================================
   ASSUNTOS DISPONÍVEIS
========================================================= */

async function carregarAssuntosDisponiveis() {
    assuntoSelect.innerHTML = `
        <option value="">
            Carregando assuntos...
        </option>
    `;

    try {
        const {
            data,
            error
        } = await db
            .from("assuntos")
            .select(`
                id,
                nome,
                duracao_min,
                status,
                topicos (
                    nome,
                    materias (
                        nome
                    )
                )
            `)
            .neq(
                "status",
                "concluido"
            )
            .order("nome");

        if (error) {
            throw error;
        }

        if (!data || !data.length) {
            assuntoSelect.innerHTML = `
                <option value="">
                    Nenhum assunto disponível
                </option>
            `;

            return;
        }

        assuntoSelect.innerHTML = `
            <option value="">
                Selecione um assunto
            </option>

            ${data
                .map(assunto => {

                    const materia =
                        assunto.topicos
                            ?.materias
                            ?.nome ||
                        "Matéria";

                    return `
                        <option
                            value="${assunto.id}"
                            data-duracao="${assunto.duracao_min}"
                        >
                            ${escaparHTML(materia)}
                            —
                            ${escaparHTML(assunto.nome)}
                        </option>
                    `;
                })
                .join("")}
        `;

    } catch (error) {
        console.error(
            "Erro ao carregar assuntos:",
            error
        );

        assuntoSelect.innerHTML = `
            <option value="">
                Erro ao carregar assuntos
            </option>
        `;
    }
}


/* =========================================================
   ADICIONAR ESTUDO
========================================================= */

async function adicionarEstudo(event) {
    event.preventDefault();

    const assuntoId = assuntoSelect.value;
    const data = dataEstudo.value;
    const duracao = Number(duracaoEstudo.value);

    if (!assuntoId || !data || !duracao) {
        return;
    }

    try {

        /* =================================================
           EDITAR
        ================================================= */

        if (modoModal === "editar") {

            const dataAntiga =
                planoEditando.data;

            /*
             * Se mudou a data, verificamos se o
             * mesmo assunto já existe no novo dia.
             */

            if (data !== dataAntiga) {

                const {
                    data: existente,
                    error: erroBusca
                } = await db
                    .from("plano_estudos")
                    .select("id")
                    .eq("assunto_id", assuntoId)
                    .eq("data", data)
                    .neq("id", planoEditando.id)
                    .maybeSingle();

                if (erroBusca) {
                    throw erroBusca;
                }

                if (existente) {
                    alert(
                        "Este assunto já está planejado para o novo dia."
                    );

                    return;
                }
            }


            /*
             * Descobre a ordem do novo dia.
             */

            let ordem = planoEditando.ordem;

            if (data !== dataAntiga) {

                const {
                    data: ultimo,
                    error: erroOrdem
                } = await db
                    .from("plano_estudos")
                    .select("ordem")
                    .eq("data", data)
                    .order("ordem", {
                        ascending: false
                    })
                    .limit(1)
                    .maybeSingle();

                if (erroOrdem) {
                    throw erroOrdem;
                }

                ordem = ultimo
                    ? Number(ultimo.ordem) + 1
                    : 0;
            }


            /*
             * Atualiza o estudo.
             */

            const {
                error
            } = await db
                .from("plano_estudos")
                .update({
                    data: data,
                    duracao_min: duracao,
                    ordem: ordem,
                    origem: "manual"
                })
                .eq(
                    "id",
                    planoEditando.id
                );

            if (error) {
                throw error;
            }


            fecharModal();

            dataSelecionada = data;

            atualizarDataInterface();

            await carregarPlano();

            return;
        }


        /* =================================================
           CRIAR
        ================================================= */

        const {
            data: existente,
            error: erroBusca
        } = await db
            .from("plano_estudos")
            .select("id")
            .eq("assunto_id", assuntoId)
            .eq("data", data)
            .maybeSingle();

        if (erroBusca) {
            throw erroBusca;
        }

        if (existente) {
            alert(
                "Este assunto já está planejado para este dia."
            );

            return;
        }


        /*
         * Descobre a próxima ordem.
         */

        const {
            data: ultimo,
            error: erroOrdem
        } = await db
            .from("plano_estudos")
            .select("ordem")
            .eq("data", data)
            .order("ordem", {
                ascending: false
            })
            .limit(1)
            .maybeSingle();

        if (erroOrdem) {
            throw erroOrdem;
        }

        const ordem = ultimo
            ? Number(ultimo.ordem) + 1
            : 0;


        /*
         * Cria o estudo.
         */

        const {
            error
        } = await db
            .from("plano_estudos")
            .insert({
                assunto_id: assuntoId,
                data: data,
                ordem: ordem,
                duracao_min: duracao,
                status: "pendente",
                origem: "manual"
            });

        if (error) {
            throw error;
        }


        fecharModal();

        dataSelecionada = data;

        atualizarDataInterface();

        await carregarPlano();

    } catch (error) {

        console.error(
            "Erro ao salvar estudo:",
            error
        );

        alert(
            "Não foi possível salvar o estudo."
        );
    }
}


/* =========================================================
   EDITAR PLANO
========================================================= */

async function editarPlano(id) {
    const item = planosDoDia.find(
        plano => plano.id === id
    );

    if (!item) {
        return;
    }

    modoModal = "editar";
    planoEditando = item;

    document.getElementById("modal-titulo").textContent =
        "Editar estudo";

    document.getElementById("btn-salvar-plano").textContent =
        "Salvar alterações";

    assuntoSelect.innerHTML = `
        <option value="${item.assunto_id}">
            ${escaparHTML(
                item.assuntos?.nome || "Assunto"
            )}
        </option>
    `;

    assuntoSelect.value = item.assunto_id;

    assuntoSelect.disabled = true;

    dataEstudo.value = item.data;

    duracaoEstudo.value =
        String(item.duracao_min);

    modalOverlay.classList.add("aberto");

    setTimeout(() => {
        dataEstudo.focus();
    }, 100);
}


/* =========================================================
   EXCLUIR PLANO
========================================================= */

async function excluirPlano(id) {
    const confirmar = confirm(
        "Remover este estudo do plano?\n\n" +
        "O assunto continuará cadastrado em Matérias."
    );

    if (!confirmar) {
        return;
    }

    try {
        const {
            error
        } = await db
            .from("plano_estudos")
            .delete()
            .eq("id", id);

        if (error) {
            throw error;
        }

        await carregarPlano();

    } catch (error) {
        console.error(
            "Erro ao excluir estudo:",
            error
        );

        alert(
            "Não foi possível remover o estudo."
        );
    }
}


/* =========================================================
   CORES
========================================================= */

function aplicarCores() {
    document
        .querySelectorAll(".plano-cor")
        .forEach(elemento => {

            const cor =
                elemento.dataset.cor;

            if (
                /^#[0-9A-Fa-f]{6}$/.test(cor)
            ) {
                elemento.style.backgroundColor =
                    cor;
            }

        });
}


/* =========================================================
   UTILITÁRIOS
========================================================= */

function escaparHTML(texto) {
    const div =
        document.createElement("div");

    div.textContent =
        texto ?? "";

    return div.innerHTML;
}


function escaparAtributo(texto) {
    return escaparHTML(texto)
        .replace(/"/g, "&quot;");
}


function formatarDuracao(minutos) {
    minutos = Number(minutos || 0);

    if (minutos < 60) {
        return `${minutos} min`;
    }

    const horas =
        Math.floor(minutos / 60);

    const resto =
        minutos % 60;

    if (!resto) {
        return horas === 1
            ? "1 hora"
            : `${horas} horas`;
    }

    return `${horas}h ${resto}min`;
}

function configurarArrastar() {
    const lista = document.getElementById("lista-plano-itens");

    if (!lista) {
        return;
    }

    if (typeof Sortable === "undefined") {
        console.warn("SortableJS não foi carregado.");
        return;
    }

    new Sortable(lista, {
        animation: 150,

        handle: ".plano-drag",

        ghostClass: "plano-card-arrastando",

        chosenClass: "plano-card-selecionado",

        dragClass: "plano-card-arrastando",

        onEnd: async () => {
            await salvarOrdemPlano();
        }
    });
}

async function salvarOrdemPlano() {
    const cards = [
        ...document.querySelectorAll("#lista-plano-itens .plano-card")
    ];

    if (!cards.length) {
        return;
    }

    try {
        for (let i = 0; i < cards.length; i++) {
            const id = cards[i].dataset.id;

            const { error } = await db
                .from("plano_estudos")
                .update({
                    ordem: i,
                    origem: "manual"
                })
                .eq("id", id);

            if (error) {
                throw error;
            }
        }

        planosDoDia = cards.map((card, index) => {
            const item = planosDoDia.find(
                plano => plano.id === card.dataset.id
            );

            if (item) {
                item.ordem = index;
            }

            return item;
        }).filter(Boolean);

    } catch (error) {
        console.error("Erro ao salvar ordem:", error);

        alert("Não foi possível salvar a nova ordem.");

        await carregarPlano();
    }
}

function obterInicioSemana(data) {
    const [ano, mes, dia] = data.split("-").map(Number);

    const dataObj = new Date(ano, mes - 1, dia);

    const diaSemana = dataObj.getDay();

    // Segunda = 0
    const diferenca = diaSemana === 0
        ? -6
        : 1 - diaSemana;

    dataObj.setDate(dataObj.getDate() + diferenca);

    return formatarDataISO(dataObj);
}

function formatarDataISO(data) {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, "0");
    const dia = String(data.getDate()).padStart(2, "0");

    return `${ano}-${mes}-${dia}`;
}

async function mudarSemana(semanas) {
    const inicio = obterInicioSemana(dataSelecionada);

    const [ano, mes, dia] = inicio.split("-").map(Number);

    const novaData = new Date(
        ano,
        mes - 1,
        dia
    );

    novaData.setDate(
        novaData.getDate() + (semanas * 7)
    );

    dataSelecionada = formatarDataISO(novaData);

    atualizarDataInterface();

    await carregarSemana();
    await carregarPlano();

    rolarDiaSelecionadoParaVisao();
}

async function carregarSemana() {
    if (!semanaDias) {
        return;
    }

    semanaDias.innerHTML = `
        <div class="loading">
            Carregando...
        </div>
    `;

    try {
        const inicio = obterInicioSemana(dataSelecionada);

        const [ano, mes, dia] = inicio.split("-").map(Number);

        const dataInicio = new Date(
            ano,
            mes - 1,
            dia
        );

        const dataFim = new Date(dataInicio);

        dataFim.setDate(
            dataFim.getDate() + 6
        );

        const inicioISO = formatarDataISO(dataInicio);
        const fimISO = formatarDataISO(dataFim);

        const { data, error } = await db
            .from("plano_estudos")
            .select(`
                id,
                data,
                duracao_min,
                status
            `)
            .gte("data", inicioISO)
            .lte("data", fimISO);

        if (error) {
            throw error;
        }

        dadosSemana = data || [];

        renderizarSemana(
            inicioISO,
            fimISO
        );

    } catch (error) {
        console.error(
            "Erro ao carregar semana:",
            error
        );

        semanaDias.innerHTML = `
            <div class="lista-vazia">
                <h3>Não foi possível carregar a semana</h3>
                <p>Tente novamente.</p>
            </div>
        `;
    }
}

function renderizarSemana(inicioISO, fimISO) {
    const [ano, mes, dia] = inicioISO
        .split("-")
        .map(Number);

    const inicio = new Date(
        ano,
        mes - 1,
        dia
    );

    const dias = [];

    for (let i = 0; i < 7; i++) {
        const data = new Date(inicio);

        data.setDate(
            data.getDate() + i
        );

        const dataISO = formatarDataISO(data);

        const estudos = dadosSemana.filter(
            item => item.data === dataISO
        );

        const total = estudos.length;

        const minutos = estudos.reduce(
            (soma, item) =>
                soma + Number(item.duracao_min || 0),
            0
        );

        const concluido = estudos.filter(
            item => item.status === "concluido"
        ).length;

        dias.push({
            data: dataISO,
            total,
            minutos,
            concluido,
            objeto: data
        });
    }

    const primeiro = dias[0].objeto;
    const ultimo = dias[6].objeto;

    atualizarTituloSemana(
        primeiro,
        ultimo
    );

    semanaDias.innerHTML = dias
        .map(criarDiaSemana)
        .join("");

    document
        .querySelectorAll(".semana-dia")
        .forEach(botao => {

            botao.addEventListener("click", async () => {

                const data = botao.dataset.data;

                dataSelecionada = data;

                atualizarDataInterface();

                renderizarSemana(
                    inicioISO,
                    fimISO
                );

                await carregarPlano();
            });

        });
}

function criarDiaSemana(dia) {
    const hoje = obterDataHoje();

    const ativo =
        dia.data === dataSelecionada;

    const ehHoje =
        dia.data === hoje;

    const nomesDias = [
        "dom",
        "seg",
        "ter",
        "qua",
        "qui",
        "sex",
        "sáb"
    ];

    const numeroDia =
        dia.objeto.getDate();

    const nomeDia =
        nomesDias[dia.objeto.getDay()];

    const minutosTexto =
        formatarDuracaoCurta(dia.minutos);

    return `
        <button
            type="button"
            class="semana-dia
                ${ativo ? "ativo" : ""}
                ${ehHoje ? "hoje" : ""}
                ${dia.total === 0 ? "vazio" : ""}"
            data-data="${dia.data}"
        >

            <span class="semana-dia-semana">
                ${nomeDia}
            </span>

            <span class="semana-dia-numero">
                ${numeroDia}
            </span>

            <span class="semana-dia-info">

                ${
                    dia.total > 0
                        ? `
                            <span>
                                ${dia.total}
                                ${dia.total === 1
                                    ? "estudo"
                                    : "estudos"}
                            </span>

                            <span>
                                ${minutosTexto}
                            </span>
                        `
                        : `
                            <span>
                                Livre
                            </span>
                        `
                }

            </span>

        </button>
    `;
}

function formatarDuracaoCurta(minutos) {
    minutos = Number(minutos || 0);

    if (minutos === 0) {
        return "0 min";
    }

    if (minutos < 60) {
        return `${minutos} min`;
    }

    const horas = Math.floor(minutos / 60);
    const resto = minutos % 60;

    if (resto === 0) {
        return `${horas}h`;
    }

    return `${horas}h ${resto}m`;
}

function atualizarTituloSemana(inicio, fim) {
    const opcoes = {
        day: "2-digit",
        month: "short"
    };

    const inicioTexto =
        inicio.toLocaleDateString(
            "pt-BR",
            opcoes
        );

    const fimTexto =
        fim.toLocaleDateString(
            "pt-BR",
            opcoes
        );

    semanaTitulo.textContent =
        `${inicioTexto} — ${fimTexto}`;

    const hoje = obterDataHoje();

    const inicioISO =
        formatarDataISO(inicio);

    const fimISO =
        formatarDataISO(fim);

    if (hoje >= inicioISO && hoje <= fimISO) {
        semanaSubtitulo.textContent =
            "Semana atual";
    } else {
        semanaSubtitulo.textContent =
            "Semana de estudos";
    }
}

function rolarDiaSelecionadoParaVisao() {
    const elemento =
        document.querySelector(
            `.semana-dia[data-data="${dataSelecionada}"]`
        );

    if (!elemento) {
        return;
    }

    elemento.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center"
    });
}

function abrirGerador() {

    const config =
        carregarConfiguracaoGerador();

    const hoje =
        obterDataHoje();

    geradorInicio.value =
        hoje;

    const [ano, mes, dia] =
        hoje.split("-").map(Number);

    const fim =
        new Date(
            ano,
            mes - 1,
            dia
        );

    fim.setDate(
        fim.getDate() + 30
    );

    geradorFim.value =
        formatarDataISO(fim);

    geradorMinutos.value =
        String(config.minutosPorDia);

    geradorModo.value =
        config.modo;

    document
        .querySelectorAll(
            ".dia-checkbox input"
        )
        .forEach(input => {

            input.checked =
                config.diasSemana.includes(
                    Number(input.value)
                );

        });

    atualizarResumoConfiguracaoGerador();

    modalGerador.classList.add(
        "aberto"
    );

    setTimeout(() => {
        geradorInicio.focus();
    }, 100);

    
}

function fecharGerador() {
    modalGerador.classList.remove("aberto");
}

function obterDiasSelecionados() {

    return [
        ...document.querySelectorAll(
            ".dia-checkbox input:checked"
        )
    ].map(input => Number(input.value));

}

function listarDiasDisponiveis(
    inicio,
    fim,
    diasSemana
) {

    const dias = [];

    const [anoInicio, mesInicio, diaInicio] =
        inicio.split("-").map(Number);

    const [anoFim, mesFim, diaFim] =
        fim.split("-").map(Number);

    const atual = new Date(
        anoInicio,
        mesInicio - 1,
        diaInicio
    );

    const limite = new Date(
        anoFim,
        mesFim - 1,
        diaFim
    );

    while (atual <= limite) {

        const diaSemana =
            atual.getDay();

        if (diasSemana.includes(diaSemana)) {

            dias.push(
                formatarDataISO(atual)
            );

        }

        atual.setDate(
            atual.getDate() + 1
        );
    }

    return dias;
}

function intercalarAssuntos(assuntos) {

    const grupos = {};

    assuntos.forEach(assunto => {

        const materiaId =
            assunto.topicos?.materias?.id ||
            assunto.topico_id;

        if (!grupos[materiaId]) {
            grupos[materiaId] = [];
        }

        grupos[materiaId].push(assunto);
    });

    const filas =
        Object.values(grupos);

    const resultado = [];

    let aindaTemAssunto = true;

    while (aindaTemAssunto) {

        aindaTemAssunto = false;

        filas.forEach(fila => {

            if (fila.length > 0) {

                resultado.push(
                    fila.shift()
                );

                aindaTemAssunto = true;
            }

        });
    }

    return resultado;
}

function gerarDistribuicao({
    assuntos,
    dias,
    minutosPorDia,
    modo
}) {

    let fila = [...assuntos];

    if (modo === "intercalado") {
        fila = intercalarAssuntos(fila);
    }

    const plano = [];

    let indiceDia = 0;
    let minutosDisponiveis = minutosPorDia;

    for (const assunto of fila) {

        let restante =
            Number(assunto.duracao_min || 60);

        while (restante > 0) {

            if (indiceDia >= dias.length) {

                return {
                    plano,
                    naoCouberam: true
                };
            }

            if (minutosDisponiveis <= 0) {

                indiceDia++;

                minutosDisponiveis =
                    minutosPorDia;

                continue;
            }

            const quantidade =
                Math.min(
                    restante,
                    minutosDisponiveis
                );

            plano.push({
                assunto_id: assunto.id,
                data: dias[indiceDia],
                duracao_min: quantidade,
                origem: "auto",
                status: "pendente"
            });

            restante -= quantidade;

            minutosDisponiveis -= quantidade;

            if (minutosDisponiveis <= 0) {

                indiceDia++;

                minutosDisponiveis =
                    minutosPorDia;
            }
        }
    }

    return {
        plano,
        naoCouberam: false
    };
}

async function buscarAssuntosParaGerar() {

    const {
        data,
        error
    } = await db
        .from("assuntos")
        .select(`
            id,
            nome,
            duracao_min,
            status,
            ordem,
            topico_id,
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
        .neq("status", "concluido")
        .order("ordem", {
            ascending: true
        });

    if (error) {
        throw error;
    }

    return data || [];
}

async function limparPlanosAutomaticosFuturos(
    dataInicio
) {

    const { error } = await db
        .from("plano_estudos")
        .delete()
        .eq("origem", "auto")
        .eq("status", "pendente")
        .gte("data", dataInicio);

    if (error) {
        throw error;
    }
}

async function buscarAssuntosManuaisPlanejados(dataInicio) {
    const { data, error } = await db
        .from("plano_estudos")
        .select("assunto_id, origem")
        .gte("data", dataInicio)
        .eq("origem", "manual");

    if (error) throw error;

    return new Set(
        (data || []).map(item => item.assunto_id)
    );
}

async function gerarPlanoAutomaticamente(event) {

    event.preventDefault();

    const inicio =
        geradorInicio.value;

    const fim =
        geradorFim.value;

    const minutosPorDia =
        Number(geradorMinutos.value);

    const modo =
        geradorModo.value;

    const diasSemana =
        obterDiasSelecionados();

    if (!inicio || !fim) {

        alert(
            "Informe o período do plano."
        );

        return;
    }

    if (fim < inicio) {

        alert(
            "A data final precisa ser igual ou posterior à data inicial."
        );

        return;
    }

    if (!diasSemana.length) {

        alert(
            "Selecione pelo menos um dia da semana."
        );

        return;
    }

    if (!minutosPorDia) {

        alert(
            "Informe quanto tempo você pode estudar por dia."
        );

        return;
    }

    salvarConfiguracaoGerador();

    const confirmar = confirm(
        "O plano automático pendente dentro desse período será recriado.\n\n" +
        "Estudos adicionados manualmente serão preservados.\n\n" +
        "Deseja continuar?"
    );

    if (!confirmar) {
        return;
    }

    btnConfirmarGerador.disabled = true;

    btnConfirmarGerador.textContent =
        "Gerando...";

    try {

        const dias =
            listarDiasDisponiveis(
                inicio,
                fim,
                diasSemana
            );

        if (!dias.length) {
            throw new Error(
                "Nenhum dia disponível foi encontrado."
            );
        }

        const assuntos =
            await buscarAssuntosParaGerar();

        if (!assuntos.length) {

            alert(
                "Não existem assuntos pendentes para gerar."
            );

            return;
        }

        // Remove os planos automáticos pendentes antigos
        // antes de gerar novamente.
        await limparPlanosAutomaticosFuturos(inicio);

        // Busca apenas os assuntos que possuem
        // planejamento manual no período.
        const assuntosManuais =
            await buscarAssuntosManuaisPlanejados(inicio);

        // Assuntos com planejamento manual são preservados.
        // Os demais podem ser gerados novamente.
        const assuntosParaGerar =
            assuntos.filter(
                assunto =>
                    !assuntosManuais.has(
                        assunto.id
                    )
            );


        if (!assuntosParaGerar.length) {

            alert(
                "Todos os assuntos pendentes já possuem planejamento manual."
            );

            return;
        }

        await limparPlanosAutomaticosFuturos(
            inicio
        );

        const resultado =
            gerarDistribuicao({
                assuntos:
                    assuntosParaGerar,
                dias,
                minutosPorDia,
                modo
            });

        const registros =
            resultado.plano;

        if (!registros.length) {

            alert(
                "Não foi possível gerar o plano."
            );

            return;
        }

        /*
         * Primeiro descobrimos a última ordem
         * de cada dia.
         */

        const { data: existentes, error } =
            await db
                .from("plano_estudos")
                .select(`
                    data,
                    ordem
                `)
                .in("data", dias);

        if (error) {
            throw error;
        }

        const maiorOrdemPorDia = {};

        (existentes || []).forEach(item => {

            const atual =
                maiorOrdemPorDia[item.data];

            if (
                atual === undefined ||
                Number(item.ordem) > atual
            ) {
                maiorOrdemPorDia[item.data] =
                    Number(item.ordem);
            }
        });

        /*
         * Define a ordem dos novos registros.
         */

        const proximaOrdem = {};

        registros.forEach(registro => {

            if (
                proximaOrdem[registro.data]
                === undefined
            ) {

                proximaOrdem[registro.data] =
                    (
                        maiorOrdemPorDia[
                            registro.data
                        ] ?? -1
                    ) + 1;
            }

            registro.ordem =
                proximaOrdem[
                    registro.data
                ];

            proximaOrdem[
                registro.data
            ]++;
        });

        const { error: erroInsercao } =
            await db
                .from("plano_estudos")
                .insert(registros);

        if (erroInsercao) {
            throw erroInsercao;
        }

        fecharGerador();

        dataSelecionada =
            inicio;

        atualizarDataInterface();

        await carregarSemana();
        await carregarPlano();

        const totalGerado =
            registros.length;

        if (resultado.naoCouberam) {

            alert(
                `Plano gerado!\n\n` +
                `${totalGerado} blocos foram distribuídos.\n\n` +
                `Alguns assuntos não couberam no período selecionado.`
            );

        } else {

            alert(
                `Plano gerado com sucesso!\n\n` +
                `${totalGerado} blocos de estudo foram distribuídos.`
            );
        }

    } catch (error) {

        console.error(
            "Erro ao gerar plano:",
            error
        );

        alert(
            "Não foi possível gerar o plano.\n\n" +
            "Veja o console para mais detalhes."
        );

    } finally {

        btnConfirmarGerador.disabled = false;

        btnConfirmarGerador.textContent =
            "Gerar plano";
    }
}

async function atualizarStatusAssunto(
    assuntoId
) {

    const {
        data,
        error
    } = await db
        .from("plano_estudos")
        .select("status")
        .eq("assunto_id", assuntoId);

    if (error) {
        throw error;
    }

    if (!data || !data.length) {
        return;
    }

    const todosConcluidos =
        data.every(
            item =>
                item.status === "concluido"
        );

    const algumConcluido =
        data.some(
            item =>
                item.status === "concluido"
        );

    let status = "pendente";

    if (todosConcluidos) {

        status = "concluido";

    } else if (algumConcluido) {

        status = "estudando";
    }

    const {
        error: erroUpdate
    } = await db
        .from("assuntos")
        .update({
            status
        })
        .eq("id", assuntoId);

    if (erroUpdate) {
        throw erroUpdate;
    }
}

function carregarConfiguracaoGerador() {
    try {
        const salvo = localStorage.getItem(
            CHAVE_CONFIG_GERADOR
        );

        if (!salvo) {
            return {
                ...CONFIG_GERADOR_PADRAO
            };
        }

        const config = JSON.parse(salvo);

        return {
            ...CONFIG_GERADOR_PADRAO,
            ...config
        };

    } catch (error) {

        console.error(
            "Erro ao carregar configuração do gerador:",
            error
        );

        return {
            ...CONFIG_GERADOR_PADRAO
        };
    }
}

function salvarConfiguracaoGerador() {

    const config = {
        minutosPorDia:
            Number(geradorMinutos.value),

        diasSemana:
            obterDiasSelecionados(),

        modo:
            geradorModo.value
    };

    localStorage.setItem(
        CHAVE_CONFIG_GERADOR,
        JSON.stringify(config)
    );
}

function atualizarResumoConfiguracaoGerador() {

    const elemento =
        document.getElementById(
            "resumo-config-gerador"
        );

    if (!elemento) {
        return;
    }

    const config =
        carregarConfiguracaoGerador();

    const nomes = {
        0: "Dom",
        1: "Seg",
        2: "Ter",
        3: "Qua",
        4: "Qui",
        5: "Sex",
        6: "Sáb"
    };

    const dias =
        config.diasSemana
            .map(dia => nomes[dia])
            .join(", ");

    const horas =
        Math.floor(
            config.minutosPorDia / 60
        );

    const minutos =
        config.minutosPorDia % 60;

    let tempo = "";

    if (horas > 0) {
        tempo += `${horas}h`;
    }

    if (minutos > 0) {

        if (tempo) {
            tempo += " ";
        }

        tempo += `${minutos}min`;
    }

    const modo =
        config.modo === "intercalado"
            ? "matérias intercaladas"
            : "ordem dos assuntos";

    elemento.textContent =
        `${tempo} por dia · ${dias} · ${modo}`;
}

btnSalvarConfigGerador?.addEventListener(
    "click",
    () => {

        const dias =
            obterDiasSelecionados();

        if (!dias.length) {

            alert(
                "Selecione pelo menos um dia da semana."
            );

            return;
        }

        salvarConfiguracaoGerador();

        atualizarResumoConfiguracaoGerador();

        alert(
            "Configuração salva! ✓"
        );
    }
);