@echo off
:: --- CONFIGURACIÓN ---
set USER=ubuntu
set HOST=143.47.37.92

:: !!! IMPORTANTE !!!
:: Cambia esto por la ruta real donde tienes tu archivo .pem
:: Ejemplo: set KEY_PATH="C:\Users\jaest\Downloads\mi-clave.pem"
set KEY_PATH="C:\Users\jaest\.ssh\minecraft_server\minecraft-server-private-key-ssh"

echo ------------------------------------------------
echo Conectando a %HOST%...
echo ------------------------------------------------

:: --- EJECUCIÓN ---
:: El flag -i indica la identidad (clave) a usar.
:: Todo el comando remoto va en una sola linea larga para evitar errores de interpretación en Windows.

ssh -i %KEY_PATH% -t %USER%@%HOST% "echo '--- Backup ---' && cd impostor && cp juego-impostor/history.json juego-impostor/history.bak && cp juego-impostor/aliases.json juego-impostor/aliases.bak && cp juego-impostor/themes.json juego-impostor/themes.bak && echo '--- Git Pull ---' && git stash && git pull && echo '--- Restaurar ---' && cp juego-impostor/history.bak juego-impostor/history.json && cp juego-impostor/aliases.bak juego-impostor/aliases.json && cp juego-impostor/themes.bak juego-impostor/themes.json && echo '--- Reiniciar ---' && pm2 restart impostor"

echo.
echo ------------------------------------------------
echo Fin del proceso.
echo ------------------------------------------------
pause