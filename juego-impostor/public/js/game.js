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
        if(banner) banner.classList.remove('hidden');
        if(title) title.innerText = currentTournamentName;
        if(box) box.classList.add('hidden');
        
        // Actualizar banner de puntos si existe la función UI
        if (typeof updateTournamentBanner === 'function') updateTournamentBanner();
    } else {
        if(banner) banner.classList.add('hidden');
        if(box) box.classList.remove('hidden');
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

function startGameSetup() {
    if(selectedThemesIds.length === 0) return alert("Elige al menos un tema.");
    
    // Preparar partida: mezclar palabras de los temas elegidos
    let selectionPool = []; 
    themes.forEach(t => { 
        if(selectedThemesIds.includes(t.id)) {
            const themeSuggs = (t.suggestions && t.suggestions.length > 0) ? t.suggestions : defaultSuggestions;
            t.words.forEach(w => selectionPool.push({ wordData: w, suggestions: themeSuggs }));
        } 
    });

    if(selectionPool.length === 0) return alert("Los temas seleccionados no tienen palabras.");
    
    // Elegir palabra
    const selection = selectionPool[Math.floor(Math.random() * selectionPool.length)];
    gameData.secretWord = selection.wordData.text;
    gameData.currentSuggestions = selection.suggestions;
    gameData.startTime = null; // Reset tiempo para nueva partida
    gameData.lastWinner = null; // Reiniciamos el candado de duplicados
    // Elegir pista
    const sel = selection.wordData;
    const hintsOn = document.getElementById('hints-toggle').checked;
    gameData.secretHint = hintsOn 
        ? (Array.isArray(sel.hints) ? sel.hints : (sel.hint ? [sel.hint] : ["Sin pista"]))[Math.floor(Math.random()*(Array.isArray(sel.hints)?sel.hints.length:1))] 
        : null;
    
    // Asignar roles
    let impC = parseInt(document.getElementById('impostor-count').value); 
    if(impC >= players.length) impC = players.length - 1;
    gameData.totalImpostors = impC; 
    
    let assign = new Array(players.length).fill(null); 
    let p = 0;
    
    // Asignar Impostores
    while(p < impC) { 
        let r = Math.floor(Math.random()*players.length); 
        if(!assign[r]) { assign[r]={isImpostor:true, isAccomplice:false, name:players[r], alive:true}; p++; } 
    }
    
    // Asignar Cómplice
    const accOn = document.getElementById('accomplice-toggle').checked;
    if(accOn && (players.length - impC) >= 2) {
        let assigned = false;
        while(!assigned) {
            let r = Math.floor(Math.random()*players.length);
            if(!assign[r]) { assign[r]={isImpostor:false, isAccomplice:true, name:players[r], alive:true}; assigned=true; }
        }
    }
    
    // Asignar Ciudadanos
    for(let i=0; i<players.length; i++) if(!assign[i]) assign[i]={isImpostor:false, isAccomplice:false, name:players[i], alive:true};
    
    gameData.assignments = assign; 
    gameData.currentIndex = 0; 
    
    // Guardar estado inicial y mostrar
    saveGameState('screen-pass-device');
    showPassScreen();
}

function showPassScreen() {
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
    const av = playerAvatars[p.name]||'👤';
    document.getElementById('current-player-display').innerHTML = `<span style="font-size:2em">${av}</span><br>Turno de: ${p.name}`;
    
    const wd = document.getElementById('secret-word');
    const rd = document.getElementById('secret-role');
    
    if(p.isImpostor) { 
        wd.innerText="😈 IMPOSTOR"; wd.style.color="#e74c3c"; 
        rd.innerHTML=gameData.secretHint?`Pista: <strong style='color:#f1c40f'>${gameData.secretHint}</strong>`:"Sin pista"; 
    } else if(p.isAccomplice) { 
        wd.innerText=gameData.secretWord; wd.style.color="#9b59b6"; 
        const imps=gameData.assignments.filter(x=>x.isImpostor).map(x=>x.name).join(", "); 
        rd.innerHTML=`🤫 CÓMPLICE<br>Protege a: <strong style='color:#e74c3c'>${imps}</strong>`; 
    } else { 
        wd.innerText=gameData.secretWord; wd.style.color="#2ecc71"; rd.innerText="Ciudadano"; 
    }
    
    const btn = document.getElementById('next-btn');
    if(gameData.currentIndex >= players.length-1) { 
        btn.innerText="EMPEZAR PARTIDA"; btn.onclick=startActiveGame; 
    } else { 
        btn.innerText="SIGUIENTE JUGADOR"; btn.onclick=nextPlayer; 
    }
}

function nextPlayer(){ 
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
        let pool=[]; 
        gameData.assignments.forEach(p=>{ if(p.alive){ const w = p.isImpostor ? 6 : 10; for(let i=0; i<w; i++) pool.push(p.name); } });
        const st = pool[Math.floor(Math.random()*pool.length)]; 
        document.getElementById('starter-name').innerText=`${playerAvatars[st]||''} ${st}`;        
    }
    startTimer();
    saveGameState('screen-active');
}

