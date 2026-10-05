$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$SourceRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$OutputRoot = Join-Path $SourceRoot 'PRISMA_FLOW_V12_DEFINITIVO'
$NowTag = Get-Date -Format 'yyyyMMdd_HHmmss'

function Write-Step([string]$Text) {
    Write-Host ''
    Write-Host ('==> ' + $Text) -ForegroundColor Cyan
}

function Ensure-Dir([string]$Path) {
    if (!(Test-Path -LiteralPath $Path)) {
        New-Item -ItemType Directory -Path $Path -Force | Out-Null
    }
}

function Safe-CopyFile([string]$From, [string]$To) {
    Ensure-Dir (Split-Path -Parent $To)
    Copy-Item -LiteralPath $From -Destination $To -Force
}

function Search-First([string[]]$Names, [string[]]$Roots) {
    foreach ($name in $Names) {
        foreach ($root in $Roots) {
            if (!$root -or !(Test-Path -LiteralPath $root)) { continue }

            $direct = Join-Path $root $name
            if (Test-Path -LiteralPath $direct -PathType Leaf) {
                return (Get-Item -LiteralPath $direct)
            }

            try {
                $hit = Get-ChildItem -LiteralPath $root -File -Recurse -ErrorAction SilentlyContinue |
                    Where-Object { $_.Name -ieq $name } |
                    Sort-Object LastWriteTimeUtc -Descending |
                    Select-Object -First 1
                if ($hit) { return $hit }
            } catch {}
        }
    }
    return $null
}

function Search-Pattern([string]$Pattern, [string[]]$Roots) {
    $hits = @()
    foreach ($root in $Roots) {
        if (!$root -or !(Test-Path -LiteralPath $root)) { continue }
        try {
            $hits += Get-ChildItem -LiteralPath $root -File -Recurse -Filter $Pattern -ErrorAction SilentlyContinue
        } catch {}
    }
    return @($hits | Sort-Object Length -Descending, LastWriteTimeUtc -Descending)
}

function Extract-Zip([System.IO.FileInfo]$Zip, [string]$Destination) {
    if (!$Zip) { return $false }
    Ensure-Dir $Destination
    Write-Host ('Extraindo: ' + $Zip.FullName) -ForegroundColor DarkGray
    Expand-Archive -LiteralPath $Zip.FullName -DestinationPath $Destination -Force
    return $true
}

Write-Host ''
Write-Host '=============================================================' -ForegroundColor DarkCyan
Write-Host '   PRISMA FLOW V12 - MONTADOR DEFINITIVO' -ForegroundColor White
Write-Host '=============================================================' -ForegroundColor DarkCyan
Write-Host ''
Write-Host 'Ele vai montar UMA pasta final e autocontida.' -ForegroundColor Gray
Write-Host 'Nenhum arquivo original sera alterado.' -ForegroundColor Gray

# Busca preferencial: pasta do montador, FONTES, Downloads, Desktop e Documentos.
$SearchRoots = @(
    (Join-Path $SourceRoot 'FONTES'),
    $SourceRoot,
    (Join-Path $env:USERPROFILE 'Downloads'),
    (Join-Path $env:USERPROFILE 'Desktop'),
    (Join-Path $env:USERPROFILE 'Documents')
) | Select-Object -Unique

# Preserva uma build anterior sem apagar nada do usuario.
if (Test-Path -LiteralPath $OutputRoot) {
    $Backup = $OutputRoot + '_BACKUP_' + $NowTag
    Write-Step ('Build anterior encontrada. Movendo para ' + (Split-Path -Leaf $Backup))
    Move-Item -LiteralPath $OutputRoot -Destination $Backup
}

Ensure-Dir $OutputRoot
Ensure-Dir (Join-Path $OutputRoot 'BASE_PRISMA\ATUAL')
Ensure-Dir (Join-Path $OutputRoot 'BASE_PRISMA\LEGADO_V8')
Ensure-Dir (Join-Path $OutputRoot 'IMPORTACOES_ORIGINAIS')
Ensure-Dir (Join-Path $OutputRoot 'DOCUMENTACAO_ORIGINAL')
Ensure-Dir (Join-Path $OutputRoot 'assets')
Ensure-Dir (Join-Path $OutputRoot 'vendor')

Write-Step 'Copiando aplicacao V12 definitiva'

$AppFiles = @(
    'index.html','styles.css','db.js','legacy.js','core.js','auto_loader.js',
    'importer.js','map.js','routes.js','groups.js','router_noc.js','messages.js',
    'flow.js','explore.js','access.js','app.js','PREPARAR_BASE.ps1'
)
foreach ($file in $AppFiles) {
    $src = Join-Path $SourceRoot $file
    if (!(Test-Path -LiteralPath $src)) {
        throw ('Arquivo obrigatorio da V12 ausente: ' + $file)
    }
    Safe-CopyFile $src (Join-Path $OutputRoot $file)
}

Copy-Item -LiteralPath (Join-Path $SourceRoot 'vendor\*') -Destination (Join-Path $OutputRoot 'vendor') -Recurse -Force

