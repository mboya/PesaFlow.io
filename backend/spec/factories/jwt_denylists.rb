FactoryBot.define do
  factory :jwt_denylist do
    jti { SecureRandom.uuid }
    exp { 30.minutes.from_now }
  end
end
