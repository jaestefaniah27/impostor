const express = require('express');
const fs = require('fs');
const app = express();
const PORT = 3000;

app.use(express.static('public'));
app.use(express.json());

const DB_FILE = 'themes.json';

// Si no existe, creamos datos de ejemplo con el NUEVO formato (Palabra + Pista)
if (!fs.existsSync(DB_FILE)) {
    const initialData = [
        { 
            id: 1, 
            name: 'Cocina', 
            words: [
                { text: 'Sartén', hint: 'Para freír' },
                { text: 'Microondas', hint: 'Calienta rápido' },
                { text: 'Nevera', hint: 'Enfría' },
                { text: 'Tenedor', hint: 'Cubierto con pinchos' },
                { text: 'Chef', hint: 'Persona que cocina' }
            ] 
        },
        { 
            id: 2, 
            name: 'Transporte', 
            words: [
                { text: 'Avión', hint: 'Vuela alto' },
                { text: 'Submarino', hint: 'Bajo el agua' },
                { text: 'Caballo', hint: 'Animal' },
                { text: 'Patinete', hint: 'Dos ruedas y manillar' },
                { text: 'Cohete', hint: 'Espacial' }
            ] 
        }
    ];
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData));
}

app.get('/api/themes', (req, res) => {
    const data = fs.readFileSync(DB_FILE);
    res.json(JSON.parse(data));
});

app.post('/api/themes', (req, res) => {
    const newTheme = req.body;
    // Asignamos ID único
    newTheme.id = Date.now();
    
    const currentThemes = JSON.parse(fs.readFileSync(DB_FILE));
    currentThemes.push(newTheme);
    
    fs.writeFileSync(DB_FILE, JSON.stringify(currentThemes));
    res.json({ success: true });
});

app.listen(PORT, () => {
    console.log(`Servidor listo en http://localhost:${PORT}`);
});