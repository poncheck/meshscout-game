FROM node:20-alpine AS base

# Build stage
FROM base AS builder
WORKDIR /app

# Copy entire project
COPY . .

# Install dependencies for database package
RUN cd packages/database && npm install

# Generate Prisma Client
RUN cd packages/database && npx prisma generate

# Build database package
RUN cd packages/database && npm run build

# Install dependencies for ingestion service
RUN cd services/ingestion && npm install

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
