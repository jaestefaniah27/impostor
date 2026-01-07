// --- LÓGICA DE TORNEO UNIFICADA ---
function startTournamentMode() {
    const nameInput = document.getElementById('tournament-name-input');
    const name = nameInput ? nameInput.value.trim() : "Torneo";

    // Validaciones
    if (!name) return alert("Por favor, ponle un nombre al torneo.");
    if (players.length < 3) return alert("Necesitas al menos 3 jugadores para empezar.");

    if (confirm(`¿Iniciar el torneo "${name}"?`)) {
        // 1. Inicializar variables
        isTournamentActive = true;
        currentTournamentName = name;
        tournamentGames = [];
        tournamentScores = {};
        players.forEach(p => tournamentScores[p] = 0);

        // 2. GUARDAR EN MEMORIA (Clave para persistencia)
        saveTournamentState();

        alert(`🏆 ¡Torneo "${name}" iniciado!`);

        // 3. Actualizar interfaz
        checkTournamentState();

        // 4. IR A JUGAR (La parte importante)
        goToThemeSelection();
    }
}

function checkTournamentState() {
    const banner = document.getElementById('active-tournament-display');
    const box = document.getElementById('tournament-setup-box');
    const title = document.getElementById('active-tourney-name');

    if (isTournamentActive) {
        if (banner) banner.classList.remove('hidden');
        if (title) title.innerText = currentTournamentName;
        if (box) box.classList.add('hidden');

        // Actualizar banner de puntos si existe la función UI
        if (typeof updateTournamentBanner === 'function') updateTournamentBanner();
    } else {
        if (banner) banner.classList.add('hidden');
        if (box) box.classList.remove('hidden');
    }
}
// Variable de seguridad para evitar duplicados en torneos
let isSavingTournament = false;
async function finishTournament() {
    // CANDADO: Si ya se está guardando, no hacemos nada
    if (isSavingTournament) return;

    if (!confirm("¿Seguro que quieres terminar el torneo? Se guardará el historial y se borrarán los marcadores.")) return;

    // Activamos el candado
    isSavingTournament = true;

    try {
        const tournamentRecord = {
            type: 'tournament',
            name: currentTournamentName,
            date: new Date().toISOString(),
            scores: tournamentScores,
            games: tournamentGames,
            players: Object.keys(tournamentScores)
        };

        await saveGameRecordToHistory(tournamentRecord);

        isTournamentActive = false;
        currentTournamentName = "";
        tournamentScores = {};
        tournamentGames = [];
        saveTournamentState();

        checkTournamentState();
        alert("🏆 Torneo finalizado y guardado.");
        goToHome();
    } catch (e) {
        console.error(e);
    } finally {
        // Liberamos el candado
        isSavingTournament = false;
    }
}

// --- LÓGICA DE JUEGO ---
// --- LÓGICA DE SELECCIÓN PONDERADA (Anti-repetición) ---
function getWeightedRandomPlayerIndex(players, currentAssignments, pastImpostors) {
    const N = players.length;
    let candidates = [];
    let totalWeight = 0;

    // 1. Calcular peso para cada jugador
    for (let i = 0; i < N; i++) {
        // Si ya tiene rol asignado en esta ronda, saltar
        if (currentAssignments[i]) continue;

        const playerName = players[i];
        let weight = 100; // Peso base (máxima probabilidad)

        // Buscar cuándo fue impostor por última vez
        // index 0 = partida anterior, 1 = hace 2 partidas...
        const lastIndex = pastImpostors.indexOf(playerName);

        if (lastIndex === -1) {
            // Si NO está en la memoria reciente, le damos mas peso (140)
            // Esto fuerza a que el sistema prefiera a gente nueva antes que repetir
            weight = 140;
        } else {
            // Si ESTÁ en memoria, aplicamos el enfriamiento (de 5 a 100)
            const recovery = lastIndex / (pastImpostors.length || 1);
            weight = 25 + Math.floor(75 * recovery);
        }

        candidates.push({ index: i, weight: weight });
        totalWeight += weight;
    }

    // 2. Selección aleatoria basada en pesos (Ruleta)
    let randomValue = Math.random() * totalWeight;
    for (let candidate of candidates) {
        randomValue -= candidate.weight;
        if (randomValue <= 0) {
            return candidate.index;
        }
    }

    // Fallback por seguridad (devuelve el último válido)
    return candidates.length > 0 ? candidates[candidates.length - 1].index : -1;
}

