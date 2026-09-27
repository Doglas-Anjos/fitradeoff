# Imagem do MCP do FITradeoff.
#
#   docker build -t fitradeoff-mcp .
#   docker run -p 8765:8765 -v fitradeoff:/dados \
#     -e FITRADEOFF_MCP_HOSTS=fit.seu-dominio.org fitradeoff-mcp
#
# O comando padrao sobe a **superficie publica** (`mcp_remoto`), que serve so
# `/mcp` e `/saude`. A mesma imagem serve o aplicativo completo, trocando o
# comando -- e e assim que o `compose.yml` levanta o lado que emite chaves,
# preso ao loopback do hospedeiro.

FROM python:3.11-slim

# O numpy e o scipy abrem um pool de threads do BLAS por nucleo visivel. Os LPs
# do metodo tem meia dezena de variaveis: paralelizar algebra deste tamanho nao
# economiza tempo nenhum -- medido, 12,4 s contra 12,9 s -- e reserva memoria a
# rodo. Com as tres em 1, o commit do processo cai de 1,5 GB para 124 MB.
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    FITRADEOFF_DATA=/dados/decisoes \
    OMP_NUM_THREADS=1 \
    OPENBLAS_NUM_THREADS=1 \
    MKL_NUM_THREADS=1

WORKDIR /app

COPY engine ./engine
COPY mcp_server ./mcp_server
COPY api ./api

# Os tres numa chamada so: `fitradeoff-api` declara os outros dois por nome, e
# instalando separado o pip sairia procurando por eles num indice publico, onde
# nao estao.
#
# A imagem carrega tambem FastAPI e o SDK da Anthropic, porque o pacote da API
# os declara. A superficie publica nao importa nenhum dos dois -- ha um teste
# que afirma isso -- entao eles ficam no disco, nunca no processo.
RUN pip install --no-cache-dir ./engine ./mcp_server ./api

# Processo exposto nao roda como root, e o volume precisa ser dele.
RUN useradd --create-home --shell /usr/sbin/nologin fitradeoff \
    && mkdir -p /dados \
    && chown -R fitradeoff:fitradeoff /dados
USER fitradeoff

VOLUME ["/dados"]
EXPOSE 8765

HEALTHCHECK --interval=30s --timeout=4s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8765/saude').read()"

CMD ["uvicorn", "fitradeoff_api.mcp_remoto:app", "--host", "0.0.0.0", "--port", "8765"]
