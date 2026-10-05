# Criptografia e gestão de chaves

## Escopo

O ClinicalMed protege no nível da aplicação os identificadores pessoais e o
conteúdo clínico armazenado no PostgreSQL. Isso inclui CPF, data de nascimento,
telefones, endereço, convênio, número de convênio, motivo e observações de
consultas, prontuários, prescrições, exames, notificações e observações de
agenda.

Nomes e e-mails permanecem disponíveis ao banco porque são usados na
autenticação, ordenação e associação dos registros. A infraestrutura deve
complementar a proteção da aplicação com criptografia de disco, banco e backups.

## Construção criptográfica

- Algoritmo: AES-256-GCM, fornecido pelo módulo criptográfico nativo do Node.js.
- Nonce/IV: 96 bits aleatórios e exclusivos por gravação.
- Tag de autenticação: 128 bits.
- Contexto autenticado (AAD): nome lógico do campo.
- Formato versionado: `cmenc.v1.<id-da-chave>.<iv>.<tag>.<conteúdo>`.
- CPF: valor cifrado com IV aleatório e índice cego HMAC-SHA-256 separado para
  garantir unicidade sem permitir consulta pelo documento em texto puro.
- Senhas: hash bcrypt não reversível com custo 12 para novos hashes. Hashes
  antigos com custo 10 ou 11 são atualizados automaticamente após autenticação
  válida.

O banco possui restrições `CHECK` que recusam novas gravações em texto puro nos
26 campos protegidos. As migrações `002_application_data_encryption.js` e
`003_additional_personal_data_encryption.js` convertem os dados já existentes em
transações.

## Segredos obrigatórios

- `JWT_SECRET`: segredo aleatório com no mínimo 256 bits.
- `DATA_ENCRYPTION_KEY_ID`: identificador público da chave ativa.
- `DATA_ENCRYPTION_KEY`: chave AES ativa com 32 bytes em base64url.
- `DATA_ENCRYPTION_PREVIOUS_KEYS`: chaves antigas apenas durante a rotação, no
  formato `id:chave,id:chave`.
- `DATA_INDEX_KEY`: chave separada de 32 bytes para índices cegos.

As chaves devem ser geradas separadamente com um gerador criptográfico e
armazenadas em KMS, HSM ou cofre de segredos. Elas não devem ser colocadas no
Git, em imagens de contêiner, logs, SBOMs ou artefatos de CI.

## Rotação

1. Faça um backup criptografado e teste a restauração.
2. Mova a chave AES atual para `DATA_ENCRYPTION_PREVIOUS_KEYS`.
3. Gere outra chave AES e outro identificador, tornando-os ativos.
4. Para rotacionar também o índice cego, gere uma nova `DATA_INDEX_KEY`.
5. Reinicie uma instância controlada da API e execute
   `npm run rotate:data-key`.
6. Execute `npm run check:crypto` e os testes integrados.
7. Mantenha a chave anterior disponível enquanto existirem backups ou réplicas
   que dependam dela. Remova-a somente após o prazo de retenção.

O processo é transacional: qualquer falha reverte toda a rotação.

## Controles dependentes da infraestrutura

- HTTPS público com TLS 1.2 ou 1.3 e certificado válido.
- Conexão PostgreSQL com `DB_SSL=true` e validação do certificado.
- Criptografia dos volumes, snapshots e backups.
- Cofre de segredos com acesso mínimo, auditoria e rotação.
- Política de retenção e descarte seguro dos backups.

Esses controles devem ser comprovados no ambiente de publicação; eles não podem
ser garantidos apenas pelo código-fonte.
