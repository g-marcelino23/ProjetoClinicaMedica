# ClinicalMed — análise além do OWASP Top 10

Data: 29 de julho de 2026  
Ferramenta: OWASP ZAP 2.17.0  
Escopo: ambiente local e banco exclusivamente de testes

## 1. Resumo executivo

A varredura do ClinicalMed não confirmou vulnerabilidades de severidade baixa,
média ou alta nos hosts da aplicação.

| Resultado no escopo | Quantidade |
| --- | ---: |
| Alertas altos | 0 |
| Alertas médios | 0 |
| Alertas baixos | 0 |
| Alertas informativos | 651 |
| Varreduras ativas concluídas | 13 |
| Requisições das varreduras ativas | 23.409 |
| Mensagens HTTP observadas na API | 23.734 |
| Mensagens HTTP observadas no frontend compilado | 615 |

Os 651 alertas informativos são:

- 648 ocorrências de `User Agent Fuzzer`. O ZAP apenas constatou diferenças de
  resposta ao variar o navegador declarado. Não apresentou evidência, CWE ou
  exploração. As diferenças também foram influenciadas por sessão e rate limit.
- 3 ocorrências de `Modern Web Application`, informando que o frontend é uma
  aplicação React.

Nenhum desses alertas representa, isoladamente, uma vulnerabilidade explorável.

O navegador controlado pelo ZAP também acessou serviços de configuração da
Mozilla. Dois alertas médios de CORS e dois alertas baixos de cabeçalhos
pertenciam a esses serviços externos, e não ao ClinicalMed. Eles foram
classificados como fora do escopo e removidos do relatório final.

## 2. Metodologia e cobertura

Foram utilizados:

- spider tradicional;
- AJAX Spider com navegador controlado;
- passive scan;
- active scan;
- modelos JSON para operações de leitura e escrita;
- autenticação com MFA;
- sessões dos perfis `SECRETARIO`, `MEDICO` e `PACIENTE`;
- frontend compilado em `http://127.0.0.1:4173`;
- API em `http://127.0.0.1:3001`.

Foram exercitados autenticação, cadastro, MFA, troca de senha, pacientes,
médicos, agendas, consultas, exames, prontuários, prescrições, notificações,
fila de espera, dashboard, indicadores, relatórios e portal do paciente.

A regra ativa de DOM XSS do ZAP ficou presa no navegador, sem enviar requisições
ou produzir evidência, e ignorou o limite de tempo configurado. Ela foi
interrompida. O restante das regras ativas foi repetido e chegou a 100%. A
cobertura do lado cliente foi complementada pelo AJAX Spider, porém esse ponto
deve permanecer registrado como limitação da ferramenta.

## 3. Fragilidade técnica observada além dos alertas do ZAP

### 3.1 Disponibilidade sob tráfego automatizado

Durante o AJAX Spider, chamadas para `/auth/me` receberam temporariamente
`503 Service Unavailable`. O backend registrou `dependency_unavailable` e falhas
ao persistir eventos de monitoramento. O serviço recuperou-se posteriormente.

Além disso, o limite global de 1.000 requisições por IP em quinze minutos foi
esgotado pela varredura. Depois disso, inclusive tentativas legítimas de login
receberam `429` até o reinício do backend.

Isso demonstra dois riscos:

1. picos relativamente curtos podem comprometer simultaneamente aplicação,
   banco e monitoramento;
2. usuários de uma clínica que compartilham o mesmo IP público podem bloquear
   uns aos outros, porque a cota é compartilhada pelo endereço de origem.

Classificação sugerida: disponibilidade/CWE-400, prioridade média para o
ambiente atual e alta antes de uso clínico real.

Esse risco ficava fora do OWASP Top 10:2021. No OWASP Top 10:2025, ele também
pode se sobrepor à A10, pois a categoria passou a tratar limites de recursos e
condições excepcionais. Portanto, não deve ser apresentado como algo
exclusivamente fora da edição 2025.

