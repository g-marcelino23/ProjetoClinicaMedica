# ClinicalMed — varredura passiva OWASP ZAP

**Data:** 27/07/2026  
**ZAP:** 2.17.0  
**Modo:** passivo, sem Active Scan

## Escopo

- Frontend de desenvolvimento: `http://127.0.0.1:5173`
- Build local de produção: `http://127.0.0.1:4173`
- API: `http://127.0.0.1:3001`
- Navegação autenticada com os perfis paciente, médico e secretário

Foram registradas 120 mensagens HTTP. Foi executado um spider tradicional e
nenhum Active Scan.

## Resultado

| Risco | Instâncias | Tipos de alerta |
| --- | ---: | ---: |
| Alto | 0 | 0 |
| Médio | 52 | 2 |
| Baixo | 29 | 1 |
| Informativo | 28 | 2 |

### Alertas médios

1. **Content Security Policy (CSP) Header Not Set** — 26 instâncias.
2. **Missing Anti-clickjacking Header** — 26 instâncias.

Os dois alertas foram observados apenas no frontend servido pelo Vite, tanto em
desenvolvimento quanto no preview do build. A API não apresentou esses alertas,
pois já utiliza Helmet.

### Alerta baixo

1. **X-Content-Type-Options Header Missing** — 29 instâncias no frontend.

### Informativos

1. **Modern Web Application** — comportamento esperado para a SPA React.
2. **Session Management Response Identified** — detecção esperada das respostas
   de autenticação.

## Correção necessária

O servidor que publicar os arquivos estáticos do frontend deve enviar:

- uma política CSP compatível com a aplicação;
- `frame-ancestors 'none'` na CSP ou `X-Frame-Options: DENY`;
- `X-Content-Type-Options: nosniff`.

Esses controles devem ser configurados no proxy reverso, CDN ou servidor web
que hospedar o frontend. O servidor de desenvolvimento do Vite não representa
uma configuração final de produção.

## Limitações

Esta etapa não enviou payloads de ataque. Portanto, ela não valida SQL
Injection, XSS explorável, SSRF, command injection ou outras falhas que exigem
Active Scan. Regras de negócio e autorização também continuam dependendo dos
testes manuais e automatizados do projeto.

## Revalidação da A02

Após a configuração dos headers no frontend e o endurecimento da CSP, uma nova
varredura passiva foi executada em 27/07/2026 contra o build de produção em
`http://127.0.0.1:4173`.

| Risco | Instâncias |
| --- | ---: |
| Alto | 0 |
| Médio | 0 |
| Baixo | 0 |
| Informativo | 6 |

Os seis registros informativos são cinco identificações esperadas de uma
aplicação web moderna e um falso positivo de “comentário suspeito” dentro do
bundle minificado de uma dependência. Nenhum deles representa vulnerabilidade.

Relatórios:

- `output/clinicalmed-zap-passive-a02-2026-07-27.html`
- `output/clinicalmed-zap-passive-a02-2026-07-27.json`