function startGameSetup() {
    if (selectedThemesIds.length === 0) return alert("Elige al menos un tema.");

    const activeThemes = themes.filter(t => selectedThemesIds.includes(t.id));
    if (activeThemes.length === 0) return alert("Error cargando temas.");

    // --- LÓGICA ANTI-REPETICIÓN ---
    // 1. Juntamos historial histórico + torneo actual
    const fullHistory = [...(gameHistory || []), ...tournamentGames];

    // 2. Set de palabras prohibidas (ignorando mayúsculas)
    const usedWordsSet = new Set(fullHistory.map(h => h.word ? h.word.toLowerCase().trim() : ""));

    // 3. Ordenar temas por "menos usado recientemente"
    const themeLastUsed = {};
    activeThemes.forEach(t => themeLastUsed[t.id] = 0);

    fullHistory.forEach(record => {
        const recDate = new Date(record.date || 0).getTime();
        activeThemes.forEach(t => {
            if (t.words.some(w => w.text.toLowerCase().trim() === (record.word || "").toLowerCase().trim())) {
                if (recDate > themeLastUsed[t.id]) themeLastUsed[t.id] = recDate;
            }
        });
    });
    activeThemes.sort((a, b) => themeLastUsed[a.id] - themeLastUsed[b.id]);

    // 4. Elegir palabra NO usada del tema prioritario
    let finalSelection = null;
    for (let theme of activeThemes) {
        const availableWords = theme.words.filter(w => !usedWordsSet.has(w.text.toLowerCase().trim()));
        if (availableWords.length > 0) {
            const randomWord = availableWords[Math.floor(Math.random() * availableWords.length)];
            finalSelection = {
                wordData: randomWord,
                suggestions: (theme.suggestions && theme.suggestions.length > 0) ? theme.suggestions : defaultSuggestions
            };
            break;
        }
    }

    // Fallback: Si todas están usadas, repetimos (pero del tema menos usado)
    if (!finalSelection) {
        const fallbackTheme = activeThemes[0];
        const randomWord = fallbackTheme.words[Math.floor(Math.random() * fallbackTheme.words.length)];
        finalSelection = {
            wordData: randomWord,
            suggestions: (fallbackTheme.suggestions && fallbackTheme.suggestions.length > 0) ? fallbackTheme.suggestions : defaultSuggestions
        };
    }
    // -----------------------------

    gameData.secretWord = finalSelection.wordData.text;
    gameData.currentSuggestions = finalSelection.suggestions;
    gameData.startTime = null;
    gameData.lastWinner = null;

    // Pista
    const hintsOn = document.getElementById('hints-toggle').checked;
    const wData = finalSelection.wordData;
    gameData.secretHint = hintsOn
        ? (Array.isArray(wData.hints) ? wData.hints : (wData.hint ? [wData.hint] : ["Sin pista"]))[Math.floor(Math.random() * (Array.isArray(wData.hints) ? wData.hints.length : 1))]
        : null;

    // Roles (con tu lógica de peso ponderado para impostores)
    let impC = parseInt(document.getElementById('impostor-count').value);
    if (impC >= players.length) impC = players.length - 1;
    gameData.totalImpostors = impC;

    let assign = new Array(players.length).fill(null);
    let p = 0;
    if (!gameData.pastImpostors) gameData.pastImpostors = [];

    while (p < impC) {
        let r = getWeightedRandomPlayerIndex(players, assign, gameData.pastImpostors);
        if (r !== -1 && !assign[r]) {
            assign[r] = { isImpostor: true, isAccomplice: false, name: players[r], alive: true };
            p++;
        } else {
            let backup = Math.floor(Math.random() * players.length);
            if (!assign[backup]) { assign[backup] = { isImpostor: true, isAccomplice: false, name: players[backup], alive: true }; p++; }
        }
    }

    const accOn = document.getElementById('accomplice-toggle').checked;
    if (accOn && (players.length - impC) >= 2) {
        let assigned = false;
        while (!assigned) {
            let r = Math.floor(Math.random() * players.length);
            if (!assign[r]) { assign[r] = { isImpostor: false, isAccomplice: true, name: players[r], alive: true }; assigned = true; }
        }
    }

    for (let i = 0; i < players.length; i++) if (!assign[i]) assign[i] = { isImpostor: false, isAccomplice: false, name: players[i], alive: true };

    gameData.assignments = assign;
    gameData.currentIndex = 0;

    saveGameState('screen-pass-device');
    showPassScreen();
}

