FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
COPY packages/database/package.json ./packages/database/
COPY services/ingestion/package.json ./services/ingestion/

# Install dependencies
RUN npm ci

# Build stage
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma Client
RUN cd packages/database && npx prisma generate

# Build ingestion service
RUN cd services/ingestion && npm run build

# Production stage
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy necessary files
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/database ./packages/database
COPY --from=builder /app/services/ingestion/dist ./services/ingestion/dist
COPY --from=builder /app/services/ingestion/package.json ./services/ingestion/

# Run as non-root user
USER node

WORKDIR /app/services/ingestion

CMD ["node", "dist/index.js"]
