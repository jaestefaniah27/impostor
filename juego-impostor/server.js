const express = require('express');
const fs = require('fs');
const app = express();
const PORT = 3000;

app.use(express.static('public'));
app.use(express.json());

const DB_FILE = 'themes.json';
const HISTORY_FILE = 'history.json';

// --- INICIALIZACIÓN CON SUGERENCIAS ---
if (!fs.existsSync(DB_FILE)) {
    const initialData = [
        { 
            id: 1, 
            name: 'Cocina', 
            // NUEVO: Sugerencias específicas del tema
            suggestions: [
                "¿Se come frío o caliente?", 
                "¿Es un utensilio o un ingrediente?", 
                "¿Se guarda en la nevera?", 
                "¿Es dulce o salado?", 
                "¿Se usa para cortar?",
                "¿Es un electrodoméstico?"
            ],
            words: [
                { text: 'Sartén', hints: ['Para freír', 'Mango largo', 'Se usa con aceite'] },
                { text: 'Microondas', hints: ['Calienta rápido', 'Tiene plato giratorio', 'Funciona con ondas'] },
                { text: 'Nevera', hints: ['Enfría', 'Conserva alimentos', 'Tiene congelador'] },
                { text: 'Tenedor', hints: ['Cubierto con pinchos', 'Para pinchar comida', 'No sirve para sopa'] },
                { text: 'Chef', hints: ['Persona que cocina', 'Usa gorro alto', 'Jefe de cocina'] }
            ] 
        },
        { 
            id: 2, 
            name: 'Transporte', 
            suggestions: [
                "¿Tiene ruedas?", 
                "¿Va por aire, mar o tierra?", 
                "¿Necesita gasolina?", 
                "¿Es transporte público?", 
                "¿Tiene motor?",
                "¿Caben muchas personas?"
            ],
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

if (!fs.existsSync(HISTORY_FILE)) {
    fs.writeFileSync(HISTORY_FILE, JSON.stringify([]));
}

// ... (Resto de endpoints API igual que antes) ...

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

app.get('/api/history', (req, res) => {
    const data = fs.readFileSync(HISTORY_FILE);
    res.json(JSON.parse(data));
});

app.post('/api/history', (req, res) => {
    const record = req.body;
    record.id = Date.now();
    // record.date ya viene del cliente o se pone aquí
    if(!record.date) record.date = new Date().toISOString();

    let history = JSON.parse(fs.readFileSync(HISTORY_FILE));
    history.unshift(record);
    if (history.length > 50) history = history.slice(0, 50);

    fs.writeFileSync(HISTORY_FILE, JSON.stringify(history));
    res.json({ success: true });
});

app.listen(PORT, () => {
    console.log(`Servidor listo en http://localhost:${PORT}`);
});