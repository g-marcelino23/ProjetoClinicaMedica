# Frontend do ClinicalMed

Aplicação React/Vite do ClinicalMed. As instruções completas de instalação,
configuração, banco de dados, execução e validação estão no `README.md` da raiz
do repositório.

Comandos locais:

```powershell
npm run dev
npm test
npm run lint
npm run build
npm run audit:prod
```

Para produção, defina `VITE_API_URL=/api` e preserve os headers e as regras de
roteamento de `nginx.conf` no proxy ou CDN escolhido.