function showPassScreen() {
    gameData.hasRevealed = false; // Reset for each player turn
    const p = gameData.assignments[gameData.currentIndex];
    const av = playerAvatars[p.name] || '👤';
    document.getElementById('pass-player-name').innerText = p.name;
    document.getElementById('pass-player-avatar').innerText = av;
    showScreen('screen-pass-device');
}

function confirmIdentity() {
    setupCardForPlayer();
    showScreen('screen-reveal');
}

function setupCardForPlayer() {
    const p = gameData.assignments[gameData.currentIndex];
    const av = playerAvatars[p.name] || '👤';
    document.getElementById('current-player-display').innerHTML = `<span style="font-size:2em">${av}</span><br>Turno de: ${p.name}`;

    const wd = document.getElementById('secret-word');
    const rd = document.getElementById('secret-role');

    if (p.isImpostor) {
        wd.innerText = "🥷 IMPOSTOR"; wd.style.color = "#e74c3c";
        rd.innerHTML = gameData.secretHint ? `Pista: <strong style='color:#f1c40f'>${gameData.secretHint}</strong>` : "Sin pista";
    } else if (p.isAccomplice) {
        wd.innerText = gameData.secretWord; wd.style.color = "#9b59b6";
        const imps = gameData.assignments.filter(x => x.isImpostor).map(x => x.name).join(", ");
        rd.innerHTML = `🤫 CÓMPLICE<br>Protege a: <strong style='color:#e74c3c'>${imps}</strong>`;
    } else {
        wd.innerText = gameData.secretWord; wd.style.color = "#2ecc71"; rd.innerText = "Ciudadano";
    }

    const btn = document.getElementById('next-btn');
    if (gameData.currentIndex >= players.length - 1) {
        btn.innerText = "EMPEZAR PARTIDA"; btn.onclick = startActiveGame;
    } else {
        btn.innerText = "SIGUIENTE JUGADOR"; btn.onclick = nextPlayer;
    }
}

function nextPlayer() {
    gameData.currentIndex++;
    saveGameState('screen-pass-device'); // Guardar antes de pasar
    showPassScreen();
}

function startActiveGame() {
    showScreen('screen-active');
    renderVotingList();

    if (!gameData.startTime) {
        gameData.startTime = Date.now();
        // Guardamos estado inmediatamente
        saveGameState('screen-active');
        let pool = [];
        gameData.assignments.forEach(p => { if (p.alive) { const w = p.isImpostor ? 6 : 10; for (let i = 0; i < w; i++) pool.push(p.name); } });
        const st = pool[Math.floor(Math.random() * pool.length)];
        document.getElementById('starter-name').innerText = `${playerAvatars[st] || ''} ${st}`;
    }
    startTimer();
    saveGameState('screen-active');
}

