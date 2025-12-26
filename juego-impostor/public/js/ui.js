// VARIABLES UI PARA FUSIÓN DE ALIAS
let isMergeMode = false;
let selectedForMerge = [];

// --- NAVEGACIÓN (CON PERSISTENCIA) ---
function showScreen(id, shouldSave = true) {
    document.querySelectorAll('.container').forEach(d => d.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
    window.scrollTo(0, 0); 
    
    // Guardar estado solo si se pide (por defecto sí)
    if (shouldSave && typeof saveGameState === 'function') {
        saveGameState(id); 
    }
}

function goToHome() { showScreen('screen-home'); }

// --- RENDERIZADO JUGADORES (HOME) ---
function renderPlayers() {
    const list = document.getElementById('players-list');
    if(!list) return;

    list.innerHTML = players.map((p,i) => 
        `<span class="tag" onclick="removePlayer(${i})"><span class="avatar">${playerAvatars[p]||'👤'}</span>${p} ✕</span>`).join('');
    
    // Ajustar máximo de impostores según jugadores
    const max = Math.max(1, Math.floor(players.length/2));
    const el = document.getElementById('impostor-count');
    if(el) {
        el.max = max; 
        if(el.value > max) el.value = max;
    }
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
    } else if(players.includes(v)) alert("Ese nombre ya existe.");
}

function removePlayer(i) { 
    players.splice(i,1); 
    saveAllData(); 
    renderPlayers(); 
}

function updateConfigDisplay() {
    const el = document.getElementById('impostor-val');
    const input = document.getElementById('impostor-count');
    if(el && input) el.innerText = input.value;
}

// --- PANTALLA DE SELECCIÓN DE TEMAS (JUGAR) ---
function goToThemeSelection() {
    if(players.length < 3) return alert("Mínimo 3 jugadores para jugar.");
    renderThemeGrid();
    showScreen('screen-themes');
}

function renderThemeGrid() {
    const container = document.getElementById('themes-grid');
    if(!container) return;
    
    if(!themes || themes.length === 0) {
        container.innerHTML = "<p>No hay temas cargados.</p>";
        return;
    }

    // Ordenar: Temas propios primero
    const sortedThemes = [...themes].sort((a, b) => {
        if (a.isCustom && !b.isCustom) return -1;
        if (!a.isCustom && b.isCustom) return 1;
        return 0;
    });

    container.innerHTML = sortedThemes.map(t => {
        const isSelected = selectedThemesIds.includes(t.id);
        const customClass = t.isCustom ? 'custom-theme-box' : '';
        const badge = t.isCustom ? '<span class="badge-custom">👤 PROPIA</span>' : '';
        
        // En esta pantalla NO se edita, solo se selecciona
        return `
        <div class="theme-box ${isSelected ? 'selected' : ''} ${customClass}" onclick="toggleTheme(${t.id})">
            <div style="display:flex; justify-content:space-between; align-items:start;">
                <strong>${t.name}</strong>
                ${isSelected ? '<span>✅</span>' : ''}
            </div>
            <small>${t.words.length} palabras</small>
            ${badge}
        </div>
    `;
    }).join('');
}

function toggleTheme(id) {
    selectedThemesIds.includes(id) ? 
        selectedThemesIds = selectedThemesIds.filter(x => x !== id) : 
        selectedThemesIds.push(id);
    renderThemeGrid();
}

// --- PANTALLA GESTOR DE TEMAS (ADMINISTRACIÓN) ---
function goToThemeManager() {
    if(!themes || themes.length === 0) {
        fetch('/api/themes').then(r => r.json()).then(data => { themes = data; renderThemeManagerList(); });
    } else {
        renderThemeManagerList();
    }
    showScreen('screen-theme-manager');
}

