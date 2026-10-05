# Segurança de autenticação e sessão

**Categoria:** OWASP Top 10:2025 A07 – Authentication Failures  
**Revisão:** 28/07/2026

## Fluxo de autenticação

1. O usuário informa e-mail e senha.
2. A senha é comparada com bcrypt, inclusive usando hash fictício quando a conta
   não existe para reduzir enumeração temporal.
3. Todos os perfis devem configurar ou validar TOTP em aplicativo autenticador.
4. Somente após o segundo fator o servidor cria uma sessão revogável.
5. O identificador assinado fica exclusivamente em cookie `HttpOnly`,
   `SameSite=Strict`, `Secure` em produção e com prefixo `__Host-`.

O token valida algoritmo, emissor, audiência, assunto e identificador de sessão.
Bearer token não é aceito pelo aplicativo web.

## MFA e recuperação

- MFA é obrigatório para paciente, médico e secretário.
- No primeiro login, o sistema apresenta uma chave TOTP para cadastro no
  autenticador.
- O código tem seis dígitos, período de 30 segundos e tolerância de um período
  para diferença de relógio.
- Um contador TOTP aceito não pode ser reutilizado.
- O usuário recebe dez códigos de recuperação aleatórios.
- Cada código de recuperação é armazenado somente como HMAC e pode ser usado uma
  vez.
- Cinco erros invalidam o desafio de MFA; o desafio expira em cinco minutos.

O relógio do servidor e dos dispositivos deve permanecer sincronizado. Os códigos
de recuperação devem ser guardados fora do dispositivo que contém o autenticador.

## Sessões

| Controle | Configuração local padrão |
| --- | --- |
| Expiração absoluta | 15 minutos |
| Expiração por inatividade | 5 minutos |
| Sessões simultâneas | Máximo de 3 |
| Logout | Revogação no banco e remoção do cookie |
| Troca de senha | Revoga todas as sessões |
| Usuário desativado | Sessão recusada imediatamente |

A tabela `auth_sessions` é consultada em todas as requisições autenticadas. Um JWT
copiado deixa de funcionar após logout, inatividade, expiração, troca de senha,
desativação da conta ou revogação por excesso de sessões.

## Senhas e automação

- Novas senhas aceitam frases e exigem de 15 a 72 caracteres.
- Não há exigência artificial de maiúscula, número ou símbolo.
- Senhas comuns, repetitivas ou contendo nome, e-mail ou o nome do sistema são
  recusadas.
- O hash usa bcrypt com custo 12 e hashes antigos são atualizados após login.
- Tentativas incorretas são registradas por conta com espera crescente, limitada
  a 15 minutos.
- Há também limite por origem para login, MFA e cadastro.
- Login e cadastro público usam respostas que não revelam se a conta já existe.
- O seed exige `DEMO_PASSWORD` fora do código e recusa execução em produção.

## Alteração e recuperação de credenciais

A alteração de senha exige a senha atual, aplica novamente a política e encerra
todas as sessões. O sistema não oferece “esqueci minha senha” porque ainda não
possui canal de e-mail ou outro meio verificado. Criar uma recuperação local,
pergunta secreta ou senha provisória seria menos seguro; esse recurso só deve ser
adicionado com token aleatório de uso único, expiração curta, resposta genérica e
canal previamente verificado.

## Verificação

- `npm test`
- `npm run check:authentication`
- `npm run smoke:authentication` com a API local em execução

O teste integrado confirma enumeração uniforme, inscrição em MFA, rejeição de
replay TOTP, uso único de recuperação, ausência de Bearer alternativo, timeout de
inatividade, revogação no logout, revogação após troca de senha e espera
progressiva da conta.
