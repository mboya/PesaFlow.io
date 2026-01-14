class ApplicationMailer < ActionMailer::Base
  default from: ENV.fetch("SMTP_FROM_EMAIL", ENV.fetch("MAILER_FROM", "noreply@pesaflow.io"))
  layout "mailer"
end
