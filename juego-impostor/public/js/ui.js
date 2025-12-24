// VARIABLES UI PARA FUSIÓN
let isMergeMode = false;
let selectedForMerge = [];

// --- NAVEGACIÓN ---
function showScreen(id) {
    document.querySelectorAll('.container').forEach(d => d.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
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

// Variable global para controlar qué estamos editando
let editingThemeId = null;

// --- RENDERIZADO TEMAS ---
// --- PANTALLA JUGAR (Modificada: SIN lápices ni edición) ---
function renderThemeGrid() {
    const container = document.getElementById('themes-grid');
    if(!container) return;
    
    if(!themes || themes.length === 0) {
        container.innerHTML = "<p>No hay temas cargados.</p>";
        return;
    }

    const sortedThemes = [...themes].sort((a, b) => {
        if (a.isCustom && !b.isCustom) return -1;
        if (!a.isCustom && b.isCustom) return 1;
        return 0;
    });

    container.innerHTML = sortedThemes.map(t => {
        const isSelected = selectedThemesIds.includes(t.id);
        const customClass = t.isCustom ? 'custom-theme-box' : '';
        const badge = t.isCustom ? '<span class="badge-custom">👤 PROPIA</span>' : '';
        
        // AQUÍ: Ya no hay botón de editar, solo selección
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

// --- CREADOR DE TEMAS UI ---
// --- NUEVO: GESTOR DE TEMAS ---
function goToThemeManager() {
    // Reutilizamos la carga de temas
    if(!themes || themes.length === 0) {
        fetch('/api/themes').then(r => r.json()).then(data => {
            themes = data;
            renderThemeManagerList();
        });
    } else {
        renderThemeManagerList();
    }
    showScreen('screen-theme-manager');
}
function renderThemeManagerList() {
    const container = document.getElementById('manager-list');
    if(!container) return;

    // Ordenar: Custom primero
    const sortedThemes = [...themes].sort((a, b) => {
        if (a.isCustom && !b.isCustom) return -1;
        if (!a.isCustom && b.isCustom) return 1;
        return 0;
    });

    container.innerHTML = sortedThemes.map(t => {
        const customClass = t.isCustom ? 'custom-theme-box' : '';
        const badge = t.isCustom ? '<span class="badge-custom">👤 PROPIA</span>' : '';
        
        // Al hacer clic, EDITAMOS directamente
        return `
        <div class="theme-box ${customClass}" onclick="loadThemeForEdit(${t.id})">
            <div style="display:flex; justify-content:space-between; align-items:start;">
                <strong>${t.name}</strong>
                <span>✏️</span>
            </div>
            <small>${t.words.length} palabras</small>
            ${badge}
        </div>
        `;
    }).join('');
}
// Abre el creador LIMPIO (para crear nuevo)
function openThemeCreator() {
    editingThemeId = null; // No estamos editando
    document.getElementById('create-theme-title').innerText = "🎨 Nuevo Tema";
    document.getElementById('new-theme-title').value = '';
    document.getElementById('new-theme-suggestions').value = '';
    document.getElementById('words-container').innerHTML = '';
    
    // Añadimos 3 filas vacías por defecto
    addWordRow(); addWordRow(); addWordRow();
    
    showScreen('screen-create-theme');
}

// Abre el creador CON DATOS (para editar)
function loadThemeForEdit(id) {
    const theme = themes.find(t => t.id === id);
    if (!theme) return;

    editingThemeId = id; // Guardamos la ID que estamos editando
    
    document.getElementById('create-theme-title').innerText = "✏️ Editar Tema";
    document.getElementById('new-theme-title').value = theme.name;
    
    // Cargar sugerencias
    const suggs = theme.suggestions ? theme.suggestions.join(' / ') : '';
    document.getElementById('new-theme-suggestions').value = suggs;

    // Cargar palabras
    const container = document.getElementById('words-container');
    container.innerHTML = ''; // Limpiar
    theme.words.forEach(w => {
        // Reusamos la lógica de añadir fila pero inyectando valores
        addWordRow(w.text, Array.isArray(w.hints) ? w.hints.join(' / ') : w.hints);
    });

    showScreen('screen-create-theme');
}

// Modificamos addWordRow para aceptar valores opcionales
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

// --- SUGERENCIAS ---
function showSuggestion() {
    const source = (gameData.currentSuggestions && gameData.currentSuggestions.length > 0) 
        ? gameData.currentSuggestions 
        : defaultSuggestions;
    const randomQ = source[Math.floor(Math.random() * source.length)];
    document.getElementById('suggestion-area').innerHTML = `<div class="suggestion-card">💡 Pista: "${randomQ}"</div>`;
}

// --- INTERACCIÓN CARTA ---
function setupCardInteractions() {
    const c = document.getElementById('magic-card');
    if(!c) return;
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
                } else {
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
    const bestImp = playersArr.sort((a,b) => b.impWins - a.impWins)[0];
    document.getElementById('stat-best-impostor').innerText = bestImp && bestImp.impWins > 0 ? `${bestImp.name} (${bestImp.impWins})` : "-";

    const mostPlayed = [...playersArr].sort((a,b) => b.time - a.time)[0];
    document.getElementById('stat-most-played').innerText = mostPlayed ? `${mostPlayed.name}` : "-";

    // 3. CONTROL DEL BANNER (AQUÍ ESTABA EL ERROR ANTES)
    // Solo reseteamos si la pantalla estaba oculta (venimos del menú)
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

    const container = document.getElementById('stats-list');
    container.innerHTML = playersArr.map(p => {
        const winRate = p.impTotal > 0 ? Math.round((p.impWins / p.impTotal) * 100) : 0;
        const timeMin = Math.round(p.time / 60);
        
        let displayName = p.name;
        if (p.aka && p.aka.length > 1) {
            const others = p.aka.filter(n => n !== p.name);
            displayName = `${p.name} | ${others.join(' | ')}`;
        }

        const checkHtml = isMergeMode 
            ? `<input type="checkbox" class="merge-check" value="${p.name}" ${selectedForMerge.includes(p.name) ? 'checked' : ''} onchange="updateMergeSelection(this)" style="width:20px; height:20px; margin-right:10px;">` 
            : '';

        return `
        <div class="card" style="display:flex; align-items:center; padding:10px;">
            ${checkHtml}
            <div style="flex-grow:1;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <strong style="font-size:1.1em; color:var(--accent); word-break: break-word;">${displayName}</strong>
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

// --- LÓGICA DE FUSIÓN Y DESUNIFICACIÓN ---
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
        btn.innerText = "Selecciona jugadores...";
        btn.disabled = true;
        btn.style.opacity = 0.5;
        btn.onclick = null;
        btn.style.background = "white";
        btn.style.color = "#d35400";
    } 
    else if (selectedForMerge.length === 1) {
        // MODO DESUNIFICAR
        btn.innerText = "DESUNIFICAR (Separar Nombres)";
        btn.disabled = false;
        btn.style.opacity = 1;
        btn.style.background = "#c0392b"; 
        btn.style.color = "white";
        btn.onclick = executeUnmerge;
    } 
    else {
        // MODO UNIFICAR
        btn.innerText = `UNIFICAR (${selectedForMerge.length})`;
        btn.disabled = false;
        btn.style.opacity = 1;
        btn.style.background = "white"; 
        btn.style.color = "#d35400";
        btn.onclick = executeMerge;
    }
}

async function executeMerge() {
    if (selectedForMerge.length < 2) return;
    
    // SIMPLIFICADO: Tomamos el primero de la selección como principal
    const mainName = selectedForMerge[0];

    if (confirm(`¿Fusionar estadísticas de "${mainName}"?\n(Se unirán: ${selectedForMerge.join(', ')})`)) {
        await mergeAliases(mainName, selectedForMerge);
        alert("¡Fusión completada!");
        toggleMergeMode();
    }
}

async function executeUnmerge() {
    if (selectedForMerge.length !== 1) return;
    const target = selectedForMerge[0];

    const stats = await fetchStats();
    const playerArr = Object.values(stats.players);
    const player = playerArr.find(p => p.name === target);
    
    if (!player || !player.aka || player.aka.length <= 1) {
        return alert("Este jugador no tiene nombres unificados para separar.");
    }

    if (confirm(`¿Quieres separar los nombres de "${target}"?\n\nNombres que se liberarán: ${player.aka.filter(n => n !== target).join(', ')}`)) {
        const aliasesToFree = player.aka.filter(n => n !== target);
        await unmergeAliases(aliasesToFree);
        alert("¡Nombres separados correctamente!");
        toggleMergeMode();
    }
}

function cancelMergeMode() {
    isMergeMode = false;
    selectedForMerge = [];
    document.getElementById('merge-tool-bar').classList.add('hidden');
    loadAndShowStats();
}