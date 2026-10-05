# Avaliação de aderência ao OWASP Top 10:2025

**Projeto:** ClinicalMed  
**Data da reavaliação:** 05/10/2026  
**Referência:** [OWASP Top 10:2025](https://owasp.org/www-project-top-ten/)

## Escopo e método

A avaliação incluiu revisão estática do backend e do frontend, análise das
dependências de produção, verificação da configuração do banco, testes
automatizados e testes integrados com os perfis paciente, médico e secretário.

Os status abaixo indicam aderência técnica observada no projeto. Eles não
substituem teste de invasão independente, varredura dinâmica em ambiente
publicado ou avaliação da infraestrutura de produção.

## Resultado por categoria

| Categoria | Status no projeto | Controles implementados |
| --- | --- | --- |
| **A01 – Broken Access Control** | Controlado | Autorização por perfil e por propriedade do recurso; consultas SQL limitadas ao paciente ou médico autenticado; prontuários e prescrições clínicas indisponíveis para secretário; cadastro público limitado a paciente; cadastro de equipe limitado a secretário. |
| **A02 – Security Misconfiguration** | Controlado no código e na publicação local | Headers rígidos na API e no frontend (CSP sem `unsafe-inline` em produção, `frame-ancestors 'none'`, `X-Frame-Options: DENY`, `nosniff`, política de permissões e `no-store`); CORS explícito; métodos desnecessários bloqueados; erros genéricos; source maps desativados; configuração Nginx reproduzível; produção falha ao iniciar sem HTTPS, proxy identificado, TLS do banco com certificado validado, credenciais fortes e origens HTTPS. |
| **A03 – Software Supply Chain Failures** | Controlado no código e no pipeline | Zero vulnerabilidades conhecidas na auditoria completa; React Router atualizado para 8.3.0; dependências sem uso removidas; versões, Node e npm fixados; lockfiles v3 com integridade; `node_modules` fora do Git; instalação do CI com scripts bloqueados e exceção explícita apenas para bcrypt; Actions fixadas por SHA; Dependabot semanal; SBOM CycloneDX automatizado e processo de atualização documentado. |
| **A04 – Cryptographic Failures** | Controlado no código e no banco local; infraestrutura deve ser verificada | Campos pessoais e clínicos cifrados com AES-256-GCM, IV aleatório, tag de autenticação, AAD e formato versionado; CPF com índice cego HMAC-SHA-256; 26 restrições no banco recusam texto puro; chaves separadas e processo transacional de rotação; senhas com bcrypt custo 12 e atualização gradual de hashes antigos; JWT com segredo aleatório mínimo de 256 bits e algoritmo fixo; cookie `HttpOnly`, `SameSite=Strict` e `Secure`; TLS do banco e HTTPS obrigatórios em produção. |
| **A05 – Injection** | Controlado | Validação central com Zod; campos inesperados, caracteres de controle, identificadores, enums, datas e intervalos inválidos são recusados; consultas de negócio parametrizadas; relatórios e indicadores usam SQL fixo; header de requisição limitado por allowlist; ausência de shell, avaliação dinâmica e sinks de HTML bruto; escape contextual do React e CSP rígida contra XSS. |
| **A06 – Insecure Design** | Controlado no código e no banco local | Modelo de ameaças com STRIDE e casos de abuso; requisitos e invariantes documentados; máquinas de estado por perfil para consultas, exames, fila e prescrições; limites temporais para agendamento, check-in, conclusão e falta; bloqueio transacional; restrições GiST contra sobreposição de agenda e de consultas do paciente; estados e duplicidades recusados pelo banco; cancelamento lógico de prescrição e preservação do histórico clínico. |
| **A07 – Authentication Failures** | Controlado no código e no banco local | MFA TOTP obrigatório para todos os perfis, dez códigos de recuperação de uso único, bloqueio de replay, desafios curtos, bcrypt custo 12, frase-senha de 15 a 72 caracteres e bloqueio de senhas comuns/contextuais; respostas uniformes contra enumeração; espera progressiva por conta e limites por origem; sessão revogável no banco com expiração absoluta, por inatividade e limite concorrente; JWT com algoritmo, emissor e audiência fixos somente em cookie protegido; logout e troca de senha revogam sessões. |
| **A08 – Software or Data Integrity Failures** | Controlado no código e no banco local | Migrações com inventário SHA-256, tamanho, nomes estritos, detecção de alteração ou remoção, transação e bloqueio contra concorrência; conta exclusiva de migração e histórico inacessível à aplicação; AES-256-GCM detecta adulteração de dados clínicos; JWT assinado e vinculado à sessão revogável; JSON estrito, schemas com rejeição de campos extras, ausência de desserialização nativa ou avaliação dinâmica e nenhum código executável externo no frontend. |
| **A09 – Security Logging and Alerting Failures** | Controlado no código e no banco local; integração externa deve ser configurada | Eventos JSON versionados para autenticação, autorização, validação, erros, mutações e leituras clínicas; redação recursiva de segredos e conteúdo clínico, neutralização contra log injection e origem correlacionada por HMAC; trilha `security_events` append-only; 19 regras com limiar, janela, severidade e cooldown; alertas persistidos em `security_alerts` e emitidos em tempo quase real; playbooks para MEDIUM, HIGH e CRITICAL. |
| **A10 – Mishandling of Exceptional Conditions** | Controlado no código e no ambiente local | Classificação central com mensagens públicas permitidas explicitamente; JSON quebrado, payload excedido, parâmetros ausentes/extras, conflitos, deadlocks, timeouts e dependências indisponíveis tratados de forma distinta; rollback seguro com escalonamento se a própria reversão falhar; autenticação e logout não ocultam falhas do banco; limites HTTP e PostgreSQL; readiness real; encerramento gracioso e saída fatal em exceção ou rejeição não capturada. |

## Evidências da reavaliação

- 84 arquivos JavaScript passaram na verificação de sintaxe.
- 55 testes automatizados de segurança, interface de acesso e regras de negócio passaram.
- O frontend passou no lint sem erros e compilou para produção.
- O smoke test da A02 confirmou oito headers, bloqueou quinze configurações
  inseguras de produção, sanitizou erros, recusou método desnecessário e não
  expôs arquivos ocultos.
- A revalidação passiva com OWASP ZAP 2.17.0 não encontrou alertas altos,
  médios ou baixos no frontend de produção.
- As auditorias completas do backend e frontend apresentaram zero
  vulnerabilidades conhecidas, incluindo dependências de desenvolvimento.
- O verificador da cadeia confirmou três manifests, seis Actions fixadas por
  SHA, integridade nos lockfiles, SBOM automatizado e zero `node_modules`
  rastreado.
- Backend e pacote raiz apresentaram zero vulnerabilidades na auditoria de
  dependências de produção.
- O teste integrado confirmou:
  - paciente limitado às próprias consultas;
  - médico limitado às consultas atribuídas a ele;
  - acesso do paciente a consulta alheia bloqueado;
  - paciente impedido de cadastrar usuário de equipe;
  - origem CORS não autorizada bloqueada;
  - cookie de sessão `HttpOnly` e `SameSite=Strict`;
  - aplicação conectada como `clinicalmed_app`, sem privilégios administrativos.
- A verificação da A04 confirmou os valores pessoais e clínicos cifrados, 203
  índices cegos de CPF, 26 bloqueios de texto puro no banco e zero hash abaixo do custo
  mínimo recomendado.
- A verificação da A05 analisou 87 arquivos de execução sem encontrar sinks de
  interpretadores perigosos, interpolação direta da requisição ou SQL concatenado.
  O teste integrado rejeitou sete payloads de injeção, aceitou quatro filtros
  válidos, manteve payload XSS como dado e preservou a quantidade de usuários.
- A verificação da A06 confirmou seis controles estruturais, bloqueou 11 casos de
  abuso pela API e aceitou quatro transições válidas. Três ataques diretos ao
  banco confirmaram a recusa de agendas sobrepostas, consultas simultâneas do
  mesmo paciente e estado inexistente. O cancelamento de prescrição preservou o
  registro e gravou a data do cancelamento.
- A verificação da A07 confirmou nove controles estruturais e, no teste
  integrado, demonstrou respostas equivalentes contra enumeração, MFA obrigatório,
  rejeição de replay TOTP, código de recuperação de uso único, recusa do caminho
  alternativo por Bearer, timeout por inatividade, revogação no logout, revogação
  após troca de senha e espera progressiva da conta.
- A verificação da A08 confirmou oito grupos de controles, registrou e conferiu
  o SHA-256 das oito migrações e recusou nos testes arquivos adulterados,
  removidos, mal nomeados ou com prefixos duplicados. O teste no PostgreSQL
  conferiu os seis hashes e duas constraints, além de provar que a conta
  `clinicalmed_app` não lê nem altera `schema_migrations`.
- A verificação da A09 confirmou logs JSON versionados, trilha append-only e 19
  regras de alerta. O teste integrado correlacionou cinco falhas de login, abriu
  um alerta HIGH, comprovou a redação de senha e cookie e recusou a tentativa de
  alterar um evento persistido.
- A verificação da A10 confirmou dez grupos de controles. O teste integrado
  recebeu cinco respostas excepcionais sem detalhes internos, comprovou que uma
  gravação parcial desapareceu após rollback e que timeout do PostgreSQL falha
  fechado como indisponibilidade temporária.
- A varredura pública com OWASP ZAP 2.17.0 terminou sem alertas altos, médios ou
  baixos. O relatório registrou somente a observação informativa `Modern Web
  Application`. A cobertura autenticada permaneceu a cargo dos testes
  integrados específicos; portanto, esse resultado não equivale a um pentest
  autenticado completo.
- Em 05/10/2026, as auditorias completas de backend e frontend voltaram a
  apresentar zero vulnerabilidades conhecidas após a atualização das
  dependências e a substituição do `nodemon` pelo modo `--watch` nativo do Node.
- Em 05/10/2026, um banco descartável foi criado do zero pelas oito migrações,
  recebeu dados fictícios e passou nos smoke tests de configuração, autorização
  dos três perfis, injeção, design, autenticação, integridade, logging e exceções.

## Pendências externas para a conclusão do TCC

1. Publicar atrás de HTTPS com certificado válido e redirecionamento obrigatório.
2. Confirmar criptografia de disco, banco e backups no provedor escolhido.
3. Habilitar MFA, revisão e checks obrigatórios, proteção da branch principal e
   bloqueio de force-push no provedor Git.
4. Enviar os logs a um coletor externo e configurar alertas para repetição de
   falhas de autenticação, respostas 403, 429 e erros 500.
5. Executar varredura dinâmica, por exemplo com OWASP ZAP, no ambiente publicado.
6. Realizar teste de invasão independente antes de uso com dados reais.
7. Executar testes de carga, estresse e indisponibilidade de dependências em
   homologação.

## Conclusão

Após as correções, o ClinicalMed apresenta controles de aplicação para as dez
categorias do OWASP Top 10:2025. A09 possui detecção e alertas locais, mas ainda
exige integração do coletor e do plantão operacional; A04 exige comprovação de
HTTPS, cofre de chaves e criptografia de volumes e backups na infraestrutura
publicada.
Por isso, a formulação tecnicamente adequada para o TCC é **“aderência técnica
verificada no código e no ambiente local”**, e não “certificação OWASP”.