function startTimer() {
    clearInterval(timerInterval);

    // Actualizar visualmente ya, para no esperar 1 segundo
    updateTimerUI();

    // Actualizar cada segundo
    timerInterval = setInterval(() => {
        updateTimerUI();
    }, 1000);
}

// 3. RENDERIZADO DEL TIEMPO (Matemáticas para persistencia real)
function updateTimerUI() {
    // Si no hay hora de inicio, no podemos calcular
    if (!gameData.startTime) return;

    // TIEMPO TRANSCURRIDO = AHORA - HORA DE INICIO
    const diff = Math.floor((Date.now() - gameData.startTime) / 1000);

    const m = Math.floor(diff / 60).toString().padStart(2, '0');
    const s = (diff % 60).toString().padStart(2, '0');

    const el = document.getElementById('timer-display');
    if (el) el.innerText = `${m}:${s}`;
}

function renderVotingList() {
    const c = document.getElementById('voting-list');
    c.innerHTML = '';
    gameData.assignments.forEach((p, i) => {
        if (p.alive) {
            const av = playerAvatars[p.name] || '👤';
            const b = document.createElement('div');
            b.className = 'vote-card';
            b.innerHTML = `<div style="font-size:1.5em">${av}</div><strong>${p.name}</strong><br><small>Expulsar</small>`;
            b.onclick = () => votePlayer(i);
            c.appendChild(b);
        }
    });
}

function votePlayer(i) {
    if (!confirm(`¿Expulsar a ${gameData.assignments[i].name}?`)) return;

    const p = gameData.assignments[i];
    p.alive = false;

    clearInterval(timerInterval);

    const t = document.getElementById('result-title');
    const ic = document.getElementById('result-icon');
    const m = document.getElementById('result-msg');
    const ia = document.getElementById('impostor-guess-area');
    const cb = document.getElementById('continue-btn');

    showScreen('screen-result');

    if (p.isImpostor) {
        t.innerText = "¡IMPOSTOR PILLADO!"; t.style.color = "#2ecc71"; ic.innerText = "🎉"; m.innerText = `${p.name} era Impostor.`;
        ia.classList.remove('hidden'); cb.classList.add('hidden');
    } else if (p.isAccomplice) {
        t.innerText = "¡ERA EL CÓMPLICE!"; t.style.color = "#9b59b6"; ic.innerText = "🎭"; m.innerText = `${p.name} ayudaba al Impostor.`;
        ia.classList.add('hidden'); cb.classList.remove('hidden');
    } else {
        t.innerText = "ERROR..."; t.style.color = "#e74c3c"; ic.innerText = "💀"; m.innerText = `${p.name} era Inocente.`;
        ia.classList.add('hidden'); cb.classList.remove('hidden');
    }

    saveGameState('screen-result');
}

function citizensGiveUp() { if (confirm("¿Rendirse?")) endGameWithWinner('Impostor'); }

function continueGame() {
    const l = gameData.assignments.filter(p => p.alive).length;
    const li = gameData.assignments.filter(p => p.alive && p.isImpostor).length;

    if (l <= 2 && li > 0) { alert("¡Empate técnico! Gana Impostor."); endGameWithWinner('Impostor'); }
    else if (li === 0) endGameWithWinner('Ciudadanos');
    else {
        startActiveGame(); // Volver a jugar (reactiva timer y guarda)
    }
}

