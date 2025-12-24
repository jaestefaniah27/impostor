// --- NAVEGACIÓN ---
function showScreen(id) {
    document.querySelectorAll('.container').forEach(d => d.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
    
    // NUEVO: Esto fuerza a que la pantalla empiece siempre desde arriba
    window.scrollTo(0, 0); 
}
function goToHome() { showScreen('screen-home'); }

// --- RENDERIZADO JUGADORES ---
function renderPlayers() {
    document.getElementById('players-list').innerHTML = players.map((p,i) => 
        `<span class="tag" onclick="removePlayer(${i})"><span class="avatar">${playerAvatars[p]||'👤'}</span>${p} ✕</span>`).join('');
    
    const max = Math.max(1, Math.floor(players.length/2));
    const el = document.getElementById('impostor-count');
    el.max = max; 
    if(el.value > max) el.value = max;
    updateConfigDisplay();
}

function addPlayer() {
    const v = document.getElementById('new-player').value.trim();
    if(v && !players.includes(v)) { 
        players.push(v); 
        playerAvatars[v] = getRandomAvatar(); 
        saveAllData(); 
        renderPlayers(); 
        document.getElementById('new-player').value=''; 
    } else if(players.includes(v)) alert("Repetido");
}

function removePlayer(i) { 
    players.splice(i,1); 
    saveAllData(); 
    renderPlayers(); 
}

function updateConfigDisplay() {
    document.getElementById('impostor-val').innerText = document.getElementById('impostor-count').value;
}

function updateTimeDisplay() {
    const v = parseInt(document.getElementById('game-timer-input').value);
    document.getElementById('time-display').innerText = (v > 20) ? "Infinito" : v + " min";
}

// --- RENDERIZADO TEMAS ---
function goToThemeSelection() {
    if(players.length < 3) return alert("Mín 3 jug.");
    renderThemeGrid();
    showScreen('screen-themes');
}

function renderThemeGrid() {
    const container = document.getElementById('themes-grid');
    if (!container) return; // Si no estamos en esa pantalla, salir

    if (!themes || themes.length === 0) {
        container.innerHTML = '<p style="text-align:center; opacity:0.5;">No hay temas cargados.</p>';
        return;
    }

    container.innerHTML = themes.map(t => `
        <div class="theme-box ${selectedThemesIds.includes(t.id)?'selected':''}" onclick="toggleTheme(${t.id})">
            <strong>${t.name}</strong><br><small>${t.words.length} palabras</small>
        </div>
    `).join('');
}

function toggleTheme(id) {
    selectedThemesIds.includes(id) ? 
        selectedThemesIds = selectedThemesIds.filter(x => x !== id) : 
        selectedThemesIds.push(id);
    renderThemeGrid();
}

// --- CREADOR DE TEMAS UI ---
function openThemeCreator() {
    document.getElementById('new-theme-title').value = '';
    // LIMPIAR EL NUEVO INPUT DE SUGERENCIAS
    document.getElementById('new-theme-suggestions').value = '';
    
    document.getElementById('words-container').innerHTML = '';
    addWordRow(); addWordRow(); addWordRow();
    showScreen('screen-create-theme');
}

function addWordRow() {
    const c = document.getElementById('words-container');
    const d = document.createElement('div');
    d.className = 'word-row card';
    d.innerHTML = `<div style="display:flex; justify-content:space-between;"><strong>Palabra</strong><span style="color:#e74c3c; cursor:pointer;" onclick="this.parentElement.parentElement.remove()">🗑️</span></div><input type="text" class="input-word" placeholder="Ej: Manzana"><div style="margin-top:5px;"><small>Pistas (separadas por /):</small><input type="text" class="input-hints" placeholder="Ej: Es roja / Fruta prohibida"></div>`;
    c.appendChild(d);
}

// --- SUGERENCIAS CONTEXTUALES ---
function showSuggestion() {
    // USAR LAS SUGERENCIAS DEL TEMA ACTUAL
    const source = (gameData.currentSuggestions && gameData.currentSuggestions.length > 0) 
        ? gameData.currentSuggestions 
        : defaultSuggestions;

    const randomQ = source[Math.floor(Math.random() * source.length)];
    document.getElementById('suggestion-area').innerHTML = `<div class="suggestion-card">💡 Pista: "${randomQ}"</div>`;
}

// --- INTERACCIÓN CARTA ---
function setupCardInteractions() {
    const c = document.getElementById('magic-card');
    const s = (e) => { if(e.cancelable) e.preventDefault(); c.classList.add('revealed'); };
    const h = (e) => { if(e.cancelable) e.preventDefault(); c.classList.remove('revealed'); };
    c.addEventListener('mousedown',s); c.addEventListener('mouseup',h); c.addEventListener('mouseleave',h);
    c.addEventListener('touchstart',s,{passive:false}); c.addEventListener('touchend',h); c.addEventListener('touchcancel',h);
}

// --- HISTORIAL UI ---
async function loadAndShowHistory() {
    try {
        const res = await fetch('/api/history');
        const history = await res.json();
        const container = document.getElementById('history-list');
        
        if (history.length === 0) {
            container.innerHTML = "<p>Vacío</p>";
        } else {
            container.innerHTML = history.map((record, index) => {
                const date = new Date(record.date || Date.now()).toLocaleDateString();
                
                // TORNEO
                if (record.type === 'tournament') {
                    let winnerName = "Empate";
                    let maxScore = -1;
                    Object.entries(record.scores).forEach(([name, score]) => { if (score > maxScore) { maxScore = score; winnerName = name; } });

                    return `
                    <div class="history-card h-type-tournament">
                        <div class="h-header toggleable" onclick="toggleHistoryDetails(${index})">
                            <div>
                                <span class="tourney-badge">🏆 ${record.name}</span>
                                <div style="font-size:0.8em; color:#bdc3c7; margin-top:5px;">📅 ${date} • Ganador: <strong>${winnerName}</strong></div>
                            </div>
                            <span style="font-size:1.5em;">⌃</span>
                        </div>
                        <div class="h-body expanded" id="h-body-${index}">
                            <p style="color:#f1c40f; border-bottom:1px solid #555;">Clasificación Final:</p>
                            ${Object.entries(record.scores).sort((a,b)=>b[1]-a[1]).map(([n,s]) => `
                                <div style="display:flex; justify-content:space-between; font-size:0.9em;"><span>${n}</span> <span>${s} pts</span></div>
                            `).join('')}
                            <p style="color:#bdc3c7; border-bottom:1px solid #555; margin-top:10px;">Partidas (${record.games.length}):</p>
                            ${record.games.map(g => `
                                <div class="game-row"><span>${g.word}</span><span class="${g.winner==='Impostor'?'win-imp-text':'win-cit-text'}">${g.winner==='Impostor'?'Ganó Imp.':'Ganan Ciu.'}</span></div>
                            `).join('')}
                        </div>
                    </div>`;
                }
                
                // PARTIDA SIMPLE
                else {
                    const wTxt = record.winner === 'Impostor' ? '👑 Ganó Impostor' : '🛡️ Ganaron Ciudadanos';
                    const wClass = record.winner === 'Impostor' ? 'win-imp-text' : 'win-cit-text';
                    return `
                    <div class="history-card h-type-single">
                        <div class="h-header">
                            <div>
                                <strong>${record.word}</strong> <span style="font-size:0.8em; opacity:0.7">(${date})</span>
                                <div class="${wClass}" style="font-size:0.9em;">${wTxt}</div>
                            </div>
                        </div>
                        <div class="h-body expanded" id="h-body-${index}">
                            <p>😈 Impostor: ${record.impostor}</p>
                            ${record.accomplice ? `<p>🤝 Cómplice: ${record.accomplice}</p>` : ''}
                            <p style="font-size:0.8em">Jugadores: ${record.players ? record.players.join(', ') : '?'}</p>
                        </div>
                    </div>`;
                }
            }).join('');
        }
        showScreen('screen-history');
    } catch (e) { console.error(e); }
}

function toggleHistoryDetails(idx) {
    const el = document.getElementById(`h-body-${idx}`);
    el.classList.toggle('expanded');
}

// VARIABLES UI PARA FUSIÓN
let isMergeMode = false;
let selectedForMerge = [];

// --- ESTADÍSTICAS UI ---
async function loadAndShowStats() {
    const stats = await fetchStats();
    if (!stats) return alert("Error cargando estadísticas");

    // 1. Resumen Global
    const totalMin = Math.floor(stats.global.totalTime / 60);
    const hours = Math.floor(totalMin / 60);
    const mins = totalMin % 60;
    document.getElementById('stat-total-games').innerText = stats.global.totalGames;
    document.getElementById('stat-total-time').innerText = `${hours}h ${mins}m`;

    // 2. Procesar Jugadores
    const playersArr = Object.values(stats.players);
    
    // Mejor Impostor (Más victorias)
    const bestImp = playersArr.sort((a,b) => b.impWins - a.impWins)[0];
    document.getElementById('stat-best-impostor').innerText = bestImp && bestImp.impWins > 0 ? `${bestImp.name} (${bestImp.impWins})` : "-";

    // Más Viciado (Más tiempo)
    const mostPlayed = playersArr.sort((a,b) => b.time - a.time)[0];
    document.getElementById('stat-most-played').innerText = mostPlayed ? `${mostPlayed.name}` : "-";

    // 3. Renderizar Lista
    renderStatsList(playersArr);
    
    showScreen('screen-stats');
}

function renderStatsList(playersArr) {
    // Ordenar por partidas jugadas por defecto
    playersArr.sort((a,b) => b.games - a.games);

    const container = document.getElementById('stats-list');
    container.innerHTML = playersArr.map(p => {
        const winRate = p.impTotal > 0 ? Math.round((p.impWins / p.impTotal) * 100) : 0;
        const timeMin = Math.round(p.time / 60);
        
        // Checkbox para modo fusión
        const checkHtml = isMergeMode 
            ? `<input type="checkbox" class="merge-check" value="${p.name}" onchange="updateMergeSelection(this)" style="width:20px; height:20px; margin-right:10px;">` 
            : '';

        return `
        <div class="card" style="display:flex; align-items:center; padding:10px;">
            ${checkHtml}
            <div style="flex-grow:1;">
                <div style="display:flex; justify-content:space-between;">
                    <strong style="font-size:1.1em; color:var(--accent);">${p.name}</strong>
                    <span class="badge" style="background:#2f3640;">${p.games} partidas</span>
                </div>
                <div style="font-size:0.85em; color:#bdc3c7; margin-top:5px; display:flex; gap:15px;">
                    <span>⏱️ ${timeMin} min</span>
                    <span>😈 Wins: ${p.impWins}/${p.impTotal} (${winRate}%)</span>
                </div>
            </div>
        </div>`;
    }).join('');
}

// --- LÓGICA DE FUSIÓN ---
function toggleMergeMode() {
    isMergeMode = !isMergeMode;
    selectedForMerge = [];
    document.getElementById('merge-tool-bar').classList.toggle('hidden', !isMergeMode);
    loadAndShowStats(); // Recargar para mostrar/ocultar checkboxes
}

function cancelMergeMode() {
    isMergeMode = false;
    selectedForMerge = [];
    document.getElementById('merge-tool-bar').classList.add('hidden');
    loadAndShowStats();
}

function updateMergeSelection(checkbox) {
    if (checkbox.checked) selectedForMerge.push(checkbox.value);
    else selectedForMerge = selectedForMerge.filter(n => n !== checkbox.value);
}

async function executeMerge() {
    if (selectedForMerge.length < 2) return alert("Selecciona al menos 2 jugadores para unir.");
    
    // Preguntar cuál es el nombre principal
    const mainName = prompt(`Vas a fusionar: ${selectedForMerge.join(', ')}\n\nEscribe el NOMBRE FINAL que se quedará (debe ser exacto):`, selectedForMerge[0]);
    
    if (!mainName || !selectedForMerge.includes(mainName)) {
        return alert("Debes escribir uno de los nombres seleccionados exactamente.");
    }

    if (confirm(`¿Seguro? Todas las stats de ${selectedForMerge.join(', ')} se sumarán a "${mainName}".`)) {
        await mergeAliases(mainName, selectedForMerge);
        alert("¡Fusión completada!");
        cancelMergeMode();
    }
}