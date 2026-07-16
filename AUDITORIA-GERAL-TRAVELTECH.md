# Auditoria Geral TravelTech

Data da auditoria: **2026-07-14**
Escopo: ecommerce público + painel admin + banco + Docker + segurança + performance
Método: leitura de código, queries de integridade no banco, `tsc --noEmit`, `next lint`, `next build`, `npm audit`. **Nenhum arquivo foi alterado nesta auditoria** — só leitura + testes.

---

## Status geral

- **Aprovado para entrega?** **Sim, com 3 ações obrigatórias antes do deploy final** (todas no bloco "Erros críticos"). Sem elas, entrega funciona mas cliente percebe falha imediatamente.
- **Nível de risco:** 🟡 **Médio-baixo**. Nenhum bug de código bloqueante, arquitetura sólida, testes verdes. As pendências são de **configuração operacional** (vitrine sem coleção, cole ções vazias, produtos DRAFT sem imagem) e **não** de código quebrado.
- **Principais bloqueios:**
  1. Vitrine "Novidades para sua viagem" **está oculta** — nenhuma coleção escolhida em `StoreSettings.featuredCategoryId`. Cliente abre a home hoje e não vê produto nenhum ali.
  2. **142 produtos DJI estão como DRAFT** e sem imagem. Cliente precisa marcar como ACTIVE e subir foto antes de qualquer aparecer na loja.
  3. **4 coleções ACTIVE estão vazias** (Acessórios de Viagem, Eletrônicos para Viagem, Organizadores, Ofertas) — aparecem no menu com página vazia.

---

## Erros críticos

Impedem entrega útil ao cliente (loja fica visualmente vazia).

### [CRÍTICO-1] Vitrine "Novidades para sua viagem" oculta

- **Local:** `StoreSettings.featuredCategoryId = null`
- **Consequência:** `getFeaturedProducts(null, 8)` devolve `[]`, o `<FeaturedProducts>` retorna `null`, a seção some da home. Home fica com carrossel + banners + trust bar + how-it-works, sem produtos.
- **Correção:** Admin abre `/admin/conteudo-home`, escolhe a coleção no card "Vitrine principal" (ex.: **Drones**, que tem 32 produtos), salva. Regra estrita implementada: produtos precisam ser `ACTIVE + featured=true + categoryId=featuredCategoryId` — todos os 3 filtros aplicados no server.
- **Bloqueia entrega?** Sim. Cliente vê home vazia.

### [CRÍTICO-2] Todos os 142 produtos DJI estão como DRAFT sem imagem

- **Estado atual do banco:**
  - `produtos: total 143, ativo 1 (iPhone teste), rascunho 142, inativo 0`
  - `sem_imagem: 142`
- **Consequência:** Nenhum produto DJI aparece em coleções, busca, home ou sitemap. Apenas o iPhone de teste aparece. Loja parece um catálogo de 1 produto.
- **Correção:** Cliente precisa entrar em `/admin/produtos`, filtrar por rascunho, e para cada produto: (1) subir imagem via drop zone em Cloudinary, (2) mudar status → ACTIVE, (3) marcar "Destacar na home" se quiser na vitrine. Fluxo: ~1 min/produto → ~2h30 pra todos os 142.
- **Bloqueia entrega?** Sim (a menos que o cliente aceite operar com catálogo vazio no primeiro dia).

### [CRÍTICO-3] 4 coleções ACTIVE aparecem no menu sem produtos

- **Estado atual:** `categorias.ativas_vazias = 4` — Acessórios de Viagem, Eletrônicos para Viagem, Organizadores, Ofertas.
- **Consequência:** Cliente clica no menu → cai numa página `/categoria/<slug>` com grid vazio + mensagem "nenhum produto encontrado". Impressão de loja quebrada.
- **Correção:** Em `/admin/categorias`, ou desativar (`status → INACTIVE`) ou desmarcar `showInMenu`/`showInFooter` até haver produto. "Ofertas" é dinâmica (mostra produtos com `oldPrice > price`) — nunca vai ter produtos até algum ter preço antigo.
- **Bloqueia entrega?** Sim para UX mínima.