function startTimer() {
    clearInterval(timerInterval);
    
    // Actualizar visualmente ya, para no esperar 1 segundo
    updateTimerUI();

    // Actualizar cada segundo
    timerInterval = setInterval(()=>{
        updateTimerUI();
    }, 1000);
}

// 3. RENDERIZADO DEL TIEMPO (Matemáticas para persistencia real)
function updateTimerUI() {
    // Si no hay hora de inicio, no podemos calcular
    if (!gameData.startTime) return;
    
    // TIEMPO TRANSCURRIDO = AHORA - HORA DE INICIO
    const diff = Math.floor((Date.now() - gameData.startTime) / 1000);
    
    const m = Math.floor(diff / 60).toString().padStart(2,'0');
    const s = (diff % 60).toString().padStart(2,'0');
    
    const el = document.getElementById('timer-display');
    if(el) el.innerText = `${m}:${s}`;
}

function renderVotingList() {
    const c = document.getElementById('voting-list');
    c.innerHTML = '';
    gameData.assignments.forEach((p,i)=>{ 
        if(p.alive){ 
            const av=playerAvatars[p.name]||'👤';
            const b=document.createElement('div');
            b.className='vote-card';
            b.innerHTML=`<div style="font-size:1.5em">${av}</div><strong>${p.name}</strong><br><small>Expulsar</small>`;
            b.onclick=()=>votePlayer(i);
            c.appendChild(b); 
        } 
    });
}

function votePlayer(i) {
    if(!confirm(`¿Expulsar a ${gameData.assignments[i].name}?`)) return;
    
    const p = gameData.assignments[i];
    p.alive = false; 
    
    clearInterval(timerInterval);
    
    const t=document.getElementById('result-title');
    const ic=document.getElementById('result-icon');
    const m=document.getElementById('result-msg');
    const ia=document.getElementById('impostor-guess-area');
    const cb=document.getElementById('continue-btn');

    showScreen('screen-result'); 

    if(p.isImpostor) { 
        t.innerText="¡IMPOSTOR PILLADO!"; t.style.color="#2ecc71"; ic.innerText="🎉"; m.innerText=`${p.name} era Impostor.`; 
        ia.classList.remove('hidden'); cb.classList.add('hidden'); 
    } else if(p.isAccomplice) { 
        t.innerText="¡ERA EL CÓMPLICE!"; t.style.color="#9b59b6"; ic.innerText="🎭"; m.innerText=`${p.name} ayudaba al Impostor.`; 
        ia.classList.add('hidden'); cb.classList.remove('hidden'); 
    } else { 
        t.innerText="ERROR..."; t.style.color="#e74c3c"; ic.innerText="💀"; m.innerText=`${p.name} era Inocente.`; 
        ia.classList.add('hidden'); cb.classList.remove('hidden'); 
    }
    
    saveGameState('screen-result');
}

