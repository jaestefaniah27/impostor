@echo off
:: --- CARGAR CONFIGURACIÓN ---
if exist secrets.bat (
    call secrets.bat
) else (
    echo [ERROR] No se encontro el archivo secrets.bat
    echo Por favor crea un archivo secrets.bat con las variables USER, HOST y KEY_PATH.
    pause
    exit /b
)

:: --- VERIFICACIÓN ---
if not defined KEY_PATH (
    echo [ERROR] La variable KEY_PATH no esta definida en secrets.bat
    pause
    exit /b
)
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