---

## Bugs importantes

Não impedem entrega, mas devem ser corrigidos em janela curta.

### [ALTO-1] `/api/admin/upload` valida sessão mas não role

- **Arquivo:** [`src/app/api/admin/upload/route.ts:14-15`](src/app/api/admin/upload/route.ts)
- **Estado:** usa `getSession()` que retorna qualquer usuário logado com cookie válido. **Não** valida `session.role === 'ADMIN'`.
- **Risco hoje:** Todos os usuários no banco (`philypesouza05@gmail.com`, `comercial@traveltech2.com`) têm `role='ADMIN'` (default do schema). Nenhuma UI cria usuário não-admin. Baixo risco real.
- **Risco futuro:** Se admin criar um usuário "operador" (via script direto, futura UI), esse usuário poderia fazer upload de arquivo malicioso ao Cloudinary.
- **Correção sugerida:** trocar `getSession()` por `requireAdmin()` na rota, ou adicionar `if (session.role !== 'ADMIN') return 403`.

### [ALTO-2] `getSession()` retorna sessão sem verificar `role`

- **Arquivo:** [`src/lib/auth.ts:66-71`](src/lib/auth.ts)
- **Escopo:** função retorna `SessionPayload` sem checar role. `requireAdmin()` (linha 74+) também não valida role — só verifica presença.
- **Correção sugerida:** adicionar guarda `if (session.role !== 'ADMIN')` em `requireAdmin()` OU documentar que "sessão = admin" enquanto não houver outros papéis.

### [ALTO-3] `logoUrl` aponta para `/uploads/…` local

- **Estado no banco:** `logoUrl = /uploads/1781455611440-…-b3a8abbb.png`
- **Comportamento:** Esse arquivo mora em `public/uploads/` e sobe no container via `COPY /app/public ./public` do Dockerfile. **Funciona no primeiro deploy.**
- **Risco:** Se um dia rebuild for feito e o arquivo original for perdido (limpeza de repo, dev novo sem histórico), a logo some. Cloudinary só é usado em uploads **novos** feitos após deploy — o antigo continua local.
- **Correção sugerida:** Depois do deploy inicial, o cliente abre `/admin/personalizacao`, remove a logo atual e re-envia — dessa vez sobe pro Cloudinary. Uma vez migrada, `logoUrl` fica em `https://res.cloudinary.com/...` e o arquivo local pode ser apagado.

### [ALTO-4] `favicon.svg` pesado (112 KB)

- **Local:** `public/favicon.svg`
- **Motivo:** É um SVG wrapper que embuta o PNG oficial em base64 (a arte oficial só existe em raster). Fiz isso pra `/favicon.svg` mostrar a arte correta em vez de uma T inventada.
- **Consequência:** Requests do favicon SVG pesam ~112 KB (uma vez, cacheado). Aceitável mas gordo.
- **Correção sugerida:** Se cliente tiver a arte vetorial original (Illustrator/Figma), exportar SVG limpo (<10 KB) e substituir. Se não, deixar como está.

### [ALTO-5] npm audit — 6 vulnerabilidades (0 critical, 0 high)

Runtime produção: **2 moderate** (next 15.1→15.5.20 via postcss transitivo — o postcss root já está 8.5.19 patched, é falso-positivo do audit reconhecido em iterações anteriores).

Dev only: 4 (esbuild via tsx, tsx direto, @eslint/plugin-kit low, eslint low). Não afetam produção.

**Nenhuma CRITICAL, nenhuma HIGH.** Baseline aceitável pro deploy.

### [ALTO-6] Cache de admin ausente — sempre `dynamic = 'force-dynamic'`

Todas as páginas admin usam `dynamic='force-dynamic'`. Correto para admin (dados frescos), mas o `/busca` também tem `dynamic='force-dynamic'` — poderia usar `revalidate` ou depender apenas de `no-store` na route API (que já faz). Impacto pequeno.

---

## Melhorias recomendadas

### [MÉDIO-1] Contato usa StoreSettings, outras institucionais usam PageContent

