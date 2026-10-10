# Contribuindo

Issues e pull requests são bem-vindos. Este guia é curto de propósito; o resto
está nos documentos que ele aponta.

## Rodar e testar

Como subir o projeto: seção [Começar](README.md#começar) do README.

```bash
# Python: motor, API e MCP
engine/.venv/Scripts/python -m pytest engine/tests api/tests mcp_server/tests -q
# interface
cd web && npm test
```

Os três (`tsc`, `pytest`, `vitest`) precisam passar. A CI
([`.github/workflows/verificar.yml`](.github/workflows/verificar.yml)) roda isso
em cada PR.

## Padrão

- **Documentação e estilo:** [`PADRAO_DE_DOCUMENTACAO.md`](PADRAO_DE_DOCUMENTACAO.md).
  Prosa em português explicando o *porquê* e o contrato que o tipo não mostra.
- **Lógica não trivial deixa um teste** que falha se ela quebrar. Sem framework
  novo, sem fixture a mais do que o necessário.
- **Arquitetura:** dependências apontam para dentro;
  [`test_architecture.py`](engine/tests/test_architecture.py) verifica por AST.

## Issues e PRs

- Mudança grande: abra uma issue antes, para alinhar o rumo.
- PR pequeno e com teste passa mais rápido do que um PR grande sem teste.
- Descreva o *porquê* da mudança, não só o quê.

## Suíte de paridade

A comparação com o sistema oficial do CDSID/UFPE precisa das **suas** credenciais
(`FIT_BASE_URL`, `FIT_USER`, `FIT_PASS` no `.env`) e de **autorização do dono do
sistema** — ela não ataca nada de terceiros por conta de ninguém. A medição já
capturada é versionada, então a suíte de equivalência roda sem rede e sem conta.
