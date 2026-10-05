# Prevenção de injeção

## Superfícies avaliadas

O ClinicalMed utiliza PostgreSQL como interpretador de dados no backend e React
no navegador. O código de execução da aplicação não usa shell, `child_process`,
`eval`, `new Function`, LDAP, XPath, mecanismos de template executável ou APIs
de HTML bruto.

Foram avaliadas entradas provenientes de corpo JSON, parâmetros de rota,
query string, cookies e headers.

## Controles implementados

1. Toda entrada utilizada em consultas passa por parâmetros posicionais do
   PostgreSQL (`$1`, `$2` etc.). Valores do usuário não são concatenados ao SQL.
2. Identificadores são convertidos e validados como inteiros positivos.
3. Status são listas fechadas (`enum`) e datas aceitam somente o formato ISO.
4. Intervalos recusam data final anterior à inicial.
5. Campos desconhecidos no corpo, rota ou query string são rejeitados.
6. Caracteres nulos e controles invisíveis perigosos são recusados.
7. Relatórios e indicadores utilizam consultas fixas com filtros opcionais
   parametrizados; não existe montagem dinâmica desses comandos.
8. Fragmentos estruturais restantes são selecionados exclusivamente a partir
   do perfil autenticado no servidor e nunca derivam da requisição.
9. O identificador `X-Request-ID` aceita apenas caracteres e tamanho
   predefinidos; valores hostis são substituídos por UUID criptográfico.
10. O frontend usa o escape contextual padrão do React e não contém
    `dangerouslySetInnerHTML`, atribuição a `innerHTML` ou `document.write`.
11. A CSP de produção continua bloqueando scripts inline como defesa adicional
    contra XSS.
12. A conta `clinicalmed_app` mantém privilégios limitados e não é
    superusuária.

Textos clínicos podem conter símbolos SQL ou HTML legítimos. Eles são tratados
como dados, enviados por parâmetros, criptografados no armazenamento e
renderizados pelo React como texto. Não é utilizada uma lista de palavras
proibidas como defesa principal.

## Verificação

Execute no backend:

```text
npm test
npm run check:injection
npm run smoke:injection
```

O teste estático falha se forem introduzidos interpretadores perigosos,
interpolação direta da requisição em templates, consultas montadas por
concatenação ou sinks de HTML bruto.

O teste integrado envia payloads de SQL injection, parâmetros inesperados,
identificadores maliciosos, XSS armazenado e header hostil. Ele confirma também
que consultas válidas continuam funcionando e que a quantidade de usuários no
banco não foi alterada.

O `smoke:injection` precisa do backend e do banco de testes em execução. Em um
ambiente publicado, ele deve ser complementado por DAST autenticado e teste de
invasão independente.
