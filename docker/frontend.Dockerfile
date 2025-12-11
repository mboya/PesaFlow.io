# Multi-stage build for optimized Next.js frontend image
# Stage 1: Dependencies stage - install dependencies only
FROM node:20-alpine AS deps

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (needed for both dev and build)
# Use npm install instead of npm ci since package-lock.json may not exist
RUN npm install && \
    npm cache clean --force

# Stage 2: Development/Builder stage
FROM node:20-alpine AS development

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy application source
COPY . .

# Set environment variables
ENV NEXT_TELEMETRY_DISABLED=1

# Expose port
EXPOSE 3000

# Default to dev mode (can be overridden in docker-compose)
CMD ["npm", "run", "dev"]

# Stage 3: Builder stage - build the Next.js application for production
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy application source
COPY . .

# Set build-time environment variables
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Build the application
RUN npm run build

# Stage 4: Production runtime stage - minimal image
FROM node:20-alpine AS production

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user for security
RUN addgroup -g 1000 -S appgroup && \
    adduser -u 1000 -S appuser -G appgroup

# Copy package files and node_modules from deps stage
COPY --from=deps /app/package*.json ./
COPY --from=deps /app/node_modules ./node_modules
# Remove dev dependencies to reduce image size
RUN npm prune --production && \
    npm cache clean --force

# Copy built application from builder stage
COPY --from=builder --chown=appuser:appgroup /app/.next ./.next
COPY --from=builder --chown=appuser:appgroup /app/public ./public
COPY --from=builder --chown=appuser:appgroup /app/next.config.ts ./

# Switch to non-root user
USER appuser

EXPOSE 3000

# Use production server
CMD ["npm", "run", "start"]
