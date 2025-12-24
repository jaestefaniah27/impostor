const express = require('express');
const fs = require('fs');
const app = express();
const PORT = 3000;

app.use(express.static('public'));
app.use(express.json());

const DB_FILE = 'themes.json';
const HISTORY_FILE = 'history.json';
const ALIAS_FILE = 'aliases.json'; // NUEVO: Archivo para guardar las fusiones

// --- INICIALIZACIÓN ---
if (!fs.existsSync(DB_FILE)) { /* ... (Tu código de temas por defecto igual) ... */ }
if (!fs.existsSync(HISTORY_FILE)) { fs.writeFileSync(HISTORY_FILE, JSON.stringify([])); }
if (!fs.existsSync(ALIAS_FILE)) { fs.writeFileSync(ALIAS_FILE, JSON.stringify({})); } // Mapa: "Apodo" -> "NombreReal"

// ... (Endpoints de /api/themes y /api/history POST se mantienen igual) ...

// GET HISTORY (Sin cambios)
app.get('/api/history', (req, res) => {
    const data = fs.readFileSync(HISTORY_FILE);
    res.json(JSON.parse(data));
});

// NUEVO: POST HISTORY (Actualizado para guardar la partida)
app.post('/api/history', (req, res) => {
    const record = req.body;
    record.id = Date.now();
    if(!record.date) record.date = new Date().toISOString();
    
    // Aseguramos que guarde la duración si viene
    if(!record.duration) record.duration = 0;

    let history = JSON.parse(fs.readFileSync(HISTORY_FILE));
    history.unshift(record);
    // Guardamos las últimas 200 para tener buen histórico
    if (history.length > 200) history = history.slice(0, 200);

    fs.writeFileSync(HISTORY_FILE, JSON.stringify(history));
    res.json({ success: true });
});

// NUEVO: ENDPOINT DE ESTADÍSTICAS
app.get('/api/stats', (req, res) => {
    const history = JSON.parse(fs.readFileSync(HISTORY_FILE));
    const aliases = JSON.parse(fs.readFileSync(ALIAS_FILE));

    // Función auxiliar para resolver nombres reales
    const resolveName = (name) => aliases[name] || name;

    const stats = {
        global: { totalGames: 0, totalTime: 0 },
        players: {}
    };

    // Procesar historial
    history.forEach(game => {
        // Ignorar torneos (solo cuentan las partidas individuales dentro o fuera)
        const gamesToProcess = game.type === 'tournament' ? game.games : [game];

        gamesToProcess.forEach(g => {
            stats.global.totalGames++;
            const duration = g.duration || 0; // Segundos
            stats.global.totalTime += duration;

            // Procesar jugadores de esta partida
            if(g.players && Array.isArray(g.players)) {
                g.players.forEach(rawName => {
                    const name = resolveName(rawName);
                    
                    if (!stats.players[name]) {
                        stats.players[name] = { name: name, games: 0, time: 0, impWins: 0, impTotal: 0 };
                    }
                    
                    stats.players[name].games++;
                    stats.players[name].time += duration;

                    // Datos de Impostor
                    const isImpostor = (g.impostor && resolveName(g.impostor) === name);
                    if (isImpostor) {
                        stats.players[name].impTotal++;
                        if (g.winner === 'Impostor') {
                            stats.players[name].impWins++;
                        }
                    }
                });
            }
        });
    });

    res.json(stats);
});

// NUEVO: ENDPOINT PARA FUSIONAR NOMBRES
app.post('/api/aliases', (req, res) => {
    const { mainName, aliasesToMerge } = req.body; // mainName: "Juan", aliasesToMerge: ["Juanito", "J.P."]
    
    let aliases = JSON.parse(fs.readFileSync(ALIAS_FILE));
    
    aliasesToMerge.forEach(alias => {
        if (alias !== mainName) {
            aliases[alias] = mainName;
        }
    });

    // Recursividad: Si alguien era alias de un alias, apuntarlo al nuevo main
    for (let key in aliases) {
        if (aliasesToMerge.includes(aliases[key])) {
            aliases[key] = mainName;
        }
    }

    fs.writeFileSync(ALIAS_FILE, JSON.stringify(aliases));
    res.json({ success: true });
});

app.listen(PORT, () => { console.log(`Servidor listo en http://localhost:${PORT}`); });