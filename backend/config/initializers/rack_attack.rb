# Rate limiting configuration using Rack::Attack
# See https://github.com/rack/rack-attack for documentation

class Rack::Attack
  # Configure Redis store for rate limiting
  # Uses the same Redis connection as Sidekiq
  Rack::Attack.cache.store = ActiveSupport::Cache::RedisCacheStore.new(
    url: ENV.fetch("REDIS_URL", "redis://localhost:6379/0")
  )

  # Enable logging
  ActiveSupport::Notifications.subscribe("rack.attack") do |_name, _start, _finish, _request_id, request|
    # The request parameter can be a Rack::Request object or a Hash depending on Rack::Attack version
    begin
      if request.is_a?(Hash)
        # If it's a hash (newer Rack::Attack versions), extract values from hash
        match_type = request['rack.attack.match_type'] || request[:match_type] || 'unknown'
        path = request['PATH_INFO'] || request[:path] || request['path'] || 'unknown'
        ip = request['REMOTE_ADDR'] || request[:ip] || request['ip'] || 'unknown'
        Rails.logger.warn("[Rack::Attack] Blocked request: #{match_type} - #{path} - IP: #{ip}")
      elsif request.respond_to?(:env) && request.respond_to?(:path) && request.respond_to?(:ip)
        # Standard Rack::Request object (older versions)
        match_type = request.env['rack.attack.match_type'] || 'unknown'
        Rails.logger.warn("[Rack::Attack] Blocked request: #{match_type} - #{request.path} - IP: #{request.ip}")
      else
        # Fallback logging if format is unexpected
        Rails.logger.warn("[Rack::Attack] Blocked request (request_id: #{_request_id}, type: #{request.class})")
      end
    rescue => e
      # Don't let logging errors break the application
      Rails.logger.error("[Rack::Attack] Error logging blocked request: #{e.class} - #{e.message}")
    end
  end

  # Safelist - allow these requests to bypass rate limiting
  # Health checks and internal endpoints
  safelist("allow-health-checks") do |req|
    req.path.start_with?("/up") || req.path.start_with?("/health")
  end

  # Throttle authentication endpoints (login, signup, OTP)
  # Limit: 5 requests per 20 seconds per IP
  throttle("auth/ip", limit: 5, period: 20.seconds) do |req|
    if req.path.match?(%r{/api/v1/(login|google_login|signup|registration|otp)})
      req.ip
    end
  end

  # Throttle authentication endpoints by email
  # Limit: 3 requests per 1 minute per email (prevents brute force on specific accounts)
  throttle("auth/email", limit: 3, period: 1.minute) do |req|
    if req.path.match?(%r{/api/v1/(login|google_login|signup|registration|otp)})
      # Extract email from request body
      if req.post? && req.content_type&.include?("application/json")
        begin
          body = req.body.read
          req.body.rewind
          params = JSON.parse(body)
          email = params.dig("user", "email") || params.dig("email")
          email&.downcase&.strip
        rescue JSON::ParserError
          nil
        end
      end
    end
  end

  # Throttle OTP verification endpoints more strictly
  # Limit: 5 requests per 5 minutes per IP (prevents OTP brute force)
  throttle("otp/ip", limit: 5, period: 5.minutes) do |req|
    if req.path.match?(%r{/api/v1/otp/(verify|verify_login)})
      req.ip
    end
  end

  # Throttle OTP verification by email
  # Limit: 3 requests per 5 minutes per email
  throttle("otp/email", limit: 3, period: 5.minutes) do |req|
    if req.path.match?(%r{/api/v1/otp/(verify|verify_login)})
      if req.post? && req.content_type&.include?("application/json")
        begin
          body = req.body.read
          req.body.rewind
          params = JSON.parse(body)
          email = params.dig("user", "email") || params.dig("email")
          email&.downcase&.strip
        rescue JSON::ParserError
          nil
        end
      end
    end
  end

  # Throttle general API endpoints for authenticated users
  # Limit: 100 requests per 1 minute per IP
  throttle("api/ip", limit: 100, period: 1.minute) do |req|
    if req.path.start_with?("/api/v1/") && !req.path.match?(%r{/api/v1/(login|google_login|signup|registration|otp|health)})
      req.ip
    end
  end

  # Throttle webhook endpoints (less restrictive, but still protected)
  # Limit: 200 requests per 1 minute per IP
  throttle("webhooks/ip", limit: 200, period: 1.minute) do |req|
    if req.path.start_with?("/webhooks/")
      req.ip
    end
  end

  # Block suspicious requests (too many requests from same IP)
  # Block: More than 300 requests per 5 minutes
  throttle("req/ip", limit: 300, period: 5.minutes) do |req|
    req.ip unless req.path.start_with?("/up") || req.path.start_with?("/health")
  end

  # Custom response for throttled requests
  self.throttled_responder = lambda do |env|
    match_data = env["rack.attack.match_data"]
    now = match_data[:epoch_time]
    retry_after = match_data[:period] - (now % match_data[:period])

    headers = {
      "Content-Type" => "application/json",
      "Retry-After" => retry_after.to_s,
      "X-RateLimit-Limit" => match_data[:limit].to_s,
      "X-RateLimit-Remaining" => "0",
      "X-RateLimit-Reset" => (now + retry_after).to_s
    }

    # Determine the error message based on the throttle type
    throttle_type = env["rack.attack.match_type"]
    message = case throttle_type
              when "auth/ip", "auth/email"
                "Too many authentication attempts. Please try again in #{retry_after} seconds."
              when "otp/ip", "otp/email"
                "Too many OTP verification attempts. Please try again in #{retry_after} seconds."
              when "api/ip"
                "API rate limit exceeded. Please try again in #{retry_after} seconds."
              when "webhooks/ip"
                "Webhook rate limit exceeded. Please try again in #{retry_after} seconds."
              else
                "Rate limit exceeded. Please try again in #{retry_after} seconds."
              end

    body = {
      status: {
        code: 429,
        message: message
      },
      error: "Too Many Requests",
      retry_after: retry_after
    }.to_json

    [429, headers, [body]]
  end
end
