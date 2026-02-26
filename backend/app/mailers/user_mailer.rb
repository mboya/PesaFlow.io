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

  def login_otp_email(user, otp_code)
    @user = user
    @otp_code = otp_code.to_s
    @app_name = "PesaFlow"
    @otp_ttl_minutes = (User::EMAIL_LOGIN_OTP_TTL / 60).to_i

    mail(
      to: @user.email,
      subject: "Your #{@app_name} login code"
    )
  end
end