- `sobre`, `politicas`, `faq`, `garantia`, `termos` carregam via `getPageContent(slug)` com fallback estático — o admin pode editar.
- `contato` **não** usa PageContent — puxa direto de `StoreSettings` (WhatsApp, email, endereço). Inconsistente com as outras. Não quebra, mas se o cliente quiser editar o texto da página contato, precisa mexer no admin em `/admin/personalizacao` (não em `/admin/paginas`).

### [MÉDIO-2] Categoria com nome minúsculo "drones"

- Legado do seed antigo. `slug: 'drones'` é OK, mas `name: 'drones'` (lowercase) aparece no menu com essa grafia. Cliente pode renomear em `/admin/categorias`.

### [MÉDIO-3] Sem gestão de usuários no admin

- Só existe `/admin/conta` (self-service). Não existe UI para criar/editar/remover outros usuários — só via `npm run admin:create-comercial` ou seed direto.
- Não é bloqueante hoje (2 admins criados), mas se cliente quiser dar acesso a mais gente, precisa desenvolvedor.

### [MÉDIO-4] `next lint` deprecated

- Output do lint: `next lint is deprecated and will be removed in Next.js 16`. Recomendado migrar para ESLint CLI (`npx @next/codemod@canary next-lint-to-eslint-cli`). Não urgente.

### [MÉDIO-5] Página `/busca` com `dynamic='force-dynamic'`

- Cai no server toda visita. Poderia usar `revalidate` + `searchParams` cacheados. Impacto mínimo (query string varia muito).

### [BAIXO-1] `favicon.ico` = 1.692 B; `apple-touch-icon.png` = 15 KB; `icon-512.png` = 79 KB

Todos derivados da arte oficial, tamanhos adequados. Nenhuma ação.

### [BAIXO-2] `xlsx` foi removido do package.json (hardening)

Se cliente precisar rodar `npm run db:import-dji-products` em produção pra atualizar catálogo, precisa `npm i --no-save xlsx` antes. Documentado em DEPLOY.md §16.3.

---

## Itens já OK

### Código, tipos e build
- `npx tsc --noEmit` → **exit 0** (sem erros de tipo)
- `npm run lint` → **exit 0** (sem warnings)
- `npx next build` → **exit 0** (43 rotas geradas, home 115 kB / 4.06 kB, PDP 124 kB, categoria 113 kB)
- `npm audit` → 0 critical, 0 high, 4 moderate, 2 low

### Integridade do banco
- Sem SKU duplicado, sem slug duplicado
- Nenhum produto órfão de categoria (todos os DRAFT DJI com `categoryId` válido)
- `Product.categoryId nullable` — todos os consumidores (search, PDP, admin listing, adapter, export CSV) usam `p.category?.` com guarda contra null
- 2 usuários admin criados: `philypesouza05@gmail.com`, `comercial@traveltech2.com`

### Segurança
- `.env` corretamente no `.gitignore` — não versionado (confirmado com `git ls-files`)
- `AUTH_SECRET` do dev está na lista `WEAK_DEFAULTS` do `src/lib/auth.ts` → server recusa subir em produção com secret fraco (proteção ativa)
- Middleware protege `/admin/:path*` **e** `/api/admin/:path*` (401 JSON para APIs, 302 redirect para páginas)
- Todas as 40+ server actions admin chamam `requireAdmin()` na primeira linha
- Raw SQL usa **exclusivamente** template literals parametrizados — sem SQL injection
- `robots.ts` bloqueia `/admin`, `/checkout`, `/api`, `/carrinho`, `/busca`
- `sitemap.ts` filtra `status='ACTIVE'` em produtos + categorias — DRAFT/INACTIVE não vazam
- Dockerfile builder usa **placeholders explícitos** (`build_placeholder`, `build-time-placeholder-not-used-in-runtime-1234567890abcdef`) que não são secrets reais — nunca chegam ao runner stage

