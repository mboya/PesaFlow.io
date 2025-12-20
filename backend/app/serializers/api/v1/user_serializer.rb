module Api
  module V1
    class UserSerializer
      def self.serialize(user)
        data = {
          id: user.id,
          email: user.email,
          created_at: user.created_at.iso8601,
          otp_enabled: user.otp_enabled
        }
        
        # Include tenant subdomain if user has a tenant (useful for frontend after signup)
        if user.tenant.present?
          data[:tenant_subdomain] = user.tenant.subdomain
          data[:tenant_id] = user.tenant_id
        end
        
        data
      end
    end
  end
end