// --- MOTOR DE PUNTUACIÓN ---
function calculateScore(winnerTeam, roundsPlayed) {
    const config = SCORING_MODES[currentScoringMode];
    // Asegurar que r es al menos 1
    const r = Math.max(1, roundsPlayed);

    if (winnerTeam === 'Impostor') {
        // FÓRMULA IMPOSTOR: Adivinanza (Decay) + Supervivencia (Híbrida)

        // 1. Puntos por Palabra (Igual que antes)
        const wordScore = Math.max(0, config.impostor.guess_base - (config.impostor.guess_decay * (r - 1)));

        // 2. Puntos por Supervivencia (NUEVA LÓGICA)
        let survScore;
        const cutoffRound = 3; // Límite de crecimiento exponencial

        if (r <= cutoffRound) {
            // FASE 1: Crecimiento Exponencial (Rondas 1, 2, 3)
            // Fórmula original: Base * Multiplier^(r-1)
            survScore = Math.floor(config.impostor.surv_base * Math.pow(config.impostor.surv_multiplier, (r - 1)));
        } else {
            // FASE 2: Crecimiento Lineal (Ronda 4 en adelante)

            // Calculamos cuánto valía en la ronda de corte (R3)
            const baseAtCutoff = Math.floor(config.impostor.surv_base * Math.pow(config.impostor.surv_multiplier, (cutoffRound - 1)));

            // Calculamos cuántas rondas extra has sobrevivido
            const extraRounds = r - cutoffRound;

            // Sumamos el paso lineal por cada ronda extra
            const linearBonus = extraRounds * (config.impostor.surv_linear_step || 500); // Fallback por seguridad

            survScore = baseAtCutoff + linearBonus;
        }

        return Math.round(wordScore + survScore);

    } else {
        // (Lógica de ciudadanos sin cambios...)
        const potScore = Math.floor(config.citizen.base_pot / r);
        return Math.round(potScore + config.citizen.flat_bonus);
    }
}