Recomendações:

- aplicar cotas separadas por conta, rota e origem;
- usar armazenamento distribuído para rate limit em produção;
- evitar que uma única cota de IP bloqueie toda uma clínica atrás de NAT;
- configurar fila, backpressure e limites de concorrência no acesso ao banco;
- manter monitoramento em infraestrutura isolada da aplicação;
- executar testes de carga, estresse, soak e recuperação;
- definir e testar RTO, RPO e capacidade mínima.

## 4. Lacunas de privacidade e LGPD que o OWASP Top 10 e o ZAP não cobrem

Estas lacunas não são necessariamente falhas exploráveis. Elas são requisitos
de privacidade, governança e prestação de contas que não foram encontrados no
repositório. A conformidade definitiva depende do controlador, do encarregado,
da instituição de saúde e de assessoria jurídica.

### 4.1 Inventário do tratamento, finalidade e hipótese legal

Não foi encontrado um registro das operações de tratamento que associe cada
categoria de dado a:

- finalidade;
- hipótese legal;
- controlador, operador e eventuais suboperadores;
- destinatários e compartilhamentos;
- prazo de retenção;
- medidas de proteção;
- necessidade e proporcionalidade.

Dados de saúde podem ser tratados com base na tutela da saúde, entre outras
hipóteses previstas na LGPD. Portanto, o problema não é simplesmente a ausência
de uma caixa de consentimento. O sistema precisa registrar e demonstrar a
hipótese correta; consentimento deve ser utilizado e gerenciado apenas quando
for a hipótese aplicável.

Prioridade: alta.

### 4.2 Direitos do titular

O portal permite consultar algumas informações clínicas, mas não existe fluxo
formal para:

- confirmação do tratamento;
- acesso completo e exportação;
- correção;
- informação sobre compartilhamentos;
- anonimização, bloqueio ou eliminação quando cabíveis;
- portabilidade;
- revogação do consentimento quando ele for utilizado;
- acompanhamento de solicitação, prazo, decisão e justificativa;
- retenção por obrigação legal ou regulatória quando a eliminação não for
  possível.

Prioridade: alta.

### 4.3 Retenção, anonimização e descarte

Não foi encontrada uma política executável e centralizada de ciclo de vida dos
dados. A própria documentação informa que não existe exclusão automática para
eventos de segurança e que os prazos ainda devem ser definidos. Há também
registros clínicos cujo fluxo de negócio cancela ou inativa, mas não realiza
eliminação física.

Isso pode ser correto quando há obrigação legal de guarda, mas o sistema deve
distinguir:

- dado em uso;
- dado sob retenção obrigatória;
- bloqueio ou legal hold;
- anonimização;
- eliminação;
- descarte das cópias e dos backups.

Prioridade: alta.

### 4.4 Gestão e comunicação de incidentes

O ClinicalMed possui logs estruturados e regras de alerta, o que é um controle
positivo. Não foi encontrado, porém, um processo completo para:

- registrar e classificar um incidente com dados pessoais;
- identificar categorias de dados e titulares atingidos;
- avaliar risco ou dano relevante;
- documentar decisões e medidas de contenção;
- controlar a comunicação à ANPD e aos titulares;
- preservar o registro do incidente pelo período regulamentar;
- executar exercícios de resposta.

A Resolução CD/ANPD nº 15/2024 prevê comunicação à ANPD e aos titulares em três
dias úteis quando o incidente puder ocasionar risco ou dano relevante, além da
manutenção do registro de incidentes por pelo menos cinco anos.

Prioridade: alta.

### 4.5 Backup, restauração e continuidade clínica

A documentação reconhece que criptografia dos volumes e backups, retenção de
backups e testes de restauração dependem da infraestrutura. Não há evidência
local de:

