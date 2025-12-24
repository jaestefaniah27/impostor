// --- LÓGICA DE TORNEO ---
function startTournamentMode() {
    const name = document.getElementById('tournament-name-input').value.trim() || "Torneo Sin Nombre";
    if (confirm(`¿Empezar el torneo "${name}"? Los puntos empezarán desde 0.`)) {
        isTournamentActive = true;
        currentTournamentName = name;
        tournamentScores = {};
        tournamentGames = [];
        players.forEach(p => tournamentScores[p] = 0);
        checkTournamentState();
        alert("¡Torneo Iniciado! Ahora dale a 'JUGAR RONDA'.");
    }
}

function checkTournamentState() {
    const banner = document.getElementById('active-tournament-display');
    const box = document.getElementById('tournament-setup-box');
    if (isTournamentActive) {
        banner.classList.remove('hidden');
        document.getElementById('active-tourney-name').innerText = currentTournamentName;
        box.classList.add('hidden');
    } else {
        banner.classList.add('hidden');
        box.classList.remove('hidden');
    }
}

async function finishTournament() {
    if (!confirm("¿Terminar torneo y guardar en el historial?")) return;
    const tournamentRecord = {
        type: 'tournament',
        name: currentTournamentName,
        date: new Date().toISOString(),
        scores: tournamentScores,
        games: tournamentGames
    };
    await saveGameRecordToHistory(tournamentRecord);
    isTournamentActive = false;
    currentTournamentName = "";
    checkTournamentState();
    alert("Torneo guardado en el Historial.");
    loadAndShowHistory();
}

// --- LÓGICA DE JUEGO ---
function startGameSetup() {
    if(selectedThemesIds.length === 0) return alert("Elige tema");
    document.getElementById('suggestion-area').innerHTML = '';
    
    // Selección contextual de palabras
    let selectionPool = []; 
    themes.forEach(t => { 
        if(selectedThemesIds.includes(t.id)) {
            const themeSuggs = (t.suggestions && t.suggestions.length > 0) ? t.suggestions : defaultSuggestions;
            t.words.forEach(w => {
                selectionPool.push({ wordData: w, suggestions: themeSuggs });
            });
        } 
    });

    if(selectionPool.length === 0) return alert("Temas vacíos");
    
    const selection = selectionPool[Math.floor(Math.random() * selectionPool.length)];
    gameData.secretWord = selection.wordData.text;
    gameData.currentSuggestions = selection.suggestions;
    const sel = selection.wordData;

    const hintsOn = document.getElementById('hints-toggle').checked;
    gameData.secretHint = hintsOn 
        ? (Array.isArray(sel.hints) ? sel.hints : (sel.hint ? [sel.hint] : ["Sin pista"]))[Math.floor(Math.random()*(Array.isArray(sel.hints)?sel.hints.length:1))] 
        : null;
    
    let impC = parseInt(document.getElementById('impostor-count').value); 
    if(impC >= players.length) impC = players.length - 1;
    gameData.totalImpostors = impC; 
    gameData.impostorsCaught = 0;
    
    let assign = new Array(players.length).fill(null); 
    let p = 0;

    // Impostores
    while(p < impC) { 
        let r = Math.floor(Math.random()*players.length); 
        if(!assign[r]) { assign[r]={isImpostor:true, isAccomplice:false, name:players[r], alive:true}; p++; } 
    }

    // Cómplice
    const accOn = document.getElementById('accomplice-toggle').checked;
    if(accOn && (players.length - impC) >= 2) {
        let assigned = false;
        while(!assigned) {
            let r = Math.floor(Math.random()*players.length);
            if(!assign[r]) { assign[r]={isImpostor:false, isAccomplice:true, name:players[r], alive:true}; assigned=true; }
        }
    }

    // Ciudadanos
    for(let i=0; i<players.length; i++) if(!assign[i]) assign[i]={isImpostor:false, isAccomplice:false, name:players[i], alive:true};
    
    gameData.assignments = assign; 
    gameData.currentIndex = 0; 
    
    // CAMBIO: En lugar de setupCardForPlayer, vamos a la pantalla de pase
    showPassScreen();
}

// NUEVA FUNCIÓN: Muestra la pantalla intermedia
function showPassScreen() {
    const p = gameData.assignments[gameData.currentIndex];
    const av = playerAvatars[p.name] || '👤';
    
    document.getElementById('pass-player-name').innerText = p.name;
    document.getElementById('pass-player-avatar').innerText = av;
    
    showScreen('screen-pass-device');
}

