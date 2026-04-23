# Contribuindo com o ACAD-SaaS

Obrigado pelo interesse! Algumas convenções:

## Setup

```bash
pnpm install
cp .env.example backend/.env  # preencher valores reais
pnpm dev                       # inicia backend + frontend
```

## Convenções de commit

Seguimos [Conventional Commits](https://www.conventionalcommits.org/) em português:

- `feat: adiciona endpoint X`
- `fix: corrige Y`
- `refactor: extrai Z`
- `docs: atualiza README`
- `chore: bump deps`
- `test: cobre caso W`

## Pull requests

- Base branch: `main` (ou `develop` em fase de features)
- Obrigatório: typecheck + test + build passando
- Descreva **o que** e **por quê**; prefira mudanças pequenas
- Inclua screenshots para mudanças de UI

## Padrões

- TypeScript `strict`
- Zod para validação de todas as entradas
- RLS habilitado em toda tabela nova
- Testes para todo caminho crítico
- Sem `console.log` em produção (usar `logger`)

## Segurança

Vulnerabilidades: `security@alpha.edu.br` (veja [security.txt](/.well-known/security.txt)).

## Privacidade

Qualquer novo dado pessoal precisa:
1. Base legal documentada
2. Incluído no endpoint `/api/me/export`
3. Coberto pela política de retenção
