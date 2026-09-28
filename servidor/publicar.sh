#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Sobe o FITradeoff no servidor. Reconstroi so o que mudou, e volta se cair.
# ---------------------------------------------------------------------------
#
# Chamado pelo workflow deste repositorio, que envia o codigo por scp.
#
# Tres processos, e a separacao entre eles nao e organizacional:
#
#   web   3000   a tela (Next). A unica porta publicada alem do MCP.
#   api   3001   o FastAPI. NAO publica porta: quem fala com ele e a tela, por
#                dentro da rede do compose. Um caminho publico seria um segundo
#                acesso as decisoes, sem passar pela tela.
#   mcp   8765   o servidor MCP, um aplicativo SEPARADO que nao tem as rotas de
#                /api. Publicar a porta do aplicativo completo publicaria as
#                decisoes junto -- e uma regra de proxy que so deixasse passar
#                /mcp estaria a um erro de digitacao de publicar o resto.

set -euo pipefail

ENTRADA=/tmp/fitradeoff.tgz
DESTINO=/srv/fitradeoff
MARCA="$DESTINO/.conteudo"

[ -f "$ENTRADA" ] || { echo "==> Sem codigo para publicar."; exit 0; }
trap 'rm -f "$ENTRADA"' EXIT

NOVO=$(mktemp -d)
tar -xzf "$ENTRADA" -C "$NOVO"

# --- 1. mudou? -------------------------------------------------------------
# O resumo cobre o que entra na imagem. Nao cobre o `.env`: segredo e assunto
# do passo anterior, e um valor novo la nao exige reconstruir imagem nenhuma --
# exige recriar o container, que o `up -d` faz sozinho.
conteudo=$(cd "$NOVO" && find . -type f \
  \( -name '*.py' -o -name '*.ts' -o -name '*.tsx' -o -name '*.json' \
     -o -name '*.toml' -o -name 'Dockerfile' -o -name 'compose.yml' \) \
  -not -path './web/node_modules/*' -not -path './web/.next/*' \
  | sort | xargs sha256sum | sha256sum | cut -d' ' -f1)

anterior=""
[ -f "$MARCA" ] && anterior=$(cat "$MARCA")

# --- 2. de onde voltar -----------------------------------------------------
for img in fitradeoff-mcp fitradeoff-web; do
  if docker image inspect "$img" >/dev/null 2>&1; then
    docker tag "$img" "$img:anterior"
  fi
done
[ -d "$DESTINO" ] && cp -a "$DESTINO" "${DESTINO}.anterior"

voltar() {
  echo "==> Voltando ao anterior." >&2
  if [ -d "${DESTINO}.anterior" ]; then
    rm -rf "$DESTINO"
    mv "${DESTINO}.anterior" "$DESTINO"
  fi
  for img in fitradeoff-mcp fitradeoff-web; do
    docker image inspect "$img:anterior" >/dev/null 2>&1 && docker tag "$img:anterior" "$img"
  done
  (cd "$DESTINO" && docker compose --profile plataforma up -d --no-build >/dev/null 2>&1) || true
  echo "    Estado: $(docker ps --filter name=fitradeoff --format '{{.Names}} {{.Status}}' | tr '\n' ' ')" >&2
}

# --- 3. trocar os arquivos -------------------------------------------------
# Um a um, preservando o `.env`: ele vive aqui e nao vem no pacote. Um `rm -rf`
# levaria os segredos, e os servicos subiriam sem eles -- sem erro de build, so
# sem identidade nenhuma, o que faz a API recusar todo mundo com 401.
mkdir -p "$DESTINO"
for d in engine api mcp_server web servidor; do
  [ -d "$NOVO/$d" ] || continue
  rm -rf "${DESTINO:?}/$d"
  cp -a "$NOVO/$d" "$DESTINO/$d"
done
for f in Dockerfile compose.yml .dockerignore; do
  [ -f "$NOVO/$f" ] && cp -a "$NOVO/$f" "$DESTINO/$f"
done
rm -rf "$NOVO"

if [ "$conteudo" = "$anterior" ]; then
  echo "==> Sem mudanca no codigo; so recriando o que precisar."
  (cd "$DESTINO" && docker compose --profile plataforma up -d --no-build >/dev/null 2>&1) \
    || { echo "ERRO: os servicos nao subiram." >&2; voltar; exit 1; }
else
  echo "==> O codigo mudou. Reconstruindo."
  # A saida do build so aparece quando ele falha: em sucesso sao centenas de
  # linhas de camada que escondem o que importa no registro.
  if ! saida=$(cd "$DESTINO" && docker compose --profile plataforma build 2>&1); then
    echo "ERRO: a construcao falhou." >&2
    echo "$saida" | tail -30 >&2
    voltar
    exit 1
  fi
  if ! (cd "$DESTINO" && docker compose --profile plataforma up -d >/dev/null 2>&1); then
    echo "ERRO: os servicos nao subiram." >&2
    voltar
    exit 1
  fi
fi

# --- 4. conferir que respondem ---------------------------------------------
# Pelas portas, e nao por `docker ps`. Um container "Up" pode ter subido com o
# processo morto por erro de importacao, e erro de importacao e o que uma
# dependencia nova introduz.
echo -n "==> Conferindo "
ok=0
for _ in $(seq 1 20); do
  web=$(curl -fsS -m 5 -o /dev/null -w '%{http_code}' http://127.0.0.1:3000/ 2>/dev/null || echo 000)
  mcp=$(curl -fsS -m 5 -o /dev/null -w '%{http_code}' http://127.0.0.1:8765/saude 2>/dev/null || echo 000)
  if [ "$web" = 200 ] && [ "$mcp" = 200 ]; then ok=1; break; fi
  echo -n "."
  sleep 3
done
echo ""

if [ "$ok" != 1 ]; then
  echo "ERRO: tela=$web  mcp=$mcp  (esperado 200 nos dois)" >&2
  for c in $(docker ps -aq --filter name=fitradeoff); do
    echo "--- $(docker inspect -f '{{.Name}}' "$c") ---" >&2
    docker logs --tail 20 "$c" 2>&1 | sed 's/^/    /' >&2
  done
  voltar
  exit 1
fi

printf '%s' "$conteudo" > "$MARCA"
rm -rf "${DESTINO}.anterior"
for img in fitradeoff-mcp fitradeoff-web; do
  docker image rm "$img:anterior" >/dev/null 2>&1 || true
done

echo "==> FITradeoff publicado."
docker ps --filter name=fitradeoff --format "    {{.Names}}  {{.Status}}"
