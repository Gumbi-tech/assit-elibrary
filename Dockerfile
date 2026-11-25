FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first for caching
COPY package.json package-lock.json* ./
RUN npm ci --quiet

# Copy Prisma schema, TypeScript/Next configs, and app directories
COPY prisma ./prisma/
COPY tsconfig.json ./
COPY next.config.js ./
COPY public ./public/
COPY src ./src/
# Uncomment or adjust if these folders exist at the project root instead of inside src/:
# COPY context ./context/
# COPY components ./components/

# Generate Prisma Client (no DB connection required)
RUN npx prisma generate --schema=prisma/schema.prisma

# Production standalone build
RUN npm run build

FROM node:20-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Create non-root user and owned /app directory
RUN addgroup -S appgroup && adduser -S appuser -G appgroup \
  && chown -R appuser:appgroup /app

# Copy standalone server, static assets, and Prisma files
COPY --from=builder --chown=appuser:appgroup /app/.next/standalone ./
COPY --from=builder --chown=appuser:appgroup /app/public ./public
COPY --from=builder --chown=appuser:appgroup /app/.next/static ./.next/static
COPY --from=builder --chown=appuser:appgroup /app/prisma ./prisma

USER appuser

EXPOSE 3000

CMD ["node", "server.js"]