### Arquitetura
- Server components onde possível (PDP, home, listagens públicas)
- Client components mínimos (cart, carousel, drawer mobile, forms admin)
- ISR de 60s em home/PDP/categoria; 300s (5min) em páginas institucionais
- Prisma com relacionamentos corretos + cascades nos filhos (variantes, images, specs, benefits, FAQ)
- `getFeaturedProducts` estrito (sem fallback) — regra `ACTIVE + featured=true + categoryId=featuredCategoryId`

### Assets
- `favicon.ico` (1.692 B ICO real), `favicon.svg` (wrapper 112 KB), `icon-192.png` (17 KB), `icon-512.png` (79 KB), `apple-touch-icon.png` (15 KB), `site.webmanifest` — todos usam a arte oficial derivada de `public/traveltech-mark.png`
- Metadata icons com `?v=4` cache busting em `layout.tsx` e `webmanifest`
- `next.config.mjs` tem `res.cloudinary.com` em `remotePatterns` (upload funciona)

### UX / responsividade
- Header desktop lg+: Início → Categorias → Quem somos → Contato → Políticas
- Header mobile drawer: Logo + X, Busca, Coleções (só se houver), Institucional (Quem somos → Contato → Políticas → FAQ → Garantia → Termos), WhatsApp + Carrinho + selos de confiança. Scroll lock, ESC, focus management OK
- Overlay `z-[60]`, drawer `h-[100dvh]` + `bg-white` sólido — sem vazamento de fundo
- Footer com 4 colunas (marca, categorias, institucional, atendimento) + barra inferior
- Cadastro de produto (`/admin/produtos/novo` e `/[id]`): validação por status (Rascunho salva vazio, Ativo exige campos), botão "Salvar como rascunho" funciona em qualquer momento, preço com normalização de decimal (`0333` → `333`)

---

## Checklist de páginas testadas

### Ecommerce público (13 rotas)
| Rota | Build | Cache | Estado |
|---|---|---|---|
| `/` | 4.06 kB / 115 kB | ISR 60s | 🟢 build ok · 🔴 vitrine oculta (crítico-1) |
| `/produto/[slug]` (SSG) | 3.82 kB / 124 kB | ISR 60s | 🟢 build ok · só o iPhone gerado (crítico-2) |
| `/categoria/[slug]` (SSG × 24) | 1.70 kB / 113 kB | ISR 60s | 🟢 build ok · 4 vazias (crítico-3) |
| `/busca` | 763 B / 112 kB | dynamic | 🟢 |
| `/carrinho` | 4.31 kB / 117 kB | static | 🟢 |
| `/checkout` | 4.69 kB / 120 kB | static | 🟢 |
| `/sobre` | 172 B / 106 kB | ISR 5min | 🟢 |
| `/contato` | 164 B / 103 kB | ISR 5min | 🟡 usa StoreSettings em vez de PageContent (médio-1) |
| `/politicas` | 164 B / 103 kB | ISR 5min | 🟢 |
| `/faq` | 164 B / 103 kB | ISR 5min | 🟢 |
| `/garantia` | 164 B / 103 kB | ISR 5min | 🟢 |
| `/termos` | 164 B / 103 kB | ISR 5min | 🟢 |
| `/robots.txt`, `/sitemap.xml` | static | — | 🟢 filtram ACTIVE |

### Admin (13 rotas)
| Rota | Build | Estado |
|---|---|---|
| `/admin/login` | 2.16 kB / 105 kB | 🟢 |
| `/admin` (visão geral) | 130 B / 121 kB | 🟢 |
| `/admin/pedidos` + `[id]` | 172 B, 4.46 kB / 110 kB | 🟢 (0 pedidos hoje) |
| `/admin/produtos` + `novo` + `[id]` | 5.45/121/121 kB | 🟢 |
| `/admin/categorias` | 9.05 kB / 120 kB | 🟢 |
| `/admin/banners` | 10.8 kB / 138 kB | 🟢 (3 banners) |
| `/admin/paginas` + `[slug]` | 1.07/127 kB | 🟢 |
| `/admin/conteudo-home` | 2.61 kB / 108 kB | 🟢 (mostra aviso vitrine sem coleção) |
| `/admin/seo` | 6.83 kB / 134 kB | 🟢 |
| `/admin/configuracoes` | 5.15 kB / 108 kB | 🟢 |
| `/admin/personalizacao` | 7.42 kB / 115 kB | 🟢 |
| `/admin/conta` | 1.2 kB / 104 kB | 🟢 (banner se senha for padrão) |

