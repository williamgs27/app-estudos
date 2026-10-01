const totalBlocos = document.getElementById("total-blocos");
const totalHoras = document.getElementById("total-horas");
const percentualGeral = document.getElementById("percentual-geral");
const sequenciaAtual = document.getElementById("sequencia-atual");

const semanaBlocos = document.getElementById("semana-blocos");
const semanaMinutos = document.getElementById("semana-minutos");
const semanaConcluidos = document.getElementById("semana-concluidos");

const graficoSemana = document.getElementById("grafico-semana");
const progressoMaterias = document.getElementById("progresso-materias");
const progressoAtrasados = document.getElementById("progresso-atrasados");

const btnTema = document.getElementById("btn-tema");


document.addEventListener("DOMContentLoaded", async () => {

    configurarEventos();

    await carregarProgresso();

});


function configurarEventos() {

    btnTema?.addEventListener("click", alternarTema);

}


/* =========================================================
   CARREGAMENTO PRINCIPAL
========================================================= */

async function carregarProgresso() {

    try {

        const hoje = obterDataHoje();

        const dataInicio = obterDataComDeslocamento(
            hoje,
            -29
        );

        const { data, error } = await db
            .from("plano_estudos")
            .select(`
                id,
                assunto_id,
                data,
                duracao_min,
                status,
                origem,
                assuntos (
                    id,
                    nome,
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
            .gte("data", dataInicio)
            .lte("data", hoje);

        if (error) {
            throw error;
        }

        const planos = data || [];

        renderizarResumoGeral(planos);

        renderizarSemana(planos);

        renderizarMaterias(planos);

        renderizarAtrasados(planos);

    } catch (error) {

        console.error(
            "Erro ao carregar progresso:",
            error
        );

        mostrarErroGeral();

    }

}


/* =========================================================
   RESUMO GERAL
========================================================= */

function renderizarResumoGeral(planos) {

    const concluidos = planos.filter(
        item => item.status === "concluido"
    );

    const minutos = concluidos.reduce(
        (total, item) =>
            total + Number(item.duracao_min || 0),
        0
    );

    const total = planos.length;

    const percentual = total > 0
        ? Math.round(
            (concluidos.length / total) * 100
        )
        : 0;


    totalBlocos.textContent =
        concluidos.length;

    totalHoras.textContent =
        formatarTempo(minutos);

    percentualGeral.textContent =
        `${percentual}%`;

    sequenciaAtual.textContent =
        calcularSequencia(planos);

}


/* =========================================================
   ÚLTIMOS 7 DIAS
========================================================= */

function renderizarSemana(planos) {

    const hoje = obterDataHoje();

    const dias = [];

    for (let i = 6; i >= 0; i--) {

        const data = obterDataComDeslocamento(
            hoje,
            -i
        );

        const planosDia = planos.filter(
            item => item.data === data
        );

        const minutos = planosDia
            .filter(item => item.status === "concluido")
            .reduce(
                (total, item) =>
                    total + Number(item.duracao_min || 0),
                0
            );

        const concluidos = planosDia.filter(
            item => item.status === "concluido"
        ).length;


        dias.push({
            data,
            minutos,
            concluidos,
            total: planosDia.length
        });

    }


    const totalBlocosSemana =
        dias.reduce(
            (total, dia) =>
                total + dia.total,
            0
        );

    const totalMinutosSemana =
        dias.reduce(
            (total, dia) =>
                total + dia.minutos,
            0
        );

    const totalConcluidosSemana =
        dias.reduce(
            (total, dia) =>
                total + dia.concluidos,
            0
        );


    semanaBlocos.textContent =
        totalBlocosSemana;

    semanaMinutos.textContent =
        totalMinutosSemana;

    semanaConcluidos.textContent =
        totalConcluidosSemana;


    const maiorMinutos =
        Math.max(
            ...dias.map(dia => dia.minutos),
            1
        );


    graficoSemana.innerHTML =
        dias.map(dia => {

            const altura =
                dia.minutos > 0
                    ? Math.max(
                        8,
                        (dia.minutos / maiorMinutos) * 100
                    )
                    : 4;

            const dataObj =
                converterData(dia.data);

            const nomeDia =
                dataObj.toLocaleDateString(
                    "pt-BR",
                    { weekday: "short" }
                )
                .replace(".", "");

            const hojeClasse =
                dia.data === hoje
                    ? " hoje"
                    : "";


            return `
                <div class="grafico-dia${hojeClasse}">

                    <div class="grafico-barra-area">

                        <div
                            class="grafico-barra"
                            style="height:${altura}%"
                            title="${dia.minutos} minutos"
                        ></div>

                    </div>

                    <strong>
                        ${dia.concluidos}
                    </strong>

                    <span>
                        ${capitalizar(nomeDia)}
                    </span>

                </div>
            `;

        }).join("");

}


/* =========================================================
   PROGRESSO POR MATÉRIA
========================================================= */

function renderizarMaterias(planos) {

    if (!planos.length) {

        progressoMaterias.innerHTML = `
            <div class="lista-vazia">

                <div class="lista-vazia-icone">
                    📚
                </div>

                <h3>Nenhum estudo ainda</h3>

                <p>
                    Comece a estudar para acompanhar
                    seu progresso aqui.
                </p>

            </div>
        `;

        return;

    }


    const mapa = new Map();


    planos.forEach(item => {

        const materia =
            item.assuntos
                ?.topicos
                ?.materias;

        if (!materia) {
            return;
        }


        if (!mapa.has(materia.id)) {

            mapa.set(
                materia.id,
                {
                    id: materia.id,
                    nome: materia.nome,
                    cor: materia.cor || "#8b5cf6",
                    total: 0,
                    concluidos: 0,
                    minutos: 0
                }
            );

        }


        const registro =
            mapa.get(materia.id);

        registro.total++;


        if (item.status === "concluido") {

            registro.concluidos++;

            registro.minutos +=
                Number(item.duracao_min || 0);

        }

    });


    const materias =
        [...mapa.values()]
            .sort(
                (a, b) =>
                    b.minutos - a.minutos
            );


    progressoMaterias.innerHTML =
        materias.map(materia => {

            const percentual =
                materia.total > 0
                    ? Math.round(
                        (materia.concluidos /
                            materia.total) * 100
                    )
                    : 0;


            return `
                <article class="materia-progresso-card">

                    <div class="materia-progresso-topo">

                        <div class="materia-progresso-nome">

                            <span
                                class="materia-progresso-cor"
                                style="background:${escaparAtributo(materia.cor)}"
                            ></span>

                            <strong>
                                ${escaparHTML(materia.nome)}
                            </strong>

                        </div>

                        <strong>
                            ${percentual}%
                        </strong>

                    </div>


                    <div class="materia-progresso-barra">

                        <span
                            style="width:${percentual}%; background:${escaparAtributo(materia.cor)}"
                        ></span>

                    </div>


                    <div class="materia-progresso-info">

                        <span>
                            ${materia.concluidos}/${materia.total} blocos
                        </span>

                        <span>
                            ${formatarTempo(materia.minutos)}
                        </span>

                    </div>

                </article>
            `;

        }).join("");

}


/* =========================================================
   ATRASADOS
========================================================= */

function renderizarAtrasados(planos) {

    const hoje = obterDataHoje();

    const atrasados =
        planos
            .filter(item =>
                item.data < hoje &&
                item.status === "pendente"
            )
            .sort(
                (a, b) =>
                    a.data.localeCompare(b.data)
            );


    if (!atrasados.length) {

        progressoAtrasados.innerHTML = `
            <div class="progresso-sem-atrasos">

                <span>✓</span>

                <div>
                    <strong>
                        Tudo em dia!
                    </strong>

                    <p>
                        Não há estudos atrasados
                        nos últimos 30 dias.
                    </p>
                </div>

            </div>
        `;

        return;

    }


    progressoAtrasados.innerHTML =
        atrasados.slice(0, 10).map(item => {

            const assunto =
                item.assuntos;

            const materia =
                assunto
                    ?.topicos
                    ?.materias;


            return `
                <article class="atrasado-card">

                    <div
                        class="atrasado-cor"
                        style="background:${escaparAtributo(
                            materia?.cor || "#8b5cf6"
                        )}"
                    ></div>

                    <div class="atrasado-info">

                        <strong>
                            ${escaparHTML(
                                assunto?.nome || "Assunto"
                            )}
                        </strong>

                        <span>
                            ${escaparHTML(
                                materia?.nome || "Matéria"
                            )}
                            ·
                            ${formatarData(item.data)}
                        </span>

                    </div>

                    <span class="atrasado-duracao">
                        ${formatarDuracao(
                            item.duracao_min
                        )}
                    </span>

                </article>
            `;

        }).join("");


    if (atrasados.length > 10) {

        progressoAtrasados.insertAdjacentHTML(
            "beforeend",
            `
                <p class="progresso-aviso">
                    Mostrando os 10 atrasados mais antigos.
                </p>
            `
        );

    }

}


/* =========================================================
   SEQUÊNCIA
========================================================= */

function calcularSequencia(planos) {

    const diasComEstudo = new Set(
        planos
            .filter(
                item => item.status === "concluido"
            )
            .map(
                item => item.data
            )
    );


    let data =
        obterDataHoje();


    /*
     * Se hoje ainda não teve estudo concluído,
     * começa a contar a partir de ontem.
     */

    if (!diasComEstudo.has(data)) {

        data =
            obterDataComDeslocamento(
                data,
                -1
            );

    }


    let sequencia = 0;


    while (
        diasComEstudo.has(data)
    ) {

        sequencia++;

        data =
            obterDataComDeslocamento(
                data,
                -1
            );

    }


    return sequencia;

}


/* =========================================================
   UTILITÁRIOS
========================================================= */

function obterDataHoje() {

    const agora = new Date();

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


function obterDataComDeslocamento(
    dataISO,
    quantidade
) {

    const [
        ano,
        mes,
        dia
    ] = dataISO
        .split("-")
        .map(Number);


    const data =
        new Date(
            ano,
            mes - 1,
            dia
        );


    data.setDate(
        data.getDate() + quantidade
    );


    return formatarDataISO(data);

}


function formatarDataISO(data) {

    const ano =
        data.getFullYear();

    const mes =
        String(
            data.getMonth() + 1
        ).padStart(2, "0");

    const dia =
        String(
            data.getDate()
        ).padStart(2, "0");


    return `${ano}-${mes}-${dia}`;

}


function converterData(dataISO) {

    const [
        ano,
        mes,
        dia
    ] = dataISO
        .split("-")
        .map(Number);


    return new Date(
        ano,
        mes - 1,
        dia
    );

}


function formatarTempo(minutos) {

    minutos =
        Number(minutos || 0);


    const horas =
        Math.floor(minutos / 60);

    const resto =
        minutos % 60;


    if (horas === 0) {

        return `${resto}min`;

    }


    if (resto === 0) {

        return `${horas}h`;

    }


    return `${horas}h ${resto}min`;

}


function formatarDuracao(minutos) {

    return formatarTempo(minutos);

}


function formatarData(dataISO) {

    return converterData(dataISO)
        .toLocaleDateString(
            "pt-BR",
            {
                day: "2-digit",
                month: "2-digit"
            }
        );

}


function capitalizar(texto) {

    if (!texto) {
        return "";
    }

    return texto.charAt(0).toUpperCase()
        + texto.slice(1);

}


function escaparHTML(texto) {

    return String(texto ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


function escaparAtributo(texto) {

    return escaparHTML(texto);

}


function mostrarErroGeral() {

    progressoMaterias.innerHTML = `
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