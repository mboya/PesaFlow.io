class RootController < ApplicationController
  # Skip tenant scoping for root endpoint (no tenant needed for basic health check)
  skip_before_action :set_current_tenant, raise: false

  def index
    render json: {
      status: "ok",
      service: "pesaflow-backend",
      message: "API is running",
      endpoints: {
        health: "/health",
        api_health: "/api/v1/health",
        rails_health: "/up"
      }
    }, status: :ok
  end
end