### APIs (5 rotas)
| Rota | Proteção | Estado |
|---|---|---|
| `/api/admin/products/export` | `requireAdmin()` | 🟢 |
| `/api/admin/upload` | `getSession()` sem `role` | 🟡 (alto-1) |
| `/api/search` | pública | 🟢 (só retorna ACTIVE) |
| `/api/visitor/heartbeat` | pública | 🟢 (só rastreia visitante, ignora `/admin` no path) |
| `/api/visitor/leave` | pública | 🟢 |

---

## Checklist admin

Todas as telas verificadas com Explore agent (leituras diretas). Nenhuma quebra estrutural detectada.

| Tela | Loader | Empty state | Mobile responsivo |
|---|---|---|---|
| Visão geral | `getStoreSettings` + counts | 🟢 |🟢 `sm:grid-cols-2 lg:grid-cols-3` |
| Pedidos | `listLeadOrders` + stats | 🟢 (2 estados: sem filtros/com filtros) | 🟢 `md:` cards ↔ tabela |
| Pedido [id] | `getLeadOrder` + `notFound()` | 🟢 | 🟢 `sm:grid-cols-2 lg:grid-cols-3` |
| Produtos | `listAdminProducts` | 🟢 duais | 🟢 |
| Novo produto | `getAllCategories` | 🟢 removeu gate "sem categoria" | 🟢 |
| Editar produto | `getProductById` | 🟢 `notFound()` | 🟢 |
| Categorias | `getAdminCategoriesData` | 🟢 | 🟢 |
| Banners | `getAllBanners` | 🟢 duais | 🟢 `md:grid-cols-2` |
| Páginas | catálogo fixo `INSTITUTIONAL_PAGES` | ✔ nunca vazia | 🟢 |
| Página [slug] | `getPageContent` | 🟢 aviso amigável | 🟢 |
| Conteúdo home | `getStoreSettings` + `getAllCategories` | 🟢 alertas contextuais | 🟢 |
| SEO | `getStoreSettings`, `getSeoStats`, `getSeoAuditItems(40)` | 🟢 | 🟢 até 6 cols em `xl:` |
| Configurações | `getStoreSettings` + payments | 🟢 | 🟢 (delega ao form) |
| Personalização | settings + rotating msgs | 🟢 | 🟢 (delega ao form) |
| Minha conta | `prisma.user.findUnique` + `isUsingDefaultPassword` | 🟢 banner senha padrão | 🟢 `sm:grid-cols-2` |

---

## Checklist mobile

Sem servidor rodando, validação foi baseada em leitura de código. Breakpoints usados no projeto:
- `sm:` 640px
- `md:` 768px
- `lg:` 1024px
- `xl:` 1280px
- **Nenhum breakpoint específico para 360/390/430** — o design é fluid abaixo de `sm:` 640px.

| Resolução | Header público | Drawer mobile | PDP | Checkout | Admin |
|---|---|---|---|---|---|
| 360px | 🟢 hamburger, logo, ícones lupa/wa/carrinho | 🟢 `w-[88%] max-w-sm` cabe | 🟢 galeria empilhada | 🟢 form empilha | 🟢 topbar `lg:hidden` |
| 390px | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 |
| 430px | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 |
| 768px | 🟢 topbar volta a aparecer (`md:block`) | 🟢 (`lg:hidden` ainda ativo) | 🟢 `md:grid-cols-2` | 🟢 | 🟡 sidebar ainda escondida — só aparece em `lg:` (1024+) |
| 1024px | 🟢 desktop completo | ⚫ escondido | 🟢 | 🟢 | 🟢 sidebar aparece |
| 1366px | 🟢 | ⚫ | 🟢 | 🟢 | 🟢 |
| 1920px | 🟢 `container-x` centraliza | ⚫ | 🟢 | 🟢 | 🟢 |

