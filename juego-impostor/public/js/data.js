// VARIABLES GLOBALES
let players = []; 
let playerAvatars = {}; 
let playerScores = {}; 
let themes = [];
let selectedThemesIds = [];

// ESTADO DE JUEGO
// Añadimos 'currentSuggestions' al estado
let gameData = { assignments: [], currentIndex: 0, secretWord: '', secretHint: '', currentSuggestions: [], impostorsCaught: 0, totalImpostors: 0 };
let timerInterval;
let timeRemaining = 600;

// ESTADO DE TORNEO
let isTournamentActive = false;
let currentTournamentName = "";
let tournamentScores = {}; 
let tournamentGames = []; 

const emojis = ["🦁","🐯","🐻","🐨","🐼","🐸","🐙","🦄","🐝","🐞","🦖","👽","🤖","👻","🤡","🤠","🎃","💀","🍄","🍔","🍕","⚽","🚀","💡","🔥","💎","🎸","🎮"];

// SUGERENCIAS POR DEFECTO (GENÉRICAS)
// Se usan si el tema no tiene sugerencias específicas
const defaultSuggestions = [
    "¿Es más grande que una caja de zapatos?", 
    "¿Se usa dentro de casa?", 
    "¿Es un ser vivo?", 
    "¿Tiene que ver con tecnología?", 
    "¿Lo usamos todos los días?", 
    "¿Es de algún color específico?", 
    "¿Se puede comprar en el supermercado?", 
    "¿Hace ruido?", 
    "¿Funciona con electricidad?", 
    "¿Es algo que se come?", 
    "¿Es peligroso?", 
    "¿Cabe en un bolsillo?", 
    "¿Es caro?"
];

// INICIALIZACIÓN
window.onload = () => {
    loadGameData();
    fetchThemes();
    updateTimeDisplay();
    checkTournamentState();
    if(typeof renderPlayers === 'function') renderPlayers();
    if(typeof setupCardInteractions === 'function') setupCardInteractions();
};

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

function getRandomAvatar() { return emojis[Math.floor(Math.random() * emojis.length)]; }

async function fetchThemes() {
    try {
        const r = await fetch('/api/themes');
        themes = await r.json();
    } catch(e) { console.error("Error cargando temas", e); }
}

async function saveThemeFromUI() {
    const n = document.getElementById('new-theme-title').value;
    if(!n) return alert("Pon título");
    
    // CAPTURAR SUGERENCIAS DEL TEXTAREA
    const suggestionsRaw = document.getElementById('new-theme-suggestions').value.trim();
    let themeSuggestions = [];
    if (suggestionsRaw) {
        themeSuggestions = suggestionsRaw.split('/').map(s => s.trim()).filter(s => s.length > 0);
    }

    const w = [];
    document.querySelectorAll('.word-row').forEach(r => {
        const t = r.querySelector('.input-word').value.trim();
        const h = r.querySelector('.input-hints').value.trim();
        if(t) w.push({text:t, hints:h ? h.split('/') : ["Sin pista"]});
    });
    
    if(w.length < 4) return alert("Mín 4 palabras");
    
    // ENVIAR SUGGESTIONS AL SERVIDOR
    await fetch('/api/themes', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({name:n, words:w, suggestions: themeSuggestions})
    });
    alert("Tema guardado");
    await fetchThemes();
    showScreen('screen-home');
}

async function saveGameRecordToHistory(record) {
    await fetch('/api/history', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(record)});
}

// --- ESTADÍSTICAS ---
async function fetchStats() {
    try {
        const r = await fetch('/api/stats');
        return await r.json();
    } catch(e) { console.error(e); return null; }
}

async function mergeAliases(mainName, aliases) {
    await fetch('/api/aliases', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ mainName: mainName, aliasesToMerge: aliases })
    });
}