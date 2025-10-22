// --- ELEMENTOS GLOBAIS ---
const telaBoasVindas = document.getElementById('boas-vindas');
const telaSelecao = document.getElementById('selecao');
const telaResultados = document.getElementById('resultados');
const telaEmbate = document.getElementById('tela-embate');
const btnLutar = document.getElementById('btnLutar');

// --- MUDANÇA 1: URL DA API NO RENDER ---
// Assim que criar seu "Web Service" no Render, 
// cole a URL dele aqui (ex: https://api-tcc-governos.onrender.com)
const API_URL = 'https://api-tcc-governos.onrender.com';
// ----------------------------------------------------

let playerA = null;
let playerB = null;
let temaPlayerA = null;
let temaPlayerB = null;
let graficos = {};

// MAPA DE IMAGENS DOS PERSONAGENS
const imagensPresidentes = {
    fhc1: 'imagens/fhc1.png',
    fhc2: 'imagens/fhc2.png',
    lula1: 'imagens/lula1.png',
    lula2: 'imagens/lula2.png',
    dilma1: 'imagens/dilma1.png',
    dilma2: 'imagens/dilma2.png',
    temer: 'imagens/temer.png',
    bolsonaro: 'imagens/bolsonaro.png',
    lula3: 'imagens/lula3.png'
};

// MAPA DE TEXTOS E TEMAS
const dadosPresidentes = {
    fhc1: { texto: "FHC 1 (95-98)", tema: "fhc" },
    fhc2: { texto: "FHC 2 (99-02)", tema: "fhc" },
    lula1: { texto: "Lula 1 (03-06)", tema: "lula" },
    lula2: { texto: "Lula 2 (07-10)", tema: "lula" },
    dilma1: { texto: "Dilma 1 (11-14)", tema: "dilma" },
    dilma2: { texto: "Dilma 2 (15-16)", tema: "dilma" },
    temer: { texto: "Temer (16-18)", tema: "temer" },
    bolsonaro: { texto: "Bolsonaro (19-22)", tema: "bolsonaro" },
    lula3: { texto: "Lula 3 (23-25)", tema: "lula" }
};


// FUNÇÃO PARA POPULAR O GRID DE PERSONAGENS
function popularGridDePersonagens() {
    const grid = document.getElementById('grid-personagens');
    grid.innerHTML = ''; // Limpa o grid para garantir

    for (const govKey in dadosPresidentes) {
        const retrato = document.createElement('div');
        retrato.className = 'retrato-presidente';
        retrato.setAttribute('data-gov', govKey);
        retrato.setAttribute('data-theme', dadosPresidentes[govKey].tema);
        retrato.onclick = () => selecionarGov(retrato);

        const img = document.createElement('img');
        img.src = imagensPresidentes[govKey];
        img.alt = dadosPresidentes[govKey].texto;

        const span = document.createElement('span');
        span.innerText = dadosPresidentes[govKey].texto;

        retrato.appendChild(img);
        retrato.appendChild(span);

        grid.appendChild(retrato);
    }
}
document.addEventListener('DOMContentLoaded', popularGridDePersonagens);


// --- NAVEGAÇÃO BÁSICA ---
function iniciarEmbate() {
    telaBoasVindas.classList.remove('ativa');
    telaSelecao.classList.add('ativa');
}

// --- FUNÇÃO DE SELEÇÃO ATUALIZADA ---
function selecionarGov(elemento) {
    const gov = elemento.getAttribute('data-gov');
    const tema = elemento.getAttribute('data-theme');
    
    if (playerA === gov) {
        playerA = null;
        temaPlayerA = null;
        elemento.classList.remove('selecionado');
    } else if (playerB === gov) {
        playerB = null;
        temaPlayerB = null;
        elemento.classList.remove('selecionado');
    } else if (!playerA) {
        playerA = gov;
        temaPlayerA = tema;
        elemento.classList.add('selecionado');
    } else if (!playerB) {
        playerB = gov;
        temaPlayerB = tema;
        elemento.classList.add('selecionado');
    }

    atualizarPlayerBox('a', playerA, temaPlayerA);
    atualizarPlayerBox('b', playerB, temaPlayerB);
    
    btnLutar.disabled = !(playerA && playerB);
}

