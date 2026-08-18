# ── DeFi Alpha — Dockerfile (self-hosted) ──────────────────────────────
# Multi-stage: install → build → slim runtime

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
COPY --from=build /app/drizzle.config.ts ./
COPY --from=build /app/migrations ./migrations
COPY --from=build /app/shared ./shared
COPY --from=build /app/tsconfig.json ./
EXPOSE 5000
# Apply DB migrations when DATABASE_URL is present, then start
CMD ["sh", "-c", "if [ -n "$DATABASE_URL" ]; then npx drizzle-kit migrate; fi && node dist/index.cjs"]