function renderThemeManagerList() {
    const container = document.getElementById('manager-list');
    if(!container) return;

    const sortedThemes = [...themes].sort((a, b) => {
        if (a.isCustom && !b.isCustom) return -1;
        if (!a.isCustom && b.isCustom) return 1;
        return 0;
    });

    container.innerHTML = sortedThemes.map(t => {
        const customClass = t.isCustom ? 'custom-theme-box' : '';
        let badge, onClickAttr, icon, style;

        if (t.isCustom) {
            // TEMA PROPIO: Editable
            badge = '<span class="badge-custom">👤 PROPIA</span>'; 
            onClickAttr = `onclick="loadThemeForEdit(${t.id})"`; 
            icon = '✏️'; 
            style = 'cursor: pointer;';
        } else {
            // TEMA ORIGINAL: Bloqueado
            badge = '<span style="display:block; margin-top:5px; font-size:0.7em; opacity:0.5;">🔒 ORIGINAL</span>'; 
            onClickAttr = `onclick="alert('⚠️ Los temas originales no se pueden editar. Crea uno nuevo.')"`; 
            icon = '🔒'; 
            style = 'opacity: 0.8; cursor: not-allowed; background: #2c3e50; border: 1px solid rgba(255,255,255,0.1);';
        }
        
        return `
        <div class="theme-box ${customClass}" ${onClickAttr} style="${style}">
            <div style="display:flex; justify-content:space-between; align-items:start;">
                <strong>${t.name}</strong>
                <span>${icon}</span>
            </div>
            <small>${t.words.length} palabras</small>
            ${badge}
        </div>`;
    }).join('');
}

// --- CREADOR / EDITOR DE TEMAS ---
function openThemeCreator() {
    editingThemeId = null; // Nuevo tema
    document.getElementById('create-theme-title').innerText = "🎨 Nuevo Tema";
    document.getElementById('new-theme-title').value = '';
    document.getElementById('new-theme-suggestions').value = '';
    document.getElementById('words-container').innerHTML = '';
    
    // Añadir 3 filas vacías por defecto
    addWordRow(); addWordRow(); addWordRow();
    showScreen('screen-create-theme');
}

function loadThemeForEdit(id) {
    const theme = themes.find(t => t.id === id);
    if (!theme) return;

    editingThemeId = id; // Estamos editando
    document.getElementById('create-theme-title').innerText = "✏️ Editar Tema";
    document.getElementById('new-theme-title').value = theme.name;
    
    const suggs = theme.suggestions ? theme.suggestions.join(' / ') : '';
    document.getElementById('new-theme-suggestions').value = suggs;

    const container = document.getElementById('words-container');
    container.innerHTML = ''; 
    theme.words.forEach(w => {
        addWordRow(w.text, Array.isArray(w.hints) ? w.hints.join(' / ') : w.hints);
    });

    showScreen('screen-create-theme');
}

function addWordRow(textVal = '', hintVal = '') {
    const c = document.getElementById('words-container');
    const d = document.createElement('div');
    d.className = 'word-row card';
    d.innerHTML = `
        <div style="display:flex; justify-content:space-between;">
            <strong>Palabra</strong>
            <span style="color:#e74c3c; cursor:pointer;" onclick="this.parentElement.parentElement.remove()">🗑️</span>
        </div>
        <input type="text" class="input-word" value="${textVal}" placeholder="Ej: Manzana">
        <div style="margin-top:5px;">
            <small>Pistas (separadas por /):</small>
            <input type="text" class="input-hints" value="${hintVal}" placeholder="Ej: Es roja / Fruta prohibida">
        </div>`;
    c.appendChild(d);
}

// --- JUEGO: SUGERENCIAS Y CARTAS ---
function showSuggestion() {
    const source = (gameData.currentSuggestions && gameData.currentSuggestions.length > 0) ? gameData.currentSuggestions : defaultSuggestions;
    const randomQ = source[Math.floor(Math.random() * source.length)];
    document.getElementById('suggestion-area').innerHTML = `<div class="suggestion-card">💡 Pista: "${randomQ}"</div>`;
}

function setupCardInteractions() {
    const c = document.getElementById('magic-card');
    if(!c) return;
    const s = (e) => { if(e.cancelable) e.preventDefault(); c.classList.add('revealed'); };
    const h = (e) => { if(e.cancelable) e.preventDefault(); c.classList.remove('revealed'); };
    // Eventos ratón y táctil
    c.addEventListener('mousedown',s); c.addEventListener('mouseup',h); c.addEventListener('mouseleave',h);
    c.addEventListener('touchstart',s,{passive:false}); c.addEventListener('touchend',h); c.addEventListener('touchcancel',h);
}