// --- FUNÇÃO AUXILIAR para atualizar os Player Boxes ---
function atualizarPlayerBox(player, gov, tema) {
    const playerBox = document.getElementById(`player-${player}`);
    const imgElement = playerBox.querySelector('.player-box-img');
    const textElement = playerBox.querySelector('.player-box-text');

    if (gov) {
        playerBox.setAttribute('data-theme', tema);
        imgElement.src = imagensPresidentes[gov];
        imgElement.classList.add('visivel');
        textElement.innerText = gov.toUpperCase();
    } else {
        playerBox.removeAttribute('data-theme');
        imgElement.src = '';
        imgElement.classList.remove('visivel');
D       textElement.innerText = `PLAYER ${player.toUpperCase()}`;
    }
}


async function mostrarResultados() {
    if (!playerA || !playerB) return;

    document.getElementById('lutador-a').setAttribute('data-theme', temaPlayerA);
    document.getElementById('lutador-b').setAttribute('data-theme', temaPlayerB);

    const loadingBar = document.getElementById('loading-bar-fill');
    loadingBar.style.transition = 'none';
    loadingBar.style.width = '0%';

    document.getElementById('img-lutador-a').src = imagensPresidentes[playerA];
    document.getElementById('img-lutador-b').src = imagensPresidentes[playerB];
    telaSelecao.classList.remove('ativa');
    telaEmbate.classList.add('ativa');

    await new Promise(resolve => setTimeout(resolve, 50)); 
    
    loadingBar.style.transition = 'width 1.5s ease-out';
    loadingBar.style.width = '90%';

    try {
        // --- MUDANÇA 2: Usando a variável da URL da API ---
        const response = await fetch(`${API_URL}/api/comparar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ gov1: playerA, gov2: playerB }),
        });
        // ----------------------------------------------------

        if (!response.ok) {
          
            let errorMsg = `Erro ao chamar a API: ${response.statusText}`;
            try {
                const errorData = await response.json();
                errorMsg = errorData.erro || errorMsg;
            } catch (e) {

                console.error("A resposta de erro não era JSON:", e);
            }
            throw new Error(errorMsg);
        }
        const dados = await response.json();
        
        loadingBar.style.transition = 'width 0.5s ease-in-out';
        loadingBar.style.width = '100%';

        await new Promise(resolve => setTimeout(resolve, 600));

        const dadosGovA = dados.governo1.nome === playerA ? dados.governo1 : dados.governo2;
        const dadosGovB = dados.governo2.nome === playerB ? dados.governo2 : dados.governo1;
        
        const temaGovA = dados.governo1.nome === playerA ? temaPlayerA : temaPlayerB;
        const temaGovB = dados.governo2.nome === playerB ? temaPlayerB : temaPlayerA;

        document.getElementById('coluna-govA').setAttribute('data-theme', temaGovA);
        document.getElementById('coluna-govB').setAttribute('data-theme', temaGovB);

        document.getElementById('titulo-embate').innerText = `${playerA.toUpperCase()} VS ${playerB.toUpperCase()}`;
        
        document.getElementById('nome-govA').innerText = dadosGovA.nome.toUpperCase();
        desenharGraficoLinha('grafico-linha-govA', dadosGovA.dados_grafico_linha, 'A');
        document.getElementById('grafico-pizza-govA').parentElement.classList.add('animar-poing');
        desenharGraficoPizza('grafico-pizza-govA', dadosGovA.dados_pizza, 'A');
        document.getElementById('kpi-horas-govA').innerText = `${dadosGovA.kpi_horas_trabalho} horas`;
        document.getElementById('kpi-aumento-govA').innerText = dadosGovA.kpi_aumento_percentual_sm;
        document.getElementById('kpi-smn-govA').innerHTML = `${dadosGovA.kpi_media_sm} vs ${dadosGovA.kpi_media_smn}<br><span style="color:#e94560;">(${dadosGovA.kpi_smn_multiplicador} menor)</span>`;

        document.getElementById('nome-govB').innerText = dadosGovB.nome.toUpperCase();
        desenharGraficoLinha('grafico-linha-govB', dadosGovB.dados_grafico_linha, 'B');
        document.getElementById('grafico-pizza-govB').parentElement.classList.add('animar-poing');
        desenharGraficoPizza('grafico-pizza-govB', dadosGovB.dados_pizza, 'B');
        document.getElementById('kpi-horas-govB').innerText = `${dadosGovB.kpi_horas_trabalho} horas`;
        document.getElementById('kpi-aumento-govB').innerText = dadosGovB.kpi_aumento_percentual_sm;
        document.getElementById('kpi-smn-govB').innerHTML = `${dadosGovB.kpi_media_sm} vs ${dadosGovB.kpi_media_smn}<br><span style="color:#e94560;">(${dadosGovB.kpi_smn_multiplicador} menor)</span>`;

        // Lógica para encontrar o nome da imagem do vencedor
        let nomeVencedorKey = "lula1"; // Um padrão, caso não ache
        const vencedorNomeUpper = dados.vencedor.split(':').pop().trim();
        
        if (dados.vencedor.toUpperCase() !== "EMPATE") {
            // Tenta achar a chave (ex: 'lula3') pelo texto (ex: 'LULA 3 (23-25)')
            for (const key in dadosPresidentes) {
                if (dadosPresidentes[key].texto.toUpperCase() === vencedorNomeUpper) {
                    nomeVencedorKey = key;
                    break;
                }
            }
        }
        
        document.getElementById('texto-analise').innerText = dados.analise_dadinho;
        document.getElementById('vencedor-banner-grande').innerText = dados.vencedor;
        document.getElementById('vencedor-imagem').src = imagensPresidentes[nomeVencedorKey];
        
        document.getElementById('coluna-govA').classList.add('animar-entrada-esquerda');
        document.getElementById('coluna-govB').classList.add('animar-entrada-direita');
       
        document.body.style.alignItems = 'flex-start';

        telaEmbate.classList.remove('ativa');
        telaResultados.classList.add('ativa');

     

    } catch (error) {
        alert("Ops! Ocorreu um erro ao buscar os dados:\n\n" + error.message + "\n\nPor favor, tente novamente. Se o erro persistir, o servidor pode estar inicializando.");
        console.error(error);
        reiniciar(); // Reinicia o app para a tela inicial
    }
}

function desenharGraficoLinha(containerId, dados, sufixo) {
    const container = document.getElementById(containerId);
    container.innerHTML = `<canvas id="canvas-linha-${sufixo}"></canvas>`;
    const ctx = document.getElementById(`canvas-linha-${sufixo}`).getContext('2d');
    if (graficos[`linha-${sufixo}`]) { graficos[`linha-${sufixo}`].destroy(); }
    graficos[`linha-${sufixo}`] = new Chart(ctx, {
        type: 'line',
        data: { labels: dados.labels, datasets: [
            { label: 'Salário Mínimo (R$)', data: dados.salario, borderColor: '#e94560', tension: 0.1 },
            { label: 'Cesta Básica (R$)', data: dados.cesta, borderColor: '#50fa7b', tension: 0.1 }
        ]},
        options: { responsive: true, maintainAspectRatio: false,
            scales: { y: { ticks: { color: 'white' } }, x: { ticks: { color: 'white' } } },
            plugins: { legend: { labels: { color: 'white', font: { size: 10 } } } }
        }
    });
}

function desenharGraficoPizza(canvasId, dados, sufixo) {
    if (graficos[`pizza-${sufixo}`]) { graficos[`pizza-${sufixo}`].destroy(); }
    const ctx = document.getElementById(canvasId).getContext('2d');
    graficos[`pizza-${sufixo}`] = new Chart(ctx, {
        type: 'pie',
        data: { labels: dados
