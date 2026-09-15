# Multi-stage production Dockerfile for Suchi SaaS API
# Stage 1: Build & Prisma generation
FROM node:22-slim AS builder

RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy root workspace and packages
COPY package.json package-lock.json ./
COPY packages ./packages

# Install workspace dependencies and generate Prisma client
RUN npm ci --legacy-peer-deps
RUN npm --prefix packages/database run generate

# Install backend dependencies
COPY backend/package.json backend/package-lock.json ./backend/
WORKDIR /app/backend
RUN npm ci --legacy-peer-deps

# Copy generated Prisma client into backend node_modules so backend can resolve it directly
RUN cp -r /app/packages/database/node_modules/@prisma/client /app/backend/node_modules/@prisma/ 2>/dev/null || cp -r /app/node_modules/@prisma/client /app/backend/node_modules/@prisma/
RUN cp -r /app/packages/database/node_modules/.prisma /app/backend/node_modules/ 2>/dev/null || cp -r /app/node_modules/.prisma /app/backend/node_modules/ 2>/dev/null || true

# Stage 2: Minimal production runtime
FROM node:22-slim AS runner

RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates curl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Copy packages and installed backend dependencies
COPY --from=builder /app/packages /app/packages
COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/backend/node_modules /app/backend/node_modules
COPY backend /app/backend
COPY package.json /app/

# Run as non-root user
USER node

EXPOSE 5000

HEALTHCHECK --interval=15s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5000/api/health || exit 1

WORKDIR /app/backend
CMD ["sh", "-c", "npm --prefix /app/packages/database run migrate:deploy && node /app/backend/saas/server.js"]
