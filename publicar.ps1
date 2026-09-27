# Poe o MCP na internet por um tunel, para testar hoje.
#
#   .\publicar.ps1
#   .\publicar.ps1 -NovaChave "Claude na web"
#
# Serve para experimentar antes de decidir onde hospedar: o Claude na web roda
# nos servidores da Anthropic e nao alcanca o seu 127.0.0.1, mas alcanca um
# endereco de tunel. Ctrl+C derruba o tunel junto.
#
# O tunel sobe antes do servidor de proposito: o endereco so existe depois que o
# cloudflared o anuncia, e e dele que sai FITRADEOFF_MCP_HOSTS -- sem declarar o
# dominio, o servidor recusa tudo o que vier por ele com 421.
#
# Para uso continuado, `compose.yml` e o caminho: um endereco de tunel destes e
# sorteado a cada execucao, entao o conector do claude.ai para de funcionar toda
# vez que voce reiniciar.

param(
    [int]$Porta = 8765,
    [string]$NovaChave = ""
)

$ErrorActionPreference = "Stop"
$raiz = $PSScriptRoot
$python = Join-Path $raiz "engine\.venv\Scripts\python.exe"

if (-not (Test-Path $python)) {
    Write-Error "Ambiente Python nao encontrado. Rode primeiro: python -m venv engine\.venv"
    exit 1
}

if (-not (Get-Command cloudflared -ErrorAction SilentlyContinue)) {
    Write-Host "cloudflared nao encontrado." -ForegroundColor Yellow
    Write-Host "  winget install --id Cloudflare.cloudflared"
    Write-Host ""
    Write-Host "Ele abre um endereco https temporario sem conta e sem cadastro."
    exit 1
}

$registro = Join-Path $env:TEMP "fitradeoff-tunel.log"
if (Test-Path $registro) { Remove-Item $registro -Force }

Write-Host "Abrindo o tunel..." -ForegroundColor Cyan
$tunel = Start-Process cloudflared `
    -ArgumentList @("tunnel", "--url", "http://127.0.0.1:$Porta", "--no-autoupdate") `
    -RedirectStandardError $registro -RedirectStandardOutput "$registro.saida" `
    -PassThru -WindowStyle Hidden

# O endereco aparece no meio do registro, e demora alguns segundos.
$endereco = $null
foreach ($tentativa in 1..40) {
    Start-Sleep -Milliseconds 500
    if (Test-Path $registro) {
        $achado = Select-String -Path $registro -Pattern "https://[a-z0-9-]+\.trycloudflare\.com" `
            -AllMatches -ErrorAction SilentlyContinue
        if ($achado) {
            $endereco = $achado.Matches[0].Value
            break
        }
    }
    if ($tunel.HasExited) { break }
}

if (-not $endereco) {
    Write-Error "O tunel nao anunciou um endereco. Veja $registro"
    if (-not $tunel.HasExited) { Stop-Process -Id $tunel.Id -Force }
    exit 1
}

$dominio = ([Uri]$endereco).Host
$env:FITRADEOFF_MCP_HOSTS = $dominio
$env:FITRADEOFF_MCP_URL = "$endereco/mcp"

Write-Host ""
Write-Host "MCP publicado em $endereco/mcp" -ForegroundColor Green

if ($NovaChave) {
    # A chave sai do mesmo cofre que a tela usa: mesmo FITRADEOFF_DATA.
    $texto = (& $python -m fitradeoff_api.chaves criar $NovaChave | Select-Object -First 1).Trim()
    Write-Host ""
    Write-Host "Cole isto em Settings > Connectors > Add custom connector:" -ForegroundColor Green
    Write-Host "  $endereco/mcp/$texto"
    Write-Host ""
    Write-Host "A chave aparece uma vez. Revogue em http://localhost:3000/chaves quando parar de usar."
} else {
    Write-Host "Gere uma chave em http://localhost:3000/chaves e conecte com:"
    Write-Host "  $endereco/mcp/SUA_CHAVE"
    Write-Host ""
    Write-Host "Ou rode de novo com -NovaChave 'Claude na web' para sair pronto."
}

Write-Host ""
Write-Host "Ctrl+C derruba o tunel e o servidor." -ForegroundColor Cyan
Write-Host ""

try {
    & $python -m uvicorn fitradeoff_api.mcp_remoto:app --host 127.0.0.1 --port $Porta
} finally {
    if (-not $tunel.HasExited) {
        Stop-Process -Id $tunel.Id -Force
        Write-Host "Tunel encerrado." -ForegroundColor Cyan
    }
}
