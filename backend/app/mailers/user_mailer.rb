class UserMailer < ApplicationMailer
  def welcome_email(user)
    @user = user
    @app_name = "PesaFlow"
    @dashboard_url = ENV.fetch("FRONTEND_URL", "http://localhost:3001")

    mail(
      to: @user.email,
      subject: "Welcome to #{@app_name}"
    )
  end
end
