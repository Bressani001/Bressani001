@echo off
setlocal
cd /d "%~dp0"
title PRISMA FLOW V12 PORTATIL

echo.
echo ============================================
echo   PRISMA FLOW V12 - BASE AUTOMATICA
echo ============================================
echo.
echo Procurando tudo dentro de BASE_PRISMA...
echo.

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0PREPARAR_BASE.ps1"
set RC=%ERRORLEVEL%

if "%RC%"=="2" (
  echo.
  echo BASE_PRISMA esta vazia.
  echo Copie sua pasta antiga inteira para BASE_PRISMA e execute este arquivo novamente.
  echo.
  pause
  exit /b 2
)

if not "%RC%"=="0" (
  echo.
  echo Nao foi possivel preparar a base.
  echo Veja a mensagem acima.
  echo.
  pause
  exit /b %RC%
)

echo.
echo Abrindo PRISMA FLOW V12...
start "" "%~dp0index.html"
exit /b 0
