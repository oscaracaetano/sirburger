@echo off
title SirBurger - Agente de Impresion de Cocina
color 0A
cls
echo =============================================================
echo   SIRBURGER - AGENTE DE IMPRESION Y ALERTAS DE COCINA
echo =============================================================
echo.
echo Iniciando agente de cocina en segundo plano...
echo Presiona Ctrl+C en esta ventana si deseas detenerlo.
echo.

node agent.js

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] No se pudo iniciar el agente.
    echo Verifica que tengas Node.js instalado en esta computadora.
    echo.
    pause
)
