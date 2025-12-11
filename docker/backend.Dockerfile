# Multi-stage build for optimized Rails backend image
# Stage 1: Build stage - includes all build dependencies
FROM ruby:3.2-alpine AS builder

# Update package index and install build dependencies
# Using BuildKit cache mount to cache apk index for faster subsequent builds
RUN --mount=type=cache,target=/var/cache/apk \
    apk update && \
    apk add --no-cache \
    build-base \
    postgresql-dev \
    yaml-dev \
    tzdata \
    git \
    nodejs

WORKDIR /app

# Copy dependency files
COPY Gemfile Gemfile.lock ./

# Install all gems (including dev/test for development)
# In production, we can exclude dev/test gems
RUN bundle install --jobs 4 --retry 3 && \
    bundle clean --force

# Copy application code
COPY . .

# Precompile bootsnap cache for faster startup (if bootsnap is available)
RUN if bundle list | grep -q bootsnap; then \
        bundle exec bootsnap precompile --gemfile app/ lib/ || true; \
    fi

# Stage 2: Runtime stage - minimal runtime dependencies only
FROM ruby:3.2-alpine AS runtime

# Install only runtime dependencies (no build tools)
# Using BuildKit cache mount to cache apk index for faster subsequent builds
RUN --mount=type=cache,target=/var/cache/apk \
    apk update && \
    apk add --no-cache \
    postgresql-libs \
    yaml \
    tzdata \
    nodejs

WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1000 -S appgroup && \
    adduser -u 1000 -S appuser -G appgroup

# Copy gems from builder stage
COPY --from=builder /usr/local/bundle /usr/local/bundle

# Copy application code from builder stage
COPY --from=builder --chown=appuser:appgroup /app /app

# Set environment variable to use tzinfo-data gem for timezone data
# This is required for Alpine Linux (musl) which doesn't have system zoneinfo
ENV TZINFO_DATA_SOURCE=ruby

# Switch to non-root user
USER appuser

EXPOSE 3000

# Default command (can be overridden in docker-compose)
CMD ["bundle", "exec", "rails", "s", "-b", "0.0.0.0", "-p", "3000"]

# Stage 3: Development stage - includes dev tools, runs as root for volume mounts
FROM builder AS development

# tzdata already installed in builder stage, no need to reinstall

WORKDIR /app

# Set environment variable to use tzinfo-data gem for timezone data
# This is required for Alpine Linux (musl) which doesn't have system zoneinfo
ENV TZINFO_DATA_SOURCE=ruby

# Keep as root for development (allows volume mounts to work properly)
# In production, use the runtime stage which runs as non-root

EXPOSE 3000

CMD ["bundle", "exec", "rails", "s", "-b", "0.0.0.0", "-p", "3000"]
