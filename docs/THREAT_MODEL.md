# Modelo de ameaças do ClinicalMed

**Revisão:** 28/07/2026  
**Método:** ativos, fronteiras de confiança, STRIDE e casos de abuso  
**Referências:** [OWASP Threat Modeling](https://cheatsheetseries.owasp.org/cheatsheets/Threat_Modeling_Cheat_Sheet.html) e [OWASP A06:2025](https://owasp.org/Top10/2025/A06_2025-Insecure_Design/)

Este documento faz parte do ciclo de desenvolvimento. Ele deve ser revisto quando
um novo perfil, fluxo clínico, integração, armazenamento ou fronteira de confiança
for adicionado.

## Escopo e componentes

O escopo analisado compreende navegador, frontend React, API Express, PostgreSQL,
proxy de produção e pipeline de dependências. E-mail, SMS, convênios, laboratórios
externos e armazenamento de anexos não estão implementados e, portanto, não
integram o fluxo atual.

## Ativos protegidos

| Ativo | Impacto principal |
| --- | --- |
| Credenciais, sessão e chaves | Tomada de conta ou comprometimento sistêmico |
| CPF, contato, endereço e convênio | Privacidade, fraude e obrigação legal |
| Agenda e fila de espera | Indisponibilidade e fraude operacional |
| Consultas e check-in | Integridade do atendimento |
| Exames, prescrições e prontuários | Segurança do paciente, sigilo e integridade clínica |
| Logs de auditoria | Investigação e responsabilização |
| Migrações e metadados de esquema | Integridade do código executado no banco |

## Fronteiras de confiança

1. **Navegador → API:** toda entrada é não confiável, mesmo quando veio de uma
   tela controlada.
2. **API → PostgreSQL:** somente consultas parametrizadas e uma função de banco
   sem privilégios administrativos são aceitas.
3. **Perfil → recurso clínico:** o perfil é necessário, mas a propriedade pelo
   paciente ou médico também é verificada.
4. **Código → dependências/pipeline:** pacotes, Actions e artefatos de build são
   tratados como componentes externos.
5. **Aplicação → infraestrutura:** HTTPS, disco, backups, cofre de segredos e
   coleta de logs não são garantidos pelo código da aplicação.
6. **Implantação → PostgreSQL:** arquivos de migração são código privilegiado e
   precisam de autenticidade, integridade e identidade separada da aplicação.

## Ameaças STRIDE prioritárias

| Classe | Exemplo | Controle |
| --- | --- | --- |
| Spoofing | Reutilizar sessão ou enumerar usuário | Cookie protegido, validação do usuário ativo, resposta genérica e rate limit |
| Tampering | Alterar status clínico fora da sequência | Máquinas de estado no backend e restrições de estado no banco |
| Tampering | Modificar uma migração já aplicada | SHA-256 e tamanho persistidos no banco, verificados antes de qualquer nova migração |
| Repudiation | Negar uma alteração | Auditoria de operações mutáveis com usuário e request ID |
| Information disclosure | Trocar ID para ler prontuário alheio | Escopo por propriedade no SQL, criptografia de campo e erro sanitizado |
| Denial of service | Repetir login ou requisições em massa | Limites de requisição e payload |
| Elevation of privilege | Paciente criar conta de equipe | Autorização por perfil no backend |

## Casos de abuso e resposta de design

| Caso de abuso | Consequência | Controle verificável |
| --- | --- | --- |
| Dois pedidos reservam a mesma agenda simultaneamente | Dupla reserva | `FOR UPDATE` e unicidade de `agenda_id` |
| Médico recebe agendas parcialmente sobrepostas | Atendimento impossível | Restrição de exclusão GiST por médico e intervalo |
| Paciente marca consultas simultâneas com médicos distintos | Fraude ou inconsistência | Restrição de exclusão GiST por paciente para consultas ativas |
| Usuário agenda ou move horário para o passado | Estado impossível | Validação com relógio do banco |
| Paciente faz check-in dias antes ou depois | Falsificação de presença | Janela de 30 minutos antes e depois |
| Secretário conclui atendimento clínico | Elevação funcional | Somente o médico atribuído pode mudar para `REALIZADA` |
| Médico cria prontuário antes da consulta | Registro clínico falso | Consulta confirmada e horário iniciado são obrigatórios |
| Exame salta de solicitado para entregue | Resultado sem cadeia clínica | Transições explícitas e terminais irreversíveis |
| Item encerrado da fila volta a ativo | Quebra de ordem e duplicidade | Máquina de estados sob bloqueio transacional |
| Prescrição é excluída para apagar histórico | Perda de evidência clínica | Cancelamento lógico com data e estado |
| Cliente envia estado inexistente direto ao banco | Corrupção de dados | `CHECK constraints` para todos os estados |
| Duas entradas ativas equivalentes entram na fila | Duplicidade e favorecimento | Índice único parcial |
| Senha vazada é reutilizada por terceiro | Tomada de conta | MFA TOTP obrigatório e espera progressiva por conta |
| Código TOTP capturado é repetido | Bypass do segundo fator | Contador aceito uma única vez e desafio curto |
| Cookie copiado continua após logout | Sequestro de sessão | Sessão revogável consultada em toda requisição |
| Computador fica aberto sem logout | Acesso oportunista | Timeout por inatividade e expiração absoluta |
| Cadastro revela que um e-mail já existe | Enumeração de contas | Mesma resposta pública para sucesso e duplicidade |
| Troca de senha mantém dispositivos antigos conectados | Persistência do atacante | Revogação de todas as sessões |
| Migração aplicada é alterada ou removida do repositório | Código de banco divergente ou malicioso | Comparação integral SHA-256 antes de aplicar novas mudanças |
| Duas implantações executam migrações simultaneamente | Ordem parcial ou esquema inconsistente | Advisory lock exclusivo e transação por arquivo |
| Conta da API tenta encobrir alteração no histórico de esquema | Perda da evidência de integridade | `clinicalmed_app` sem privilégios sobre `schema_migrations` |
| Cliente adiciona propriedades privilegiadas a um objeto válido | Atribuição em massa | Schema por rota e rejeição explícita de campos extras |
| Atacante injeta quebra de linha em valor registrado | Evento falso ou corrupção do coletor | JSON de uma linha, neutralização de controles, limites e redação recursiva |
| Força bruta ocorre sem intervenção | Comprometimento prolongado | Correlação por origem ou conta, alerta HIGH e cooldown |
| Scanner enumera rotas e controles | Reconhecimento não detectado | Limiar para 404, validação, 403, CORS, CSRF e rate limit |
| Operador ou conta da API apaga eventos | Perda de evidência forense | Trilha append-only, trigger e ausência de UPDATE/DELETE |
| Alerta crítico fica sem resposta | Aumento do impacto | Severidade, prazo e playbook documentados |
| Banco cai durante autenticação | Decisão incorreta ou bypass | Resposta 503; sessão não é aceita sem consulta ao banco |
| Banco cai durante logout | Sessão parece revogada sem estar | Cookie removido, resposta de indisponibilidade e alerta; revogação não é declarada como concluída |
| Segunda etapa de uma transação falha | Estado clínico parcial | Rollback integral; falha do rollback é escalada como crítica |
| Atacante envia JSON quebrado ou corpo enorme | Crash, vazamento ou exaustão | Parser estrito, 100 KB, respostas 400/413 e log sem payload |
| Cliente mantém conexão lenta indefinidamente | Esgotamento de sockets | Timeouts de headers, requisição, socket e keep-alive |
| Exceção fatal deixa o processo em estado desconhecido | Corrupção ou bypass posterior | Encerramento gracioso com código 1 e reinício pelo orquestrador |

## Premissas e riscos residuais

- A hora oficial é a do PostgreSQL e o servidor deve estar configurado no fuso
  esperado pela instituição.
- TLS, criptografia de disco e backups dependem do ambiente de implantação.
- Logs precisam ser enviados a uma plataforma externa para alertas operacionais.
- Proteção da branch, revisão obrigatória e acesso à identidade de migração
  precisam ser configurados no provedor Git e na infraestrutura.
- É necessário executar teste dinâmico autenticado antes da publicação.
- Regras clínicas e prazos de retenção devem ser validados por responsável da
  instituição e assessoria jurídica antes de uso real.
