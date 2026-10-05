# ClinicalMed

Sistema web de gestão clínica com perfis de paciente, médico e secretário.
O projeto usa React/Vite no frontend, Express no backend e PostgreSQL para
persistência.

## Funcionalidades

- autenticação com senha, MFA TOTP, códigos de recuperação e sessões revogáveis;
- cadastro e administração de pacientes, médicos e secretários;
- agendas, consultas, check-in e lista de espera;
- exames, prontuários e prescrições com autorização por vínculo clínico;
- dashboard por perfil, indicadores e relatórios administrativos;
- criptografia de campos pessoais e clínicos, logs e alertas de segurança.

## Requisitos

- Node.js `24.14.x`;
- npm `11.x`;
- PostgreSQL com suporte à extensão `btree_gist`;
- uma conta administrativa para criar o banco e os papéis;
- uma conta de migração com permissão para criar e alterar objetos no banco.

## Instalação

Instale as dependências usando os lockfiles:

```powershell
npm ci
npm --prefix backend ci
npm --prefix frontend ci
```

Crie o banco `clinicalmed`. Em seguida, execute
`backend/database/create_app_role.sql` com uma conta administrativa do
PostgreSQL para criar a conta restrita `clinicalmed_app`.

Copie `backend/.env.example` para `backend/.env` e substitua todos os valores de
exemplo. `DB_USER` deve ser a conta `clinicalmed_app`; `DB_MIGRATION_USER` e
`DB_MIGRATION_PASSWORD` devem identificar a conta usada exclusivamente pelas
migrações.

As chaves podem ser geradas individualmente com:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

Depois aplique o esquema completo:

```powershell
npm --prefix backend run migrate
```

A migração `000_base_schema.sql` cria o banco funcional do zero. As migrações
seguintes aplicam criptografia, invariantes de negócio, autenticação forte,
logging e alertas. O executor registra SHA-256 e rejeita migrações já aplicadas
que tenham sido modificadas.

## Dados de demonstração

Defina uma senha exclusiva em `DEMO_PASSWORD`. Nunca reutilize uma senha real.
Para criar uma base fictícia determinística:

```powershell
npm --prefix backend run seed:demo
```

Para substituir somente dados anteriormente criados pelo seed:

```powershell
npm --prefix backend run seed:demo -- --reset
```

O seed é recusado quando `NODE_ENV=production`.

## Execução local

Em terminais separados:

```powershell
npm run dev:backend
npm run dev:frontend
```

Por padrão, a API usa `http://localhost:3001` e o Vite usa
`http://localhost:5173`. O backend disponibiliza `/health` para vivacidade e
`/ready` para prontidão com verificação do banco.

## Verificações

Validação principal:

```powershell
npm run check
npm run audit
npm run check:supply-chain
```

Com a API, o banco de homologação e os dados de demonstração em execução:

```powershell
npm --prefix backend run smoke:security
npm --prefix backend run smoke:config
npm --prefix backend run smoke:injection
npm --prefix backend run smoke:design
npm --prefix backend run smoke:authentication
npm --prefix backend run smoke:integrity
npm --prefix backend run smoke:logging
npm --prefix backend run smoke:exceptions
```

Os smoke tests alteram dados de demonstração e devem ser executados somente em
ambiente descartável ou de homologação.

## Produção

O frontend deve ser compilado com `VITE_API_URL=/api` e servido com as regras de
`frontend/nginx.conf`. A publicação exige HTTPS, proxy confiável explicitamente
configurado, TLS do PostgreSQL, segredos armazenados fora do repositório, backups
criptografados e encaminhamento dos alertas a um coletor externo.

Consulte `SECURITY.md` e a documentação em `docs/` antes de publicar ou utilizar
dados reais.
