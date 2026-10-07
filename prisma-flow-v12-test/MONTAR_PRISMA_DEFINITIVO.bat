@echo off
setlocal
cd /d "%~dp0"
title PRISMA FLOW V12 - MONTADOR DEFINITIVO

echo.
echo =============================================================
echo    PRISMA FLOW V12 - MONTADOR DEFINITIVO
echo =============================================================
echo.
echo O montador procura automaticamente em:
echo - esta pasta
echo - FONTES
echo - Downloads
echo - Desktop
echo - Documents
echo.
echo Ele NAO altera os arquivos originais.
echo.
pause

set "PRISMA_MONTADOR_ROOT=%~dp0"
set "PRISMA_MONTADOR_SCRIPT=%~dp0MONTAR_PRISMA_DEFINITIVO.ps1"
powershell.exe -NoProfile -Command "$ErrorActionPreference='Stop'; $code=Get-Content -LiteralPath $env:PRISMA_MONTADOR_SCRIPT -Raw; & ([ScriptBlock]::Create($code))"
set RC=%ERRORLEVEL%

echo.
if not "%RC%"=="0" (
  echo FALHA AO MONTAR. Codigo: %RC%
  echo Leia a mensagem acima.
  pause
  exit /b %RC%
)

echo BUILD DEFINITIVA CRIADA COM SUCESSO.
echo.
pause
exit /b 0
