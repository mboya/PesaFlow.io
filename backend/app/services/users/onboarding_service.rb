module Users
  class OnboardingService
    class << self
      def ensure_customer(user)
        return nil unless user

        existing_customer = existing_customer_for(user)
        return existing_customer if existing_customer.present?

        name = user.email.to_s.split("@").first.to_s.split(/[._]/).map(&:capitalize).join(" ")
        name = user.email if name.blank?

        Customer.create!(
          user: user,
          tenant: user.tenant,
          name: name,
          email: user.email,
          phone_number: nil,
          status: "active"
        )
      rescue StandardError => e
        Rails.logger.error("Failed to create customer for user #{user&.id}: #{Security::PiiMasker.mask_free_text(e.message)}")
        nil
      end

      def send_welcome_email(user, async: true)
        return nil unless user&.email.present?

        delivery = UserMailer.welcome_email(user)
        async ? delivery.deliver_later : delivery.deliver_now
      rescue StandardError => e
        Rails.logger.error("Failed to send welcome email for user #{user&.id}: #{Security::PiiMasker.mask_free_text(e.message)}")
        nil
      end

      private

      def existing_customer_for(user)
        ActsAsTenant.without_tenant { Customer.find_by(user_id: user.id) }
      end
    end
  end
end
