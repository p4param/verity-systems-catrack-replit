# Stage 1: Build dependencies
FROM node:20-alpine AS builder
WORKDIR /app

# Install openssl for Prisma binary compatibility on Alpine
RUN apk add --no-cache openssl

# Copy package files and prisma schema first (layer caching)
COPY package*.json ./
COPY prisma ./prisma/

# Install all dependencies (including devDeps needed for build)
RUN npm ci

# Copy rest of source
COPY . .

# Generate Prisma client (linux-musl-openssl-3.0.x binary for Alpine)
RUN npx prisma generate

# Build Next.js app
RUN npm run build

# Copy Prisma engine into .next/server so Next.js can find it at runtime
RUN cp -r /app/src/generated/client/*.node /app/.next/server/ 2>/dev/null || true

# Stage 2: Production runner
FROM node:20-alpine AS runner
WORKDIR /app

# Install openssl for Prisma at runtime
RUN apk add --no-cache openssl

ENV NODE_ENV=production
# Required so Next.js listens on all interfaces inside Docker
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

# Copy build artifacts from builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/scripts ./scripts
# Copy generated Prisma client (includes native engine binary)
COPY --from=builder /app/src/generated ./src/generated

EXPOSE 3000

CMD ["npm", "start"]
