# Sobe a API e o front em janelas separadas.
#
#   .\iniciar.ps1
#
# A API fica em http://127.0.0.1:8000 (docs em /docs) e o front em
# http://localhost:3000. Para habilitar a tela de chat, defina
# ANTHROPIC_API_KEY antes de rodar.

$raiz = $PSScriptRoot
$python = Join-Path $raiz "engine\.venv\Scripts\python.exe"

if (-not (Test-Path $python)) {
    Write-Error "Ambiente Python nao encontrado. Rode primeiro: python -m venv engine\.venv"
    exit 1
}

Write-Host "API   -> http://127.0.0.1:8000/docs"
Write-Host "Front -> http://localhost:3000"
if (-not $env:ANTHROPIC_API_KEY) {
    Write-Host "Aviso: ANTHROPIC_API_KEY nao definida; a tela de chat ficara indisponivel." -ForegroundColor Yellow
}

Start-Process powershell -ArgumentList @(
    "-NoExit", "-Command",
    "& '$python' -m uvicorn fitradeoff_api.app:app --host 127.0.0.1 --port 8000 --reload"
)
Start-Process powershell -ArgumentList @(
    "-NoExit", "-Command",
    "Set-Location '$raiz\web'; npm run dev"
)
