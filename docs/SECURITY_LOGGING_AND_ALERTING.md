# Logging e alertas de segurança — A09:2025

**Revisão:** 28/07/2026  
**Referência:** [OWASP A09:2025 — Security Logging and Alerting Failures](https://owasp.org/Top10/2025/A09_2025-Security_Logging_and_Alerting_Failures/)

## Arquitetura

Cada evento possui data UTC, versão do schema, serviço, nível, tipo, request ID,
rota, método, status e contexto mínimo. O formato JSON em uma única linha pode
ser consumido por coletores de logs.

O evento é enviado simultaneamente para:

1. saída estruturada do processo, destinada ao coletor da infraestrutura;
2. tabela `security_events`, que funciona como trilha local append-only;
3. mecanismo de correlação, que abre ou atualiza `security_alerts`.

O frontend não possui rota para consultar eventos ou alertas. O acesso
operacional deve usar uma identidade de monitoramento separada.

## Eventos cobertos

- sucesso e falha de autenticação;
- falha de MFA e de reautenticação para troca de senha;
- troca de senha;
- 401, 403, 404 e 429;
- rejeição de CORS e CSRF;
- falha de validação de entrada, sem copiar o payload;
- mutações autenticadas;
- leitura autenticada de consultas, pacientes, exames, prescrições,
  prontuários e portal do paciente;
- erros não tratados e falhas de integridade AES-GCM;
- falha ao persistir a trilha de auditoria.

## Privacidade e resistência à injeção

- Senha, cookie, autorização, token, segredo MFA, código de recuperação, CPF,
  e-mail, telefone, endereço e conteúdo clínico são redigidos recursivamente.
- Caracteres de controle, quebras de linha Unicode e CR/LF são neutralizados.
- Strings, arrays, objetos, profundidade e quantidade de chaves são limitados.
- O endereço de origem não é persistido diretamente. Um HMAC-SHA-256 permite
  correlação sem revelar o endereço.
- O corpo da requisição nunca é incluído nos eventos.

## Integridade e acesso

`security_events` aceita somente inserções. UPDATE e DELETE são impedidos por
privilégios e por trigger. A conta `clinicalmed_app` não pode alterar ou apagar a
trilha. Os alertas não podem ser apagados pela aplicação, e ela só atualiza os
campos necessários à correlação; o estado do incidente exige outra identidade.

Não existe exclusão automática. O prazo de retenção e o arquivamento externo
devem ser definidos com o responsável legal e de segurança antes do uso real.

## Regras e limiares

| Detecção | Limiar | Janela | Severidade |
| --- | ---: | ---: | --- |
| Falha de login | 5 | 10 min | HIGH |
| Falha de MFA | 3 | 10 min | HIGH |
| Falha de reautenticação de senha | 3 | 10 min | HIGH |
| Acesso negado | 5 | 5 min | HIGH |
| Entrada inválida | 10 | 5 min | MEDIUM |
| Rotas inexistentes | 20 | 5 min | MEDIUM |
| Origem CORS rejeitada | 3 | 5 min | MEDIUM |
| Tentativa CSRF | 1 | 5 min | HIGH |
| Rate limit de login, MFA, cadastro ou API | 1 | 15–60 min | HIGH |
| Erro não tratado | 3 | 5 min | HIGH |
| Falha de integridade clínica | 1 | 60 min | CRITICAL |
| Perfil de autenticação inconsistente | 1 | 60 min | CRITICAL |
| Falha de persistência de auditoria | 1 | 5 min | CRITICAL |
| Dependência indisponível | 1 | 5 min | HIGH |
| Falha do rollback | 1 | 60 min | CRITICAL |
| Conflitos transacionais repetidos | 5 | 5 min | MEDIUM |

Alertas iguais ficam agrupados por HMAC de origem, conta ou rota. O cooldown
evita notificações repetidas durante 15 minutos; alertas críticos de integridade
usam uma hora. A contagem continua sendo atualizada.

## Playbooks

### CRITICAL — resposta inicial em até 15 minutos

1. Confirmar o alerta em `security_alerts` e preservar request IDs.
2. Restringir alterações no sistema e proteger cópias dos eventos.
3. Para integridade clínica, retirar o registro afetado de uso até validar a
   origem e o backup confiável.
4. Para falha da auditoria, restaurar o coletor ou banco antes de retomar
   operações não essenciais.
5. Acionar o responsável de segurança e avaliar notificação legal.

### HIGH — triagem em até 30 minutos

1. Correlacionar origem, conta, rota e horário.
2. Bloquear a origem no proxy quando confirmado abuso.
3. Revogar sessões e exigir redefinição de credenciais quando uma conta estiver
   envolvida.
4. Preservar eventos e verificar acessos clínicos posteriores.

### MEDIUM — triagem em até quatro horas

1. Distinguir erro legítimo de enumeração, scanner ou payload malicioso.
2. Promover para HIGH se houver aumento de frequência, múltiplas rotas ou acesso
   negado associado.
3. Ajustar o limiar somente com evidência, documentando falsos positivos.

## Verificação

```text
npm --prefix backend run check:logging
npm --prefix backend test
npm --prefix backend run smoke:logging
```

O smoke test envia cinco falhas correlacionadas, confirma a criação de um alerta
HIGH, verifica a redação de senha e cookie e tenta adulterar a trilha.

## Responsabilidades da produção

- Enviar stdout e os alertas a um coletor externo com armazenamento separado.
- Configurar notificação de plantão para HIGH e CRITICAL.
- Sincronizar os relógios da API, banco, proxy e coletor.
- Criar uma identidade SOC de somente leitura, com procedimento separado para
  reconhecer ou resolver alertas.
- Testar periodicamente os alertas com ZAP e exercícios de resposta.
- Definir retenção, backup imutável e processo formal de resposta a incidentes.
