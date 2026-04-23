# 🎯 Plano de Ação & Roadmap — ACAD-SaaS

> **Dois sistemas-foco:**
> 1. **ACAD Web** — ERP acadêmico completo (gestão de faculdade)
> 2. **Diploma Digital & Assinatura Virtual** — emissão/assinatura/validação conforme **Portaria MEC 554/2019**, **Portaria 315/2018** (Secretaria Digital) e **MP 2.200-2/2001** (ICP-Brasil).

---

## 🚨 AÇÕES IMEDIATAS (fazer AGORA — nesta ordem)

### A. Corrigir build no Render (bloqueante)
- [ ] **A1.** No dashboard Render → serviço `acad-saas-api` → **Settings → Build Command**, trocar para:
  ```
  npm install -g pnpm@9.12.0 && pnpm install --frozen-lockfile && pnpm build
  ```
- [ ] **A2.** Confirmar **Start Command**: `pnpm start`
- [ ] **A3.** **Root Directory**: `backend`
- [ ] **A4.** **Environment → Node Version**: deixar vazio (usa `.nvmrc`=20) OU forçar `NODE_VERSION=20.11.1`
- [ ] **A5.** Clicar **Manual Deploy → Clear build cache & deploy**
- [ ] **A6.** Aguardar status `live` → testar `curl https://acad-saas-api.onrender.com/healthz`
- [ ] **A7.** Se ainda falhar, anexar log de build aqui para diagnóstico

### B. Validar API em produção
- [ ] **B1.** `GET /healthz` → `{ status: "ok" }`
- [ ] **B2.** `GET /public/validar/TESTE123` → 404 com JSON (comportamento correto)
- [ ] **B3.** `GET /api/me` sem token → 401 (auth ativa)

### C. Deploy do Frontend (Render Static Site)
- [ ] **C1.** New → **Static Site** → repo `vitoruk/acad-saas-alpha`
- [ ] **C2.** **Root Directory**: `frontend`
- [ ] **C3.** **Build Command**: `npm install -g pnpm@9.12.0 && pnpm install --frozen-lockfile && pnpm build`
- [ ] **C4.** **Publish Directory**: `dist`
- [ ] **C5.** **Environment**:
  - `VITE_API_URL=https://acad-saas-api.onrender.com`
  - `VITE_SUPABASE_URL=https://ratjzzinkzroadkfvspt.supabase.co`
  - `VITE_SUPABASE_ANON_KEY=<anon>`
- [ ] **C6.** **Rewrite Rule** (SPA): `/*` → `/index.html` (Status 200)
- [ ] **C7.** Validar: login com magic link → carregar portal

### D. Configurar CORS no backend para domínio Render
- [ ] **D1.** Adicionar env no API: `CORS_ORIGIN=https://acad-saas-frontend.onrender.com,http://localhost:5173`
- [ ] **D2.** Redeploy

### E. Primeiros dados reais
- [ ] **E1.** Criar conta super-admin via Supabase Auth (dashboard) com email `luanvitorus@gmail.com`
- [ ] **E2.** Atualizar `profiles` → `is_super_admin=true` via SQL
- [ ] **E3.** Criar 1 aluno teste, 1 professor teste, 1 turma, 1 disciplina, 1 matrícula
- [ ] **E4.** Logar em cada portal e validar renderização

---

## 📊 VISÃO MACRO — 10 Pilares

| # | Pilar | Nº de melhorias |
|---|---|---|
| 1 | Build & Deploy & Infra | 80 |
| 2 | Segurança & Compliance LGPD | 120 |
| 3 | ACAD Web — Acadêmico | 200 |
| 4 | ACAD Web — Financeiro | 100 |
| 5 | Secretaria Digital (MEC 315/2018) | 100 |
| 6 | Diploma Digital (MEC 554/2019) | 120 |
| 7 | Assinatura Virtual & ICP-Brasil | 80 |
| 8 | UX/UI/Design System | 120 |
| 9 | Observabilidade & DX | 60 |
| 10 | Mobile, Integrações & IA | 120 |
| | **TOTAL** | **≈ 1.100** |

---

# 1️⃣ BUILD, DEPLOY & INFRA (1–80)

