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

# Install dependencies for API service
RUN cd services/api && npm install

# Build API service
RUN cd services/api && npm run build

# Production stage
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy necessary files
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/database ./packages/database
COPY --from=builder /app/services/api/dist ./services/api/dist
COPY --from=builder /app/services/api/package.json ./services/api/

# Run as non-root user
USER node

WORKDIR /app/services/api

EXPOSE 3001

CMD ["node", "dist/index.js"]
