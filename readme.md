# 🕵️ El Impostor - Guía de Despliegue

Este repositorio contiene el código fuente del juego "El Impostor". A continuación se detallan los pasos para desplegar la aplicación en un servidor Linux (Ubuntu/Debian) desde cero, configurando Node.js, PM2, Nginx y SSL.

[![Deploy](https://img.shields.io/badge/Deploy-impostor--is--sus.duckdns.org-success?style=for-the-badge&logo=rocket)](http://impostor-is-sus.duckdns.org)

Este proyecto está desplegado en un servidor propio accesible públicamente.
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
```
📦 2. Instalación del Proyecto
```bash
# 1. Clonar el repositorio
git clone [https://github.com/TU_USUARIO/TU_REPO.git](https://github.com/TU_USUARIO/TU_REPO.git)

# 2. Entrar en la carpeta del proyecto
cd TU_REPO/juego-impostor

# 3. Instalar dependencias
npm install

# 4. Prueba rápida (Opcional, Ctrl+C para salir)
node server.js
```
⚙️ 3. Gestor de Procesos (PM2)
Para mantener la aplicación siempre encendida (incluso si se reinicia el servidor).
# 1. Instalar PM2 globalmente
```bash
sudo npm install -g pm2

# 2. Iniciar la aplicación (Puerto 3000 por defecto)
pm2 start server.js --name "impostor"

# 3. Configurar arranque automático al reiniciar el servidor
pm2 startup
# (Copia y pega el comando que te muestre la terminal tras ejecutar el anterior)

# 4. Guardar la lista de procesos actual
pm2 save
```
🌐 4. Servidor Web y Proxy Inverso (Nginx)
Nginx redirigirá el tráfico de internet (puerto 80) a nuestra aplicación Node.js (puerto 3000).
```bash
# 1. Instalar Nginx
sudo apt install nginx -y

# 2. Crear configuración para el sitio
sudo nano /etc/nginx/sites-available/impostor
```
Pega el siguiente contenido en el editor:
(Sustituye tu-dominio.duckdns.org por tu dominio real)
```bash
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
```
Guardar y Activar:
 * Guarda (Ctrl+O, Enter) y Sal (Ctrl+X).
 * Ejecuta:
```bash
# Activar el sitio (Enlace simbólico)
sudo ln -s /etc/nginx/sites-available/impostor /etc/nginx/sites-enabled/

# Verificar sintaxis
sudo nginx -t

# Reiniciar Nginx
sudo systemctl restart nginx
```
🔒 5. Certificado SSL (HTTPS)
Para tener el candado verde y evitar avisos de "Sitio no seguro". Nota: Necesitas que el dominio ya apunte a tu IP.
```bash
# 1. Instalar Certbot
sudo apt install certbot python3-certbot-nginx -y

# 2. Obtener certificado
sudo certbot --nginx -d tu-dominio.duckdns.org
```
Sigue las instrucciones en pantalla y acepta la redirección automática a HTTPS.
🔄 6. Actualizar la Web
Cuando hagas cambios en tu código y los subas a GitHub, usa este comando en tu servidor para actualizar todo en segundos:
```bash
# Entra, descarga, instala dependencias nuevas y reinicia
git pull && npm install && pm2 restart impostor
```
🛠️ 7. Mantenimiento y Extras
🗑️ Borrar Historial / Resetear Stats
Como eliminamos el botón de la web por seguridad, para reiniciar las estadísticas e historial:
```bash
# Opción A: Borrar el archivo (se regenera solo)
rm ~/TU_REPO/juego-impostor/history.json
```
```bash
# Opción B: Vaciarlo manualmente
echo "[]" > ~/TU_REPO/juego-impostor/history.json
```
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
Copia de seguridad rápida:

```bash
cp juego-impostor/history.json juego-impostor/history.bak
cp juego-impostor/aliases.json juego-impostor/aliases.bak
cp juego-impostor/aliases.json juego-impostor/themes.bak
```
Haz el pull:

```bash
git pull
```
El Truco Final en el Servidor: Si al hacer git pull te dice que hay conflicto o te borra los archivos, simplemente restaura tu copia de seguridad:

```bash
# Si git los borró:
mv juego-impostor/history.bak juego-impostor/history.json
mv juego-impostor/aliases.bak juego-impostor/aliases.json
mv juego-impostor/aliases.bak juego-impostor/themes.json
```

En local
```bash
git rm --cached juego-impostor/history.json
git rm --cached juego-impostor/aliases.json
# Si también modificas temas en el servidor y quieres conservarlos:
git rm --cached juego-impostor/themes.json
```
Comando de Actualización Rápida sin perder historial:
```bash
cp juego-impostor/history.json juego-impostor/history.bak
git stash
git pull
mv juego-impostor/history.bak juego-impostor/history.json
pm2 restart impostor
```
