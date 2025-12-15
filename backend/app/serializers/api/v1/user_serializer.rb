module Api
  module V1
    class UserSerializer
      def self.serialize(user)
        {
          id: user.id,
          email: user.email,
          created_at: user.created_at.iso8601,
          otp_enabled: user.otp_enabled
        }
      end
    end
  end
end
