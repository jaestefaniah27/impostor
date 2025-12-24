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
    if (pStored) players = JSON.parse(pStored); else players = ['Mateo', 'Juan', 'Diego', 'Jorge', 'Poke'];
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
        
        // CORRECCIÓN: Si ya estamos en la pantalla de temas (o para precargar), renderizamos
        if (typeof renderThemeGrid === 'function') {
            renderThemeGrid();
        }
    } catch(e) { 
        console.error("Error cargando temas", e); 
        alert("Error cargando temas. Revisa la consola.");
    }
}

async function saveThemeFromUI() {
    const n = document.getElementById('new-theme-title').value;
    if(!n) return alert("Pon título");
    
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
    
    // Objeto a enviar (incluye id si estamos editando)
    const payload = {
        id: editingThemeId, // Global definida en ui.js
        name: n, 
        words: w, 
        suggestions: themeSuggestions
    };
    
    await fetch('/api/themes', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify(payload)
    });
    
    alert(editingThemeId ? "Tema actualizado" : "Tema creado");
    await fetchThemes(); // Recargar lista
    if (typeof goToThemeManager === 'function') {
        goToThemeManager();
    } else {
        showScreen('screen-home'); // Fallback por si acaso
    }
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

async function unmergeAliases(namesToFree) {
    await fetch('/api/aliases/unmerge', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ namesToFree: namesToFree })
    });
}

// --- PERSISTENCIA DEL TORNEO ---
function saveTournamentState() {
    if (isTournamentActive) {
        localStorage.setItem('tournamentName', currentTournamentName);
        localStorage.setItem('tournamentScores', JSON.stringify(tournamentScores));
        localStorage.setItem('tournamentGames', JSON.stringify(tournamentGames));
    } else {
        localStorage.removeItem('tournamentName');
        localStorage.removeItem('tournamentScores');
        localStorage.removeItem('tournamentGames');
    }
    
    // Actualizar banner visual si existe la función (en ui.js)
    if (typeof updateTournamentBanner === 'function') {
        updateTournamentBanner();
    }
}