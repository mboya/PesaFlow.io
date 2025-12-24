# Combined Dockerfile for deploying both backend and frontend together
# This uses a process manager (supervisord) to run both services

FROM node:20-slim AS frontend-base
WORKDIR /app/frontend

# Install frontend dependencies
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci

# Build frontend
COPY frontend/ ./
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
# Increase Node.js memory limit for build
ENV NODE_OPTIONS="--max-old-space-size=4096"
RUN npm run build

# Copy standalone build if it exists, otherwise copy regular build
RUN if [ -d ".next/standalone" ]; then \
      cp -r .next/standalone /app/frontend-standalone; \
    else \
      mkdir -p /app/frontend-standalone && \
      cp -r .next /app/frontend-standalone/.next && \
      cp -r public /app/frontend-standalone/public && \
      cp server.js /app/frontend-standalone/ && \
      cp package.json /app/frontend-standalone/; \
    fi

# Ruby base for backend
ARG RUBY_VERSION=3.3.7
FROM docker.io/library/ruby:$RUBY_VERSION-slim AS backend-base

WORKDIR /rails

# Install base packages
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y \
      curl \
      libjemalloc2 \
      libvips \
      postgresql-client \
      supervisor \
      && \
    rm -rf /var/lib/apt/lists /var/cache/apt/archives

# Set production environment
ENV RAILS_ENV="production" \
    BUNDLE_DEPLOYMENT="1" \
    BUNDLE_PATH="/usr/local/bundle" \
    BUNDLE_WITHOUT="development"

# Build stage for backend
FROM backend-base AS backend-build

# Install packages needed to build gems
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y \
      build-essential \
      git \
      libpq-dev \
      pkg-config \
      libyaml-dev \
      && \
    rm -rf /var/lib/apt/lists /var/cache/apt/archives

# Install application gems
COPY backend/Gemfile backend/Gemfile.lock ./
RUN bundle install && \
    rm -rf ~/.bundle/ "${BUNDLE_PATH}"/ruby/*/cache "${BUNDLE_PATH}"/ruby/*/bundler/gems/*/.git && \
    bundle exec bootsnap precompile --gemfile

# Copy application code
COPY backend/ ./

# Precompile bootsnap code for faster boot times
RUN bundle exec bootsnap precompile app/ lib/

# Final stage - combined
FROM backend-base

# Copy backend built artifacts
COPY --from=backend-build "${BUNDLE_PATH}" "${BUNDLE_PATH}"
COPY --from=backend-build /rails /rails

# Copy frontend built artifacts
COPY --from=frontend-base /app/frontend-standalone /app/frontend

# Install frontend production dependencies (if not in standalone)
WORKDIR /app/frontend
RUN if [ ! -d "node_modules" ]; then npm install --production --ignore-scripts; fi

# Create supervisord configuration
RUN mkdir -p /etc/supervisor/conf.d && \
    echo '[supervisord]' > /etc/supervisor/conf.d/supervisord.conf && \
    echo 'nodaemon=true' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo 'user=root' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo '' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo '[program:backend]' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo 'command=/rails/bin/docker-entrypoint ./bin/rails server -b 0.0.0.0 -p 3000' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo 'directory=/rails' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo 'autostart=true' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo 'autorestart=true' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo 'stderr_logfile=/dev/stderr' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo 'stderr_logfile_maxbytes=0' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo 'stdout_logfile=/dev/stdout' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo 'stdout_logfile_maxbytes=0' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo 'environment=RAILS_ENV="production"' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo '' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo '[program:frontend]' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo 'command=sh -c "PORT=$${PORT:-3001} node server.js"' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo 'directory=/app/frontend' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo 'autostart=true' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo 'autorestart=true' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo 'stderr_logfile=/dev/stderr' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo 'stderr_logfile_maxbytes=0' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo 'stdout_logfile=/dev/stdout' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo 'stdout_logfile_maxbytes=0' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo 'environment=NODE_ENV="production",BACKEND_INTERNAL_URL="http://localhost:3000"' >> /etc/supervisor/conf.d/supervisord.conf

# Run and own only the runtime files as a non-root user for security
RUN groupadd --system --gid 1000 rails && \
    useradd rails --uid 1000 --gid 1000 --create-home --shell /bin/bash && \
    mkdir -p /rails/db /rails/log /rails/storage /rails/tmp && \
    chown -R rails:rails /rails/db /rails/log /rails/storage /rails/tmp && \
    chown -R rails:rails /app/frontend

# Expose ports
EXPOSE 3000 3001

# Start supervisord to run both services
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