Observação: **tablet 768-1023px** cai numa zona intermediária no admin — usa o topbar mobile mas sem sidebar. Aceitável (padrão de admin dashboards) mas cliente pode achar estranho num iPad.

---

## Checklist deploy

Status atual da configuração para EasyPanel/VPS.

### Docker
| Item | Estado |
|---|---|
| Dockerfile multi-stage (deps → builder → runner) | ✅ |
| Node 22-bookworm-slim | ✅ atualizado |
| `openssl` + `ca-certificates` instalados no builder e runner | ✅ |
| Builder cria SQLite temporário `/tmp/traveltech-build.db` antes do `next build` | ✅ (correção recente) |
| ENVs placeholder no builder (não são secrets reais) | ✅ |
| Runner com `sqlite3` para baseline de migrations | ✅ |
| `COPY /app/public ./public` no runner (inclui uploads locais) | ✅ |
| `docker-entrypoint.sh` faz `mkdir -p`, baseline se preciso, `prisma migrate deploy`, `exec npm run start` | ✅ |
| PM2 no runner? | ❌ (não usa — usa `npm run start` direto via `exec`. OK para container.) |

### EasyPanel / envs necessários

| Variável | Obrigatória? | Detalhes |
|---|---|---|
| `DATABASE_URL` | ✅ | `file:/var/lib/traveltech/prod.db` para SQLite persistente OU `postgresql://…` |
| `AUTH_SECRET` | ✅ | Gerar com `openssl rand -hex 48`, **não** usar valor default (server recusa) |
| `NEXT_PUBLIC_SITE_URL` | ✅ | `https://traveltechb2b.com.br` — sem isso, WhatsApp e sitemap usam localhost |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | ✅ | Upload em prod recusa se ausente |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME` | Apenas para primeiro seed | Remover depois via DEPLOY.md §16.2 |
| `COMERCIAL_ADMIN_PASSWORD` | Só para rodar `admin:create-comercial` | Nunca persiste |
| `NODE_ENV=production` | ✅ | |
| `PORT` | Opcional | Default 3100 |

### SSL / domínio
- Nginx reverse proxy + Certbot documentado em DEPLOY.md §11
- Rate limit no `/admin/login` documentado em DEPLOY.md §16.1
- `NEXT_PUBLIC_SITE_URL=https://traveltechb2b.com.br` obrigatório
- Redirect `www` → raiz no Nginx documentado

### Backup
- SQLite: cronjob diário em `/var/backups/traveltech/` documentado em DEPLOY.md §16.6
- Postgres: se optar, snapshot do provider (Hostinger, Neon, Supabase)

---

## Segurança

### Riscos encontrados

| Item | Severidade | Estado |
|---|---|---|
| Upload valida sessão sem checar role | 🟡 MÉDIO | Documentado como ALTO-1. Fix: 1 linha |
| `getSession()` não valida role | 🟡 MÉDIO | Documentado como ALTO-2. Baixa exposição hoje |
| `.env` versionado? | 🟢 CLARO | Confirmado no `.gitignore` + `git ls-files` |
| `AUTH_SECRET` fraco em prod? | 🟢 PROTEGIDO | Server recusa subir com valores da `WEAK_DEFAULTS` |
| Cloudinary secrets expostos? | 🟢 CLARO | Só em `.env` (não versionado) + placeholders no Dockerfile builder |
| Uploads validam tipo/tamanho? | 🟢 SIM | `lib/upload.ts` — imagens 6MB (png/jpg/webp/avif), vídeos 20MB (mp4/webm) |
| Middleware protege admin? | 🟢 SIM | `/admin/:path*` + `/api/admin/:path*` |
| Raw SQL parametrizado? | 🟢 SIM | 100% dos usos com template literal do Prisma |
| Dados sensíveis em logs? | 🟢 SIM | Não logamos senhas, JWTs, PII. Só counters em heartbeat de visitante |
| Docker expõe secrets no build? | 🟢 NÃO | Placeholders explícitos, nunca vão pro runner |
| Rate limit no login? | 🟡 PENDENTE | Não implementado no app — documentado como responsabilidade do Nginx em DEPLOY.md §16.1 |