// --- ACTUALIZAR BANNER TORNEO (PUNTOS) ---
function updateTournamentBanner() {
    const container = document.getElementById('tournament-mini-scores');
    if (!container) return;

    if (!isTournamentActive || !tournamentScores) {
        container.innerHTML = '';
        return;
    }

    const sortedPlayers = Object.entries(tournamentScores).sort((a,b) => b[1] - a[1]);

    if (sortedPlayers.length === 0) {
        container.innerHTML = "<small style='opacity:0.6; padding:0 5px;'>Esperando resultados...</small>";
        return;
    }

    container.innerHTML = sortedPlayers.map(([name, score], i) => {
        let icon = '👤';
        let colorStyle = '';
        
        // Medallas
        if (i === 0 && score > 0) { icon = '🥇'; colorStyle = 'border-color: #f1c40f; color: #f1c40f;'; }
        else if (i === 1 && score > 0) { icon = '🥈'; colorStyle = 'border-color: #bdc3c7;'; }
        else if (i === 2 && score > 0) { icon = '🥉'; colorStyle = 'border-color: #cd7f32;'; }

        return `
            <div class="score-pill" style="${colorStyle}">
                <span>${icon}</span>
                <strong>${name}</strong>: ${score}
            </div>
        `;
    }).join('');
}

// --- HISTORIAL UI ---
// Función auxiliar para formatear tiempo (ej: "3m 45s")
function formatDuration(seconds) {
    if (!seconds && seconds !== 0) return "-";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
}
// --- HISTORIAL UI CON TIEMPOS ---
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
                
                if (record.type === 'tournament') {
                    // Lógica Torneo
                    let winnerName = "Empate";
                    let maxScore = -1;
                    if(record.scores) {
                        Object.entries(record.scores).forEach(([name, score]) => { if (score > maxScore) { maxScore = score; winnerName = name; } });
                    }
                    
                    // Calcular duración total del torneo sumando partidas
                    let totalSeconds = 0;
                    if(record.games) record.games.forEach(g => totalSeconds += (g.duration || 0));
                    const totalTimeStr = formatDuration(totalSeconds);

                    return `
                    <div class="history-card h-type-tournament">
                        <div class="h-header toggleable" onclick="toggleHistoryDetails(${index})">
                            <div>
                                <span class="tourney-badge">🏆 ${record.name}</span>
                                <div style="font-size:0.8em; color:#bdc3c7; margin-top:5px;">
                                    📅 ${date} • ⏱️ ${totalTimeStr} • Ganador: <strong>${winnerName}</strong>
                                </div>
                            </div>
                            <span style="font-size:1.5em;">⌃</span>
                        </div>
                        <div class="h-body expanded" id="h-body-${index}">
                            <p style="color:#f1c40f; border-bottom:1px solid #555;">Clasificación Final:</p>
                            ${record.scores ? Object.entries(record.scores).sort((a,b)=>b[1]-a[1]).map(([n,s]) => `
                                <div style="display:flex; justify-content:space-between; font-size:0.9em;"><span>${n}</span> <span>${s} pts</span></div>
                            `).join('') : ''}
                            
                            <p style="color:#bdc3c7; border-bottom:1px solid #555; margin-top:10px;">Partidas (${record.games ? record.games.length : 0}):</p>
                            ${record.games ? record.games.map(g => `
                                <div class="game-row">
                                    <span>${g.word} <small style="opacity:0.6">(${formatDuration(g.duration)})</small></span>
                                    <span class="${g.winner==='Impostor'?'win-imp-text':'win-cit-text'}">${g.winner==='Impostor'?'Ganó Imp.':'Ganan Ciu.'}</span>
                                </div>
                            `).join('') : ''}
                        </div>
                    </div>`;
                } else {
                    // Lógica Partida Individual
                    const wTxt = record.winner === 'Impostor' ? '👑 Ganó Impostor' : '🛡️ Ganaron Ciudadanos';
                    const wClass = record.winner === 'Impostor' ? 'win-imp-text' : 'win-cit-text';
                    const timeStr = formatDuration(record.duration);
                    
                    // NUEVO: Mostrar puntos y ronda si existen
                    const ptsStr = record.points ? `<span style="color:#f1c40f; font-weight:bold;">+${record.points} pts</span>` : '';
                    const roundStr = record.rounds ? `(Ronda ${record.rounds})` : '';

                    return `
                    <div class="history-card h-type-single">
                        <div class="h-header">
                            <div>
                                <div style="display:flex; justify-content:space-between;">
                                    <strong>${record.word}</strong>
                                    ${ptsStr}
                                </div>
                                <span style="font-size:0.8em; opacity:0.7">(${date}) • ${timeStr} ${roundStr}</span>
                                <div class="${wClass}" style="font-size:0.9em; margin-top:2px;">${wTxt}</div>
                            </div>
                        </div>
                        <div class="h-body expanded" id="h-body-${index}">
                            <p>😈 Impostor: ${record.impostor}</p>
                            ${record.accomplice ? `<p>🤝 Cómplice: ${record.accomplice}</p>` : ''}
                            <p style="font-size:0.8em">Jugadores: ${record.players ? record.players.join(', ') : '?'}</p>
                            ${record.mode ? `<p style="font-size:0.7em; color:#7f8c8d">Modo: ${record.mode}</p>` : ''}
                        </div>
                    </div>`;
                }
            }).join('');
        }
        showScreen('screen-history');
    } catch (e) { console.error(e); }
}

