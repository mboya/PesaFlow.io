# Simplified Dockerfile for development only
# Ruby version matches .ruby-version file (3.3.7)
FROM ruby:3.3-alpine

# Install dependencies
RUN apk update && \
    apk add --no-cache \
    build-base \
    postgresql-dev \
    postgresql-libs \
    yaml-dev \
    yaml \
    tzdata \
    git \
    nodejs

WORKDIR /app

# Set environment variable for timezone data
ENV TZINFO_DATA_SOURCE=ruby \
    BUNDLE_PATH=/usr/local/bundle

# Copy dependency files (code will be mounted as volume)
COPY Gemfile Gemfile.lock ./

# Install gems (will be cached in bundle_cache volume)
RUN bundle install --jobs 4 --retry 3

EXPOSE 3000

# Default command (can be overridden in docker-compose)
CMD ["bundle", "exec", "rails", "s", "-b", "0.0.0.0", "-p", "3000"]
