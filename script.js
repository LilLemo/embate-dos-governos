// --- ELEMENTOS GLOBAIS ---
const telaBoasVindas = document.getElementById('boas-vindas');
const telaSelecao = document.getElementById('selecao');
const telaResultados = document.getElementById('resultados');
const telaEmbate = document.getElementById('tela-embate');
const btnLutar = document.getElementById('btnLutar');

// --- MUDANÇA 1: URL DA SUA API NO RENDER ---
// Cole a URL do seu "Web Service" (o app Python) aqui:
const API_URL = 'https://COLE-A-URL-DO-SEU-WEB-SERVICE-AQUI.onrender.com';
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

// MAPA de TEXTOS E TEMAS
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
        textElement.innerText = `PLAYER ${player.toUpperCase()}`;
    }
}


async function mostrarResultados() {
    if (!playerA || !playerB) return;

    document.getElementById('lutador-a').setAttribute('data-theme', temaPlayerA);
    document.getElementById('lutador-b').setAttribute('data-theme', temaPlayerB);

    const loadingBar = document.getElementById('loading-bar-fill');
    loadingBar.style.transition = 'none';
    loadingBar.style.width = '0%';

    document.getElementById('
