¡Claro que sí! Aquí tienes un README.md profesional y completo. Está diseñado para que, si el día de mañana cambias de servidor o formateas la máquina, solo tengas que seguir estos pasos para tenerlo todo funcionando igual.
Copia el siguiente bloque de código y guárdalo como README.md en la raíz de tu repositorio.
# 🕵️ El Impostor - Guía de Despliegue

Este repositorio contiene el código fuente del juego "El Impostor". A continuación se detallan los pasos para desplegar la aplicación en un servidor Linux (Ubuntu/Debian) desde cero, configurando Node.js, PM2, Nginx y SSL.

## 📋 Prerrequisitos

1.  Un servidor **Linux** (Máquina Virtual o VPS) con acceso SSH.
2.  Un **Dominio** o Subdominio (ej: `impostor.duckdns.org`) apuntando a la IP pública de tu servidor.

---

## 🚀 1. Preparación del Sistema

Conéctate por SSH a tu servidor y ejecuta los siguientes comandos para actualizar el sistema e instalar las herramientas básicas.

```bash
# 1. Actualizar repositorios
sudo apt update && sudo apt upgrade -y

# 2. Instalar Git y herramientas esenciales
sudo apt install git curl build-essential -y

# 3. Instalar Node.js (Versión LTS 20.x)
curl -fsSL [https://deb.nodesource.com/setup_20.x](https://deb.nodesource.com/setup_20.x) | sudo -E bash -
sudo apt-get install -y nodejs

# 4. Verificar instalación
node -v
npm -v

📦 2. Instalación del Proyecto
# 1. Clonar el repositorio
git clone [https://github.com/TU_USUARIO/TU_REPO.git](https://github.com/TU_USUARIO/TU_REPO.git)

# 2. Entrar en la carpeta del proyecto
cd TU_REPO/juego-impostor

# 3. Instalar dependencias
npm install

# 4. Prueba rápida (Opcional, Ctrl+C para salir)
node server.js

⚙️ 3. Gestor de Procesos (PM2)
Para mantener la aplicación siempre encendida (incluso si se reinicia el servidor).
# 1. Instalar PM2 globalmente
sudo npm install -g pm2

# 2. Iniciar la aplicación (Puerto 3000 por defecto)
pm2 start server.js --name "impostor"

# 3. Configurar arranque automático al reiniciar el servidor
pm2 startup
# (Copia y pega el comando que te muestre la terminal tras ejecutar el anterior)

# 4. Guardar la lista de procesos actual
pm2 save

🌐 4. Servidor Web y Proxy Inverso (Nginx)
Nginx redirigirá el tráfico de internet (puerto 80) a nuestra aplicación Node.js (puerto 3000).
# 1. Instalar Nginx
sudo apt install nginx -y

# 2. Crear configuración para el sitio
sudo nano /etc/nginx/sites-available/impostor

Pega el siguiente contenido en el editor:
(Sustituye tu-dominio.duckdns.org por tu dominio real)
server {
    listen 80;
    server_name tu-dominio.duckdns.org;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

Guardar y Activar:
 * Guarda (Ctrl+O, Enter) y Sal (Ctrl+X).
 * Ejecuta:
<!-- end list -->
# Activar el sitio (Enlace simbólico)
sudo ln -s /etc/nginx/sites-available/impostor /etc/nginx/sites-enabled/

# Verificar sintaxis
sudo nginx -t

# Reiniciar Nginx
sudo systemctl restart nginx

🔒 5. Certificado SSL (HTTPS)
Para tener el candado verde y evitar avisos de "Sitio no seguro". Nota: Necesitas que el dominio ya apunte a tu IP.
# 1. Instalar Certbot
sudo apt install certbot python3-certbot-nginx -y

# 2. Obtener certificado
sudo certbot --nginx -d tu-dominio.duckdns.org

Sigue las instrucciones en pantalla y acepta la redirección automática a HTTPS.
🔄 6. Actualizar la Web
Cuando hagas cambios en tu código y los subas a GitHub, usa este comando en tu servidor para actualizar todo en segundos:
# Entra, descarga, instala dependencias nuevas y reinicia
cd ~/TU_REPO/juego-impostor && git pull && npm install && pm2 restart impostor

🛠️ 7. Mantenimiento y Extras
🗑️ Borrar Historial / Resetear Stats
Como eliminamos el botón de la web por seguridad, para reiniciar las estadísticas e historial:
# Opción A: Borrar el archivo (se regenera solo)
rm ~/TU_REPO/juego-impostor/history.json

# Opción B: Vaciarlo manualmente
echo "[]" > ~/TU_REPO/juego-impostor/history.json

➕ Añadir más juegos (Multi-App)
Si quieres subir otro juego en el futuro (ej. Ajedrez) en el mismo servidor:
 * Crea otro subdominio (ej: ajedrez.duckdns.org).
 * En el código del nuevo juego, cambia el puerto en server.js (ej: 3001).
 * Arranca con PM2: pm2 start server.js --name "ajedrez".
 * Crea un nuevo archivo Nginx (/etc/nginx/sites-available/ajedrez) apuntando al puerto 3001.
 * Activa con ln -s ... y reinicia Nginx.
 * Saca el certificado SSL para el nuevo subdominio.
📜 Comandos Útiles PM2
 * pm2 status: Ver estado de las apps.
 * pm2 logs: Ver la consola en tiempo real (útil para errores).
 * pm2 restart all: Reiniciar todo.
 * pm2 stop impostor: Parar el juego.
<!-- end list -->

