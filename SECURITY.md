# Segurança do ClinicalMed

## Modelo de autorização

- Paciente: acessa somente consultas, exames, prescrições e prontuários associados ao próprio `paciente_id`.
- Médico: acessa e altera somente registros associados ao próprio `medico_id`.
- Secretário: executa rotinas administrativas. Não cria, altera ou consulta conteúdo de prontuários e prescrições.
- Contas de médico e secretário somente podem ser criadas por um secretário autenticado.

As verificações são executadas no backend e não dependem das restrições visuais do frontend.

## Sessão

A autenticação utiliza JWT de curta duração em cookie `HttpOnly`, `SameSite=Strict` e `Secure` em produção. O backend consulta o usuário atual a cada requisição, rejeitando usuários inexistentes, inativos ou com perfil alterado.

## Implantação obrigatória

1. Use HTTPS no proxy ou balanceador e configure `NODE_ENV=production`, `TRUST_PROXY=1` (ajuste ao número exato de proxies), `DB_SSL=true` e `DB_SSL_REJECT_UNAUTHORIZED=true`. Nunca use `TRUST_PROXY=true`.
2. Gere `JWT_SECRET`, `DATA_ENCRYPTION_KEY` e `DATA_INDEX_KEY` separadamente,
   com um gerador criptográfico. Armazene-os em cofre de segredos.
3. Execute `backend/database/create_app_role.sql` com `psql` e configure `DB_USER=clinicalmed_app`.
4. Compile o frontend com `VITE_API_URL=/api` e publique-o usando as regras de `frontend/nginx.conf`, ou replique exatamente os mesmos headers no proxy/CDN escolhido.
5. Armazene segredos em um cofre de segredos; nunca no Git.
6. Use volume ou serviço PostgreSQL com criptografia de disco e backups criptografados.
7. Centralize os logs JSON e encaminhe `security_alert_raised` ao plantão,
   priorizando severidades HIGH e CRITICAL.
8. Não registre senhas, tokens, CPF, diagnóstico, resultado de exames ou conteúdo de prontuários.

## Verificações

- Backend: `npm run check`, `npm test`, `npm run smoke:config`, `npm run smoke:security` e `npm audit --omit=dev`.
- Frontend: `npm run lint`, `npm run build` e `npm run audit:prod`.
- Banco: `npm run migrate`.
- Criptografia: `npm run check:crypto`.
- Injeção: `npm run check:injection` e, com o sistema local em execução,
  `npm run smoke:injection`.
- Design seguro: `npm run check:design` e, com o sistema local em execução,
  `npm run smoke:design`.
- Autenticação: `npm run check:authentication` e, com o sistema local em
  execução, `npm run smoke:authentication`.
- Integridade: `npm run check:integrity`, `npm run migrate` e
  `npm run smoke:integrity`.
- Logging e alertas: `npm run check:logging` e `npm run smoke:logging`.
- Condições excepcionais: `npm run check:exceptions` e
  `npm run smoke:exceptions`.
- Cadeia de suprimentos: `npm run check:supply-chain` e `npm run audit` na raiz.

Os inventários CycloneDX ficam em `reports/sbom`. O procedimento de atualização,
os prazos e os controles externos estão em `docs/SUPPLY_CHAIN_SECURITY.md`.
O inventário de campos protegidos e o procedimento de rotação ficam em
`docs/CRYPTOGRAPHY_AND_KEY_MANAGEMENT.md`.
Os interpretadores avaliados, as regras de validação e os testes A05 ficam em
`docs/INJECTION_SECURITY.md`.
As invariantes, máquinas de estado e casos de abuso da A06 ficam em
`docs/SECURE_DESIGN.md` e `docs/THREAT_MODEL.md`.
MFA, política de senha, recuperação e ciclo de vida de sessões da A07 ficam em
`docs/AUTHENTICATION_SECURITY.md`.
Os eventos, limiares, severidades e playbooks da A09 ficam em
`docs/SECURITY_LOGGING_AND_ALERTING.md`.
Os status seguros, timeouts, rollback e ciclo de vida da A10 ficam em
`docs/EXCEPTION_HANDLING_SECURITY.md`.