// NUEVA FUNCIÓN: Se llama cuando el usuario confirma "Soy yo"
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
        wd.innerText="😈 IMPOSTOR"; 
        wd.style.color="#e74c3c"; 
        rd.innerHTML=gameData.secretHint?`Pista: <strong style='color:#f1c40f'>${gameData.secretHint}</strong>`:"Sin pista"; 
    }
    else if(p.isAccomplice) { 
        wd.innerText=gameData.secretWord; 
        wd.style.color="#9b59b6"; 
        const imps=gameData.assignments.filter(x=>x.isImpostor).map(x=>x.name).join(", "); 
        rd.innerHTML=`🤫 CÓMPLICE<br>Protege a: <strong style='color:#e74c3c'>${imps}</strong>`; 
    }
    else { 
        wd.innerText=gameData.secretWord; 
        wd.style.color="#2ecc71"; 
        rd.innerText="Ciudadano"; 
    }
    
    const btn = document.getElementById('next-btn');
    if(gameData.currentIndex >= players.length-1) { 
        btn.innerText="EMPEZAR PARTIDA"; 
        btn.onclick=startActiveGame; 
    } else { 
        btn.innerText="SIGUIENTE JUGADOR"; 
        btn.onclick=nextPlayer; // Llama a la función que inicia el pase de móvil
    }
}

function nextPlayer(){ 
    gameData.currentIndex++; 
    showPassScreen(); // Ahora va a la pantalla intermedia
}

function startActiveGame() {
    showScreen('screen-active'); 
    renderVotingList();
    
    let pool=[]; 
    gameData.assignments.forEach(p=>{
        if(p.alive){
            const w = p.isImpostor ? 6 : 10;
            for(let i=0; i<w; i++) pool.push(p.name);
        }
    });
    const st = pool[Math.floor(Math.random()*pool.length)]; 
    document.getElementById('starter-name').innerText=`${playerAvatars[st]||''} ${st}`;
    
    const m = parseInt(document.getElementById('game-timer-input').value);
    if(m > 20) document.getElementById('timer-display').innerText="♾️";
    else { 
        timeRemaining = m * 60; 
        updateTimerUI(); 
        timerInterval = setInterval(()=>{
            timeRemaining--; 
            updateTimerUI(); 
            if(timeRemaining<=0) clearInterval(timerInterval);
        }, 1000); 
    }
}

function updateTimerUI() {
    const m = Math.floor(timeRemaining/60).toString().padStart(2,'0');
    const s = (timeRemaining%60).toString().padStart(2,'0');
    document.getElementById('timer-display').innerText=`${m}:${s}`;
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
    
    showScreen('screen-result'); 
    clearInterval(timerInterval);
    
    const t=document.getElementById('result-title');
    const ic=document.getElementById('result-icon');
    const m=document.getElementById('result-msg');
    const ia=document.getElementById('impostor-guess-area');
    const cb=document.getElementById('continue-btn');

    if(p.isImpostor) { 
        t.innerText="¡IMPOSTOR PILLADO!"; t.style.color="#2ecc71"; ic.innerText="🎉"; m.innerText=`${p.name} era Impostor.`; 
        ia.classList.remove('hidden'); cb.classList.add('hidden'); 
    }
    else if(p.isAccomplice) { 
        t.innerText="¡ERA EL CÓMPLICE!"; t.style.color="#9b59b6"; ic.innerText="🎭"; m.innerText=`${p.name} ayudaba al Impostor.`; 
        ia.classList.add('hidden'); cb.classList.remove('hidden'); 
    }
    else { 
        t.innerText="ERROR..."; t.style.color="#e74c3c"; ic.innerText="💀"; m.innerText=`${p.name} era Inocente.`; 
        ia.classList.add('hidden'); cb.classList.remove('hidden'); 
    }
}

function citizensGiveUp(){ if(confirm("¿Rendirse?")) endGameWithWinner('Impostor'); }

function continueGame() {
    const l = gameData.assignments.filter(p=>p.alive).length;
    const li = gameData.assignments.filter(p=>p.alive&&p.isImpostor).length;
    
    if(l <= 2 && li > 0) { alert("¡Empate técnico! Gana Impostor."); endGameWithWinner('Impostor'); }
    else if(li === 0) endGameWithWinner('Ciudadanos');
    else { showScreen('screen-active'); renderVotingList(); }
}

// --- FINALIZAR RONDA ---
async function endGameWithWinner(winner) {
    clearInterval(timerInterval);
    
    const impostorObj = gameData.assignments.find(p => p.isImpostor);
    const accompliceObj = gameData.assignments.find(p => p.isAccomplice);
    
    const currentGameRecord = {
        type: 'single_game', 
        date: new Date().toISOString(),
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

function restartGame(){ startGameSetup(); }