function citizensGiveUp(){ if(confirm("¿Rendirse?")) endGameWithWinner('Impostor'); }

function continueGame() {
    const l = gameData.assignments.filter(p=>p.alive).length;
    const li = gameData.assignments.filter(p=>p.alive&&p.isImpostor).length;
    
    if(l <= 2 && li > 0) { alert("¡Empate técnico! Gana Impostor."); endGameWithWinner('Impostor'); }
    else if(li === 0) endGameWithWinner('Ciudadanos');
    else { 
        startActiveGame(); // Volver a jugar (reactiva timer y guarda)
    }
}

async function endGameWithWinner(winner) {
    if (gameData.lastWinner) return; // Candado
    gameData.lastWinner = winner;    // Bloqueo

    clearInterval(timerInterval);
    const durationSec = gameData.startTime ? Math.round((Date.now() - gameData.startTime) / 1000) : 0;    
    const impostorObj = gameData.assignments.find(p => p.isImpostor);
    const accompliceObj = gameData.assignments.find(p => p.isAccomplice);
    
    const currentGameRecord = {
        type: 'single_game', 
        date: new Date().toISOString(),
        duration: durationSec, 
        players: gameData.assignments.map(p => p.name),
        impostor: impostorObj ? impostorObj.name : "?",
        accomplice: accompliceObj ? accompliceObj.name : null,
        word: gameData.secretWord,
        hint: gameData.secretHint,
        winner: winner
    };

    if (isTournamentActive) {
        tournamentGames.push(currentGameRecord);
        gameData.assignments.forEach(p => {
            if (tournamentScores[p.name] === undefined) tournamentScores[p.name] = 0;
            const isBad = p.isImpostor || p.isAccomplice;
            if (winner === 'Impostor' && isBad) tournamentScores[p.name] += 5;
            else if (winner === 'Ciudadanos' && !isBad) tournamentScores[p.name] += 2;
        });
        
        saveTournamentState();
        renderScoreboard();
        document.getElementById('scoreboard-container').classList.remove('hidden');
    } else {
        await saveGameRecordToHistory(currentGameRecord);
        document.getElementById('scoreboard-container').classList.add('hidden');
    }

    document.getElementById('final-word').innerText = gameData.secretWord;
    const display = document.getElementById('winner-display');
    display.innerText = (winner === 'Impostor') ? "🏆 GANA EL IMPOSTOR" : "🛡️ GANAN CIUDADANOS";
    display.style.color = (winner === 'Impostor') ? "#e74c3c" : "#2ecc71";

    const rolesDiv = document.getElementById('roles-reveal');
    const imps = gameData.assignments.filter(p => p.isImpostor).map(p => `<strong>${p.name}</strong>`).join(', ');
    const accs = gameData.assignments.filter(p => p.isAccomplice).map(p => `<strong>${p.name}</strong>`).join(', ');
    rolesDiv.innerHTML = `<p style="color:#e74c3c">😈 Impostor: ${imps}</p>` + (accs ? `<p style="color:#9b59b6">🤝 Cómplice: ${accs}</p>` : '');
    
    saveGameState('screen-solution');
    showScreen('screen-solution');
}

function renderScoreboard() {
    document.getElementById('score-tourney-name').innerText = currentTournamentName;
    const table = document.getElementById('scoreboard-body');
    const sortedPlayers = Object.keys(tournamentScores).sort((a,b) => tournamentScores[b] - tournamentScores[a]);
    table.innerHTML = sortedPlayers.map((name, i) => {
        const av = playerAvatars[name] || '👤';
        const sc = tournamentScores[name];
        return `<tr style="${i===0?'background:rgba(241,196,15,0.2)':''}"><td>#${i+1} <span style="font-size:1.2em">${av}</span> ${name}</td><td class="score-val">${sc}</td></tr>`;
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
function restartGame(){ startGameSetup(); }