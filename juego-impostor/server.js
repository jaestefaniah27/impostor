const express = require('express');
const fs = require('fs');
const app = express();
const PORT = 3000;

app.use(express.static('public'));
app.use(express.json());

const DB_FILE = 'themes.json';
const HISTORY_FILE = 'history.json';
const ALIAS_FILE = 'aliases.json';

// --- INICIALIZACIÓN ---
if (!fs.existsSync(DB_FILE)) { fs.writeFileSync(DB_FILE, JSON.stringify([])); }
if (!fs.existsSync(HISTORY_FILE)) { fs.writeFileSync(HISTORY_FILE, JSON.stringify([])); }
if (!fs.existsSync(ALIAS_FILE)) { fs.writeFileSync(ALIAS_FILE, JSON.stringify({})); }

// GET THEMES
app.get('/api/themes', (req, res) => {
    try {
        const data = fs.readFileSync(DB_FILE, 'utf8');
        const json = JSON.parse(data); 
        res.json(json);
    } catch (e) {
        console.error("Error leyendo themes.json:", e.message);
        res.json([]); 
    }
});

// POST THEMES (Crear o Editar)
app.post('/api/themes', (req, res) => {
    const { id, name, words, suggestions } = req.body;
    let themes = [];
    try { themes = JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); } catch(e){}

    if (id) {
        // --- MODO EDICIÓN ---
        const index = themes.findIndex(t => t.id === id);
        if (index !== -1) {
            themes[index] = { ...themes[index], name, words, suggestions, isCustom: true };
        } else {
            // Si venía ID pero no existe, lo creamos
            themes.push({ id, name, words, suggestions, isCustom: true });
        }
    } else {
        // --- MODO CREACIÓN ---
        const newId = Date.now(); 
        themes.push({ id: newId, name, words, suggestions, isCustom: true });
    }

    fs.writeFileSync(DB_FILE, JSON.stringify(themes, null, 2));
    res.json({ success: true });
});

// HISTORY & STATS API
app.get('/api/history', (req, res) => {
    const data = fs.readFileSync(HISTORY_FILE);
    res.json(JSON.parse(data));
});

app.post('/api/history', (req, res) => {
    const record = req.body;
    record.id = Date.now();
    if(!record.date) record.date = new Date().toISOString();
    if(!record.duration) record.duration = 0;

    let history = JSON.parse(fs.readFileSync(HISTORY_FILE));
    history.unshift(record);
    if (history.length > 200) history = history.slice(0, 200);

    fs.writeFileSync(HISTORY_FILE, JSON.stringify(history));
    res.json({ success: true });
});

app.get('/api/stats', (req, res) => {
    const history = JSON.parse(fs.readFileSync(HISTORY_FILE));
    const aliases = JSON.parse(fs.readFileSync(ALIAS_FILE));
    const resolveName = (name) => aliases[name] || name;

    const stats = { global: { totalGames: 0, totalTime: 0 }, players: {} };

    history.forEach(game => {
        const gamesToProcess = game.type === 'tournament' ? game.games : [game];
        gamesToProcess.forEach(g => {
            stats.global.totalGames++;
            const duration = g.duration || 0;
            stats.global.totalTime += duration;

            if(g.players && Array.isArray(g.players)) {
                g.players.forEach(rawName => {
                    const name = resolveName(rawName);
                    if (!stats.players[name]) {
                        stats.players[name] = { name, games: 0, time: 0, impWins: 0, impTotal: 0, aka: new Set() };
                    }
                    stats.players[name].aka.add(rawName);
                    stats.players[name].games++;
                    stats.players[name].time += duration;

                    const isImpostor = (g.impostor && resolveName(g.impostor) === name);
                    if (isImpostor) {
                        stats.players[name].impTotal++;
                        if (g.winner === 'Impostor') stats.players[name].impWins++;
                    }
                });
            }
        });
    });

    Object.values(stats.players).forEach(p => { p.aka = Array.from(p.aka); });
    res.json(stats);
});

// ALIASES API
app.post('/api/aliases', (req, res) => {
    const { mainName, aliasesToMerge } = req.body;
    let aliases = JSON.parse(fs.readFileSync(ALIAS_FILE));
    aliasesToMerge.forEach(alias => { if (alias !== mainName) aliases[alias] = mainName; });
    for (let key in aliases) { if (aliasesToMerge.includes(aliases[key])) aliases[key] = mainName; }
    fs.writeFileSync(ALIAS_FILE, JSON.stringify(aliases));
    res.json({ success: true });
});

app.post('/api/aliases/unmerge', (req, res) => {
    const { namesToFree } = req.body; 
    let aliases = JSON.parse(fs.readFileSync(ALIAS_FILE));
    namesToFree.forEach(name => { if (aliases[name]) delete aliases[name]; });
    fs.writeFileSync(ALIAS_FILE, JSON.stringify(aliases));
    res.json({ success: true });
});
app.post('/api/themes', (req, res) => {
    const { id, name, words, suggestions } = req.body;
    let themes = [];
    try { themes = JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); } catch(e){}

    if (id) {
        // --- MODO EDICIÓN ---
        const index = themes.findIndex(t => t.id === id);
        if (index !== -1) {
            themes[index] = { ...themes[index], name, words, suggestions, isCustom: true };
        } else {
            // Si venía ID pero no existe, lo creamos (raro, pero por si acaso)
            themes.push({ id, name, words, suggestions, isCustom: true });
        }
    } else {
        // --- MODO CREACIÓN ---
        const newId = Date.now(); // ID único basado en tiempo
        themes.push({ id: newId, name, words, suggestions, isCustom: true });
    }

    fs.writeFileSync(DB_FILE, JSON.stringify(themes, null, 2));
    res.json({ success: true });
});
app.listen(PORT, () => { console.log(`Servidor listo en http://localhost:${PORT}`); });