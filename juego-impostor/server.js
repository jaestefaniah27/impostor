const express = require('express');
const fs = require('fs');
const app = express();
const PORT = 3000;

app.use(express.static('public'));
app.use(express.json());

const DB_FILE = 'themes.json';
const HISTORY_FILE = 'history.json'; // Nuevo archivo para el historial

// --- INICIALIZACIÓN DE ARCHIVOS ---

// 1. Temas (Código anterior...)
if (!fs.existsSync(DB_FILE)) {
    const initialData = [
        { 
            id: 1, name: 'Cocina', 
            words: [
                { text: 'Sartén', hints: ['Para freír', 'Mango largo', 'Se usa con aceite'] },
                { text: 'Microondas', hints: ['Calienta rápido', 'Tiene plato giratorio', 'Funciona con ondas'] },
                { text: 'Nevera', hints: ['Enfría', 'Conserva alimentos', 'Tiene congelador'] },
                { text: 'Tenedor', hints: ['Cubierto con pinchos', 'Para pinchar comida', 'No sirve para sopa'] },
                { text: 'Chef', hints: ['Persona que cocina', 'Usa gorro alto', 'Jefe de cocina'] }
            ] 
        },
        { 
            id: 2, name: 'Transporte', 
            words: [
                { text: 'Avión', hints: ['Vuela alto', 'Tiene alas', 'Va al aeropuerto'] },
                { text: 'Submarino', hints: ['Bajo el agua', 'Tiene periscopio', 'Vehículo militar o científico'] },
                { text: 'Caballo', hints: ['Animal que se monta', 'Relincha', 'Tiene crines'] },
                { text: 'Patinete', hints: ['Dos ruedas y manillar', 'Hay eléctricos', 'Pie en el suelo'] },
                { text: 'Cohete', hints: ['Viaje espacial', 'Despega vertical', 'Astronautas'] }
            ] 
        }
    ];
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData));
}

// 2. Historial (NUEVO)
if (!fs.existsSync(HISTORY_FILE)) {
    fs.writeFileSync(HISTORY_FILE, JSON.stringify([]));
}

// --- API TEMAS ---
app.get('/api/themes', (req, res) => {
    const data = fs.readFileSync(DB_FILE);
    res.json(JSON.parse(data));
});

app.post('/api/themes', (req, res) => {
    const newTheme = req.body;
    newTheme.id = Date.now();
    let currentThemes = JSON.parse(fs.readFileSync(DB_FILE));
    currentThemes.push(newTheme);
    fs.writeFileSync(DB_FILE, JSON.stringify(currentThemes));
    res.json({ success: true });
});

// --- API HISTORIAL (NUEVO) ---

// Obtener historial
app.get('/api/history', (req, res) => {
    const data = fs.readFileSync(HISTORY_FILE);
    res.json(JSON.parse(data));
});

// Guardar partida terminada
app.post('/api/history', (req, res) => {
    const record = req.body;
    // Añadimos fecha y ID
    record.id = Date.now();
    record.date = new Date().toISOString();

    let history = JSON.parse(fs.readFileSync(HISTORY_FILE));
    // Guardamos al principio (unshift) para que salgan primero las recientes
    history.unshift(record);
    
    // Opcional: Limitar a las últimas 50 partidas para no llenar el disco infinito
    if (history.length > 50) history = history.slice(0, 50);

    fs.writeFileSync(HISTORY_FILE, JSON.stringify(history));
    res.json({ success: true });
});

app.listen(PORT, () => {
    console.log(`Servidor listo en http://localhost:${PORT}`);
});