## 1.1 Deploy
1. Criar `render.yaml` declarativo no monorepo (IaC)
2. Separar serviços: `api`, `validador-publico` (só `/public/*`), `web` (SPA)
3. Adicionar `healthcheckPath: /healthz` no `render.yaml`
4. Configurar auto-deploy só para branch `main`
5. Ambiente `staging` conectado à branch `develop`
6. Preview environments por PR (Render Preview)
7. Domínio customizado `app.alpha.edu.br` para web
8. Domínio `api.alpha.edu.br` para backend
9. Domínio `validar.alpha.edu.br` para validador público
10. Certificado TLS automático (Let's Encrypt via Render)
11. HSTS com preload
12. Redirect HTTP→HTTPS 301
13. CDN na frente do frontend (Cloudflare)
14. Cache-Control agressivo em `/assets/*`
15. Compressão brotli + gzip

## 1.2 Build
16. Habilitar `sourcemap: true` em produção (só subir ao Sentry)
17. Tree-shaking agressivo
18. Code splitting por rota (React.lazy)
19. Pré-bundle de dependências pesadas (Vite optimizeDeps)
20. Minificação com terser (drop_console)
21. Hash em nomes de asset (cache busting)
22. Chunks < 250 KB
23. Análise de bundle com `rollup-plugin-visualizer`
24. CI rejeita PR se bundle > threshold
25. Docker multi-stage para backend (alternativa)

## 1.3 Infra Supabase
26. Habilitar PITR (Point-In-Time Recovery) no Supabase
27. Backup diário exportado para S3/R2
28. Réplica de leitura (quando tier permitir)
29. Connection pooling via PgBouncer (já no pooler)
30. Monitorar `pg_stat_statements`
31. Índices faltantes (pg_stat_user_indexes)
32. VACUUM automatizado agendado
33. `pg_cron` para jobs noturnos
34. `pg_net` para webhooks outbound
35. Extensão `pgcrypto` habilitada (já)
36. `pgjwt` para validação de tokens
37. Edge Functions p/ tarefas pesadas
38. Storage com políticas RLS por tenant
39. Rate-limit no Auth
40. MFA obrigatório para admins

## 1.4 CI/CD
41. GitHub Actions: lint + typecheck + test em cada push
42. Matriz Node 20/22
43. Cache pnpm-store
44. Playwright E2E em CI
45. Semgrep SAST
46. Trivy scan de imagem
47. Dependabot semanal
48. Renovate com auto-merge de patches
49. Changelogs automáticos (changesets)
50. Release tagging semântico
51. Conventional commits enforced (commitlint)
52. Husky pre-commit (lint-staged)
53. Branch protection em `main`
54. Review obrigatório antes de merge
55. Status checks obrigatórios
56. Squash merge padrão

## 1.5 Ambientes
57. `.env.example` completo documentado
58. Secrets apenas no Render Env Groups
59. Rotação trimestral de chaves
60. `SUPABASE_SERVICE_ROLE` só no servidor (nunca no frontend)
61. Secrets detection (gitleaks)
62. `dotenvx` para encrypt local envs
63. Feature flags (Unleash ou LaunchDarkly OSS)
64. Canary deploys
65. Rollback 1-click

## 1.6 Qualidade
66. Cobertura de testes > 70% backend
67. Cobertura > 50% frontend
68. Mutation testing (Stryker) trimestral
69. Contract tests (Pact) api↔web
70. Smoke tests pós-deploy
71. Testes de carga (k6) antes de go-live
72. Chaos testing (Gremlin) em staging
73. Benchmarks de endpoints críticos
74. Lighthouse CI > 90 em todas as rotas
75. Axe-core acessibilidade em CI

## 1.7 Logs & Monitoramento
76. Log estruturado JSON com pino (já)
77. Correlação `requestId` em todos os logs
78. Shipping para Datadog/Axiom/Better Stack
79. Alertas por e-mail/Slack em 5xx > 1%
80. Dashboards de latência p50/p95/p99

---

# 2️⃣ SEGURANÇA & COMPLIANCE LGPD (81–200)

## 2.1 Autenticação
81. MFA TOTP obrigatório para admins
82. MFA SMS opcional para alunos (custo Supabase)
83. Passkeys (WebAuthn)
84. Sessões com rotação de refresh tokens
85. Logout em todos os dispositivos
86. Detecção de login anômalo (geo+device)
87. Captcha (Turnstile/hCaptcha) em magic link
88. Rate-limit por IP
89. Rate-limit por email
90. Expiração de magic link 10 min
91. Senha alternativa com Argon2id
92. Política de senha (min 12, upper/lower/num/sym)
93. Bloqueio após N tentativas (5)
94. Desbloqueio via e-mail verificado
95. Timeout de sessão 30 min inatividade (admin)
96. Timeout 8h para alunos
97. Remember-me seguro
98. Device binding

## 2.2 Autorização
99. RLS em **todas** as tabelas (auditar)
100. Políticas testadas com `pgTAP`
101. Role-based + attribute-based (ABAC)
102. Escopo por curso/campus
103. Permissão granular por rota `/api/*`
104. Super-admin sempre ≥ 2 (evitar lockout)
105. Audit log toda mudança de perfil
106. Impersonation (admin logar como usuário) com auditoria
107. Revogação de sessão em tempo real

## 2.3 LGPD
108. Página pública de Política de Privacidade
109. Termo de Uso com versionamento
110. Consentimentos granulares (marketing, cookies, dados)
111. Registro de consentimento com timestamp + IP
112. Portal do titular: exportar dados pessoais (JSON+PDF)
113. Portal do titular: solicitar exclusão
114. Anonimização lógica (não hard delete) após solicitação
115. Retenção de dados configurável por tabela
116. DPO (Encarregado) designado em rodapé
117. Canal de comunicação DPO
118. Inventário de dados pessoais (DPIA)
119. Registro de operações (Art. 37 LGPD)
120. Notificação de incidente em 72h (fluxo)
121. Cookie banner com granularidade
122. Sem trackers sem consentimento
123. Pseudonimização em logs
124. Mascaramento de CPF em UI (###.***.***-##)
125. Política de retenção de backups
126. Treinamento LGPD para equipe

## 2.4 Cripto & ICP-Brasil
127. TLS 1.3 obrigatório
128. HSTS preload
129. Assinatura XAdES-T / XAdES-A nos XML de diploma
130. Carimbo de tempo (LTV) ITI
131. HSM ou KMS gerenciado (AWS KMS/Google KMS)
132. Rotação de chaves de vault AES-GCM anualmente
133. Envelope encryption (DEK + KEK)
134. Transparency log de emissões
135. Hash SHA-256 em todos os documentos
136. Merkle tree diária (tamper-evident)
137. Notarização opcional em blockchain (Polygon ID)
138. Validação OCSP/CRL do cert ICP-Brasil
139. Verificação de cadeia completa ITI
140. Alerta de certificado próximo de expirar (90d/30d/7d)

## 2.5 OWASP Top 10
141. Helmet com CSP estrito
142. CSP sem `unsafe-inline` (nonces)
143. CORS allowlist explícita
144. CSRF token em formulários sensíveis
145. Anti-XSS: sanitize DOMPurify em HTML renderizado
146. SQL injection: só queries parametrizadas
147. SSRF guard em URLs externas
148. Path traversal: validar `..`
149. XXE: parser XML com entities off
150. Deserialization segura (zod)
151. Upload: whitelist MIME + magic bytes
152. Upload: antivírus (ClamAV)
153. Upload: tamanho máx por tipo
154. Upload: scan de malware assíncrono
155. Prototype pollution: lodash → es-toolkit
156. Dependency confusion: scope `@alpha/*`
157. Subresource Integrity (SRI) em CDNs
158. Permissions-Policy estrita
159. Referrer-Policy: strict-origin
160. X-Frame-Options: DENY

## 2.6 Auditoria
161. Log imutável append-only
162. Assinar logs diariamente (hash chain)
163. SIEM integration (Wazuh)
164. Alertas de mudanças em `profiles`
165. Alertas de mudança em permissões
166. Trilha completa de emissão de diploma
167. Trilha de acesso a dados sensíveis (CPF/RG)
168. Retenção de logs ≥ 6 meses
169. Compactação de logs antigos
170. Export de logs para forense

## 2.7 Pentest & Programa de Bug Bounty
171. Pentest externo anual
172. Scan automatizado mensal (OWASP ZAP)
173. Programa de bug bounty (HackerOne/Intigriti) quando maduro
174. Política de divulgação responsável
175. security.txt no domínio

## 2.8 Resiliência
176. Backup diário + off-site
177. Teste de restore trimestral
178. DR plan documentado
179. RTO < 4h, RPO < 1h
180. DDoS protection (Cloudflare)
181. Circuit breakers em chamadas externas
182. Fallback de ICP-Brasil (cert B se cert A cair)
183. Cache offline de CRL
184. Queue de emissão (idempotente)
185. Retry com backoff exponencial
186. Dead letter queue
187. Graceful shutdown
188. Health probe com dependências
189. Feature flag "kill switch" em módulos
190. Modo somente-leitura em manutenção

## 2.9 Acessos Internos
191. SSH bastion com MFA
192. Acesso DB só via VPN
193. Access log de admins
194. Revisão trimestral de permissões
195. Offboarding checklist
196. Cofre de senhas corporativo (1Password)
197. Política BYOD documentada
198. Criptografia de disco em máquinas da equipe
199. Firewall de saída no banco
200. Isolamento por VPC

---

# 3️⃣ ACAD WEB — ACADÊMICO (201–400)

## 3.1 Matrícula & Inscrição
201. Calendário de matrícula configurável
202. Pré-matrícula online com upload de docs
203. Análise de documentos por secretaria
204. Aceite de contrato de prestação de serviços
205. Assinatura eletrônica do contrato (Gov.br)
206. Matrícula por período (integral / semestre)
207. Matrícula em disciplinas isoladas
208. Rematrícula com 1-clique (recurring)
209. Ajuste de matrícula dentro do prazo
210. Trancamento total
211. Trancamento parcial por disciplina
212. Cancelamento com taxa
213. Transferência interna (mudança de curso)
214. Transferência externa recebida
215. Aproveitamento de estudos
216. Dispensa de disciplina
217. Equivalência curricular entre matrizes
218. Matriz curricular migrada (aluno antigo)
219. Plano de ensino adaptado (PCD)
220. Validação de pré-requisitos
221. Validação de co-requisitos
222. Bloqueio por inadimplência
223. Alertas de prazos críticos
224. Protocolo automático único
225. Fila de espera em turma lotada
226. Remanejamento automático por prioridade

## 3.2 Oferta de Disciplinas
227. Calendário acadêmico anual/semestral
228. Oferta por período letivo
229. Turmas com vagas configuráveis
230. Horários com conflito detectado
231. Alocação automática de salas
232. Alocação automática de professores
233. Coeficiente de ocupação de salas
234. Dashboard de taxa de preenchimento
235. Abertura/fechamento condicional (min alunos)
236. Oferta de cursos livres
237. Oferta de cursos de extensão
238. Oferta de pós-graduação latu sensu
239. Stricto sensu (mestrado/doutorado)
240. EAD (ensino a distância) com diário virtual
241. Híbrido (presencial + online)
242. Semipresencial 20%
243. Turmas compartilhadas entre cursos

## 3.3 Diário Eletrônico
244. Chamada digital (QR code / geofence)
245. Falta atestada (médica/justificada)
246. Upload de atestado
247. Abono automático até N faltas
248. Alerta 75% frequência
249. Plano de aula por encontro
250. Registro de conteúdo ministrado
251. Anexos de material didático
252. Envio de material pelo professor
253. Notificar alunos de novo material
254. Pesquisa de satisfação por aula (opcional)
255. Enquete rápida em aula
256. Assinatura digital do professor no diário
257. Fechamento de diário com prazo
258. Correção de diário com justificativa
259. Histórico de alterações (versionamento)

## 3.4 Avaliações & Notas
260. Composição de nota configurável por disciplina
261. Pesos por avaliação
262. Avaliação substitutiva
263. Avaliação final / exame
264. Lançamento em lote (CSV)
265. Arredondamento configurável
266. Nota máxima/mínima de aprovação
267. Regra por curso/currículo
268. Recuperação paralela
269. Nota de atividades online
270. Integração com AVA (Moodle/Canvas)
271. Anti-plagiarism (Turnitin/Copyspider)
272. Correção por rubrica
273. Feedback qualitativo
274. Revisão de prova (protocolo)
275. Prova em 2ª chamada
276. Prova oral com gravação
277. Avaliação por pares
278. Auto-avaliação
279. Portfólio do aluno

## 3.5 Histórico & Currículo
280. Histórico escolar oficial em PDF assinado
281. Declaração de matrícula
282. Declaração de conclusão
283. Atestado de frequência
284. Certificado de conclusão de módulo
285. Programa da disciplina (plano de ensino)
286. Projeto pedagógico do curso (PPC) público
287. Matriz curricular em grafo (visualização)
288. CRA (Coef. Rendimento Acadêmico)
289. CR por período
290. Ranking da turma (opt-in)
291. Situação por disciplina (AP/RP/TR/DI)
292. Equivalência/aproveitamento marcados
293. Exportação CSV do histórico
294. Exportação XML padrão MEC

## 3.6 TCC, Estágio & Atividades Complementares
295. Módulo TCC
296. Orientador + banca
297. Cronograma de entregas
298. Upload de versões
299. Antiplágio automático
300. Ficha catalográfica
301. Arquivo de dedicação
302. Módulo Estágio obrigatório
303. Termo de compromisso
304. Empresa cadastrada
305. Agente de integração
306. Supervisor externo
307. Orientador interno
308. Relatórios parciais/finais
309. Horas acumuladas
310. Atividades complementares (AACC)
311. Catálogo de tipos de atividade
312. Upload de comprovante
313. Aprovação por coordenação
314. Horas contabilizadas no histórico

## 3.7 Coordenação
315. Painel de coordenador por curso
316. Indicadores de evasão
317. Previsão de reprovação (ML)
318. Alunos em risco (early warning)
319. Intervenção pedagógica planejada
320. Tutoria / monitoria
321. Programa de acolhimento
322. Mapeamento de habilidades
323. Avaliação institucional (CPA)
324. Relatório para INEP/MEC
325. ENADE — preparação
326. Simulados ENADE
327. Indicador de empregabilidade
328. Alumni (egressos) cadastrados

## 3.8 Biblioteca
329. Acervo catalogado (MARC 21)
330. Empréstimo físico
331. Devolução com multa
332. Renovação online
333. Reserva de livro
334. Acervo digital (EPUB/PDF)
335. DRM de e-book
336. Integração Minha Biblioteca / Pearson
337. Busca avançada
338. Recomendação por curso/disciplina
339. Bibliografia básica/complementar mapeada
340. Relatório de uso para MEC (e-MEC)

## 3.9 Espaço Físico
341. Cadastro de salas/laboratórios
342. Capacidade e recursos
343. Agendamento de laboratório
344. Reserva de auditório
345. Mapa interativo do campus
346. QR code em cada sala (presença)
347. Patrimônio (tombamento)
348. Manutenção predial (chamados)

## 3.10 Secretaria Acadêmica (operações)
349. Protocolo único de documentos
350. Fluxo configurável (BPMN light)
351. SLA por tipo de requerimento
352. Escalation automático
353. Assinatura digital do responsável
354. Envio por e-mail com link seguro
355. Busca full-text nos documentos
356. Tags e anotações internas
357. Reabertura com justificativa
358. Histórico de todos os atos
359. Relatórios gerenciais
360. Export para auditoria MEC

## 3.11 Parâmetros & Cadastros
361. Cadastro de IES multi-campus
362. Cadastro de cursos e áreas OCDE/CNPq
363. Cadastro de matrizes por ano
364. Disciplinas com ementa versionada
365. Bibliografias vinculadas
366. Pré-requisitos/co-requisitos em grafo
367. Professores com titulação
368. Lattes scraping (opcional)
369. Produção intelectual do docente
370. Carga horária docente
371. Contratação (CLT/RPA/voluntário)
372. Gestão de férias docentes
373. Plano de carreira
374. Planilha docente exportável
375. Coordenadores de curso
376. NDE (Núcleo Docente Estruturante)
377. Colegiados
378. Atas de reunião
379. Deliberações com voto eletrônico

## 3.12 Portal do Aluno — melhorias
380. Timeline de eventos pessoais
381. Dashboard com KPIs pessoais
382. Chat com coordenação/suporte
383. Calendário unificado (.ics)
384. Notificações push (PWA)
385. Dark mode
386. Idioma EN/ES (i18n)
387. Widget de próximas avaliações
388. Widget de frequência atual
389. Barra de progresso do curso (%)
390. Árvore de disciplinas concluídas
391. Matriz visual interativa
392. Exportar currículo padrão Europass
393. Solicitar segunda via de documentos
394. Assinar termos de uso novos
395. Carteirinha de estudante digital
396. QR code de carteirinha
397. Validação da carteirinha em apps parceiros
398. Benefícios estudantis (meia-entrada)
399. Portal de vagas e estágios
400. Indicação de colegas (refer-a-friend)

---

# 4️⃣ ACAD WEB — FINANCEIRO (401–500)

401. Plano de contas
402. Cadastro de planos de curso (mensalidades)
403. Descontos: bolsa, pontualidade, convênio
404. PROUNI / FIES
405. Crédito educativo próprio
406. Boleto bancário (integração Banco do Brasil / Itaú / Santander / Bradesco)
407. PIX (cobrança por Pix dinâmico)
408. Cartão de crédito recorrente
409. Cartão de débito
410. Carnê impresso (PDF)
411. Conciliação bancária automática
412. Retorno CNAB 240/400
413. Baixa automática
414. Notificação de boleto vencendo (3d/1d/vencido)
415. Multa + juros configuráveis
416. Negociação com desconto
417. Parcelamento de dívida
418. Acordo assinado digitalmente
419. Dashboard financeiro (inadimplência)
420. Projeção de receita
421. DRE mensal
422. Fluxo de caixa
423. Conta a pagar (fornecedores)
424. Folha de pagamento (integração)
425. INSS / FGTS / IR
426. Obrigações acessórias (DCTFWeb, eSocial)
427. Emissão de NFS-e (educação)
428. Retenção tributária
429. Crédito do PIS/Cofins
430. Contabilidade (integração Domínio/Sage)
431. Fechamento contábil mensal
432. Balanço patrimonial
433. Auditoria de receita/despesa
434. Centro de custo por curso/campus
435. Orçamento anual
436. Análise de margem por curso
437. Evasão financeira (inadimplentes desligados)
438. Dossiê de cobrança
439. Envio para serasa/SPC (opt-in)
440. Rescisão de contrato
441. Portal do aluno: "Meus boletos"
442. Histórico financeiro
443. Comprovante de pagamento
444. Declaração de quitação anual (IR)
445. Declaração para imposto de renda (repasse de curso)
446. Emissão de recibo
447. Devolução / estorno
448. Chargeback controle
449. Relatório para auditoria independente
450. Integração ERP externo (TOTVS/Senior)
451. API aberta de cobrança
452. Webhooks de pagamento recebido
453. Reconciliação multi-banco
454. OFX / OFC import
455. Extrato bancário agregado (Open Finance)
456. Cash-flow forecast com ML
457. Alerta de gastos anômalos
458. Aprovação de despesa (workflow)
459. Contrato de fornecedor com assinatura digital
460. Licitação interna (ITB light)
461. Controle de contratos e vigência
462. Renovação automática
463. Gestão de bolsas
464. Edital de bolsa (publicação)
465. Análise socioeconômica
466. Score interno de bolsa
467. Parcelamento in-house
468. Simulador financeiro para candidato
469. Calculadora de financiamento
470. Parcerias (empresas convênio) com desconto
471. Cashback educação (opcional)
472. Cartão de crédito próprio (co-branded)
473. Seguro educacional (parceiro)
474. Plano de saúde estudantil
475. Seguro estágio
476. Marketplace de serviços pagos
477. Taxa de matrícula variável
478. Taxa de emissão de documentos
479. Taxa de 2ª chamada
480. Taxa de diploma (gratuita por lei → custo zero)
481. Relatório de receita por taxa
482. Gestão de bolsa-atleta
483. Monitoria remunerada
484. Iniciação científica (PIBIC)
485. Cotas (PROUNI, FIES, próprias)
486. Relatório cotas para MEC
487. Painel CFO
488. Painel tesouraria
489. DRE por centro de custo
490. EBITDA educacional
491. NPS financeiro
492. Tempo médio de cobrança (DSO)
493. Taxa de conversão de inadimplente
494. Provisão para devedores duvidosos
495. Auditoria externa pronta
496. SOX compliance (se virar S.A.)
497. Export FP&A
498. Integração Power BI / Metabase
499. Relatório operacional automático (e-mail)
500. Fechamento contábil com 1 clique

---

# 5️⃣ SECRETARIA DIGITAL (MEC 315/2018) (501–600)

## 5.1 Acervo Acadêmico Digital (conforme Art. 4º e 5º)
501. Classificação por tipo documental (CONARQ)
502. Tabela de temporalidade
503. Guarda permanente vs temporária
504. Transferência para arquivo permanente
505. Eliminação com edital
506. Termo de eliminação assinado digitalmente
507. Metadados obrigatórios (dublin core)
508. Assinatura digital em cada documento (XAdES)
509. Carimbo de tempo ICP-Brasil
510. Preservação a longo prazo (LTV)
511. Migração de formato (PDF/A-1b → A-3)
512. Manifest XML por documento
513. Cadeia de custódia auditável
514. Hash SHA-256 armazenado
515. Índice full-text (Tika)
516. OCR em documentos escaneados (digitalizados)
517. Reconhecimento de assinatura manuscrita
518. Verificação automática de integridade (diária)
519. Relatório de conformidade ao MEC
520. Exportação para e-MEC
521. Importação de acervo legado (papel → digital)
522. Plano de digitalização
523. Fluxo de digitalização com validação dupla
524. Scanner compliance (Res. CONARQ 31/2010)
525. Marca d'água "CÓPIA"
526. Cópia autenticada digital
527. Validador público de cópia autenticada
528. Link QR em cópia impressa
529. Restrição de acesso por perfil
530. Busca facetada
531. Filtros por curso/período/tipo
532. Relacionamento entre documentos (ex: prova → diário)
533. Dossiê do aluno (agregador)
534. Exportar dossiê completo (ZIP)
535. Entrega ao aluno (LGPD)
536. Retenção conforme curso/MEC
537. Preservação perpétua de diplomas
538. Blockchain notarization opcional
539. Timestamp RFC 3161
540. Validação periódica da cadeia ICP-Brasil

## 5.2 Requerimentos
541. Catálogo de requerimentos (CRUD)
542. Formulário dinâmico por tipo (JSON schema)
543. Workflow configurável (BPMN)
544. SLA por tipo
545. Taxa associada
546. Pagamento prévio (PIX)
547. Assinatura do requerente (Gov.br)
548. Documentos anexos obrigatórios
549. Validação automática de documentos
550. Parecer do responsável
551. Segunda instância / recurso
552. Arquivamento automático após N dias
553. Reabertura com novo protocolo
554. Notificação por e-mail / push
555. Consulta pública por protocolo
556. Templates de resposta
557. Assinatura digital do despacho
558. Exportação PDF completa
559. Estatísticas por tipo
560. Heatmap de gargalos

## 5.3 Ordens e Portarias Internas
561. Editor de portaria com template
562. Numeração automática anual
563. Assinatura digital do reitor
564. Publicação interna (DOU interno)
565. Notificação aos afetados
566. Vigência configurável
567. Revogação posterior
568. Histórico rastreável

## 5.4 Atas
569. Ata de colegiado
570. Ata de NDE
571. Ata de congregação
572. Deliberação com voto eletrônico
573. Publicação após assinatura
574. Arquivo permanente

## 5.5 Integrações Governamentais
575. e-MEC (cadastro de cursos)
576. Censo da Educação Superior (INEP)
577. SISU/PROUNI/FIES
578. EducaCenso
579. Gov.br (login)
580. ITI (validador ICP-Brasil)
581. Sistema Arquivo Nacional (SIGA-AN, se aplicável)
582. Portal da Transparência (se pública)
583. eSocial
584. ComprasNet (se pública)

## 5.6 Acessibilidade documental
585. Tags acessíveis em PDF (PDF/UA)
586. Leitor de tela testado (NVDA/JAWS)
587. Alt-text em imagens
588. Contraste mínimo WCAG AA
589. Navegação por teclado

## 5.7 Auditoria MEC
590. Pasta única por aluno
591. Relatório de conformidade 315/2018
592. Checklist auditor interno
593. Simulador de auditoria
594. Preparação para visita in loco
595. Documentos do curso (PPC, DCN)
596. Ato autorizativo (portaria MEC)
597. Renovação de reconhecimento
598. Trilha de aprovação institucional
599. Plataforma MEC ready (exportar dossiê)
600. Certidão de regularidade

---

# 6️⃣ DIPLOMA DIGITAL (MEC 554/2019) (601–720)

## 6.1 Emissão
601. Schema XML oficial MEC (XSD validado)
602. Validação XSD antes de assinar
603. Dados do diplomado (CPF, RG, nome)
604. Dados do curso (eixo/OCDE)
605. Dados do ato autorizativo (portaria)
606. Dados da colação
607. Número de registro único (UUID + sequencial)
608. Livro/folha de registro (Art. 21 Portaria 330)
609. Data de expedição
610. Data de colação
611. Base legal (LDB, portarias)
612. Timbre da IES (PNG em base64)
613. Assinatura do diplomado (imagem)
614. Assinatura do reitor (digital)
615. Assinatura do secretário (digital)
616. Geração do PDF visual (representação)
617. PDF/A-3 com XML embutido
618. Marca d'água com número de registro
619. QR Code do validador público
620. URL curta amigável
621. Hash SHA-256 publicado
622. Assinatura XAdES-T no XML
623. Assinatura XAdES-A (arquivamento)
624. Carimbo de tempo AC Timestamping
625. Validação da cadeia ICP-Brasil
626. Registro em repositório imutável
627. Apostilamento (Convenção Haia) opcional
628. Versão em inglês (curso internacional)
629. Versão em espanhol
630. Reemissão com novo número (1ª via perdida)
631. Cancelamento com motivação registrada
632. Histórico de versões do diploma
633. Fila de emissão com retry
634. Lote de emissão (colação em massa)
635. Notificação ao diplomado por e-mail
636. Entrega digital no portal
637. Download autenticado
638. Apresentação pública do diploma (URL)
639. Impressão física ao pedido (cortesia)
640. Kit impressão (capa + miolo)

## 6.2 Registro
641. Registro na IES emissora
642. Envio para IES registradora (se distinta)
643. Integração e-MEC Diplomas
644. Sinc diária com base MEC
645. Reconhecimento internacional (apostilamento)
646. Certidão de registro
647. Livro diário de registros eletrônico
648. Numeração sequencial inviolável
649. Fechamento mensal/anual
650. Export livro diário

## 6.3 Validação Pública
651. Endpoint `/public/validar/{numero}` (✅ já)
652. Página web amigável do validador
653. Upload de PDF para validar hash
654. Validar XML anexo
655. Mostrar chain de assinaturas
656. Mostrar timestamps
657. Botão "verificar cert ICP-Brasil" (OCSP live)
658. Histórico de validações (auditoria)
659. Compartilhar via WhatsApp / LinkedIn
660. Badge embutível ("Diploma verificado")
661. API pública REST + XML Schema
662. API pública GraphQL (read-only)
663. Rate-limit no validador
664. Estatística pública (sem PII)
665. Selo "MEC 554/2019 Compliant"

## 6.4 Diplomado (portal)
666. Card do diploma com "Validar"
667. Compartilhar em redes (LinkedIn)
668. Badge digital (Open Badges / Credly)
669. Download XML+PDF
670. Solicitar apostilamento
671. Solicitar 2ª via
672. Atualizar nome social (compliance LGBTQIA+)
673. Correção de grafia (com análise)
674. Declaração de conclusão (prévia ao diploma)
675. Status de registro (em processo / registrado)
676. Timeline: colação → expedição → registro → entrega
677. Certificado de participação em eventos (extensão)
678. Certificado de curso livre (padrão distinto)
679. Certificado digital de monitoria
680. Certificado de iniciação científica

## 6.5 Governança
681. Política de emissão documentada
682. Papéis separados (segregation of duties)
683. Dupla assinatura (reitor + secretário)
684. Aprovação prévia por coordenador
685. Checklist pré-emissão
686. Testes automáticos de conformidade
687. Validação CPF no Receita Federal (opcional)
688. Prevenção de duplicata (unique)
689. Alerta de emissão fora do padrão
690. Relatório diário de emissões
691. Aprovação de reitor em lote
692. Dry-run (simulação sem registro)
693. Ambiente de homologação (staging)
694. Pentest específico do módulo
695. Auditoria externa anual
696. Certificação ISO 27001 (longo prazo)

## 6.6 Histórico Escolar Digital
697. XML de histórico (padrão XSD MEC)
698. Assinatura XAdES
699. Validador público separado
700. Incluído na pasta do aluno
701. Versionamento (retificações)
702. Publicação ao término do curso
703. Entrega ao aluno em PDF/A
704. QR Code de validação
705. Idioma EN/ES

## 6.7 Certificados de Curso Livre / Extensão
706. Numeração separada
707. Template customizado por curso
708. Assinatura do coordenador do curso
709. Quantidade de horas
710. Ementa anexa
711. Validador público
712. Registro contabilizado para AACC
713. Export CSV para LinkedIn Learning

## 6.8 Apostilamento da Haia
714. Integração com cartório (API Anoreg, quando disponível)
715. Fluxo de solicitação
716. Taxa configurável
717. Apostila anexada ao diploma
718. Validador aceita apostila

## 6.9 Compatibilidade Legacy
719. Diplomas anteriores (papel) → digitalização certificada
720. Diploma digital complementar (coexistência) com link à versão física

---

# 7️⃣ ASSINATURA VIRTUAL & ICP-BRASIL (721–800)

## 7.1 Assinatura
721. Assinatura XAdES-BES (básica)
722. XAdES-T (com timestamp)
723. XAdES-LT (long-term)
724. XAdES-LTA (archival)
725. PAdES (PDF) para documentos visuais
726. CAdES para outros binários
727. Assinatura em lote
728. Assinatura com múltiplos signatários
729. Assinatura paralela (todos ao mesmo tempo)
730. Assinatura serial (um após o outro)
731. Assinatura condicional (se X então Y)
732. Anotação em assinatura (finalidade)
733. Selo visual no PDF
734. Campo de assinatura no PDF
735. Posicionamento configurável do selo
736. Selo com QR validador
737. Contra-assinatura (endosso)

## 7.2 Integrações
738. Gov.br (assinatura cidadã) OAuth
739. Certificado A1 via upload (.pfx)
740. Certificado A3 via token/HSM local
741. Certificado na nuvem (VaultID, Valid, Certisign cloud)
742. HSM remoto (AWS CloudHSM / Thales)
743. Bry / Soluti / ViaSign APIs (parceiros)
744. DocuSign / Clicksign (assinatura simples)
745. Whitelabel de assinatura
746. SDK JavaScript para embed

## 7.3 Validação
747. Validador interno de cadeia
748. Validação OCSP em tempo real
749. Validação CRL offline-cache
750. Validação LCR
751. Suporte a AC-Raiz ICP-Brasil v5 e v10
752. Validador ITI (consulta oficial)
753. Relatório de validação (PDF)
754. Visualizador de certificado (detalhes)
755. Política de aceitação configurável
756. Aceitar certs internacionais (eIDAS) — opcional
757. Verificação em diplomas digitalizados
758. Verificação de timestamp válido
759. LTV (Long Term Validation)
760. Alerta de expiração de assinatura

## 7.4 Fluxos
761. Solicitar assinatura por e-mail
762. Link público único (magic link)
763. Autenticação do signatário (email, CPF, SMS, selfie)
764. Evidências: IP, geo, device, horário
765. Protocolo de assinatura
766. Relatório de evidências em PDF
767. Assinatura por vídeo (gravação de aceite)
768. Reconhecimento facial (opcional)
769. Live-ness detection
770. Comparação com RG/CNH (OCR)
771. Anexo de documento de identidade
772. Recusa com justificativa
773. Revogação de documento não assinado
774. Expiração de link
775. Reenvio de link
776. Lembrete automático
777. SLA de assinatura
778. Dashboard de andamento
779. Trilha de auditoria completa
780. Export do dossiê forense

## 7.5 Compliance
781. MP 2.200-2/2001 (ICP-Brasil)
782. Lei 14.063/2020 (assinatura eletrônica simples/avançada/qualificada)
783. Decreto 10.543/2020 (gov digital)
784. eIDAS (se exportar para UE)
785. ESIGN (se EUA)
786. Política de Assinatura (DPC) publicada
787. Declaração de Práticas
788. Auditoria externa da política

## 7.6 Performance & Escala
789. Queue de assinatura (BullMQ/Supabase queues)
790. Worker pool
791. Assinatura paralela em N núcleos
792. Cache de CRL
793. Retry inteligente
794. Timeout configurável
795. Monitor de latência por AC
796. Failover entre provedores
797. Métricas prometheus
798. SLO 99.9%
799. Circuit breaker em AC fora do ar
800. Degrade grácil (enfileirar)

---

# 8️⃣ UX / UI / DESIGN SYSTEM (801–920)

## 8.1 Design System
801. Criar lib `@alpha/ui` com tokens
802. Paleta oficial da IES (primary/neutral)
803. Tipografia corporativa (Inter + variable)
804. Escala de espaçamento 4/8
805. Escala de radius (sm/md/lg/xl)
806. Shadows consistentes
807. Animações padrão (160/240/320 ms)
808. Ícones Phosphor / Lucide unificados
809. Componentes base: Button, Input, Select, Textarea, Checkbox, Radio, Switch
810. Form com react-hook-form + Zod
811. Dialog, Drawer, Popover, Tooltip
812. DataTable com paginação/ordenação/filtro
813. Skeleton loaders
814. Empty states ilustrados
815. Toast / Sonner
816. Command palette (Cmd+K)
817. Breadcrumbs
818. Tabs / Segmented controls
819. Accordions
820. Steps / Wizard
821. File upload com drag-drop
822. Image cropper
823. Date picker (BR format)
824. Time picker
825. CPF/CNPJ/CEP/phone inputs com máscara
826. Currency input (pt-BR)
827. Rich text editor (TipTap)
828. Markdown preview
829. Signature pad (touch)
830. QR code gen/scan

## 8.2 Temas
831. Dark mode
832. High contrast mode
833. Tema institucional customizável (whitelabel)
834. Seletor de fonte (acessibilidade)
835. Aumentar fonte (A+/A-)
836. Modo leitura simplificada

## 8.3 Telas — Admin
837. Dashboard rico (KPIs, charts)
838. Chart lib: Recharts ou visx
839. Heatmap de atividades
840. Funnel de matrícula
841. Cohort retenção
842. Overview por curso
843. Filtros persistentes
844. Export CSV/Excel/PDF em todas as tabelas
845. Impressão amigável
846. Print layout específico

## 8.4 Telas — Aluno
847. Home com "próximo passo" (nudge)
848. Card de CRA com trend
849. Gráfico de frequência por disciplina
850. Calendário integrado
851. Meu progresso (donut)
852. Histórico em timeline visual
853. Compartilhar certificado (social)
854. Badges (gamification)
855. Leaderboard opt-in
856. Sistema de XP de engajamento
857. Notificações inteligentes

## 8.5 Telas — Professor
858. Visão semanal das turmas
859. Chamada mobile-first (big touch)
860. Lançamento de notas com validação em tempo real
861. Gráfico de desempenho da turma
862. Comentários privados por aluno
863. Prever alunos em risco
864. Envio em massa de avisos

## 8.6 Telas — Secretaria
865. Inbox de requerimentos (kanban)
866. SLA visual (semáforo)
867. Busca global (alunos, docs)
868. Busca full-text
869. Scanner integrado (drag file)
870. Pré-visualização de PDF inline
871. Anotações/highlights em PDF
872. Modo foco (esconder sidebar)

## 8.7 Acessibilidade
873. WCAG 2.1 AA
874. Leitor de tela 100% nos fluxos críticos
875. Navegação por teclado completa
876. Skip links
877. Focus ring visível
878. ARIA roles revisados
879. Labels em todos os inputs
880. Erros associados via aria-describedby
881. Live region em loaders
882. Reduz motion (respeitar prefer-reduced-motion)
883. Contraste AAA em tipografia principal
884. Testes com NVDA / VoiceOver / JAWS
885. Auditoria a11y trimestral

## 8.8 Microinterações
886. Animações sutis de transição
887. Feedback imediato em ações
888. Confetti em conquistas (colação)
889. Progress bar global em ações longas
890. Toast com undo
891. Drag & drop em kanban
892. Inline edit
893. Optimistic UI
894. Skeleton matching real layout
895. Image lazy + blur placeholder

## 8.9 Performance de front
896. LCP < 2.5s
897. INP < 200ms
898. CLS < 0.1
899. Preload de rotas prováveis
900. Prefetch em hover
901. Suspense boundaries
902. React Query stale-while-revalidate
903. WebSocket / Supabase realtime para inbox
904. PWA com installable
905. Offline basic (service worker)
906. Background sync
907. Push notifications
908. Icon + splash screen

## 8.10 Internacionalização
909. i18next
910. pt-BR (default)
911. en-US
912. es-ES
913. Formatação de datas/moeda por locale
914. RTL (se expandir)
915. Pluralização
916. Traduções gerenciadas (Crowdin/Tolgee)
917. Tradução de PDFs gerados

## 8.11 Onboarding
918. Tour guiado (Shepherd.js) em primeiro login
919. Checklist de onboarding por papel
920. Dica contextual (tooltip com "nunca mostrar")

---

# 9️⃣ OBSERVABILIDADE & DX (921–980)

## 9.1 Logs
921. Structured logs JSON (já pino)
922. Trace ID em toda request
923. Log de SQL lentas
924. Log de RLS violations
925. Log shipping (Axiom)
926. Dashboard de erros
927. Alerta Slack em erro crítico
928. Relatório semanal automatizado

## 9.2 Métricas
929. Prometheus / OpenTelemetry
930. RED metrics (Rate, Errors, Duration)
931. Métricas de negócio (emissões/dia)
932. SLI/SLO definidos
933. Error budget dashboards
934. Histograms por rota

## 9.3 Tracing
935. OTel SDK backend + frontend
936. Jaeger / Tempo
937. Sampling configurável
938. Trace de chamadas externas (ICP)
939. Trace do fluxo de assinatura

## 9.4 APM
940. Sentry (errors + performance)
941. Sentry Session Replay
942. Sentry profiling
943. Source maps privados
944. Alerta em regressão de performance

## 9.5 Uptime
945. Better Stack / UptimeRobot
946. Status page público
947. Incidentes registrados
948. Postmortems (blameless)
949. Runbooks por tipo de alerta

## 9.6 DX
950. README por pacote
951. Storybook com todos os componentes UI
952. Chromatic (visual regression)
953. TS strict em todos os pacotes
954. ESLint consistent rules
955. Prettier config única
956. Husky + lint-staged
957. Conventional commits
958. Changesets
959. Release notes automáticas
960. API reference (Redoc via OpenAPI)
961. OpenAPI spec completo
962. Postman collection exportada
963. SDK TypeScript gerado (openapi-typescript)
964. SDK PHP/Python/Go (se integrações externas)
965. Exemplos de uso no repo
966. Vídeos de onboarding dev
967. Playwright com video em falha
968. CI rodando < 5 min

## 9.7 Docs
969. Docs site (Nextra/Docusaurus)
970. Tutoriais passo-a-passo
971. Arquitetura (C4 model)
972. ADRs (Architecture Decision Records)
973. Guia de contribuição
974. Código de conduta
975. Onboarding dev (1 dia)

## 9.8 Data
976. Data warehouse (DuckDB + dbt)
977. ETL noturno
978. Painéis Metabase
979. Self-service BI para diretoria
980. Privacidade por design (PII masked)

---

# 🔟 MOBILE, INTEGRAÇÕES & IA (981–1100)

## 10.1 Mobile
981. App React Native (Expo)
982. iOS + Android
983. Login biométrico
984. Push notifications (FCM/APNs)
985. Carteirinha digital offline
986. QR de presença
987. Chat suporte in-app
988. Deep links
989. Upload de documentos (camera)
990. Scanner de boleto
991. Integração Apple Pay / Google Pay
992. Widgets (iOS 17+)
993. Siri/Google Assistant shortcuts
994. App Clip / Instant App (matrícula rápida)
995. Modo offline de histórico
996. Sync em background
997. TestFlight / Internal track
998. CI Fastlane
999. Crashlytics
1000. App Store Optimization

## 10.2 Integrações externas
1001. Microsoft 365 Education (SSO, Teams)
1002. Google Workspace for Education
1003. Moodle (LTI 1.3)
1004. Canvas LMS (LTI)
1005. Blackboard (LTI)
1006. Zoom (criação de aulas)
1007. Google Meet
1008. Webex
1009. MS Teams (bot)
1010. WhatsApp Business (notificações)
1011. Telegram (notificações)
1012. SMS (Twilio/Zenvia)
1013. E-mail transacional (Resend/Postmark)
1014. Signaturit / DocuSign
1015. Clicksign
1016. Gov.br Identidade
1017. Gov.br Assinatura
1018. Serasa (cobrança)
1019. Receita Federal (valida CPF)
1020. CEPs (ViaCEP / Correios API)
1021. Correios (envio de diploma físico)
1022. JadLog / Loggi (alternativos)
1023. IBGE (dados de município)
1024. e-Social
1025. FGTS Digital
1026. INSS API
1027. Banco Central (PIX, Open Finance)
1028. Stripe / Pagar.me / Mercado Pago
1029. Asaas (boleto/PIX BR-friendly)
1030. Iugu / Vindi (recorrência)
1031. LinkedIn (diploma compartilhável)
1032. Credly (open badges)
1033. Europass (CV/diploma internacional)
1034. HackerRank / Codility (avaliações tech)
1035. Turnitin / Urkund (plágio)
1036. Google Scholar (produção docente)
1037. Lattes CNPq
1038. ORCID
1039. DOI (publicações)

## 10.3 Analytics
1040. Plausible (privacy-first)
1041. PostHog (feature flags + analytics)
1042. Mixpanel events
1043. Heatmaps (Hotjar / FullStory)
1044. Funil de matrícula
1045. Eventos de engajamento
1046. Cohort por curso
1047. Retenção por semestre
1048. Churn de alunos
1049. NPS pós-semestre
1050. CSAT pós-atendimento

## 10.4 Inteligência Artificial
1051. Chatbot aluno (RAG sobre FAQ/regimento)
1052. Chatbot secretaria (tirar dúvidas)
1053. Sumarizar currículo (alumni)
1054. Sumarizar histórico (coordenador)
1055. Previsão de evasão (ML)
1056. Previsão de reprovação (ML)
1057. Recomendação de disciplina eletiva
1058. Recomendação de trilha de carreira
1059. Corretor automático de redação (feedback)
1060. Detector de plágio local (embeddings)
1061. Geração de ementa sugerida
1062. Geração de plano de ensino
1063. Geração de prova a partir de ementa
1064. Geração de feedback qualitativo
1065. Transcrição de aula (Whisper)
1066. Legenda automática em vídeo-aula
1067. Tradução de material didático
1068. Summarização de aula
1069. Tutor IA 24/7 por disciplina
1070. Tutor IA com limites pedagógicos
1071. Análise de sentimento em avaliações institucionais
1072. Alert de burnout docente
1073. Q&A sobre regulamento (RAG)
1074. Assistente de matrícula (conversacional)
1075. Bot de lembrete de prazos
1076. Explicador de boleto (nota/valor)
1077. Classificador de requerimento
1078. Priorização automática de inbox secretaria
1079. Detecção de fraude em documentos (ML)
1080. OCR + IA em diplomas legados
1081. Verificação de autenticidade com ML
1082. Deep learning para correção de grafia
1083. Assistente do professor (planejamento)
1084. Geração de relatórios executivos
1085. Agente autônomo para atas (resumo)
1086. Moderação de conteúdo (fórum)

## 10.5 Comunidade & Engajamento
1087. Fórum por disciplina
1088. Grupos de estudo
1089. Mentoria aluno-aluno
1090. Eventos/Workshops (inscrição)
1091. Egressos — network
1092. Vagas compartilhadas pela coordenação
1093. Oportunidades de pesquisa
1094. Semana acadêmica (app)
1095. Gamification com badges
1096. Moedas virtuais (loja de brindes)
1097. Desafios mensais
1098. Podcast interno
1099. Blog institucional (SEO)
1100. Newsletter semanal personalizada

---

# 📌 Critérios de priorização

| Nível | Quando fazer | Exemplos |
|---|---|---|
| **P0** | Imediato (bloqueia outras coisas) | Build Render, CORS, seed real |
| **P1** | Este mês (essencial MVP v1) | Matrícula fim-a-fim, emissão de diploma ponta-a-ponta, cobrança básica |
| **P2** | Próximos 3 meses | Relatórios MEC, antiplágio, integração Gov.br |
| **P3** | 6–12 meses | Mobile, IA avançada, multi-campus |
| **P4** | Longo prazo | ISO 27001, multi-país, eIDAS |

## Convenções
- Marcar ✅ no final de cada item concluído
- Criar issue GitHub para P1/P2 vinculada ao número desta lista
- Atualizar este arquivo apenas via PR
- Registrar decisões em `docs/adr/`

---

_Última atualização: 23/04/2026 — gerado após build fail no Render (pnpm corepack read-only)_
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
