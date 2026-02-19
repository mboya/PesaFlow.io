require "rails_helper"

RSpec.describe UserMailer, type: :mailer do
  let(:user) { create(:user, email: "new-user@example.com") }

  describe "welcome_email" do
    let(:mail) { UserMailer.welcome_email(user) }

    it "renders the headers" do
      expect(mail.subject).to eq("Welcome to PesaFlow")
      expect(mail.to).to eq([ user.email ])
      expect(mail.from).to be_present
    end

    it "renders the body" do
      expect(mail.body.encoded).to include("Welcome to PesaFlow")
      expect(mail.body.encoded).to include(user.email)
    end
  end
end
