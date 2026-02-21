return unless defined?(Sentry)

dsn = ENV["SENTRY_DSN"].to_s.strip
return if dsn.empty?

raw_traces_sample_rate = begin
  Float(ENV.fetch("SENTRY_TRACES_SAMPLE_RATE", "0.0"))
rescue ArgumentError, TypeError
  0.0
end
traces_sample_rate = raw_traces_sample_rate.clamp(0.0, 1.0)

Sentry.init do |config|
  config.dsn = dsn
  config.environment = ENV.fetch("SENTRY_ENVIRONMENT", Rails.env)
  config.release = ENV["SENTRY_RELEASE"] if ENV["SENTRY_RELEASE"].present?
  config.breadcrumbs_logger = [ :active_support_logger, :http_logger ]
  config.traces_sample_rate = traces_sample_rate
  config.send_default_pii = ENV.fetch("SENTRY_SEND_DEFAULT_PII", "false") == "true"
  config.enabled_environments = %w[development staging production]
end