async function endGameWithWinner(winner) {
    if (gameData.lastWinner) return;
    gameData.lastWinner = winner;

    if (!gameData.pastImpostors) gameData.pastImpostors = [];

    // Actualizar historial de roles recientes (Lógica existente)
    const currentImpostors = gameData.assignments.filter(p => p.isImpostor).map(p => p.name);
    currentImpostors.forEach(impName => {
        const oldIdx = gameData.pastImpostors.indexOf(impName);
        if (oldIdx !== -1) gameData.pastImpostors.splice(oldIdx, 1);
        gameData.pastImpostors.unshift(impName);
    });
    const memoryLimit = Math.ceil(players.length * 1.2);
    if (gameData.pastImpostors.length > memoryLimit) gameData.pastImpostors = gameData.pastImpostors.slice(0, memoryLimit);

    clearInterval(timerInterval);
    const durationSec = gameData.startTime ? Math.round((Date.now() - gameData.startTime) / 1000) : 0;

    // --- CÁLCULO DE RONDAS ---
    // En tu juego, una "ronda" pasa cuando se expulsa a alguien.
    // Ronda 1 = 0 muertos. Ronda 2 = 1 muerto. Ronda 3 = 2 muertos.
    // Por tanto: Ronda Actual = (Muertos Inocentes + Muertos Impostores) + 1
    const deadPlayersCount = gameData.assignments.filter(p => !p.alive).length;
    const currentRound = deadPlayersCount;

    // --- CÁLCULO DE PUNTOS ---
    const pointsAwarded = calculateScore(winner, currentRound);

    const impostorObj = gameData.assignments.find(p => p.isImpostor);
    const accompliceObj = gameData.assignments.find(p => p.isAccomplice);

    // Creamos el registro con los puntos guardados
    const currentGameRecord = {
        type: 'single_game',
        date: new Date().toISOString(),
        duration: durationSec,
        players: gameData.assignments.map(p => p.name),
        impostor: impostorObj ? impostorObj.name : "?",
        accomplice: accompliceObj ? accompliceObj.name : null,
        word: gameData.secretWord,
        hint: gameData.secretHint,
        winner: winner,
        rounds: currentRound,     // <--- Guardamos ronda
        points: pointsAwarded,    // <--- Guardamos puntos
        mode: currentScoringMode  // <--- Guardamos qué modo se usó
    };

    // --- GESTIÓN DE PUNTOS (TORNEO O NO) ---
    // Ahora SIEMPRE calculamos puntos, si hay torneo los sumamos.
    if (isTournamentActive) {
        tournamentGames.push(currentGameRecord);
        gameData.assignments.forEach(p => {
            if (tournamentScores[p.name] === undefined) tournamentScores[p.name] = 0;

            const isBad = p.isImpostor || p.isAccomplice;

            // Si gana Impostor, suman los malos. Si gana Ciudadano, suman los buenos.
            if (winner === 'Impostor' && isBad) {
                tournamentScores[p.name] += pointsAwarded;
            } else if (winner === 'Ciudadanos' && !isBad) {
                // Opcional: ¿Los muertos suman? 
                // En tu lógica original: Sí. En modo supervivencia estricto: Quizás no.
                // Dejémoslo en que TODOS los ciudadanos suman si ganan.
                tournamentScores[p.name] += pointsAwarded;
            }
        });

        saveTournamentState();
        renderScoreboard();
        document.getElementById('scoreboard-container').classList.remove('hidden');
    } else {
        // Si es partida rápida, guardamos en historial global
        await saveGameRecordToHistory(currentGameRecord);
        document.getElementById('scoreboard-container').classList.add('hidden');
    }

    // --- INTERFAZ FINAL ---
    document.getElementById('final-word').innerText = gameData.secretWord;
    const display = document.getElementById('winner-display');

    // AÑADIMOS LOS PUNTOS AL CARTEL DE VICTORIA
    display.innerHTML = (winner === 'Impostor')
        ? `🏆 GANA EL IMPOSTOR<br><span style="font-size:0.6em; color:#fff;">+${pointsAwarded} pts (Ronda ${currentRound})</span>`
        : `🛡️ GANAN CIUDADANOS<br><span style="font-size:0.6em; color:#fff;">+${pointsAwarded} pts (Ronda ${currentRound})</span>`;

    display.style.color = (winner === 'Impostor') ? "#e74c3c" : "#2ecc71";

    const rolesDiv = document.getElementById('roles-reveal');
    const imps = gameData.assignments.filter(p => p.isImpostor).map(p => `<strong>${p.name}</strong>`).join(', ');
    const accs = gameData.assignments.filter(p => p.isAccomplice).map(p => `<strong>${p.name}</strong>`).join(', ');
    rolesDiv.innerHTML = `<p style="color:#e74c3c">🥷 Impostor: ${imps}</p>` + (accs ? `<p style="color:#9b59b6">🤝 Cómplice: ${accs}</p>` : '');

    saveGameState('screen-solution');
    showScreen('screen-solution');
}

function renderScoreboard() {
    document.getElementById('score-tourney-name').innerText = currentTournamentName;
    const table = document.getElementById('scoreboard-body');
    const sortedPlayers = Object.keys(tournamentScores).sort((a, b) => tournamentScores[b] - tournamentScores[a]);
    table.innerHTML = sortedPlayers.map((name, i) => {
        const av = playerAvatars[name] || '👤';
        const sc = tournamentScores[name];
        return `<tr style="${i === 0 ? 'background:rgba(241,196,15,0.2)' : ''}"><td>#${i + 1} <span style="font-size:1.2em">${av}</span> ${name}</td><td class="score-val">${sc}</td></tr>`;
    }).join('');
}
// --- FUNCIÓN PARA CANCELAR PARTIDA ---
function cancelGame() {
    if (confirm("¿⛔️ Cancelar esta partida?\n\nNo se guardará en el historial ni afectará al torneo.")) {
        // 1. Parar el reloj
        clearInterval(timerInterval);

        // 2. Limpiar datos de la partida actual (resetear ganador para el candado)
        gameData.lastWinner = null;
        gameData.startTime = null;

        // 3. Salir al menú (esto borra el estado temporal 'impostorGameState')
        // Nota: Si hay un torneo activo, NO se borra, sigue ahí esperándote.
        exitGameToHome();
    }
}
function restartGame() { startGameSetup(); }