# ── Stage 1: Install deps + build ──────────────────────────────
FROM node:20-slim AS builder
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ && \
    rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
RUN npm install --legacy-peer-deps

COPY . .
RUN npm run build

# ── Stage 2: Production ────────────────────────────────────────
FROM node:20-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV NEXT_TELEMETRY_DISABLED=1

# Copy node_modules from builder (compiled on same Debian base)
COPY --from=builder /app/node_modules ./node_modules

# Copy Next.js build output
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/package.json ./

# Copy public assets
COPY --from=builder /app/public ./public

# Copy runtime source (schema, db init, utils)
COPY --from=builder /app/src/lib/db/schema.ts ./src/lib/db/schema.ts
COPY --from=builder /app/src/lib/db/index.ts ./src/lib/db/index.ts
COPY --from=builder /app/src/lib/db/queries.ts ./src/lib/db/queries.ts
COPY --from=builder /app/src/lib/settings.ts ./src/lib/settings.ts
COPY --from=builder /app/src/lib/validation.ts ./src/lib/validation.ts
COPY --from=builder /app/src/lib/task-utils.ts ./src/lib/task-utils.ts
COPY --from=builder /app/src/lib/daily-state.ts ./src/lib/daily-state.ts
COPY --from=builder /app/src/lib/utils.ts ./src/lib/utils.ts

# Copy drizzle migrations
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/drizzle.config.ts ./

RUN mkdir -p /app/data

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

CMD ["npx", "next", "start", "-H", "0.0.0.0"]
