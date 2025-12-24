// VARIABLES GLOBALES
let players = []; 
let playerAvatars = {}; 
let themes = [];
let selectedThemesIds = [];

// ESTADO DE JUEGO (Persistente)
// Añadimos startTime para recuperar el tiempo real
let gameData = { assignments: [], currentIndex: 0, secretWord: '', secretHint: '', currentSuggestions: [], impostorsCaught: 0, totalImpostors: 0, startTime: null };
let timerInterval;
let timeRemaining = 600;
let editingThemeId = null; // Para el editor de temas

// ESTADO DE TORNEO (Persistente)
let isTournamentActive = false;
let currentTournamentName = "";
let tournamentScores = {}; 
let tournamentGames = []; 

const emojis = ["🦁","🐯","🐻","🐨","🐼","🐸","🐙","🦄","🐝","🐞","🦖","👽","🤖","👻","🤡","🤠","🎃","💀","🍄","🍔","🍕","⚽","🚀","💡","🔥","💎","🎸","🎮"];
const defaultSuggestions = ["¿Es grande?", "¿Está vivo?", "¿Tecnología?", "¿Uso diario?", "¿Color?", "¿Supermercado?", "¿Ruido?", "¿Electricidad?", "¿Comida?", "¿Peligroso?", "¿Bolsillo?", "¿Caro?"];

// --- INICIALIZACIÓN CON PANTALLA DE CARGA SUAVE ---
window.onload = async () => {
    loadGameData();      
    await fetchThemes();       
    // updateTimeDisplay(); // (Recuerda que esta la quitamos)

    restoreTournamentState();
    restoreGameState();

    if(typeof renderPlayers === 'function') renderPlayers();
    if(typeof setupCardInteractions === 'function') setupCardInteractions();
    if(typeof checkTournamentState === 'function') checkTournamentState();

    // SECUENCIA DE APERTURA SUAVE
    setTimeout(() => {
        const loader = document.getElementById('screen-loading');
        if (loader) {
            // 1. Primero hacemos desaparecer el círculo y el texto
            loader.classList.add('fade-out-items');
            
            // 2. Esperamos 300ms y desvanecemos el fondo negro
            setTimeout(() => {
                loader.style.opacity = '0'; 
                
                // 3. Finalmente quitamos el div para que no moleste
                setTimeout(() => {
                    loader.classList.add('hidden'); 
                    
                    // Comprobación de seguridad
                    const anyVisible = document.querySelector('.container:not(.hidden):not(#screen-loading)');
                    if (!anyVisible) showScreen('screen-home');
                    
                }, 500); // Tiempo que tarda el fondo en irse
            }, 300); // Tiempo que tardan los items en irse
        }
    }, 800); // Tiempo mínimo de carga inicial
};

function loadGameData() {
    const pStored = localStorage.getItem('impostorPlayers');
    if (pStored) players = JSON.parse(pStored); else players = ['Jugador 1', 'Jugador 2', 'Jugador 3'];
    const aStored = localStorage.getItem('impostorAvatars');
    if (aStored) playerAvatars = JSON.parse(aStored);
    players.forEach(p => { if(!playerAvatars[p]) playerAvatars[p] = getRandomAvatar(); });
}

function saveAllData() {
    localStorage.setItem('impostorPlayers', JSON.stringify(players));
    localStorage.setItem('impostorAvatars', JSON.stringify(playerAvatars));
}

function getRandomAvatar() { return emojis[Math.floor(Math.random() * emojis.length)]; }

// --- PERSISTENCIA DE TORNEO ---
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
    // Actualizar visualmente si ui.js está cargado
    if (typeof checkTournamentState === 'function') checkTournamentState();
}

function restoreTournamentState() {
    const tName = localStorage.getItem('tournamentName');
    const tScores = localStorage.getItem('tournamentScores');
    const tGames = localStorage.getItem('tournamentGames');

    if (tName && tScores) {
        isTournamentActive = true;
        currentTournamentName = tName;
        tournamentScores = JSON.parse(tScores);
        tournamentGames = tGames ? JSON.parse(tGames) : [];
        // La UI se actualizará cuando se llame a checkTournamentState() en game.js/ui.js
    }
}

// --- PERSISTENCIA DE PARTIDA EN CURSO ---
function saveGameState(currentScreenId) {
    if (!currentScreenId) {
        const visible = document.querySelector('.container:not(.hidden)');
        currentScreenId = visible ? visible.id : 'screen-home';
    }

    const relevantScreens = ['screen-pass-device', 'screen-reveal', 'screen-active', 'screen-result', 'screen-solution'];

    if (!relevantScreens.includes(currentScreenId)) {
        localStorage.removeItem('impostorGameState');
        return;
    }

    const state = {
        screen: currentScreenId,
        gameData: gameData,
        timeRemaining: timeRemaining,
        selectedThemesIds: selectedThemesIds, // GUARDA LA CONFIGURACIÓN DE TEMAS
        timestamp: Date.now()
    };
    
    localStorage.setItem('impostorGameState', JSON.stringify(state));
}

