FactoryBot.define do
  factory :user do
    email { Faker::Internet.unique.email }
    password { "password123" }
    password_confirmation { "password123" }
    otp_enabled { false }
    otp_secret_key { nil }
    backup_codes { [] }

    trait :with_otp do
      otp_secret_key { ROTP::Base32.random }
      otp_enabled { true }
      backup_codes { Array.new(10) { SecureRandom.alphanumeric(8).upcase } }
    end

    trait :otp_setup_but_not_enabled do
      otp_secret_key { ROTP::Base32.random }
      otp_enabled { false }
    end
  end
end
