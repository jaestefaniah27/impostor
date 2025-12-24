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
if (!fs.existsSync(DB_FILE)) { /* ... tu código de temas ... */ }
if (!fs.existsSync(HISTORY_FILE)) { fs.writeFileSync(HISTORY_FILE, JSON.stringify([])); }
if (!fs.existsSync(ALIAS_FILE)) { fs.writeFileSync(ALIAS_FILE, JSON.stringify({})); }

// ... (Endpoints de themes y history POST/DELETE se mantienen igual) ...

// GET HISTORY
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

// NUEVO: ESTADÍSTICAS MEJORADAS (Con lista de alias)
app.get('/api/stats', (req, res) => {
    const history = JSON.parse(fs.readFileSync(HISTORY_FILE));
    const aliases = JSON.parse(fs.readFileSync(ALIAS_FILE));

    const resolveName = (name) => aliases[name] || name;

    const stats = {
        global: { totalGames: 0, totalTime: 0 },
        players: {}
    };

    history.forEach(game => {
        const gamesToProcess = game.type === 'tournament' ? game.games : [game];

        gamesToProcess.forEach(g => {
            stats.global.totalGames++;
            const duration = g.duration || 0;
            stats.global.totalTime += duration;

            if(g.players && Array.isArray(g.players)) {
                g.players.forEach(rawName => {
                    const mainName = resolveName(rawName);
                    
                    if (!stats.players[mainName]) {
                        // Añadimos 'aka' (Also Known As) como un Set para evitar duplicados
                        stats.players[mainName] = { 
                            name: mainName, 
                            games: 0, 
                            time: 0, 
                            impWins: 0, 
                            impTotal: 0,
                            aka: new Set() 
                        };
                    }
                    
                    // Guardamos el nombre original usado en esa partida
                    stats.players[mainName].aka.add(rawName);
                    
                    stats.players[mainName].games++;
                    stats.players[mainName].time += duration;

                    const isImpostor = (g.impostor && resolveName(g.impostor) === mainName);
                    if (isImpostor) {
                        stats.players[mainName].impTotal++;
                        if (g.winner === 'Impostor') {
                            stats.players[mainName].impWins++;
                        }
                    }
                });
            }
        });
    });

    // Convertir los Sets a Arrays para enviarlos por JSON
    Object.values(stats.players).forEach(p => {
        p.aka = Array.from(p.aka);
    });

    res.json(stats);
});

// FUSIONAR (Igual que antes)
app.post('/api/aliases', (req, res) => {
    const { mainName, aliasesToMerge } = req.body;
    let aliases = JSON.parse(fs.readFileSync(ALIAS_FILE));
    
    aliasesToMerge.forEach(alias => {
        if (alias !== mainName) aliases[alias] = mainName;
    });
    
    // Recursividad para cadenas de alias
    for (let key in aliases) {
        if (aliasesToMerge.includes(aliases[key])) aliases[key] = mainName;
    }

    fs.writeFileSync(ALIAS_FILE, JSON.stringify(aliases));
    res.json({ success: true });
});

// NUEVO: DESUNIFICAR (Borrar alias)
app.post('/api/aliases/unmerge', (req, res) => {
    const { namesToFree } = req.body; // Array de nombres a liberar
    let aliases = JSON.parse(fs.readFileSync(ALIAS_FILE));

    namesToFree.forEach(name => {
        if (aliases[name]) {
            delete aliases[name];
        }
    });

    fs.writeFileSync(ALIAS_FILE, JSON.stringify(aliases));
    res.json({ success: true });
});

app.get('/api/themes', (req, res) => {
    try {
        const data = fs.readFileSync(DB_FILE, 'utf8');
        // Intentamos parsear para ver si explota
        const json = JSON.parse(data); 
        res.json(json);
    } catch (e) {
        console.error("❌ ERROR CRÍTICO EN THEMES.JSON:", e.message);
        // Si hay error, devolvemos un array vacío para que la web no se cuelgue
        res.json([]); 
    }
});

app.listen(PORT, () => { console.log(`Servidor listo en http://localhost:${PORT}`); });