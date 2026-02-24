# syntax=docker/dockerfile:1.7
# Simplified Dockerfile for development only
FROM node:20-alpine

WORKDIR /app

# Set environment variables
ENV NEXT_TELEMETRY_DISABLED=1 \
    NPM_CONFIG_AUDIT=false \
    NPM_CONFIG_FUND=false

# Copy package files
COPY package*.json ./

# Copy entrypoint script
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Install dependencies (will be cached in anonymous volume)
RUN --mount=type=cache,target=/root/.npm npm install --include=optional --prefer-offline

# Set entrypoint
ENTRYPOINT ["docker-entrypoint.sh"]

# Expose port
EXPOSE 3000

# Default to dev mode (can be overridden in docker-compose)
CMD ["npm", "run", "dev"]
