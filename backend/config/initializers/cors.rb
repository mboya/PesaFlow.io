# backend/config/initializers/cors.rb
Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    # Allow origins from environment variable (for production) or default to localhost
    origins_env = ENV.fetch("ALLOWED_ORIGINS", "localhost:3001,127.0.0.1:3001")
    origins origins_env.split(",").map(&:strip)

    resource "*",
             headers: :any,
             methods: [ :get, :post, :put, :patch, :delete, :options, :head ],
             expose: [ "Authorization", "X-Tenant-Subdomain", "X-Tenant-ID" ],
             credentials: true
  end
end
