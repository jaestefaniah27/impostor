// VARIABLES GLOBALES
let players = []; 
let playerAvatars = {}; 
let playerScores = {}; // Puntos acumulados (persistente si se quiere)
let themes = [];
let selectedThemesIds = [];

// ESTADO DE JUEGO (GLOBAL)
let gameData = { assignments: [], currentIndex: 0, secretWord: '', secretHint: '', impostorsCaught: 0, totalImpostors: 0 };
let timerInterval;
let timeRemaining = 600;

// ESTADO DE TORNEO
let isTournamentActive = false;
let currentTournamentName = "";
let tournamentScores = {}; 
let tournamentGames = []; 

// CONSTANTES
const emojis = ["🦁","🐯","🐻","🐨","🐼","🐸","🐙","🦄","🐝","🐞","🦖","👽","🤖","👻","🤡","🤠","🎃","💀","🍄","🍔","🍕","⚽","🚀","💡","🔥","💎","🎸","🎮"];
const suggestions = ["¿Es más grande que una caja de zapatos?", "¿Se usa dentro de casa?", "¿Es un ser vivo?", "¿Tiene que ver con tecnología?", "¿Lo usamos todos los días?", "¿Es de algún color específico?", "¿Se puede comprar en el supermercado?", "¿Hace ruido?", "¿Funciona con electricidad?", "¿Es algo que se come?", "¿Es peligroso?", "¿Cabe en un bolsillo?", "¿Es caro?", "¿Se usa para trabajar?", "¿Tiene ruedas?", "¿Huele a algo?"];

// INICIALIZACIÓN
window.onload = () => {
    loadGameData();
    fetchThemes();
    updateTimeDisplay();
    checkTournamentState();
    
    // Cargar UI inicial
    if(typeof renderPlayers === 'function') renderPlayers();
    if(typeof setupCardInteractions === 'function') setupCardInteractions();
};

// --- GESTIÓN DE DATOS ---
function loadGameData() {
    const pStored = localStorage.getItem('impostorPlayers');
    if (pStored) players = JSON.parse(pStored); else players = ['Ana', 'Juan', 'Pedro'];
    
    const aStored = localStorage.getItem('impostorAvatars');
    if (aStored) playerAvatars = JSON.parse(aStored);
    
    players.forEach(p => { if(!playerAvatars[p]) playerAvatars[p] = getRandomAvatar(); });
    saveAllData();
}

function saveAllData() {
    localStorage.setItem('impostorPlayers', JSON.stringify(players));
    localStorage.setItem('impostorAvatars', JSON.stringify(playerAvatars));
}

function getRandomAvatar() { 
    return emojis[Math.floor(Math.random() * emojis.length)]; 
}

// --- API ---
async function fetchThemes() {
    try {
        const r = await fetch('/api/themes');
        themes = await r.json();
    } catch(e) { console.error("Error cargando temas", e); }
}

async function saveThemeFromUI() {
    const n = document.getElementById('new-theme-title').value;
    if(!n) return alert("Pon título");
    
    const w = [];
    document.querySelectorAll('.word-row').forEach(r => {
        const t = r.querySelector('.input-word').value.trim();
        const h = r.querySelector('.input-hints').value.trim();
        if(t) w.push({text:t, hints:h ? h.split('/') : ["Sin pista"]});
    });
    
    if(w.length < 4) return alert("Mín 4 palabras");
    
    await fetch('/api/themes', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({name:n, words:w})
    });
    alert("Tema guardado");
    await fetchThemes();
    showScreen('screen-home');
}

async function saveGameRecordToHistory(record) {
    await fetch('/api/history', { 
        method:'POST', 
        headers:{'Content-Type':'application/json'}, 
        body:JSON.stringify(record)
    });
}