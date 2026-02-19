require_relative "boot"

require "rails"
# Pick the frameworks you want:
require "active_model/railtie"
require "active_job/railtie"
require "active_record/railtie"
require "active_storage/engine"
require "action_controller/railtie"
require "action_mailer/railtie"
require "action_mailbox/engine"
require "action_text/engine"
require "action_view/railtie"
require "action_cable/engine"
# require "rails/test_unit/railtie"

# Require the gems listed in Gemfile, including any gems
# you've limited to :test, :development, or :production.
Bundler.require(*Rails.groups)

module Backend
  class Application < Rails::Application
    # Initialize configuration defaults for originally generated Rails version.
    config.load_defaults 7.2

    # Please, add to the `ignore` list any other `lib` subdirectories that do
    # not contain `.rb` files, or that should not be reloaded or eager loaded.
    # Common ones are `templates`, `generators`, or `middleware`, for example.
    config.autoload_lib(ignore: %w[assets tasks])

    # This repository keeps production environment config committed and may omit
    # development/test files locally, so set a safe eager-load default.
    config.eager_load = Rails.env.production?

    # Configuration for the application, engines, and railties goes here.
    #
    # These settings can be overridden in specific environments using the files
    # in config/environments, which are processed later.
    #
    # config.time_zone = "Central Time (US & Canada)"
    # config.eager_load_paths << Rails.root.join("extras")

    # Only loads a smaller set of middleware suitable for API only apps.
    # Middleware like session, flash, cookies can be added back manually.
    # Skip views, helpers and assets when generating a new resource.
    config.api_only = true

    # Allow Docker service hostnames used for internal proxying between frontend and backend.
    # Comma-separated override example: RAILS_ALLOWED_INTERNAL_HOSTS=backend,frontend,api.local
    ENV.fetch("RAILS_ALLOWED_INTERNAL_HOSTS", "backend,frontend").split(",").map(&:strip).reject(&:empty?).each do |host|
      config.hosts << host
      config.hosts << /\A#{Regexp.escape(host)}(?::\d+)?\z/
    end

    # Enable session middleware for Devise/Warden (required for JWT authentication)
    # Use cookie store with minimal settings - sessions are only used temporarily
    # during authentication, JWT tokens handle actual authentication
    config.middleware.use ActionDispatch::Cookies
    config.middleware.use ActionDispatch::Session::CookieStore,
      key: "_pesaflow_session",
      expire_after: nil, # Don't persist sessions
      httponly: true,
      secure: Rails.env.production?,
      same_site: :lax

    # Configure Active Job to use Sidekiq
    config.active_job.queue_adapter = :sidekiq

    # Configure Action Mailer SMTP so web and Sidekiq containers do not fall back
    # to localhost:25 in development.
    if Rails.env.test?
      config.action_mailer.delivery_method = :test
    else
      config.action_mailer.delivery_method = :smtp
      config.action_mailer.default_url_options = {
        host: ENV.fetch("APP_HOST", "localhost"),
        port: ENV.fetch("APP_PORT", 3001).to_i,
        protocol: ENV.fetch("APP_PROTOCOL", "http")
      }

      smtp_settings = {
        address: ENV.fetch("SMTP_HOST", "localhost"),
        port: ENV.fetch("SMTP_PORT", 25).to_i,
        enable_starttls_auto: ENV.fetch("SMTP_ENABLE_STARTTLS_AUTO", "false") == "true"
      }
      smtp_settings[:domain] = ENV["SMTP_DOMAIN"] if ENV["SMTP_DOMAIN"].present?
      smtp_settings[:user_name] = ENV["SMTP_USERNAME"] if ENV["SMTP_USERNAME"].present?
      smtp_settings[:password] = ENV["SMTP_PASSWORD"] if ENV["SMTP_PASSWORD"].present?
      smtp_settings[:authentication] = ENV["SMTP_AUTHENTICATION"].to_sym if ENV["SMTP_AUTHENTICATION"].present?
      config.action_mailer.smtp_settings = smtp_settings
    end

    # Enable rack-attack middleware for rate limiting
    config.middleware.use Rack::Attack
  end
end
