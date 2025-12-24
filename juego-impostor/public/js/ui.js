// --- NAVEGACIÓN ---
function showScreen(id) {
    document.querySelectorAll('.container').forEach(d => d.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
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
    document.getElementById('themes-grid').innerHTML = themes.map(t => `
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

// --- SUGERENCIAS ---
function showSuggestion() {
    document.getElementById('suggestion-area').innerHTML = `<div class="suggestion-card">💡 Pista: "${suggestions[Math.floor(Math.random()*suggestions.length)]}"</div>`;
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