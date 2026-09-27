# Sobe a API e o front em janelas separadas.
#
#   .\iniciar.ps1
#
# A API fica em http://127.0.0.1:8000 (docs em /docs) e o front em
# http://localhost:3000. O servidor MCP por HTTP sobe junto, em /mcp: gere uma
# chave em http://localhost:3000/chaves e cole no seu cliente.

$raiz = $PSScriptRoot
$python = Join-Path $raiz "engine\.venv\Scripts\python.exe"

if (-not (Test-Path $python)) {
    Write-Error "Ambiente Python nao encontrado. Rode primeiro: python -m venv engine\.venv"
    exit 1
}

Write-Host "API   -> http://127.0.0.1:8000/docs"
Write-Host "Front -> http://localhost:3000"
Write-Host "MCP   -> http://127.0.0.1:8000/mcp (chaves em /chaves)"
if ($env:FITRADEOFF_MCP_HOSTS) {
    Write-Host "MCP publicado em: $env:FITRADEOFF_MCP_HOSTS" -ForegroundColor Yellow
    if (-not $env:FITRADEOFF_ADMIN_TOKEN) {
        Write-Host "Aviso: publicado sem FITRADEOFF_ADMIN_TOKEN; emitir chaves ficara bloqueado." -ForegroundColor Yellow
    }
}

Start-Process powershell -ArgumentList @(
    "-NoExit", "-Command",
    "& '$python' -m uvicorn fitradeoff_api.app:app --host 127.0.0.1 --port 8000 --reload"
)
Start-Process powershell -ArgumentList @(
    "-NoExit", "-Command",
    "Set-Location '$raiz\web'; npm run dev"
)
