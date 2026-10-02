$ErrorActionPreference = 'Stop'

$AppRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$BaseRoot = Join-Path $AppRoot 'BASE_PRISMA'
$ManifestPath = Join-Path $AppRoot 'base_manifest.js'

if (!(Test-Path -LiteralPath $BaseRoot)) {
  New-Item -ItemType Directory -Path $BaseRoot | Out-Null
}

function RelPath([string]$FullPath) {
  Push-Location $AppRoot
  try {
    $r = (Resolve-Path -LiteralPath $FullPath -Relative)
  } finally {
    Pop-Location
  }
  if ($r.StartsWith('.\')) { $r = $r.Substring(2) }
  return ($r -replace '\\','/')
}

function PickFile($Files, [string[]]$Names) {
  foreach ($name in $Names) {
    $hit = $Files | Where-Object { $_.Name -ieq $name } | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if ($hit) { return $hit }
  }
  return $null
}

Write-Host ''
Write-Host 'PRISMA FLOW V12 - PREPARANDO BASE AUTOMATICA' -ForegroundColor Cyan
Write-Host ('Pasta monitorada: ' + $BaseRoot)
Write-Host ''

$allFiles = @(Get-ChildItem -LiteralPath $BaseRoot -File -Recurse -ErrorAction SilentlyContinue)

if (!$allFiles.Count) {
  Write-Host 'BASE_PRISMA esta vazia.' -ForegroundColor Yellow
  Write-Host 'Copie sua pasta V11 inteira (ou as pastas antigas) para dentro de BASE_PRISMA e abra novamente.' -ForegroundColor Yellow
  if (Test-Path -LiteralPath $ManifestPath) { Remove-Item -LiteralPath $ManifestPath -Force }
  exit 2
}

$dirs = $allFiles | Group-Object DirectoryName
$ranked = @()

foreach ($g in $dirs) {
  $files = @($g.Group)
  $catalog = PickFile $files @('catalog.js','catalog(1).js','catalog(2).js')
  $whatsapp = PickFile $files @('whatsapp.js','whatsapp(1).js','whatsapp(2).js')
  $point = PickFile $files @('point_details.js','point_details(1).js','point_details(2).js')
  $machine = PickFile $files @('machine_details.js','machine_details(1).js','machine_details(2).js')
  $router = PickFile $files @('router.js','router(1).js','router_v7.js','router_v7(1).js','router_v7(2).js')

  $score = 0
  if ($catalog) { $score += 100 }
  if ($whatsapp) { $score += 100 }
  if ($point) { $score += 35 }
  if ($machine) { $score += 35 }
  if ($router) { $score += 30 }

  if ($score -gt 0) {
    $latest = ($files | Sort-Object LastWriteTime -Descending | Select-Object -First 1).LastWriteTimeUtc
    $ranked += [pscustomobject]@{
      Directory = $g.Name
      Score = $score
      Latest = $latest
      Catalog = $catalog
      Whatsapp = $whatsapp
      Point = $point
      Machine = $machine
      Router = $router
    }
  }
}

$best = $ranked | Sort-Object @{Expression='Score';Descending=$true}, @{Expression='Latest';Descending=$true} | Select-Object -First 1
$mixed = $false

if (!$best -or !$best.Catalog -or !$best.Whatsapp) {
  Write-Host 'Nenhuma pasta unica trouxe catalog.js + whatsapp.js. Tentando localizar os arquivos separadamente...' -ForegroundColor Yellow
  $mixed = $true

  $catalog = PickFile $allFiles @('catalog.js','catalog(1).js','catalog(2).js')
  $whatsapp = PickFile $allFiles @('whatsapp.js','whatsapp(1).js','whatsapp(2).js')
  $point = PickFile $allFiles @('point_details.js','point_details(1).js','point_details(2).js')
  $machine = PickFile $allFiles @('machine_details.js','machine_details(1).js','machine_details(2).js')
  $router = PickFile $allFiles @('router.js','router(1).js','router_v7.js','router_v7(1).js','router_v7(2).js')

  if (!$catalog -or !$whatsapp) {
    Write-Host 'ERRO: catalog.js e/ou whatsapp.js nao foram encontrados dentro de BASE_PRISMA.' -ForegroundColor Red
    if (Test-Path -LiteralPath $ManifestPath) { Remove-Item -LiteralPath $ManifestPath -Force }
    exit 3
  }

  $best = [pscustomobject]@{
    Directory = '(arquivos misturados)'
    Catalog = $catalog
    Whatsapp = $whatsapp
    Point = $point
    Machine = $machine
    Router = $router
  }
}

$mediaExt = @('.jpg','.jpeg','.png','.webp','.gif','.bmp','.mp4','.webm','.mov','.mkv','.pdf','.mp3','.wav','.ogg','.m4a','.heic')
$mediaCandidates = @($allFiles | Where-Object { $mediaExt -contains $_.Extension.ToLowerInvariant() })
$preferredRoot = $best.Directory

$mediaScored = foreach ($f in $mediaCandidates) {
  $pref = 1
  if ($preferredRoot -ne '(arquivos misturados)' -and $f.FullName.StartsWith($preferredRoot,[System.StringComparison]::OrdinalIgnoreCase)) { $pref = 0 }
  [pscustomobject]@{ File=$f; Pref=$pref; Modified=$f.LastWriteTimeUtc }
}
$mediaScored = $mediaScored | Sort-Object Pref, @{Expression='Modified';Descending=$true}

$media = [ordered]@{}
foreach ($item in $mediaScored) {
  $f = $item.File
  $key = $f.Name.ToLowerInvariant()
  if (!$media.Contains($key)) {
    $media[$key] = RelPath $f.FullName
  }
}

$filesObj = [ordered]@{
  catalog = RelPath $best.Catalog.FullName
  whatsapp = RelPath $best.Whatsapp.FullName
  pointDetails = if ($best.Point) { RelPath $best.Point.FullName } else { $null }
  machineDetails = if ($best.Machine) { RelPath $best.Machine.FullName } else { $null }
  router = if ($best.Router) { RelPath $best.Router.FullName } else { $null }
}

$manifest = [ordered]@{
  version = 1
  build = '12.2.0-PORTATIL'
  generatedAt = (Get-Date).ToString('o')
  sourceRoot = if ($mixed) { 'BASE_PRISMA (arquivos misturados)' } else { RelPath $best.Directory }
  mixed = $mixed
  files = $filesObj
  media = $media
  scan = [ordered]@{
    totalFiles = $allFiles.Count
    mediaFiles = $media.Count
    selectedDirectory = $best.Directory
  }
}

$json = $manifest | ConvertTo-Json -Depth 8 -Compress
$js = 'window.__PRISMA_BASE_MANIFEST__=' + $json + ';'
Set-Content -LiteralPath $ManifestPath -Value $js -Encoding UTF8

Write-Host ('Base selecionada: ' + $manifest.sourceRoot) -ForegroundColor Green
Write-Host ('catalog:          ' + $filesObj.catalog)
Write-Host ('whatsapp:         ' + $filesObj.whatsapp)
Write-Host ('point_details:    ' + $(if ($filesObj.pointDetails) {$filesObj.pointDetails} else {'nao encontrado'}))
Write-Host ('machine_details:  ' + $(if ($filesObj.machineDetails) {$filesObj.machineDetails} else {'nao encontrado'}))
Write-Host ('router:           ' + $(if ($filesObj.router) {$filesObj.router} else {'nao encontrado'}))
Write-Host ('midias mapeadas:  ' + $media.Count)
Write-Host ''
Write-Host 'Manifesto atualizado. A V12 vai carregar essa base automaticamente.' -ForegroundColor Green
exit 0
