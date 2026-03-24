# syntax=docker/dockerfile:1

FROM node:20-alpine AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate
COPY package.json pnpm-lock.yaml ./
# prepare script runs prisma generate — schema must exist before install
COPY prisma ./prisma
RUN pnpm install --frozen-lockfile
COPY src ./src
COPY tsconfig.json ./
RUN pnpm exec prisma generate && pnpm exec tsc

FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
# Prisma engines on Alpine (musl) need OpenSSL
RUN apk add --no-cache openssl \
  && corepack enable && corepack prepare pnpm@latest --activate
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma
COPY --from=builder /app/dist ./dist
# ignore-scripts: package "prepare" runs prisma generate, which breaks after prune removes prisma
RUN pnpm config set ignore-scripts true \
  && pnpm install --frozen-lockfile \
  && pnpm dlx prisma@6.19.1 generate \
  && pnpm prune --prod \
  && chown -R node:node /app
USER node
EXPOSE 8000
CMD ["node", "dist/server.js"]
