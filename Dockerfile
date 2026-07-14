FROM node:22-bookworm-slim AS deps

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY prisma ./prisma

RUN npm ci


FROM node:22-bookworm-slim AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Variáveis falsas apenas para permitir build seguro.
# Em produção, o EasyPanel injeta os valores reais no runtime.
ENV DATABASE_URL=file:/tmp/traveltech-build.db
ENV AUTH_SECRET=build-time-placeholder-not-used-in-runtime-1234567890abcdef
ENV NEXT_PUBLIC_SITE_URL=https://traveltechb2b.com.br
ENV CLOUDINARY_CLOUD_NAME=build_placeholder
ENV CLOUDINARY_API_KEY=build_placeholder
ENV CLOUDINARY_API_SECRET=build_placeholder

# `npm run build` já chama `prisma generate && next build`.
# Não usamos `prisma db push` no build — o banco de produção é
# populado no runtime via `prisma migrate deploy` (ver entrypoint).
RUN npm run build


FROM node:22-bookworm-slim AS runner

WORKDIR /app

# sqlite3 é necessário para o entrypoint detectar bancos legados
# criados via `prisma db push` (sem tabela _prisma_migrations)
# e fazer baseline antes do `migrate deploy`.
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates sqlite3 \
  && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PORT=3100
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/next.config.mjs ./next.config.mjs
COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

EXPOSE 3100

# O entrypoint garante:
#   1. Diretório do SQLite existe (para volume persistente).
#   2. Baseline seguro se banco veio de `db push`.
#   3. `prisma migrate deploy` antes do server subir.
#   4. `npm run start` com `exec` para forward de sinais.
CMD ["/app/docker-entrypoint.sh"]