function toggleHistoryDetails(idx) {
    document.getElementById(`h-body-${idx}`).classList.toggle('expanded');
}

// --- ESTADÍSTICAS UI Y FUSIÓN ---
async function loadAndShowStats() {
    const stats = await fetchStats();
    if (!stats) return alert("Error cargando estadísticas");

    const totalMin = Math.floor(stats.global.totalTime / 60);
    document.getElementById('stat-total-games').innerText = stats.global.totalGames;
    document.getElementById('stat-total-time').innerText = `${Math.floor(totalMin/60)}h ${totalMin%60}m`;
    
    const playersArr = Object.values(stats.players);
    const bestImp = playersArr.sort((a,b) => b.impWins - a.impWins)[0];
    document.getElementById('stat-best-impostor').innerText = bestImp && bestImp.impWins > 0 ? `${bestImp.name} (${bestImp.impWins})` : "-";
    const mostPlayed = [...playersArr].sort((a,b) => b.time - a.time)[0];
    document.getElementById('stat-most-played').innerText = mostPlayed ? `${mostPlayed.name}` : "-";

    const screenStats = document.getElementById('screen-stats');
    if (screenStats.classList.contains('hidden')) {
        document.getElementById('merge-tool-bar').classList.add('hidden');
        isMergeMode = false;
        selectedForMerge = [];
    }
    renderStatsList(playersArr);
    showScreen('screen-stats');
}

function renderStatsList(playersArr) {
    playersArr.sort((a,b) => b.games - a.games);
    document.getElementById('stats-list').innerHTML = playersArr.map(p => {
        const winRate = p.impTotal > 0 ? Math.round((p.impWins / p.impTotal) * 100) : 0;
        let displayName = p.name;
        if (p.aka && p.aka.length > 1) displayName = `${p.name} | ${p.aka.filter(n=>n!==p.name).join(' | ')}`;
        
        const checkHtml = isMergeMode ? `<input type="checkbox" class="merge-check" value="${p.name}" ${selectedForMerge.includes(p.name)?'checked':''} onchange="updateMergeSelection(this)" style="width:20px; height:20px; margin-right:10px;">` : '';
        
        return `
        <div class="card" style="display:flex; align-items:center; padding:10px;">
            ${checkHtml}
            <div style="flex-grow:1;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <strong style="font-size:1.1em; color:var(--accent); word-break: break-word;">${displayName}</strong>
                    <span class="badge" style="background:#2f3640;">${p.games} partidas</span>
                </div>
                <div style="font-size:0.85em; color:#bdc3c7; margin-top:5px;">
                    <span>⏱️ ${Math.round(p.time/60)} min</span> • <span>😈 Wins: ${p.impWins}/${p.impTotal} (${winRate}%)</span>
                </div>
            </div>
        </div>`;
    }).join('');
}

function toggleMergeMode() {
    isMergeMode = !isMergeMode;
    selectedForMerge = [];
    document.getElementById('merge-tool-bar').classList.toggle('hidden', !isMergeMode);
    updateMergeToolbar(); 
    loadAndShowStats(); 
}

function updateMergeSelection(checkbox) {
    if (checkbox.checked) selectedForMerge.push(checkbox.value);
    else selectedForMerge = selectedForMerge.filter(n => n !== checkbox.value);
    updateMergeToolbar(); 
}

