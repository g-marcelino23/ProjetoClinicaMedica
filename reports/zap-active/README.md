# Varredura ativa A05

- Ferramenta: OWASP ZAP 2.17.0
- Data: 28/07/2026
- Alvo público: `http://127.0.0.1:3001/health`
- Resultado: zero alertas altos, médios, baixos ou informativos.
- Relatório: `clinicalmed-zap-a05-2026-07-28.html`

O quick scan público não representa cobertura autenticada das rotas de paciente,
médico e secretário. Essas rotas foram exercitadas separadamente pelo
`backend/scripts/injection-smoke.js`, com sete payloads hostis e quatro consultas
válidas. Um DAST autenticado deve ser repetido no ambiente publicado.
