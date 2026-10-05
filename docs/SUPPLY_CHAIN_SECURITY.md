# Segurança da cadeia de suprimentos

**Última verificação:** 05/10/2026 — auditorias completas de backend e frontend
sem vulnerabilidades conhecidas no registro npm.

## Inventário reproduzível

- O runtime é fixado em Node.js 24.14.0 por `.nvmrc` e pelos campos `engines`.
- O npm é fixado em 11.9.0 por `packageManager`.
- Dependências diretas usam versões exatas.
- Os três lockfiles usam o formato v3 e registram URL e hash de integridade das
  dependências transitivas.
- `node_modules` não é versionado nem deve ser incluído em artefatos.
- Pacotes são obtidos somente do registro oficial por HTTPS com validação TLS.

## Instalação e build

O CI utiliza `npm ci --ignore-scripts`. No backend, apenas o script nativo do
`bcrypt` é executado posteriormente e de forma explícita:

```text
npm ci --ignore-scripts
npm rebuild bcrypt --ignore-scripts=false
```

O frontend não autoriza scripts de instalação. O mesmo artefato aprovado deve
ser promovido entre ambientes; produção não deve reconstruir dependências.

## Verificação contínua

- `npm audit --audit-level=low` analisa dependências de produção e de build.
- Dependabot verifica npm e GitHub Actions semanalmente.
- O workflow também executa semanalmente, em pushes e pull requests.
- GitHub Actions de terceiros são referenciadas por SHA completo.
- `npm run check:supply-chain` verifica manifests, lockfiles, hashes, workflow e
  ausência de `node_modules` rastreado.
- SBOMs CycloneDX 1.5 do backend e frontend são gerados pelo CI e retidos como
  artefatos por 30 dias.

O desenvolvimento do backend usa `node --watch`, disponível no runtime fixado,
evitando uma dependência adicional de monitoramento de arquivos.

## Processo de atualização

1. Confirmar a origem oficial, manutenção e aviso de segurança.
2. Atualizar deliberadamente o manifest e o lockfile.
3. Revisar mudanças diretas e transitivas.
4. Executar auditoria, testes, lint e build.
5. Validar login e rotas principais em navegador.
6. Aprovar por pull request antes de promover o artefato.

Vulnerabilidades críticas ou altas devem ser triadas imediatamente e corrigidas
em até 72 horas quando houver versão segura. Moderadas devem ser tratadas em até
30 dias. Exceções exigem justificativa, controles compensatórios, responsável e
data de expiração.

## Controles externos do repositório

No provedor Git, habilite MFA, proteção da branch principal, revisão obrigatória,
checks obrigatórios, bloqueio de force-push, secret scanning e permissões de
menor privilégio. Esses controles não podem ser impostos apenas pelos arquivos
do repositório.
