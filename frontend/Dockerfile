# Frontend Dockerfile for production deployment
FROM node:20-slim AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Install build dependencies for native modules (lightningcss)
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies - use npm install to allow rebuilding native modules
RUN npm install --include=optional && \
    npm rebuild lightningcss

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app

# Install build dependencies in builder stage too (needed for native modules during build)
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Verify and rebuild lightningcss native bindings in builder stage
RUN npm rebuild lightningcss && \
    ls -la node_modules/lightningcss/lightningcss.linux-x64-gnu.node || \
    (echo "Native binding not found, attempting manual build..." && \
     cd node_modules/lightningcss && \
     npm run build 2>&1 || echo "Manual build failed, continuing...")

# Set environment variables for build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
# Increase Node.js memory limit for build
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Build the application
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 --gid nodejs --create-home nextjs

# Copy necessary files from standalone build
COPY --from=builder /app/public ./public

# Copy standalone build output if it exists, otherwise copy regular build
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy server.js and package.json (needed for custom server)
COPY --from=builder --chown=nextjs:nodejs /app/server.js ./server.js
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json

# Install production dependencies for server.js (http-proxy-middleware)
RUN npm install --production --ignore-scripts

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Use custom server.js for WebSocket proxy support
CMD ["node", "server.js"]
