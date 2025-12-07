FROM node:20-alpine AS base

# Build stage
FROM base AS builder
WORKDIR /app

# Copy entire project
COPY . .

# Install dependencies for web service
RUN cd services/web && npm install

# Set build-time environment variables
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_MAPBOX_TOKEN
ARG NEXT_PUBLIC_WS_URL

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_MAPBOX_TOKEN=$NEXT_PUBLIC_MAPBOX_TOKEN
ENV NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL

# Build Next.js
RUN cd services/web && npm run build

# Production stage
FROM base AS runner
WORKDIR /app/services/web

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/services/web/public ./public

# Copy node_modules and built files
COPY --from=builder --chown=nextjs:nodejs /app/services/web/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/services/web/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/services/web/package.json ./package.json

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node_modules/.bin/next", "start"]
