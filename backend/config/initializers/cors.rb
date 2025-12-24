# backend/config/initializers/cors.rb
Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    # Allow requests from frontend domain(s)
    # In production, set FRONTEND_URL environment variable
    # For development, allow localhost
    origins(
      ENV.fetch("FRONTEND_URL", "http://localhost:3001"),
      "http://localhost:3001",
      "http://127.0.0.1:3001",
      # Allow Render frontend URLs (wildcard for *.onrender.com)
      /https?:\/\/.*\.onrender\.com/,
      # Allow custom domain if set
      ENV.fetch("FRONTEND_CUSTOM_DOMAIN", "").split(",").map(&:strip).reject(&:empty?)
    ).flatten.compact

    resource "*",
             headers: :any,
             methods: [ :get, :post, :put, :patch, :delete, :options, :head ],
             expose: [ "Authorization" ],
             credentials: true
  end
end