function restoreGameState() {
    const saved = localStorage.getItem('impostorGameState');
    if (!saved) return;

    try {
        const state = JSON.parse(saved);
        gameData = state.gameData;
        timeRemaining = state.timeRemaining || 600;
        
        // RESTAURAR CONFIGURACIÓN DE TEMAS
        if (state.selectedThemesIds) {
            selectedThemesIds = state.selectedThemesIds;
            // Refrescar visualmente la selección si estamos en la pantalla de temas
            if (typeof renderThemeGrid === 'function') renderThemeGrid();
        }

        if (state.screen) {
            if(typeof showScreen === 'function') {
                showScreen(state.screen, false); 
                
                if (state.screen === 'screen-pass-device' && typeof showPassScreen === 'function') showPassScreen();
                if (state.screen === 'screen-reveal' && typeof setupCardForPlayer === 'function') setupCardForPlayer();
                if (state.screen === 'screen-active') {
                    if(typeof renderVotingList === 'function') renderVotingList();
                    if(typeof startTimer === 'function') startTimer();
                    const st = document.getElementById('starter-name');
                    if(st) st.innerText = "Continúa la partida...";
                }
                
                // RESTAURAR PANTALLAS DE FIN DE JUEGO
                if (state.screen === 'screen-solution' || state.screen === 'screen-result') {
                    restoreEndGameUI(state.screen);
                }
            }
        }
    } catch (e) {
        console.error("Error restaurando partida", e);
        clearGameState();
    }
}

// NUEVA: Restaura la UI de ganador al recargar
function restoreEndGameUI(screen) {
    const winner = gameData.lastWinner; // Recuperamos el ganador guardado
    
    // Restaurar palabra secreta
    const finalWordEl = document.getElementById('final-word');
    if(finalWordEl) finalWordEl.innerText = gameData.secretWord;

    // Restaurar cartel de ganador
    const display = document.getElementById('winner-display');
    if (display && winner) {
        display.innerText = (winner === 'Impostor') ? "🏆 GANA EL IMPOSTOR" : "🛡️ GANAN CIUDADANOS";
        display.style.color = (winner === 'Impostor') ? "#e74c3c" : "#2ecc71";
    } else if (display) {
        display.innerText = "PARTIDA FINALIZADA"; // Fallback por si acaso
    }

    // Restaurar lista de roles
    const rolesDiv = document.getElementById('roles-reveal');
    if (rolesDiv && gameData.assignments) {
        const imps = gameData.assignments.filter(p => p.isImpostor).map(p => `<strong>${p.name}</strong>`).join(', ');
        const accs = gameData.assignments.filter(p => p.isAccomplice).map(p => `<strong>${p.name}</strong>`).join(', ');
        rolesDiv.innerHTML = `<p style="color:#e74c3c">😈 Impostor: ${imps}</p>` + (accs ? `<p style="color:#9b59b6">🤝 Cómplice: ${accs}</p>` : '');
    }

    // Restaurar tabla de torneo si hace falta
    if (isTournamentActive && typeof renderScoreboard === 'function') {
        renderScoreboard();
        const scoreContainer = document.getElementById('scoreboard-container');
        if(scoreContainer) scoreContainer.classList.remove('hidden');
    }
}

function clearGameState() {
    localStorage.removeItem('impostorGameState');
}

// --- API FETCHES ---
async function fetchThemes() {
    try {
        const r = await fetch('/api/themes');
        themes = await r.json();
        if (typeof renderThemeGrid === 'function') renderThemeGrid();
    } catch(e) { console.error(e); }
}

async function saveThemeFromUI() {
    const n = document.getElementById('new-theme-title').value;
    if(!n) return alert("Pon título");
    
    const suggestionsRaw = document.getElementById('new-theme-suggestions').value.trim();
    let themeSuggestions = [];
    if (suggestionsRaw) themeSuggestions = suggestionsRaw.split('/').map(s => s.trim()).filter(s => s.length > 0);

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
    
    // Volver al gestor
    if (typeof goToThemeManager === 'function') {
        goToThemeManager();
    } else {
        showScreen('screen-home');
    }
}

async function saveGameRecordToHistory(record) {
    await fetch('/api/history', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(record)});
}

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