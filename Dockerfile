FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first for caching
COPY package.json package-lock.json* ./
RUN npm ci --quiet

# Copy source code
COPY prisma ./prisma/
COPY src ./src/


# Run Prisma migration and generate client
RUN npx prisma generate --schema=prisma/schema.prisma
RUN npx prisma db push --schema=prisma/schema.prisma

# Production build
RUN npm run build

FROM node:20-alpine AS runtime

WORKDIR /app

# Copy built artifacts from builder
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/public ./public

# Set non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

CMD ["node", "server.js"]