module Api
  module V1
    class ProfileController < ApplicationController
      before_action :authenticate_api_v1_user!

      # GET /api/v1/profile
      def show
        customer = find_or_create_customer
        render_enveloped(
          resource: Api::V1::CustomerSerializer.render_as_hash(customer),
          status_code: 200,
          message: "Profile retrieved successfully"
        )
      end

      # PATCH/PUT /api/v1/profile
      def update
        customer = find_or_create_customer

        if customer.update(profile_params)
          render_enveloped(
            resource: Api::V1::CustomerSerializer.render_as_hash(customer),
            status_code: 200,
            message: "Profile updated successfully"
          )
        else
          render_enveloped(
            resource: { errors: customer.errors.full_messages },
            status_code: 422,
            message: "Profile could not be updated",
            error_code: "validation_error",
            http_status: :unprocessable_entity
          )
        end
      end

      private

      def find_or_create_customer
        customer = current_user_customer
        return customer if customer

        # Create customer if doesn't exist
        Customer.create!(
          user: current_user,
          name: current_user.email.split("@").first,
          email: current_user.email,
          status: "active"
        )
      end

      def profile_params
        params.require(:profile).permit(:name, :phone_number, :preferred_payment_day)
      end
    end
  end
end
