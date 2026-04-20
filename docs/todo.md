# 📋 SUPER TODO — ACAD-SaaS (Faculdade Alpha, Recife-PE)

> Plano de 7 dias para MVP de ERP Acadêmico + Secretaria Digital + Diploma Digital MEC.
> Stack: **Supabase + Render + Cloudflare + TypeScript + React**.
> Tenancy: **Single-tenant** (Faculdade Alpha).

---

## 🎯 Decisões fechadas
- [x] Backend em **TypeScript**
- [x] Frontend **Vite + React + TS + Tailwind**
- [x] **OpenTimestamps** como TSA MVP
- [x] Certificado **A1 self-signed OpenSSL** no MVP
- [x] **Single-tenant** (Faculdade Alpha, Recife-PE)
- [x] **Resend** como provider de e-mail
- [ ] Domínio a ser definido (Cloudflare DNS)

---

## 🏛️ FASE 0 — FUNDAÇÃO

- [x] Monorepo `/backend`, `/frontend`, `/database`, `/scripts`, `/docs`
- [x] `pnpm workspaces`
- [x] `.env.example` exaustivo
- [ ] Setup ESLint + Husky (prettier já, resto pendente)
- [x] GitHub Actions CI
- [x] `render.yaml`
- [x] Certificado A1 self-signed (`/scripts/gen-test-cert.sh`)

---

## 🗄️ DIA 1 — SUPABASE

- [x] 17 migrations (`001_extensions.sql` … `017_censo_enade.sql`)
- [x] RLS endurecida + `auth.has_role()`
- [x] Storage buckets (5)
- [x] Seeds (CONARQ, tipos requerimento, IES Alpha)

---

## 🔐 DIA 2 — RENDER: CORE API

- [x] `server.ts` + tsup
- [x] Módulos academico, secretaria, diplomas
- [x] helmet, cors, rate-limit, pino-http, compression
- [x] authMiddleware (JWT Supabase)
- [x] rbacMiddleware
- [x] errorHandler + classes
- [x] supabase admin/user libs
- [x] cryptoVault AES-256-GCM
- [x] `/health` + `/ready`
- [ ] idempotencyMiddleware
- [ ] OpenAPI 3.1

---

## 🎓 DIA 3 — ERP ACADÊMICO

- [x] CRUD cursos, matrizes, turmas, matrículas
- [x] Pré-requisitos (RPC)
- [x] Diário (frequências + notas em lote)
- [x] Fechamento de pauta
- [x] Workflow requerimentos
- [x] Histórico acadêmico compilado
- [ ] Endpoint export Censo/Enade

---

## 📜 DIA 4 — SECRETARIA DIGITAL

- [x] Upload com SHA-256/512 + temporalidade
- [x] Assinatura por e-mail (token + IP/UA)
- [x] Assinatura PFX A1 (@signpdf)
- [x] Cofre certificados (upload/rotação)
- [x] OpenTimestamps timestampService
- [x] `/documentos/:id/prova-existencia`
- [ ] UI de assinatura em lote

---

## 🎓 DIA 5 — DIPLOMA DIGITAL

- [x] `xmlMecBuilder.ts` (estrutura 554/2019)
- [x] `xmlSigningService.ts` (xml-crypto v6+)
- [x] Assinatura dupla (Emissora + Registradora)
- [x] `rvddService.ts` (PDF + QR Code + hash)
- [x] `POST /diplomas/emitir` (orquestrador)
- [x] `GET /diplomas/:id/rvdd` (signed URL 5min)
- [x] Upload XML + PDF pro Storage
- [x] Validador público `/public/validar/:numero`
- [ ] XSD oficial MEC + validação

---

## 🖥️ DIA 6 — FRONTEND

- [x] Vite + React + TS + Tailwind
- [x] Auth Supabase (magic link OTP)
- [x] Router com guards por role
- [x] Portal do Aluno (esqueleto)
- [x] Portal do Professor (esqueleto)
- [x] Portal Secretaria (esqueleto)
- [x] Portal Admin (esqueleto)
- [x] Validador Público (funcional)
- [ ] Preencher CRUDs nos portais
- [ ] Cloudflare DNS/SSL/WAF/Turnstile

---

## 🚀 DIA 7 — DEPLOY PROD

- [x] CI GitHub Actions (typecheck + test + build)
- [ ] Testes E2E Playwright
- [ ] Load test autocannon
- [ ] OWASP ZAP baseline
- [ ] Deploy Supabase prod
- [ ] Deploy Render
- [ ] Deploy Frontend Cloudflare Pages
- [ ] Emissão E2E de 1 diploma real
- [ ] Backup PITR
- [ ] Monitoramento (Uptime Kuma + Sentry)

---

## 🎯 DÉBITOS TÉCNICOS — todos resolvidos

- [x] DT-1..DT-7
