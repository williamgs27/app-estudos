// ==========================================
// AUTENTICAÇÃO
// ==========================================


const formAuth = document.getElementById("form-auth");

const inputEmail = document.getElementById("email");
const inputSenha = document.getElementById("senha");

const btnCadastro = document.getElementById("btn-cadastro");

let modoCadastro = false;


// ==========================================
// ELEMENTOS DA INTERFACE
// ==========================================

function criarMensagemAuth() {

    let mensagem = document.getElementById("mensagem-auth");

    if (!mensagem) {

        mensagem = document.createElement("div");

        mensagem.id = "mensagem-auth";

        mensagem.setAttribute("role", "alert");

        formAuth.insertBefore(
            mensagem,
            formAuth.firstChild
        );
    }

    return mensagem;
}


function mostrarMensagem(texto, tipo = "erro") {

    const mensagem = criarMensagemAuth();

    mensagem.textContent = texto;

    mensagem.className =
        `mensagem-auth mensagem-${tipo}`;
}


function limparMensagem() {

    const mensagem =
        document.getElementById("mensagem-auth");

    if (mensagem) {
        mensagem.textContent = "";
        mensagem.className = "mensagem-auth";
    }
}


// ==========================================
// ALTERAR LOGIN / CADASTRO
// ==========================================

function atualizarModoAuth() {

    const titulo =
        document.querySelector(".login-header h1");

    const descricao =
        document.querySelector(".login-header p");

    const botao =
        formAuth.querySelector("button[type='submit']");

    const alternativa =
        document.querySelector(".auth-alternativa span");


    if (modoCadastro) {

        titulo.textContent = "Criar conta";

        descricao.textContent =
            "Crie sua conta para começar a organizar seus estudos.";

        botao.textContent = "Criar conta";

        alternativa.textContent =
            "Já possui uma conta?";

        btnCadastro.textContent =
            "Entrar";

        inputSenha.autocomplete =
            "new-password";

    } else {

        titulo.textContent = "Meus Estudos";

        descricao.textContent =
            "Organize seus estudos e acompanhe seu progresso.";

        botao.textContent = "Entrar";

        alternativa.textContent =
            "Ainda não tem uma conta?";

        btnCadastro.textContent =
            "Criar conta";

        inputSenha.autocomplete =
            "current-password";
    }

    limparMensagem();
}


// ==========================================
// BOTÃO CRIAR CONTA
// ==========================================

btnCadastro?.addEventListener(
    "click",
    () => {

        modoCadastro = !modoCadastro;

        atualizarModoAuth();
    }
);


// ==========================================
// LOADING DO BOTÃO
// ==========================================

function definirLoading(loading) {

    const botao =
        formAuth.querySelector(
            "button[type='submit']"
        );

    if (!botao) return;

    if (loading) {

        botao.disabled = true;

        botao.dataset.textoOriginal =
            botao.textContent;

        botao.textContent =
            modoCadastro
                ? "Criando conta..."
                : "Entrando...";

    } else {

        botao.disabled = false;

        botao.textContent =
            botao.dataset.textoOriginal ||
            (modoCadastro
                ? "Criar conta"
                : "Entrar");
    }
}


// ==========================================
// LOGIN / CADASTRO
// ==========================================

formAuth?.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();

        limparMensagem();

        const email =
            inputEmail.value.trim();

        const senha =
            inputSenha.value;


        // -------------------------------
        // VALIDAÇÃO
        // -------------------------------

        if (!email) {

            mostrarMensagem(
                "Digite seu e-mail."
            );

            inputEmail.focus();

            return;
        }


        if (!senha) {

            mostrarMensagem(
                "Digite sua senha."
            );

            inputSenha.focus();

            return;
        }


        if (senha.length < 6) {

            mostrarMensagem(
                "A senha precisa ter pelo menos 6 caracteres."
            );

            inputSenha.focus();

            return;
        }


        definirLoading(true);


        try {

            // ==================================
            // CADASTRO
            // ==================================

            if (modoCadastro) {

                const {
                    data,
                    error
                } = await db.auth.signUp({

                    email,
                    password: senha

                });


                if (error) {
                    throw error;
                }


                /*
                 * Dependendo da configuração do Supabase,
                 * o usuário pode precisar confirmar o e-mail.
                 */

                if (
                    data.user &&
                    !data.session
                ) {

                    mostrarMensagem(
                        "Conta criada! Verifique seu e-mail para confirmar o cadastro.",
                        "sucesso"
                    );

                    formAuth.reset();

                    return;
                }


                mostrarMensagem(
                    "Conta criada com sucesso!",
                    "sucesso"
                );


                window.location.href =
                    "plano.html";

                return;
            }


            // ==================================
            // LOGIN
            // ==================================

            const {
                data,
                error
            } = await db.auth.signInWithPassword({

                email,
                password: senha

            });


            if (error) {
                throw error;
            }


            if (!data.session) {

                throw new Error(
                    "Não foi possível iniciar a sessão."
                );
            }


            window.location.href =
                "plano.html";

        } catch (error) {

            console.error(
                "Erro de autenticação:",
                error
            );


            let mensagem =
                "Ocorreu um erro. Tente novamente.";


            if (
                error.message
                    ?.toLowerCase()
                    .includes("invalid login credentials")
            ) {

                mensagem =
                    "E-mail ou senha incorretos.";

            } else if (
                error.message
                    ?.toLowerCase()
                    .includes("user already registered")
            ) {

                mensagem =
                    "Este e-mail já possui uma conta.";

            } else if (
                error.message
                    ?.toLowerCase()
                    .includes("email not confirmed")
            ) {

                mensagem =
                    "Confirme seu e-mail antes de entrar.";

            } else if (error.message) {

                mensagem =
                    error.message;
            }


            mostrarMensagem(
                mensagem
            );

        } finally {

            definirLoading(false);
        }
    }
);


// ==========================================
// VERIFICAR SESSÃO
// ==========================================

async function obterUsuario() {

    const {
        data,
        error
    } = await db.auth.getUser();


    if (error) {

        console.error(
            "Erro ao obter usuário:",
            error
        );

        return null;
    }


    return data.user;
}


// ==========================================
// PROTEGER PÁGINAS
// ==========================================

async function protegerPagina() {

    const {
        data: {
            session
        }
    } = await db.auth.getSession();


    if (!session) {

        window.location.href =
            "index.html";

        return null;
    }


    return session;
}


// ==========================================
// LOGOUT
// ==========================================

async function sair() {

    const {
        error
    } = await db.auth.signOut();


    if (error) {

        console.error(
            "Erro ao sair:",
            error
        );

        return;
    }


    window.location.href =
        "index.html";
}


// ==========================================
// MONITORAR SESSÃO
// ==========================================

db.auth.onAuthStateChange(
    (event, session) => {

        console.log(
            "Auth:",
            event
        );
    }
);