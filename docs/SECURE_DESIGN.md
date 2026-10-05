# Design seguro e invariantes de negócio

**Categoria:** OWASP Top 10:2025 A06 – Insecure Design  
**Revisão:** 28/07/2026

O objetivo destes controles é impedir estados indesejados mesmo quando o cliente
envia requisições fora da ordem, simultâneas ou diretamente para a API. As regras
não dependem de botões desabilitados no frontend.

## Invariantes

1. Um horário deve estar no futuro quando é criado, alterado ou reservado.
2. Agendas do mesmo médico não podem se sobrepor.
3. Um paciente não pode manter consultas `AGENDADA` ou `CONFIRMADA` sobrepostas.
4. Uma agenda só pode pertencer a uma consulta.
5. Agenda vinculada a consulta não pode ter seu intervalo alterado.
6. Check-in só ocorre na janela de 30 minutos antes a 30 minutos depois.
7. Atendimento só pode ser concluído pelo médico atribuído e após seu início.
8. Falta só pode ser registrada depois do fim do intervalo.
9. Prontuário exige consulta confirmada e iniciada.
10. Exame e prescrição exigem consulta confirmada ou realizada.
11. Prescrição e demais históricos clínicos não são apagados pela API.
12. Uma fila exige médico ou especialidade e não aceita entrada ativa equivalente.

As invariantes de simultaneidade, intervalo, unicidade e domínio de estados também
existem no PostgreSQL. Assim, uma falha futura no controller não basta para
corromper esses dados.

## Máquinas de estado

### Consulta

| Estado atual | Médico | Secretário |
| --- | --- | --- |
| `AGENDADA` | `CONFIRMADA`, `CANCELADA`, `FALTOU` | `CONFIRMADA`, `CANCELADA`, `FALTOU` |
| `CONFIRMADA` | `REALIZADA`, `CANCELADA`, `FALTOU` | `CANCELADA`, `FALTOU` |
| `REALIZADA`, `CANCELADA`, `FALTOU` | Terminal | Terminal |

`REALIZADA` requer horário iniciado. `FALTOU` requer horário encerrado.

### Exame

`SOLICITADO` → `AGENDADO` → `REALIZADO` → `ENTREGUE`

`SOLICITADO` e `AGENDADO` podem ir para `CANCELADO`. `ENTREGUE` e `CANCELADO`
são terminais.

### Lista de espera

`ATIVO` → `CHAMADO` → `ENCERRADO`

`ATIVO` e `CHAMADO` podem ir para `CANCELADO`. `ENCERRADO` e `CANCELADO` são
terminais. A leitura e a mudança usam bloqueio da mesma linha para evitar duas
decisões concorrentes.

### Prescrição

`ATIVA` → `CANCELADA`

O cancelamento grava `cancelada_em`. Não existe transição de reativação nem
exclusão física pela API.

## Evidências automatizadas

- `npm test`: políticas de estados e regressão de segurança.
- `npm run check:design`: presença dos controles estruturais da A06.
- `npm run smoke:design`: abuso da API e das restrições do banco em execução.
- Migração `004_secure_business_invariants.sql`: controles independentes da API.

## Processo para novas funcionalidades

Antes de implementar um fluxo novo:

1. registrar ativo, agente, fronteira e caso de abuso no modelo de ameaças;
2. definir estados, transições, limites temporais e comportamento concorrente;
3. colocar regras críticas também no banco quando tecnicamente possível;
4. criar teste do caminho permitido e do abuso;
5. revisar autorização, auditoria, falhas e retenção antes da entrega.
