FROM node:20-alpine AS base

# Build stage
FROM base AS builder
WORKDIR /app/services/web

# Copy web service files
COPY services/web/package.json services/web/package-lock.json* ./
RUN npm install

# Copy the rest of the web service files
COPY services/web .

# Set build-time environment variables
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_MAPBOX_TOKEN
ARG NEXT_PUBLIC_WS_URL

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_MAPBOX_TOKEN=$NEXT_PUBLIC_MAPBOX_TOKEN
ENV NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL

# Build Next.js
RUN npm run build

# Production stage
FROM base AS runner
WORKDIR /app/services/web

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built files and dependencies from builder
COPY --from=builder --chown=nextjs:nodejs /app/services/web/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/services/web/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/services/web/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/services/web/package.json ./package.json

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node_modules/.bin/next", "start"]