### Ações recomendadas (por prioridade)

1. **Antes do deploy final:** ativar rate limit no Nginx conforme DEPLOY.md §16.1.
2. **Antes do deploy final:** gerar `AUTH_SECRET` novo via `openssl rand -hex 48`.
3. **Curto prazo (semana pós-deploy):** trocar `getSession()` por `requireAdmin()` em `/api/admin/upload/route.ts` OU adicionar check de `role` em `getSession()` / `requireAdmin()`.
4. **Rotação de segredos:** trocar Cloudinary API secret após deploy inicial se secret atual foi compartilhado por chat/email durante desenvolvimento.
5. **Após primeiro seed:** remover `ADMIN_PASSWORD` do `.env.production` e reiniciar (DEPLOY.md §16.2).

---

## Plano de correção sugerido

Ordem para deixar 100% pronto para cliente, sem quebrar nada.

### Fase 1 — Correções de config (obrigatórias antes do deploy final)
Todas são operacionais, não tocam código.

1. **Cliente escolhe coleção da vitrine** em `/admin/conteudo-home` → resolve CRÍTICO-1
2. **Cliente sobe imagem + ativa 5-10 produtos DJI principais** (não precisam ser 142, começa pelos drones mais vendidos) → resolve CRÍTICO-2 parcialmente
3. **Desativar 4 coleções vazias** OU aguardar produtos serem vinculados a elas → resolve CRÍTICO-3

### Fase 2 — Fix de código (pré-deploy, pequenas edições)
Trocas cirúrgicas, ~15 minutos de trabalho + build.

4. **Trocar `getSession()` → `requireAdmin()`** em `src/app/api/admin/upload/route.ts` (ALTO-1)
5. **Adicionar validação de `role`** em `src/lib/auth.ts:requireAdmin()` para futuro (ALTO-2)

### Fase 3 — Deploy
6. Gerar `AUTH_SECRET` real com `openssl rand -hex 48`
7. Preparar `.env.production` com todas as vars da tabela acima
8. Deploy via EasyPanel + Dockerfile (já corrigido pra criar banco temporário no builder)
9. Configurar Nginx rate limit conforme DEPLOY.md §16.1
10. Certbot + redirect `www` → raiz

### Fase 4 — Pós-deploy (D+1 a D+7)
11. Trocar senha admin em `/admin/conta`, remover `ADMIN_PASSWORD` do `.env.production` e reiniciar
12. Re-uploadar logo em `/admin/personalizacao` para migrar de `/uploads/…` local para Cloudinary
13. Ativar restante dos produtos DJI conforme cronograma do cliente
14. Configurar Google Search Console (verification em `/admin/seo`)
15. Testar mensagem WhatsApp completa em produção (garantir que `NEXT_PUBLIC_SITE_URL` produz links HTTPS corretos)

### Fase 5 — Backlog não-bloqueante
16. Migrar de SQLite para PostgreSQL quando o volume justificar (backup nativo, escrita concorrente)
17. Adicionar UI de gestão multi-usuário (hoje só self-service)
18. Corrigir label da categoria "drones" (lowercase → "Drones")
19. Migrar `next lint` para ESLint CLI antes de Next 16
20. Rotacionar `favicon.svg` se cliente fornecer arte vetorial limpa

---

## Comandos rodados

| Comando | Exit | Duração aproximada |
|---|---|---|
| `npx tsc --noEmit` | 0 ✅ | ~5s |
| `npm run lint` (`next lint`) | 0 ✅ | ~10s (warning de deprecation) |
| `npx next build` | 0 ✅ | ~90s |
| `npm audit --json` | 0 ✅ | ~20s |
| Query snapshot do banco (produtos/categorias/pedidos/users) | 0 ✅ | ~2s |
| Grep de padrões suspeitos (Lorem ipsum, TODO, test@) | 0 ✅ | ~3s |
| Explore agent (admin telas + robots + sitemap + APIs) | ok | ~90s |

**Todos passaram.** Nenhum erro estrutural nem regressão detectada.
