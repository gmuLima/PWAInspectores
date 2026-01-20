@echo off
REM GUÍA RÁPIDA PARA EMPEZAR EN WINDOWS

echo.
echo ╔════════════════════════════════════════════════════════════════╗
echo ║     🚓 PWA INSPECTORES DE TRÁNSITO - GUÍA DE INICIO            ║
echo ╚════════════════════════════════════════════════════════════════╝
echo.
echo PASO 1: Asegúrate de estar en la carpeta del proyecto
echo   $ cd c:\Users\USUARIO\Documents\MunLima\PWA\pwa-inspector
echo.
echo PASO 2: Instala dependencias (si aún no lo hiciste)
echo   $ npm install
echo.
echo PASO 3: Abre DOS terminales (PowerShell o CMD)
echo.
echo   TERMINAL 1 - Servidor Socket.IO:
echo     $ npm install express socket.io cors
echo     $ node SERVER_EJEMPLO.js
echo     → El servidor estará en http://localhost:3000
echo.
echo   TERMINAL 2 - Aplicación React:
echo     $ npm run dev
echo     → La app estará en http://localhost:5173
echo.
echo PASO 4: Abre tu navegador
echo   Navega a: http://localhost:5173
echo.
echo PASO 5: Configura la app
echo   • Tu nombre: 'Inspector Juan' (o el que quieras)
echo   • URL Socket: 'http://localhost:3000'
echo   • Haz clic en 'Continuar'
echo.
echo PASO 6: Dale permisos
echo   • Geolocalización: Permitir
echo   • Micrófono: Permitir
echo.
echo PASO 7: Prueba la app
echo   • Click '📍 Iniciar seguimiento'
echo   • Mantén presionado '🎤 Hablar' para grabar mensajes
echo   • Abre otra pestaña/navegador para simular otros inspectores
echo.
echo ╔════════════════════════════════════════════════════════════════╗
echo ║  COMANDOS ÚTILES                                               ║
echo ╠════════════════════════════════════════════════════════════════╣
echo   npm run dev          → Desarrollo con hot-reload               ║
echo   npm run build        → Build para producción                   ║
echo   npm run preview      → Preview del build                       ║
echo   npm run lint         → Revisar código                          ║
echo ╚════════════════════════════════════════════════════════════════╝
echo.
echo 📚 DOCUMENTACIÓN: Lee README.md para más detalles
echo 🚀 PRODUCCIÓN: Usa Vercel (setup en README.md)
echo.
pause
