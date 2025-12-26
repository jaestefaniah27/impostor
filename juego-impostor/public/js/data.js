// VARIABLES GLOBALES
let players = []; 
let playerAvatars = {}; 
let themes = [];
let selectedThemesIds = [];
// CONFIGURACIÓN DE PUNTUACIÓN (MODOS DE JUEGO)
const SCORING_MODES = {
    HUNTER: {
        id: 'HUNTER',
        name: "🏹 Cacería (Impostor gana fácil)",
        desc: "Puntos bajos al inicio, suben exponencialmente. Obliga al impostor a sobrevivir.",
        impostor: { guess_base: 150, guess_decay: 40, surv_base: 20, surv_multiplier: 4.5 },
        citizen: { base_pot: 600, flat_bonus: 50 }
    },
    SIEGE: {
        id: 'SIEGE',
        name: "🏰 Asedio (Ciudadanos ganan fácil)",
        desc: "Puntos altos desde el inicio. Premia cualquier victoria del impostor.",
        impostor: { guess_base: 300, guess_decay: 50, surv_base: 80, surv_multiplier: 2.0 },
        citizen: { base_pot: 250, flat_bonus: 30 }
    }
};

// Variable de estado para el modo actual (Por defecto HUNTER)
let currentScoringMode = 'HUNTER';

// ESTADO DE JUEGO (Persistente)
// Añadimos startTime para recuperar el tiempo real
let gameData = { 
    assignments: [], 
    currentIndex: 0, 
    secretWord: '', 
    secretHint: '', 
    currentSuggestions: [], 
    impostorsCaught: 0, 
    totalImpostors: 0, 
    startTime: null,
    lastWinner: null,
    pastImpostors: []
};
let gameHistory = []; // Almacén para todo el historial de palabras usadas
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
    
    // Función para ocultar la carga suavemente
    const removeLoadingScreen = () => {
        const loader = document.getElementById('screen-loading');
        if (loader && !loader.classList.contains('hidden')) {
            // 1. Bajamos la opacidad de TODO el bloque a la vez
            loader.style.opacity = '0';
            
            // 2. Esperamos a que termine la transición CSS (0.5s) y lo quitamos
            setTimeout(() => {
                loader.classList.add('hidden');
                // Comprobación de seguridad: si no hay pantalla, ir a Home
                const anyVisible = document.querySelector('.container:not(.hidden):not(#screen-loading)');
                if (!anyVisible && typeof showScreen === 'function') showScreen('screen-home');
            }, 500); 
        }
    };

    // Backup de seguridad: A los 3 segundos se quita sí o sí
    const safetyTimer = setTimeout(removeLoadingScreen, 3000);

    try {
        // Cargas de datos
        loadGameData();      
        await fetchThemes();   
        
        await fetchGameHistory();
        
        restoreTournamentState();
        restoreGameState();

        if(typeof renderPlayers === 'function') renderPlayers();
        if(typeof setupCardInteractions === 'function') setupCardInteractions();
        if(typeof checkTournamentState === 'function') checkTournamentState();
        
    } catch (e) {
        console.error("Error init:", e);
    } finally {
        // Quitamos la pantalla de carga (con un pequeño delay para que se vea el logo)
        clearTimeout(safetyTimer);
        setTimeout(removeLoadingScreen, 800);
    }
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
        scoringMode: currentScoringMode,
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
        if (state.scoringMode && SCORING_MODES[state.scoringMode]) {
            currentScoringMode = state.scoringMode;
            // Actualizar selector visual si existe (lo crearemos luego en UI)
            const selector = document.getElementById('scoring-mode-select');
            if(selector) selector.value = currentScoringMode;
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
async function fetchGameHistory() {
    try {
        const r = await fetch('/api/history');
        gameHistory = await r.json();
    } catch(e) { 
        console.error("Error cargando historial:", e);
        gameHistory = [];
    }
}

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
    try {
        // 1. Guardar en el servidor
        await fetch('/api/history', { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify(record)
        });

        // 2. IMPORTANTE: Guardar en memoria local también
        // Así, si juegas otra ronda seguida sin recargar, el juego sabe que esta palabra ya salió.
        if (!gameHistory) gameHistory = [];
        gameHistory.push(record);

    } catch (e) {
        console.error("Error al guardar historial:", e);
    }
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