- backup criptografado e imutável;
- restauração testada;
- segregação de credenciais e chaves;
- retenção e descarte das cópias;
- plano de continuidade;
- RTO e RPO aprovados para a clínica.

Para um sistema médico, disponibilidade e recuperação são proteção de dados e
segurança do atendimento, mesmo quando nenhuma vulnerabilidade web tradicional
é encontrada.

Prioridade: alta antes de produção.

### 4.6 Minimização e privacidade por padrão

O ZAP verifica se uma resposta pode ser atacada, mas não sabe se cada campo
retornado é realmente necessário para a tarefa do usuário. É necessário mapear
por tela, endpoint e perfil:

- campos estritamente necessários;
- finalidade de cada acesso;
- exportações e relatórios;
- uso secundário para pesquisa ou indicadores;
- compartilhamentos;
- mascaramento e pseudonimização;
- acesso emergencial e sua revisão posterior.

Esse trabalho deve alimentar um Relatório de Impacto à Proteção de Dados
Pessoais (RIPD).

Prioridade: alta para governança; a existência de exposição excessiva precisa
ser confirmada com os requisitos da instituição.

## 5. Por que olhar além do OWASP Top 10

O OWASP Top 10 é uma lista de conscientização sobre famílias frequentes de
riscos de aplicações web. Ele não é:

- uma certificação;
- uma lista completa de vulnerabilidades;
- um programa de privacidade;
- um inventário de tratamento;
- um plano de continuidade;
- um procedimento de direitos do titular;
- uma demonstração automática de conformidade com a LGPD.

O OWASP ASVS amplia a verificação para áreas como proteção de dados, lógica de
negócio, arquitetura, APIs e configuração. Mesmo o ASVS deve ser combinado com
governança e requisitos legais.

O resultado do ClinicalMed ilustra diretamente a hipótese do TCC: é possível
não ter alertas técnicos baixos, médios ou altos no ZAP e ainda assim faltar
trabalho essencial para que um sistema médico demonstre segurança, privacidade,
continuidade e conformidade com a LGPD.

## 6. Plano recomendado

1. Elaborar inventário de dados e RIPD.
2. Definir finalidades, hipóteses legais, compartilhamentos e responsáveis.
3. Implementar módulo auditável de solicitações dos titulares.
4. Criar política executável de retenção, legal hold, anonimização e descarte.
5. Formalizar resposta a incidentes e executar simulações.
6. Implementar e testar backup, restauração e continuidade.
7. Corrigir o risco de indisponibilidade e validar capacidade.
8. Adotar o OWASP ASVS, preferencialmente nível 2, como lista técnica ampliada.
9. Repetir SAST, SCA, DAST autenticado, testes de lógica de negócio e teste de
   intrusão independente antes da produção.

## 7. Referências

- Lei nº 13.709/2018 — LGPD:
  https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm
- Direitos dos titulares — ANPD:
  https://www.gov.br/anpd/pt-br/assuntos/titular-de-dados-1/direito-dos-titulares
- Relatório de Impacto à Proteção de Dados Pessoais — ANPD:
  https://www.gov.br/anpd/pt-br/canais_atendimento/agente-de-tratamento/relatorio-de-impacto-a-protecao-de-dados-pessoais-ripd
- Comunicação de incidente de segurança — ANPD:
  https://www.gov.br/anpd/pt-br/canais_atendimento/agente-de-tratamento/comunicado-de-incidente-de-seguranca-cis
- OWASP ASVS:
  https://devguide.owasp.org/en/03-requirements/05-asvs/

## 8. Limitações

- O teste ocorreu em ambiente local, sem TLS, WAF, balanceador, CDN ou
  infraestrutura de produção.
- Não foi realizado teste externo independente.
- Não foram avaliados contratos, treinamento, fornecedores, prontuários
  físicos ou procedimentos internos da clínica.
- DAST não prova ausência de vulnerabilidades.
- A regra ativa de DOM XSS apresentou falha operacional, conforme descrito.