function updateMergeToolbar() {
    const btn = document.getElementById('merge-action-btn');
    if(!btn) return;
    if (selectedForMerge.length === 0) {
        btn.innerText = "Selecciona jugadores..."; btn.disabled = true; btn.style.opacity = 0.5; btn.style.background = "white"; btn.style.color = "#d35400"; btn.onclick = null;
    } else if (selectedForMerge.length === 1) {
        btn.innerText = "DESUNIFICAR"; btn.disabled = false; btn.style.opacity = 1; btn.style.background = "#c0392b"; btn.style.color = "white"; btn.onclick = executeUnmerge;
    } else {
        btn.innerText = `UNIFICAR (${selectedForMerge.length})`; btn.disabled = false; btn.style.opacity = 1; btn.style.background = "white"; btn.style.color = "#d35400"; btn.onclick = executeMerge;
    }
}

async function executeMerge() {
    if (selectedForMerge.length < 2) return;
    if (confirm(`¿Fusionar estadísticas bajo "${selectedForMerge[0]}"?`)) { 
        await mergeAliases(selectedForMerge[0], selectedForMerge); 
        alert("¡Fusión completada!"); 
        toggleMergeMode(); 
    }
}

async function executeUnmerge() {
    if (selectedForMerge.length !== 1) return;
    const target = selectedForMerge[0];
    const stats = await fetchStats();
    const player = Object.values(stats.players).find(p => p.name === target);
    if (!player || !player.aka || player.aka.length <= 1) return alert("Este jugador no tiene alias para separar.");
    if (confirm(`¿Separar los nombres de "${target}"?`)) { 
        await unmergeAliases(player.aka.filter(n=>n!==target)); 
        alert("¡Separados!"); 
        toggleMergeMode(); 
    }
}

function cancelMergeMode() {
    isMergeMode = false;
    selectedForMerge = [];
    document.getElementById('merge-tool-bar').classList.add('hidden');
    loadAndShowStats();
}

// --- MODO ADMIN SECRETO (5 CLICS) ---
let secretClicks = 0;
let secretTimer;

function triggerSecretAdmin() {
    secretClicks++;
    clearTimeout(secretTimer);
    secretTimer = setTimeout(() => { secretClicks = 0; }, 1000);

    if (secretClicks === 5) {
        secretClicks = 0;
        const pwd = prompt("🕵️‍♂️ ACCESO ADMIN DETECTADO\n\nIntroduce la contraseña para BORRAR EL HISTORIAL:");
        if (pwd) {
            deleteHistory(pwd);
        }
    }
}

async function deleteHistory(password) {
    try {
        const res = await fetch('/api/history', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: password })
        });
        const data = await res.json();
        if (data.success) {
            alert("✅ Historial borrado correctamente.");
            location.reload();
        } else {
            alert(data.error || "❌ Error desconocido");
        }
    } catch (e) {
        console.error(e);
        alert("❌ Error de conexión con el servidor");
    }
}

// NUEVA FUNCIÓN PARA SALIR DE VERDAD
function exitGameToHome() {
    if (typeof clearGameState === 'function') {
        clearGameState(); // Borrar partida activa
    }
    showScreen('screen-home');
}

// --- GESTIÓN DE MODO DE PUNTUACIÓN (TOGGLE) ---
function initScoringUI() {
    const toggle = document.getElementById('scoring-mode-toggle');
    
    if (toggle) {
        // Si el modo es SIEGE (Alto riesgo), el toggle debe estar encendido (checked)
        const isSiege = (currentScoringMode === 'SIEGE');
        toggle.checked = isSiege;
        
        // Actualizamos el texto descriptivo
        updateScoringText(isSiege);
    }
}

function toggleScoringMode(checkbox) {
    const isSiege = checkbox.checked;
    
    // Asignar el modo basado en el estado del toggle
    currentScoringMode = isSiege ? 'SIEGE' : 'HUNTER';
    
    // Guardar preferencia (usaremos saveAllData para que sea persistente)
    saveAllData(); 
    
    // Actualizar texto visual
    updateScoringText(isSiege);
}

function updateScoringText(isSiege) {
    const desc = document.getElementById('mode-description');
    if (!desc) return;

    if (isSiege) {
        // Texto para Modo Alto riesgo
        desc.innerHTML = `<span style="color:#e74c3c">☠️ Alto riesgo</span> <small style="opacity:0.7">(Si el Impostor gana poco, Se premia victoria rápida)</small>`;
    } else {
        // Texto para Modo Supervivencia
        desc.innerHTML = `<span style="color:#2ecc71">⏳ Supervivencia</span> <small style="opacity:0.7">(Si el Impostor gana mucho. Se premia más la supervivencia)</small>`;
    }
}
