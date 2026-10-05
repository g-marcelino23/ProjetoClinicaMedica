# Tratamento de condições excepcionais — A10:2025

**Revisão:** 29/07/2026  
**Referência:** [OWASP A10:2025 — Mishandling of Exceptional Conditions](https://owasp.org/Top10/2025/A10_2025-Mishandling_of_Exceptional_Conditions/)

## Princípio

Quando o ClinicalMed não consegue confirmar uma operação, ele falha fechado:
nenhuma etapa parcial é considerada concluída, a resposta não contém detalhes
internos e a condição é registrada para investigação.

Somente `ApplicationError`, criado explicitamente pelo próprio sistema, pode
definir status e mensagem pública. Propriedades `status` ou `publicMessage`
presentes em erros desconhecidos são ignoradas.

## Classificação central

| Condição | Resposta | Comportamento |
| --- | ---: | --- |
| JSON malformado | 400 | Mensagem pública e request ID |
| Corpo acima de 100 KB | 413 | Recusa antes do controller |
| Parâmetro ausente, inválido ou extra | 400 | Schema Zod e rejeição de campos extras |
| Conflito de integridade | 409 | Operação recusada |
| Deadlock ou serialização concorrente | 409 | `Retry-After: 1` |
| Timeout ou dependência indisponível | 503 | `Retry-After: 5` |
| Privilégio insuficiente inesperado | 500 | Falha fechada, sem transformar erro do banco em autorização válida |
| Integridade AES-GCM não confirmada | 500 | Alerta crítico e dado não retornado |
| Erro desconhecido | 500 | Mensagem genérica e request ID |
| Falha do próprio rollback | 500 | `TransactionRollbackError` e alerta crítico |

O middleware global fica depois de todas as rotas. Respostas 5xx criadas fora
dele também passam por uma última sanitização defensiva.

## Transações e estado

- Operações de múltiplas etapas usam `BEGIN`, `COMMIT`, `ROLLBACK` e `finally`
  para liberar a conexão.
- Se uma etapa falha, `rollbackTransaction` tenta reverter toda a transação.
- Se o rollback também falha, o erro original não é tratado como sucesso ou
  conflito comum; a condição é escalada como falha crítica.
- Conflitos conhecidos só recebem 409 depois que o rollback foi confirmado.
- O logout diferencia token inválido de falha do banco. Token inválido permite
  remover o cookie; falha ao revogar a sessão retorna indisponibilidade.
- A autenticação diferencia JWT inválido de banco indisponível. Falha da
  dependência não é disfarçada como credencial incorreta.

## Limites de recursos

| Recurso | Limite |
| --- | ---: |
| Corpo JSON | 100 KB |
| Headers por requisição | 100 |
| Recebimento da requisição HTTP | 15 s |
| Recebimento dos headers | 10 s |
| Inatividade do socket | 15 s |
| Keep-alive | 5 s |
| Requisições por socket | 100 |
| Conexão com PostgreSQL | 5 s |
| Comando PostgreSQL | 10 s |
| Query no cliente PostgreSQL | 12 s |
| Encerramento gracioso | 10 s |

Rate limits de autenticação, MFA, cadastro e API complementam esses limites.

## Disponibilidade e ciclo de vida

- `/health` informa que o processo está vivo.
- `/ready` executa `SELECT 1` e só informa `ready` quando o banco responde.
- A API não começa a escutar antes de confirmar a conexão inicial.
- `SIGTERM` e `SIGINT` param novas conexões, fecham conexões ociosas, aguardam as
  requisições existentes, encerram o pool e só então finalizam.
- `uncaughtException` e `unhandledRejection` são fatais: o processo registra a
  condição e encerra com código 1 em vez de continuar em estado desconhecido.
- Requisições HTTP malformadas recebem 400 e o socket é fechado.

## Verificação

```text
npm --prefix backend run check:exceptions
npm --prefix backend test
npm --prefix backend run smoke:exceptions
```

O smoke test confirma readiness, JSON quebrado, corpo excedido, parâmetros
ausentes e extras, rota inexistente, timeout do PostgreSQL e rollback de uma
transação interrompida após a primeira gravação.

## Responsabilidades da produção

- Configurar o orquestrador para usar `/ready` e reiniciar processos encerrados
  com falha.
- Executar testes de carga, estresse, interrupção de rede e indisponibilidade do
  PostgreSQL no ambiente de homologação.
- Monitorar saturação do pool, latência, 409, 413, 500 e 503.
- Ajustar limites somente com medição e revisão de segurança.
- Garantir sincronização de relógio e capacidade suficiente no proxy e banco.