# Copia logo/mark se ja estiverem na propria pasta do projeto.
foreach ($img in @('prisma_logo.png','prisma_mark.png')) {
    $src = Join-Path $SourceRoot $img
    if (Test-Path -LiteralPath $src) {
        Safe-CopyFile $src (Join-Path $OutputRoot ('assets\' + $img))
    }
}

Write-Step 'Localizando as bases que voce ja usou'

$Critical = [ordered]@{
    'catalog.js' = @('catalog(1).js','catalog.js')
    'whatsapp.js' = @('whatsapp(1).js','whatsapp.js')
    'point_details.js' = @('point_details(1).js','point_details.js')
    'machine_details.js' = @('machine_details(1).js','machine_details.js')
    'router.js' = @('router(1).js','router_v7(1).js','router.js','router_v7.js')
}

$FoundCritical = 0
foreach ($target in $Critical.Keys) {
    $hit = Search-First $Critical[$target] $SearchRoots
    if ($hit) {
        Safe-CopyFile $hit.FullName (Join-Path $OutputRoot ('BASE_PRISMA\ATUAL\' + $target))
        Write-Host ('OK  ' + $target + '  <-  ' + $hit.FullName) -ForegroundColor Green
        $FoundCritical++
    } else {
        Write-Host ('--  ' + $target + ' nao encontrado solto; tentarei recuperar do pacote completo.') -ForegroundColor Yellow
    }
}

# Imagens da identidade visual enviadas anteriormente.
$LogoHit = Search-First @('prisma_logo(2).png','prisma_logo.png') $SearchRoots
if ($LogoHit) { Safe-CopyFile $LogoHit.FullName (Join-Path $OutputRoot 'assets\prisma_logo.png') }

$MarkHit = Search-First @('prisma_mark(2).png','prisma_mark.png') $SearchRoots
if ($MarkHit) { Safe-CopyFile $MarkHit.FullName (Join-Path $OutputRoot 'assets\prisma_mark.png') }

Write-Step 'Recuperando pacote completo / midias sem duplicar arquivos gigantes'

$FullZip = Search-Pattern 'Central_Eletromidia_NOC_V8_COMPLETO_COM_BASES_2026-09-21*.zip' $SearchRoots |
    Where-Object { $_.Length -gt 400MB } |
    Select-Object -First 1

if ($FullZip) {
    Extract-Zip $FullZip (Join-Path $OutputRoot 'BASE_PRISMA\LEGADO_V8') | Out-Null
    Write-Host 'Pacote completo extraido. O ZIP original NAO foi duplicado na pasta final.' -ForegroundColor Green
} else {
    # Se o ZIP completo nao existir, tenta reconstruir das 5 partes.
    $Parts = @()
    foreach ($n in 1..5) {
        $suffix = $n.ToString('00')
        $part = Search-First @('NOC_V8_COMPLETO.part' + $suffix) $SearchRoots
        if ($part) { $Parts += $part }
    }

    if ($Parts.Count -eq 5) {
        Write-Host 'ZIP completo nao encontrado. Reconstruindo pelas 5 partes...' -ForegroundColor Yellow
        $TempZip = Join-Path $env:TEMP ('PRISMA_V8_' + $NowTag + '.zip')
        $outStream = [System.IO.File]::Create($TempZip)
        try {
            foreach ($part in $Parts | Sort-Object Name) {
                $inStream = [System.IO.File]::OpenRead($part.FullName)
                try { $inStream.CopyTo($outStream) } finally { $inStream.Dispose() }
            }
        } finally {
            $outStream.Dispose()
        }
        Expand-Archive -LiteralPath $TempZip -DestinationPath (Join-Path $OutputRoot 'BASE_PRISMA\LEGADO_V8') -Force
        Remove-Item -LiteralPath $TempZip -Force
        Write-Host 'Pacote reconstruido e extraido.' -ForegroundColor Green
    } else {
        Write-Host 'Pacote completo/midias nao encontrado. A build ainda funcionara com a base solta, se localizada.' -ForegroundColor Yellow
    }
}

Write-Step 'Incluindo materiais auxiliares que voce enviou'

$Archives = @(
    @('WHATSAPP_MASTER.zip','WHATSAPP_MASTER'),
    @('PLANILHAS_E_CSV.zip','PLANILHAS_E_CSV'),
    @('PRISMA_FLOW_V11_UPDATE_FINAL.zip','V11_UPDATE_ORIGINAL')
)
foreach ($pair in $Archives) {
    $hit = Search-First @($pair[0]) $SearchRoots
    if ($hit) {
        $dest = Join-Path $OutputRoot ('IMPORTACOES_ORIGINAIS\' + $pair[1])
        Extract-Zip $hit $dest | Out-Null
        Write-Host ('OK  ' + $pair[0]) -ForegroundColor Green
    }
}

$Docs = @(
    'AUDITORIA_ROTEADOR_V7(1).json',
    'ARQUITETURA_DADOS(1).json',
    'AUDITORIA_INTEGRACAO(1).txt',
    'LEIA-ME-PRISMA-V10(2).txt',
    'LEIA-ME-V7(2).txt',
    'LEIA-ME-V9(2).txt',
    'LEIA-ME-PRISMA-FLOW-V11(2).txt',
    'MANIFEST_V10(2).json',
    'MANIFEST_V11(2).json',
    'MANIFEST_V9(2).json',
    'MAPA_DADOS(2).txt',
    'VALIDACAO_SHA256(1).txt'
)
foreach ($name in $Docs) {
    $hit = Search-First @($name) $SearchRoots
    if ($hit) {
        Safe-CopyFile $hit.FullName (Join-Path $OutputRoot ('DOCUMENTACAO_ORIGINAL\' + $hit.Name))
    }
}

Write-Step 'Gerando manifesto automatico da base'

$Prep = Join-Path $OutputRoot 'PREPARAR_BASE.ps1'
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $Prep
if ($LASTEXITCODE -ne 0) {
    throw 'A base foi copiada, mas o manifesto automatico nao conseguiu encontrar catalog.js + whatsapp.js.'
}

Write-Step 'Criando abertura definitiva'

$OpenBat = @'
@echo off
setlocal
cd /d "%~dp0"
title PRISMA FLOW V12 DEFINITIVO
start "" "%~dp0index.html"
exit /b 0
'@
Set-Content -LiteralPath (Join-Path $OutputRoot 'ABRIR_PRISMA.bat') -Value $OpenBat -Encoding ASCII

$Readme = @"
PRISMA FLOW V12 DEFINITIVO
==========================

BUILD: 12.3.0-DEFINITIVO-20261005

COMO ABRIR
----------
Dê dois cliques em:

ABRIR_PRISMA.bat

Nao precisa:
- selecionar pasta V11;
- copiar arquivos para dentro do app;
- instalar Leaflet;
- instalar biblioteca de Excel;
- estar conectado a internet para o nucleo do PRISMA funcionar.

INTERNET
--------
O sistema, as bases, a busca, WhatsApp, roteador, XLS/XLSX, CSV/JSON,
tarefas, importacoes, correcoes e demais recursos rodam com os arquivos locais.

Os fundos Ruas/Satelite/Claro do MAPA sao online.
Sem internet, escolha "Sem fundo": os pontos e coordenadas continuam funcionando.
Google Maps tambem requer internet quando voce pedir para abri-lo.

DADOS
-----
A base original foi incorporada em BASE_PRISMA.
Arquivos originais nao sao alterados pelo PRISMA.
Correcoes/tarefas/preferencias continuam no IndexedDB separado da V12.

IMPORTACOES_ORIGINAIS e DOCUMENTACAO_ORIGINAL foram mantidas para consulta/auditoria.
"@
Set-Content -LiteralPath (Join-Path $OutputRoot 'LEIA-ME-PRIMEIRO.txt') -Value $Readme -Encoding UTF8

Write-Step 'Validando build final'

$RequiredFinal = @(
    'index.html','styles.css','app.js','core.js','db.js','importer.js',
    'vendor\leaflet.js','vendor\leaflet.css','vendor\xlsx.full.min.js',
    'base_manifest.js','ABRIR_PRISMA.bat','LEIA-ME-PRIMEIRO.txt'
)
$Missing = @()
foreach ($rel in $RequiredFinal) {
    if (!(Test-Path -LiteralPath (Join-Path $OutputRoot $rel))) { $Missing += $rel }
}
if ($Missing.Count) {
    throw ('Build incompleta. Arquivos ausentes: ' + ($Missing -join ', '))
}

$ManifestText = Get-Content -LiteralPath (Join-Path $OutputRoot 'base_manifest.js') -Raw
if ($ManifestText -notmatch 'catalog' -or $ManifestText -notmatch 'whatsapp') {
    throw 'Manifesto gerado, mas sem catalog/whatsapp.'
}

$TotalFiles = (Get-ChildItem -LiteralPath $OutputRoot -File -Recurse | Measure-Object).Count
$TotalBytes = (Get-ChildItem -LiteralPath $OutputRoot -File -Recurse | Measure-Object Length -Sum).Sum
$TotalMB = [Math]::Round($TotalBytes / 1MB, 1)

Write-Host ''
Write-Host '=============================================================' -ForegroundColor Green
Write-Host '   PRISMA FLOW V12 DEFINITIVO PRONTO' -ForegroundColor Green
Write-Host '=============================================================' -ForegroundColor Green
Write-Host ('Pasta:    ' + $OutputRoot) -ForegroundColor White
Write-Host ('Arquivos: ' + $TotalFiles) -ForegroundColor White
Write-Host ('Tamanho:  ' + $TotalMB + ' MB') -ForegroundColor White
Write-Host ''
Write-Host 'Agora use somente: ABRIR_PRISMA.bat' -ForegroundColor Yellow
Write-Host ''
Start-Process explorer.exe -ArgumentList ('"' + $OutputRoot + '"')
