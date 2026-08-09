# Multi-stage Dockerfile for Intelligent Teacher Recruitment Platform - Backend

# Stage 1: Builder
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package descriptors and prisma schema
COPY package*.json ./
COPY prisma ./prisma/

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy source code and tsconfig files
COPY tsconfig.json ./
COPY prisma.config.ts ./
COPY src ./src/

# Generate Prisma Client and build TypeScript source
RUN npx prisma generate
RUN npm run build

# Stage 2: Production Runner
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Install curl for health check execution
RUN apk add --no-cache curl

# Copy package descriptors and install production dependencies only
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy built application, generated Prisma client, and schema from builder with node user ownership
COPY --chown=node:node --from=builder /app/src/generated ./src/generated
COPY --chown=node:node --from=builder /app/dist ./dist
COPY --chown=node:node --from=builder /app/prisma ./prisma

# Create uploads directory and assign ownership to node user
RUN mkdir -p /app/uploads && chown -R node:node /app

# Use unprivileged node user for security
USER node

EXPOSE 3000

# Container healthcheck against /health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:${PORT:-3000}/health || exit 1

# Run migrations and start production server
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
