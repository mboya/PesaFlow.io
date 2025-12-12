Rails.application.routes.draw do
  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html

  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  # Can be used by load balancers and uptime monitors to verify that the app is live.
  get "up" => "rails/health#show", as: :rails_health_check

  # Detailed health check endpoint with service status
  get "health" => "health#show", as: :health_check

  # API routes
  namespace :api do
    namespace :v1 do
      # API health check endpoint
      get "health" => "health#show", as: :api_health_check
    end
  end

  # Defines the root path route ("/")
  # root "posts#index"
end
