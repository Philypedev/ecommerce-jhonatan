# Deploy & operação — TravelTech

Guia completo: do clone fresh até subir em produção, manter e atualizar
com segurança. Atualizado para a versão final do projeto.

---

## Índice

1. [Stack](#1-stack)
2. [Variáveis de ambiente](#2-variáveis-de-ambiente)
3. [Setup local](#3-setup-local)
4. [Migrar SQLite → PostgreSQL](#4-migrar-sqlite--postgresql)
5. [Cloudinary (obrigatório em prod)](#5-cloudinary-obrigatório-em-prod)
6. [Comandos de banco — perigosos × seguros](#6-comandos-de-banco--perigosos--seguros)
7. [Backup do banco](#7-backup-do-banco)
8. [Senha e segurança do admin](#8-senha-e-segurança-do-admin)
9. [Build & start](#9-build--start)
10. [Hospedagem — Opção A: Hostinger Web Hosting (Node.js)](#10-hospedagem--opção-a-hostinger-web-hosting-nodejs)
11. [Hospedagem — Opção B: VPS Hostinger (Ubuntu + PM2 + Nginx)](#11-hospedagem--opção-b-vps-hostinger-ubuntu--pm2--nginx)
12. [Checklist pré-deploy](#12-checklist-pré-deploy)
13. [Checklist pós-deploy (configurar a loja)](#13-checklist-pós-deploy-configurar-a-loja)
14. [Atualizar a aplicação depois do deploy inicial](#14-atualizar-a-aplicação-depois-do-deploy-inicial)
15. [Troubleshooting](#15-troubleshooting)

---

## 1. Stack

- **Next.js 15** (App Router) + **React 19** + TypeScript
- **Tailwind CSS** 3.4
- **Prisma ORM** + SQLite (dev) / PostgreSQL (prod)
- Auth admin: JWT em cookie HTTP-only (`jose` + `bcryptjs`)
- Upload: filesystem local (dev) / **Cloudinary** (prod — obrigatório)
- Analytics: GA4 + Meta Pixel (opcionais)

---

## 2. Variáveis de ambiente

Copie `.env.example` para `.env`. Em produção, defina via secrets do
provider (Hostinger Panel, painel da VPS, GitHub Actions, etc.) — NUNCA
suba `.env` versionado pro git.

| Variável | Quando | O que é |
|---|---|---|
| `DATABASE_URL` | sempre | Conexão SQLite (dev) ou Postgres (prod) |
| `AUTH_SECRET` | sempre | 32+ chars aleatórios em prod (o servidor recusa subir se for menor) |
| `NEXT_PUBLIC_SITE_URL` | sempre | URL HTTPS final em prod (sem barra no fim) |
| `ADMIN_EMAIL` | seed inicial | E-mail do admin criado pelo seed |
| `ADMIN_PASSWORD` | seed inicial | Senha inicial — **troque imediatamente** |
| `ADMIN_NAME` | seed inicial | Nome exibido na sidebar |
| `CLOUDINARY_CLOUD_NAME` | **prod obrigatório** | Sem isso, uploads falham com mensagem clara |
| `CLOUDINARY_API_KEY` | **prod obrigatório** | |
| `CLOUDINARY_API_SECRET` | **prod obrigatório** | Nunca vaza para o client |
| `NEXT_PUBLIC_GA_ID` | opcional | `G-XXXXXXXXXX` |
| `NEXT_PUBLIC_META_PIXEL_ID` | opcional | ID numérico |

**Gerar AUTH_SECRET forte:**

```bash
# Linux/Mac
openssl rand -base64 48

# PowerShell (Windows)
[Convert]::ToBase64String((1..48 | %{ Get-Random -Maximum 256 }))
```

---

## 3. Setup local

```bash
# 1. Clone + dependências
git clone <repo> traveltech && cd traveltech
npm install

# 2. .env (use o template)
cp .env.example .env
# edite e troque AUTH_SECRET por algo aleatório

# 3. Banco + admin + catálogo de exemplo
npm run prisma:migrate      # cria schema no SQLite local
npm run db:seed             # cria admin + 8 produtos + 6 categorias

# 4. Rodar
npm run dev                 # http://localhost:3000
# Admin: http://localhost:3000/admin
#   E-mail: admin@traveltech.com.br
#   Senha:  admin123  (TROQUE em /admin/conta)
```

---

## 4. Migrar SQLite → PostgreSQL

Para produção, mude para Postgres em 3 passos:

### a) Editar `prisma/schema.prisma`

```diff
 datasource db {
-  provider = "sqlite"
+  provider = "postgresql"
   url      = env("DATABASE_URL")
 }
```

### b) Setar `DATABASE_URL`

Exemplo Neon / Supabase / Railway:

```bash
DATABASE_URL="postgresql://user:pass@host:5432/dbname?schema=public&sslmode=require"
```

### c) Aplicar migrations

```bash
# Em DEV: cria a migration
npx prisma migrate dev --name init-postgres

# Em PROD: aplica migrations já existentes (não cria nova)
npx prisma migrate deploy
```

Para popular um banco de produção vazio do zero:

```bash
# Cuidado: seed RECRIA produtos/categorias mock.
# Em prod só use no primeiro deploy ou nunca.
npm run db:seed
```

---

## 5. Cloudinary (obrigatório em prod)

Crie uma conta gratuita em https://cloudinary.com → Dashboard → copie:

```
CLOUDINARY_CLOUD_NAME="seu-cloud-name"
CLOUDINARY_API_KEY="123456789"
CLOUDINARY_API_SECRET="abc...xyz"
```

Como funciona:

- Em **dev**, se as três estiverem vazias, salva localmente em
  `/public/uploads/` (não funciona em hospedagens serverless).
- Em **prod** (NODE_ENV=production), se faltarem, o admin mostra erro
  claro ao tentar upload:
  *"Upload local não é suportado em produção. Configure
  CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY e CLOUDINARY_API_SECRET."*

Pastas usadas: tudo vai pra pasta `traveltech` no seu cloud.

---

## 6. Comandos de banco — perigosos × seguros

### ⚠️ `npm run db:seed` — DESTRUTIVO

Apaga **todos** os produtos e categorias e recria a partir dos mocks em
`src/data/`. Settings, mensagens rotativas, pedidos e admins **não** são
apagados. **Não use em produção** sem backup. Use só:

- Setup inicial de banco vazio
- Reset deliberado em dev

### ✅ `npm run db:restore-power-bank`

Recria APENAS o produto Power Bank se ele não existir. Idempotente. Não
toca em mais nada.

### ✅ `npm run db:sync-theme`

Aplica as cores definidas em `src/app/globals.css` no `StoreSettings` do
banco. Útil quando você mudou cores no código e quer propagar pro DB
sem tocar em catálogo nem mensagens.

### ⚠️ `npm run prisma:reset`

Drop completo + recreate. **NUNCA em produção**. Usa só em dev pra
voltar a um estado limpo.

### ✅ `npm run prisma:migrate` (dev) / `npx prisma migrate deploy` (prod)

Aplica mudanças de schema preservando dados. **Sempre faça backup
antes** em produção.

### ✅ `npm run prisma:studio`

UI web para inspecionar/editar o banco em http://localhost:5555. **Não
exponha em produção** — bypassa toda a auth.

---

## 7. Backup do banco

### Postgres

```bash
# Manual
pg_dump $DATABASE_URL > backup-$(date +%F).sql

# Cron diário com retenção 7 dias
cat > /etc/cron.daily/traveltech-backup <<'EOF'
#!/bin/bash
set -e
BACKUP_DIR=/var/backups/traveltech
mkdir -p "$BACKUP_DIR"
pg_dump "$DATABASE_URL" | gzip > "$BACKUP_DIR/traveltech-$(date +%Y%m%d-%H%M%S).sql.gz"
find "$BACKUP_DIR" -name "traveltech-*.sql.gz" -mtime +7 -delete
EOF
chmod +x /etc/cron.daily/traveltech-backup
```

Para restaurar:

```bash
gunzip -c backup-2026-06-14.sql.gz | psql $DATABASE_URL
```

### Recomendado

Use os snapshots automáticos do provider (Neon, Supabase, Railway,
Hostinger Postgres) **em adição** ao backup manual.

---

## 8. Senha e segurança do admin

O código aplica vários guards em runtime:

1. **AUTH_SECRET** com menos de 16 chars: o servidor não sobe (qualquer
   ambiente).
2. **AUTH_SECRET** com menos de 32 chars em produção: o servidor não
   sobe.
3. **AUTH_SECRET** com valor default conhecido em produção: o servidor
   não sobe.
4. **`admin123`** ainda em uso: o dashboard mostra **banner amarelo**
   permanente até o admin trocar a senha.
5. **Cookies de sessão**: `httpOnly`, `sameSite=lax`, `secure=true`
   automaticamente em produção (`NODE_ENV=production`).
6. **`passwordHash`**: nunca sai de server actions. Auditado por grep.
7. **Senha forte**: o form `/admin/conta` recusa senhas fracas (min 8
   chars, ≥1 letra + ≥1 número, sem termos comuns como `admin123`,
   `password`, `qwerty`).

### Resetar senha sem rodar seed

Se você perder a senha em produção:

```bash
# Conecte no servidor e rode:
npx tsx -e "
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
const p = new PrismaClient();
const hash = await bcrypt.hash('NOVA_SENHA_FORTE', 10);
await p.user.update({
  where: { email: 'admin@traveltech.com.br' },
  data: { passwordHash: hash },
});
console.log('Senha atualizada');
await p.\$disconnect();
"
```

Faça login com a nova senha e descarte ela imediatamente trocando por
outra no painel.

---

## 9. Build & start

```bash
# Build de produção (gera .next/ otimizado)
npm run build

# Servir em produção
npm start                   # roda em PORT=3000 por padrão
PORT=8080 npm start         # custom port
```

O `npm run build` automaticamente roda `npx prisma generate` antes do
`next build`. Em ambientes onde o dev server local segura o DLL do
Prisma engine (Windows), o build pode falhar — pare o `npm run dev`
antes.

---

## 10. Hospedagem — Opção A: Hostinger Web Hosting (Node.js)

Bom pra começar: simples, sem precisar configurar Linux.

### a) Pré-requisitos

- Plano com suporte a **Node.js Apps** (Business ou superior)
- **Banco Postgres externo**: Neon (free tier), Supabase, Railway, ou o
  Postgres do próprio painel da Hostinger se disponível
- Cloudinary configurado

### b) No painel da Hostinger

1. **Domínios** → seu domínio → "Configurar DNS" (vamos usar depois)
2. **Avançado** → **Configurar Node.js**
   - Versão Node: 20 ou 22 (testado em 24)
   - Diretório raiz: `/public_html` (ou um subdiretório dedicado)
   - Arquivo principal: `node_modules/next/dist/bin/next` com
     argumento `start` — OU configure `npm start` como comando de
     entrada se a interface permitir
   - Modo: produção
3. Subir o código:
   - Via Git: configure SSH/Git e dê push direto
   - Via FTP/zip: faça `npm run build` localmente, suba o projeto
     (incluindo `.next/`, `node_modules/`, `public/`, `package.json`,
     `prisma/`)
4. **Variáveis de ambiente** no painel Node.js:
   - Cole todas as `KEY=value` do seu `.env` de produção
5. **No SSH (se disponível)** depois do upload:
   ```bash
   npm ci --omit=dev      # se subiu sem node_modules
   npx prisma generate
   npx prisma migrate deploy
   # primeiro acesso: criar admin + catálogo se ainda vazio
   npm run db:seed         # CUIDADO: só na primeira vez
   ```
6. **Domínio**: aponte o registro A do seu domínio pro IP da Hostinger
   (ou use os nameservers deles). Painel → SSL → ative HTTPS gratuito
   (Let's Encrypt).
7. Em `NEXT_PUBLIC_SITE_URL` coloque a URL HTTPS final.

### c) Limitações da Opção A

- Espaço em disco compartilhado pode ser limitado
- Você não controla o processo Node — sem fine-tuning de PM2
- Reinício depende do painel

---

## 11. Hospedagem — Opção B: VPS Hostinger (Ubuntu + PM2 + Nginx)

Recomendado para escala: você tem controle total e custo previsível.

### a) Provisionar VPS

Painel Hostinger → KVM 1 (ou superior, depende do tráfego) → escolha
**Ubuntu 22.04 LTS**.

### b) Setup inicial via SSH

```bash
ssh root@SEU_IP

# Atualiza sistema
apt update && apt upgrade -y

# Node 22 (mais recente LTS)
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs git nginx postgresql certbot python3-certbot-nginx

# Usuário sem root para a app
adduser deploy
usermod -aG sudo deploy
su - deploy

# PM2 global
sudo npm install -g pm2
```

### c) Postgres local (opcional — pode usar Neon/Supabase em vez)

```bash
sudo -u postgres psql <<EOF
CREATE DATABASE traveltech;
CREATE USER traveltech_app WITH ENCRYPTED PASSWORD 'SENHA_FORTE_AQUI';
GRANT ALL PRIVILEGES ON DATABASE traveltech TO traveltech_app;
EOF
```

DATABASE_URL fica:
```
postgresql://traveltech_app:SENHA_FORTE_AQUI@localhost:5432/traveltech?schema=public
```

### d) Clonar e build

```bash
cd ~
git clone <seu-repo-url> traveltech
cd traveltech
cp .env.example .env
nano .env    # preencha TUDO (DATABASE_URL, AUTH_SECRET, CLOUDINARY_*, etc.)

npm ci
npx prisma migrate deploy    # se for primeira vez: npx prisma migrate dev
npm run db:seed              # APENAS no primeiro deploy
npm run build
```

### e) PM2 (process manager)

```bash
# /home/deploy/traveltech/ecosystem.config.js
cat > ecosystem.config.js <<'EOF'
module.exports = {
  apps: [{
    name: 'traveltech',
    script: 'node_modules/next/dist/bin/next',
    args: 'start -p 3000',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '512M',
    env: { NODE_ENV: 'production' },
  }],
};
EOF

pm2 start ecosystem.config.js
pm2 save
sudo pm2 startup systemd -u deploy --hp /home/deploy
# copie e rode o comando que o PM2 imprimir
```

### f) Nginx reverse proxy

```bash
sudo tee /etc/nginx/sites-available/traveltech <<'EOF'
server {
    listen 80;
    server_name traveltech.com.br www.traveltech.com.br;

    # Tamanho máximo de upload (Cloudinary recebe via base64 — vai por aqui)
    client_max_body_size 10M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 60s;
    }
}
EOF

sudo ln -s /etc/nginx/sites-available/traveltech /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### g) SSL com Let's Encrypt

```bash
sudo certbot --nginx -d traveltech.com.br -d www.traveltech.com.br
# Renovação automática já configurada via cron
```

Edite seu `.env` em prod e coloque:
```
NEXT_PUBLIC_SITE_URL="https://traveltech.com.br"
```

Reinicie:
```bash
pm2 restart traveltech
```

### h) Logs e debug

```bash
pm2 logs traveltech         # logs em tempo real
pm2 monit                   # dashboard ASCII
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

---

## 12. Checklist pré-deploy

Antes de subir pela primeira vez:

- [ ] `npm run lint` zero warnings
- [ ] `npm run build` verde (em uma máquina com `npm run dev` parado)
- [ ] `.env` com **AUTH_SECRET 32+ chars aleatórios**
- [ ] `.env` com `NEXT_PUBLIC_SITE_URL` apontando pro domínio final
- [ ] `.env` com `DATABASE_URL` apontando pro Postgres de produção
- [ ] Cloudinary configurado (3 vars preenchidas)
- [ ] Cloudinary com pasta `traveltech` reservada (criada
      automaticamente no primeiro upload)
- [ ] Backup do banco antes de qualquer migration
- [ ] `.env` NÃO está no git (`.gitignore` já cobre)
- [ ] SSL (Let's Encrypt ou provider) ativo
- [ ] Postgres acessível só pela aplicação (firewall ou local)

---

## 13. Checklist pós-deploy (configurar a loja)

Depois que a app está no ar com domínio HTTPS:

### Operacional / segurança

- [ ] **Trocar senha do admin** em `/admin/conta` (sai do `admin123`).
      O banner amarelo no dashboard só some depois disso.
- [ ] Validar que `/admin` redireciona pra `/admin/login` quando
      deslogado.
- [ ] Validar que o cookie de sessão tem `Secure` e `HttpOnly` no
      DevTools.

### Identidade visual (em `/admin/personalizacao`)

- [ ] Subir **logo** oficial
- [ ] Subir **favicon**
- [ ] Definir **cores** (primary, secondary, accent)
- [ ] Ajustar **tamanho da logo** com o slider
- [ ] Configurar **hero**: título, subtítulo, imagem, textos dos botões
- [ ] Mensagens rotativas customizadas
- [ ] Rodapé: e-mail, telefone, endereço, redes sociais

### Operação (em `/admin/configuracoes`)

- [ ] WhatsApp número real (formato internacional só dígitos:
      `5511999999999`)
- [ ] WhatsApp display formatado (`(11) 99999-9999`)
- [ ] Formas de pagamento aceitas
- [ ] Aviso de frete

### Conteúdo da home (em `/admin/conteudo-home`)

- [ ] Selos do hero
- [ ] Cards "Por que comprar"
- [ ] Passos "Como funciona"

### Páginas institucionais (em `/admin/paginas`)

- [ ] Sobre — texto adaptado ao seu posicionamento
- [ ] Políticas — com prazo de entrega real
- [ ] Garantia
- [ ] FAQ — perguntas frequentes da sua operação
- [ ] Termos de uso

### Catálogo

- [ ] Coleções com imagens (banner desktop + mobile)
- [ ] Coleções marcadas para Menu / Home / Rodapé conforme
      estratégia
- [ ] Produtos com fotos reais (substituir placeholders)
- [ ] Produtos com descrição completa + especificações + FAQ
- [ ] SEO title/description em produtos importantes

### Banners

- [ ] Banners de campanha em `/admin/banners`
- [ ] Versão desktop + mobile para cada banner
- [ ] Link de destino correto

### Testes funcionais (faça você mesmo no site)

- [ ] Buscar produto no header → resultados aparecem no dropdown
- [ ] Buscar termo inexistente → vê sugestão de categorias
- [ ] Abrir uma categoria → filtros funcionam
- [ ] Abrir um produto → galeria, preço, parcelamento OK
- [ ] Adicionar ao carrinho → drawer abre
- [ ] Atualizar a página → carrinho persiste
- [ ] Ir pro checkout → preencher CEP válido → endereço auto-preenche
- [ ] Finalizar pedido → WhatsApp abre com a mensagem formatada
- [ ] Conferir em `/admin/pedidos` que o pedido foi salvo
- [ ] Mudar status do pedido para "Em atendimento"
- [ ] Excluir pedido de teste (com confirmação)
- [ ] Produto com estoque 0 → mostra "Consultar disponibilidade"

### Analytics & SEO

- [ ] GA4 configurado em `.env` (`NEXT_PUBLIC_GA_ID`)
- [ ] Meta Pixel configurado (`NEXT_PUBLIC_META_PIXEL_ID`)
- [ ] Abrir Chrome → DevTools → Network → tab "Preserve log" → fazer
      um checkout → confirmar eventos: `view_item`, `add_to_cart`,
      `begin_checkout`, `generate_lead`, `contact`
- [ ] Acessar `https://seudominio.com/sitemap.xml` → retorna XML
      com todas as páginas
- [ ] Acessar `https://seudominio.com/robots.txt` → tem `Disallow:
      /admin` e `/api`
- [ ] Open Graph: cole `https://seudominio.com/produto/X` no
      Facebook/WhatsApp e veja o preview

### Mobile

- [ ] Abrir o site no celular real (não só DevTools)
- [ ] Header limpo, lupa de busca funciona
- [ ] Botão flutuante de WhatsApp visível
- [ ] Drawer de filtros na categoria abre e funciona
- [ ] Checkout: formulário não trava, botões grandes

---

## 14. Atualizar a aplicação depois do deploy inicial

```bash
# No servidor (VPS) ou via redeploy do painel
cd ~/traveltech
git pull
npm ci
npx prisma migrate deploy     # SE houver nova migration
npm run build
pm2 restart traveltech         # ou método do painel

# Se mudou o schema:
# 1. Sempre faça backup antes
pg_dump $DATABASE_URL > backup-pre-update.sql
# 2. Aplique
npx prisma migrate deploy
```

**Nunca** rode `db:seed` em update — ele apaga o catálogo. Use:

- `db:restore-power-bank` — script de exemplo idempotente para
  restaurar um produto específico sem tocar no resto
- Painel admin para tudo mais

---

## 15. Troubleshooting

### Build falha com "EPERM rename query_engine-windows.dll.node"

Você está no Windows e o `npm run dev` está rodando. O dev segura o
DLL do Prisma engine. Solução: Ctrl+C no terminal do dev, rode
`npm run build`, reabra o dev.

### Dev server retorna 500 em rotas que antes funcionavam

Cache do `.next` corrompeu após muitos builds intercalados. Solução:
Ctrl+C no dev, apague a pasta `.next`, rode `npm run dev` de novo.

### Admin não loga após o seed

A senha é a do `.env` (`ADMIN_PASSWORD`). Em produção, se quiser
resetar sem rodar seed, use o snippet da [seção 8](#8-senha-e-segurança-do-admin).

### Upload de imagem retorna erro em produção

Confira se as 3 vars do Cloudinary estão preenchidas. Em produção, o
upload local **é recusado de propósito** (filesystem não persiste em
serverless).

### "Cannot find module" em dev

Mesma solução do cache do `.next`: pare o dev, apague `.next`, reabra.

### Pedido não aparece em `/admin/pedidos` mesmo eu clicando finalizar

Veja o Network do browser na hora do submit: a server action
`saveLeadOrderAction` retorna `ok: true` antes de abrir o WhatsApp. Se
não chega, há erro na action — confira o log do servidor (PM2 logs).

### Carrinho ficou com produto de estoque 0

Está protegido em runtime: `useCart.add()` ignora produtos com
`stock <= 0`. Carrinhos antigos persistidos em localStorage podem ter
o item. Cliente vê no checkout e pode remover.

### Cores do admin não refletem no site público

`/admin/personalizacao` salva as cores. O layout público faz cache de
60s — recarregue após 1 minuto ou force revalidação.

---

## 16. Endurecimento pós-auditoria (obrigatório para prod)

Itens acordados durante a revisão pré-produção. Complementa a seção 11
(VPS) e a seção 8 (segurança do admin).

### 16.1 Rate limit no login (Nginx)

Força-bruta no `/admin/login` não tem defesa no código — a proteção
mora no proxy. Adicione ao **bloco `http { … }` de `/etc/nginx/nginx.conf`**
(uma vez, global):

```nginx
limit_req_zone $binary_remote_addr zone=login_limit:10m rate=5r/m;
```

E dentro do server block do site (antes da location `/` genérica):

```nginx
location = /admin/login {
    limit_req zone=login_limit burst=5 nodelay;
    proxy_pass         http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header   Host $host;
    proxy_set_header   X-Real-IP $remote_addr;
    proxy_set_header   X-Forwarded-For  $proxy_add_x_forwarded_for;
    proxy_set_header   X-Forwarded-Proto $scheme;
}
```

Ajuste `127.0.0.1:3000` se seu PM2 subir em outra porta (ex.: 3100 se
divide a VPS com outro app na 3000).

Efeito: 5 requisições por minuto por IP no path `/admin/login`. Excedente
recebe `503 Service Temporarily Unavailable`. Testar:

```bash
for i in {1..10}; do curl -s -o /dev/null -w "%{http_code}\n" \
  https://traveltech.com.br/admin/login; done
```

Espera-se ver as 5 primeiras `200/302` e o restante `503`.

### 16.2 Remover `ADMIN_PASSWORD` do `.env.production` após seed

`ADMIN_PASSWORD` é lido **apenas** por `prisma/seed.ts` (`npm run db:seed`) —
o hash bcrypt do admin já grava no banco, depois disso a variável não é mais
usada em login.

Já `prisma/scripts/create-comercial-user.ts` lê a senha do usuário comercial
de uma variável separada, `COMERCIAL_ADMIN_PASSWORD` — nada de senha
hardcoded no repo. Uso:

```bash
COMERCIAL_ADMIN_PASSWORD="senha-temporaria" npm run admin:create-comercial
```

Se a variável estiver vazia ou ausente, o script encerra com mensagem clara
sem tocar no banco. Após criar o usuário e trocar a senha em `/admin/conta`,
remova a variável do ambiente.

Depois que o hash bcrypt está no banco, o login não usa mais essa
variável. Manter a senha em texto no `.env.production` é vazamento
evitável — qualquer sysadmin com acesso ao arquivo lê a senha.

Passos após a primeira execução em prod:

```bash
# 1. Logue em /admin/login com essa senha
# 2. Vá em /admin/conta e troque por senha forte (nova hash grava no banco)
# 3. Edite o env removendo a linha
sudo nano /home/deploy/traveltech/.env
# remova: ADMIN_PASSWORD=...

# 4. Reinicie
pm2 restart traveltech
```

O seed re-executado com `ADMIN_PASSWORD` vazia **não** derruba o admin
existente (upsert só cria se não houver — nunca sobrescreve senha
existente).

### 16.3 Importador DJI — `xlsx` fora de `dependencies`

O pacote `xlsx` tem CVE HIGH sem patch e foi **removido** do
`package.json` durante o hardening. Se precisar rodar
`npm run db:import-dji-products` de novo (ex.: para importar catálogo
atualizado), instale sob demanda sem persistir no lock:

```bash
npm i --no-save xlsx
npm run db:import-dji-products:dry
npm run db:import-dji-products
# limpar depois
npm ci
```

Nada da execução runtime do site depende de `xlsx`. O script continua
no repo em `prisma/scripts/import-dji-products.ts` como legado
documentado.

### 16.4 `AUTH_SECRET` fresco por ambiente

Nunca reaproveitar o secret do dev em prod, nem entre projetos. Gerar:

```bash
openssl rand -hex 48       # recomendado
# ou:
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Colar no `.env.production` como:

```
AUTH_SECRET="a1b2c3...96chars"
```

`src/lib/auth.ts` recusa subir com secret na lista `WEAK_DEFAULTS`
(inclui `"dev-secret-troque-em-producao-com-32-chars-ou-mais"` e
similares) — se o server der `throw new Error("AUTH_SECRET is a known
weak default")`, foi por causa disso.

### 16.5 Segurança de rede (firewall)

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

Apenas 22 (SSH), 80 e 443 abertos externamente. O Node continua
ouvindo em `127.0.0.1:3000` (ou 3100) — inacessível pela internet
direta, só via Nginx.

### 16.6 Backup de SQLite (se ainda não migrou para PG)

Cronjob de backup diário obrigatório:

```bash
sudo mkdir -p /var/backups/traveltech
sudo tee /etc/cron.d/traveltech-backup <<'EOF'
0 3 * * * deploy cp /var/lib/traveltech/prod.db /var/backups/traveltech/prod-$(date +\%F).db && find /var/backups/traveltech -mtime +14 -delete
EOF
```

Restore em incidente:

```bash
pm2 stop traveltech
cp /var/backups/traveltech/prod-2026-07-13.db /var/lib/traveltech/prod.db
pm2 start traveltech
```

Se você aceitou o risco de manter SQLite temporariamente, veja seção 4
para o caminho de migração para Postgres quando quiser.
