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

      # Authentication routes
      devise_for :users, path: "", path_names: {
        sign_in: "login",
        sign_out: "logout",
        registration: "signup"
      }, controllers: {
        sessions: "api/v1/sessions",
        registrations: "api/v1/registrations"
      }

      # User routes
      get "current_user", to: "users#current_user"

      # OTP routes
      post "otp/enable", to: "otp#enable"
      post "otp/verify", to: "otp#verify"
      post "otp/disable", to: "otp#disable"
      post "otp/verify_login", to: "otp#verify_login"
      post "otp/backup_codes", to: "otp#backup_codes"
      get "otp/qr_code", to: "otp#qr_code"

      # Protected route example
      get "protected", to: "protected#index"
    end
  end

  # Defines the root path route ("/")
  # root "posts#index"
end
