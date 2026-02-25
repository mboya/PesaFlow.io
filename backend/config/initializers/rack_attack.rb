# Rate limiting configuration using Rack::Attack
# See https://github.com/rack/rack-attack for documentation

require "ipaddr"
require "json"

class Rack::Attack
  AUTH_PATH_PATTERN = %r{\A/api/v1/(login|google_login|signup|registration|otp(?:/.*)?)\z}.freeze
  OTP_VERIFY_PATH_PATTERN = %r{\A/api/v1/otp/(verify|verify_login)\z}.freeze

  AUTH_IP_LIMIT = ENV.fetch("RACK_ATTACK_AUTH_IP_LIMIT", "20").to_i
  AUTH_IP_PERIOD_SECONDS = ENV.fetch("RACK_ATTACK_AUTH_IP_PERIOD_SECONDS", "60").to_i
  AUTH_EMAIL_LIMIT = ENV.fetch("RACK_ATTACK_AUTH_EMAIL_LIMIT", "8").to_i
  AUTH_EMAIL_PERIOD_SECONDS = ENV.fetch("RACK_ATTACK_AUTH_EMAIL_PERIOD_SECONDS", "300").to_i

  OTP_IP_LIMIT = ENV.fetch("RACK_ATTACK_OTP_IP_LIMIT", "8").to_i
  OTP_IP_PERIOD_SECONDS = ENV.fetch("RACK_ATTACK_OTP_IP_PERIOD_SECONDS", "300").to_i
  OTP_EMAIL_LIMIT = ENV.fetch("RACK_ATTACK_OTP_EMAIL_LIMIT", "5").to_i
  OTP_EMAIL_PERIOD_SECONDS = ENV.fetch("RACK_ATTACK_OTP_EMAIL_PERIOD_SECONDS", "300").to_i

  API_IP_LIMIT = ENV.fetch("RACK_ATTACK_API_IP_LIMIT", "300").to_i
  API_IP_PERIOD_SECONDS = ENV.fetch("RACK_ATTACK_API_IP_PERIOD_SECONDS", "60").to_i
  WEBHOOK_IP_LIMIT = ENV.fetch("RACK_ATTACK_WEBHOOK_IP_LIMIT", "400").to_i
  WEBHOOK_IP_PERIOD_SECONDS = ENV.fetch("RACK_ATTACK_WEBHOOK_IP_PERIOD_SECONDS", "60").to_i
  REQ_IP_LIMIT = ENV.fetch("RACK_ATTACK_REQ_IP_LIMIT", "1200").to_i
  REQ_IP_PERIOD_SECONDS = ENV.fetch("RACK_ATTACK_REQ_IP_PERIOD_SECONDS", "300").to_i

  # Configure Redis store for rate limiting.
  Rack::Attack.cache.store = ActiveSupport::Cache::RedisCacheStore.new(
    url: ENV.fetch("REDIS_URL", "redis://localhost:6379/0")
  )

  class << self
    def auth_request?(req)
      req.post? && req.path.match?(AUTH_PATH_PATTERN)
    end

    def otp_verify_request?(req)
      req.post? && req.path.match?(OTP_VERIFY_PATH_PATTERN)
    end

    def health_request?(req)
      req.path.start_with?("/up") || req.path.start_with?("/health")
    end

    def client_identifier(req)
      forwarded_for = req.get_header("HTTP_X_FORWARDED_FOR").to_s
      forwarded_for.split(",").map(&:strip).each do |candidate|
        return candidate if valid_ip?(candidate)
      end

      x_real_ip = req.get_header("HTTP_X_REAL_IP").to_s.strip
      return x_real_ip if valid_ip?(x_real_ip)

      remote_ip = req.get_header("action_dispatch.remote_ip").to_s.strip
      return remote_ip if valid_ip?(remote_ip)

      request_ip = req.ip.to_s.strip
      return request_ip if valid_ip?(request_ip)

      remote_addr = req.get_header("REMOTE_ADDR").to_s.strip
      return remote_addr if valid_ip?(remote_addr)

      "unknown"
    end

    def normalized_email(value)
      email = value.to_s.downcase.strip
      return nil if email.empty?

      email
    end

    def extract_email(req)
      return nil unless req.post?
      return nil unless req.content_type.to_s.include?("application/json")

      payload = parsed_json_body(req)
      normalized_email(payload.dig("user", "email") || payload["email"])
    end

    def parsed_json_body(req)
      cache_key = "rack.attack.parsed_json_body"
      return req.env[cache_key] if req.env.key?(cache_key)

      req.env[cache_key] = begin
        body = req.body.read
        req.body.rewind
        body.strip.empty? ? {} : JSON.parse(body)
      rescue JSON::ParserError
        {}
      end
    end

    def valid_ip?(value)
      return false if value.blank?

      IPAddr.new(value)
      true
    rescue IPAddr::InvalidAddressError
      false
    end

    def match_data_value(match_data, key, default = nil)
      match_data[key] || match_data[key.to_s] || default
    end
  end

  # Enable logging for blocked requests.
  ActiveSupport::Notifications.subscribe("rack.attack") do |_name, _start, _finish, request_id, payload|
    begin
      request = payload.is_a?(Hash) ? payload[:request] || payload["request"] : nil
      env = request&.env || {}
      matched = env["rack.attack.matched"] || env["rack.attack.match_type"] || "unknown"
      path = request&.path || env["PATH_INFO"] || "unknown"
      ip = request&.ip || env["action_dispatch.remote_ip"] || env["REMOTE_ADDR"] || "unknown"
      Rails.logger.warn("[Rack::Attack] Blocked request: #{matched} - #{path} - IP: #{ip} - Request ID: #{request_id}")
    rescue StandardError => e
      Rails.logger.error("[Rack::Attack] Error logging blocked request: #{e.class} - #{e.message}")
    end
  end

  # Safelist health checks and test suite traffic.
  safelist("allow-health-checks") { |req| health_request?(req) }
  safelist("allow-test-suite") { |_req| Rails.env.test? }

  # Throttle authentication endpoints by client and endpoint.
  throttle("auth/ip", limit: AUTH_IP_LIMIT, period: AUTH_IP_PERIOD_SECONDS.seconds) do |req|
    next unless auth_request?(req)

    "#{client_identifier(req)}:#{req.path}"
  end

  # Throttle authentication endpoints by email and endpoint.
  throttle("auth/email", limit: AUTH_EMAIL_LIMIT, period: AUTH_EMAIL_PERIOD_SECONDS.seconds) do |req|
    next unless auth_request?(req)

    email = extract_email(req)
    next if email.blank?

    "#{email}:#{req.path}"
  end

  # OTP endpoints are intentionally stricter than generic auth.
  throttle("otp/ip", limit: OTP_IP_LIMIT, period: OTP_IP_PERIOD_SECONDS.seconds) do |req|
    next unless otp_verify_request?(req)

    client_identifier(req)
  end

  throttle("otp/email", limit: OTP_EMAIL_LIMIT, period: OTP_EMAIL_PERIOD_SECONDS.seconds) do |req|
    next unless otp_verify_request?(req)

    extract_email(req)
  end

  # Throttle general API traffic.
  throttle("api/ip", limit: API_IP_LIMIT, period: API_IP_PERIOD_SECONDS.seconds) do |req|
    next unless req.path.start_with?("/api/v1/")
    next if auth_request?(req) || req.path.start_with?("/api/v1/health")

    client_identifier(req)
  end

  # Throttle webhook traffic.
  throttle("webhooks/ip", limit: WEBHOOK_IP_LIMIT, period: WEBHOOK_IP_PERIOD_SECONDS.seconds) do |req|
    next unless req.path.start_with?("/webhooks/")

    client_identifier(req)
  end

  # Global IP safeguard for non-health traffic.
  throttle("req/ip", limit: REQ_IP_LIMIT, period: REQ_IP_PERIOD_SECONDS.seconds) do |req|
    next if health_request?(req)

    client_identifier(req)
  end

  # Custom response for throttled requests.
  self.throttled_responder = lambda do |request|
    env = request.env
    match_data = env["rack.attack.match_data"] || {}
    throttle_name = (env["rack.attack.matched"] || env["rack.attack.match_type"] || "throttle").to_s

    now = Rack::Attack.match_data_value(match_data, :epoch_time, Time.now.to_i).to_i
    period = Rack::Attack.match_data_value(match_data, :period, 60).to_i
    period = 60 if period <= 0
    retry_after = period - (now % period)
    retry_after = period if retry_after <= 0

    limit = Rack::Attack.match_data_value(match_data, :limit, 0).to_i

    headers = {
      "Content-Type" => "application/json",
      "Retry-After" => retry_after.to_s,
      "X-RateLimit-Limit" => limit.to_s,
      "X-RateLimit-Remaining" => "0",
      "X-RateLimit-Reset" => (now + retry_after).to_s
    }

    message = case throttle_name
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
