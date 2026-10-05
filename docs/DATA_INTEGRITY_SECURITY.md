# Integridade de software e dados — A08:2025

**Revisão:** 05/10/2026  
**Referência:** [OWASP A08:2025 — Software or Data Integrity Failures](https://owasp.org/Top10/2025/A08_2025-Software_or_Data_Integrity_Failures/)

## Escopo

A A08 trata código ou dados não confiáveis que são aceitos como válidos sem
verificação de integridade. No ClinicalMed, as principais fronteiras analisadas
são as migrações de banco, dados clínicos cifrados, objetos recebidos pela API,
sessões assinadas e código carregado pelo navegador.

A segurança de dependências e da cadeia de fornecimento é detalhada
separadamente em `SUPPLY_CHAIN_SECURITY.md`, conforme a A03:2025.

## Migrações verificáveis

O comando `npm run migrate`:

1. aceita somente nomes no formato `NNN_nome.sql` ou `NNN_nome.js`;
2. recusa prefixos numéricos duplicados e caminhos fora do diretório;
3. calcula SHA-256 e tamanho antes de acessar o banco;
4. obtém um advisory lock exclusivo no PostgreSQL;
5. compara todos os arquivos aplicados com `schema_migrations`;
6. interrompe antes de aplicar novas mudanças se um arquivo foi alterado,
   removido ou possui hash inválido;
7. aplica cada migração em transação e registra hash e tamanho no mesmo commit;
8. exige uma conta exclusiva de migração;
9. remove da conta `clinicalmed_app` todo acesso ao histórico de migrações.

O inventário atual contém oito migrações verificadas. A migração
`000_base_schema.sql` permite construir o esquema funcional a partir de um banco
vazio; as demais aplicam os controles de segurança e correções evolutivas. Em
bancos anteriores, os arquivos já aplicados receberam baseline SHA-256
controlado. A partir desse baseline, qualquer alteração é detectada. As colunas
de hash e tamanho são obrigatórias e protegidas por constraints.

## Integridade dos dados críticos

- Campos pessoais e clínicos usam AES-256-GCM com IV aleatório, tag de
  autenticação e AAD vinculado ao nome do campo. Alteração do conteúdo, da tag ou
  do contexto impede a leitura.
- Restrições no PostgreSQL recusam dados sensíveis em texto puro, estados
  inexistentes, duplicidades e sobreposições clínicas.
- Exclusões clínicas destrutivas foram substituídas por estados e datas de
  cancelamento quando o histórico precisa ser preservado.
- Sessões usam JWT assinado com algoritmo, emissor e audiência fixos. O `jti`
  também precisa existir, estar ativo e não revogado no banco.

## Objetos e código não confiáveis

- O parser aceita somente JSON estrito e limita o corpo a 100 KB.
- Todos os objetos de entrada passam por schemas Zod. Campos não declarados são
  recusados, o que evita atribuição em massa.
- A aplicação não desserializa objetos nativos, não usa `eval` ou
  `new Function` e não executa campos recebidos do cliente.
- O HTML inicial não carrega scripts ou iframes de domínios externos. Os
  artefatos executáveis são empacotados localmente e protegidos também pela CSP.

## Verificação

```text
npm --prefix backend run check:integrity
npm --prefix backend test
npm --prefix backend run migrate
npm --prefix backend run smoke:integrity
```

O teste automatizado altera e remove migrações em um diretório temporário e
confirma que ambas são recusadas. O smoke test confere os hashes reais do banco,
as constraints dos metadados e a ausência de privilégios da conta da aplicação.

## Responsabilidades do ambiente publicado

- Habilitar MFA, revisão obrigatória, checks obrigatórios e proteção contra
  force-push na branch principal.
- Permitir que somente a identidade de implantação aprovada use as credenciais
  de migração.
- Promover o mesmo artefato verificado entre ambientes, sem reconstruí-lo em
  produção.
- Proteger backups, chaves e artefatos de release contra alteração.

Esses controles operacionais precisam ser comprovados no provedor escolhido; os
arquivos do projeto não conseguem impor sozinhos as permissões do repositório ou
da infraestrutura.
