require "rails_helper"

RSpec.describe "Registrations API", type: :request do
  describe "POST /api/v1/signup" do
    context "with valid params" do
      let(:valid_params) do
        {
          user: {
            email: "test@example.com",
            password: "password123"
          }
        }
      end

      it "returns 200 and JWT token" do
        post "/api/v1/signup", params: valid_params, as: :json

        expect(response).to have_http_status(:ok)
        expect(response.headers["Authorization"]).to be_present
        expect(response.headers["Authorization"]).to start_with("Bearer ")
      end

      it "creates user in database" do
        expect {
          post "/api/v1/signup", params: valid_params, as: :json
        }.to change(User, :count).by(1)

        user = User.last
        expect(user.email).to eq("test@example.com")
      end

      it "creates associated customer record" do
        expect {
          post "/api/v1/signup", params: valid_params, as: :json
        }.to change(Customer, :count).by(1)

        user = User.last
        customer = user.customer
        expect(customer).to be_present
        expect(customer.email).to eq("test@example.com")
        expect(customer.name).to be_present
        expect(customer.status).to eq("active")
        expect(customer.user_id).to eq(user.id)
      end

      it "response includes user data" do
        post "/api/v1/signup", params: valid_params, as: :json

        json_response = JSON.parse(response.body)
        expect(json_response["data"]).to be_present
        expect(json_response["data"]["email"]).to eq("test@example.com")
        expect(json_response["data"]["id"]).to be_present
        expect(json_response["data"]["otp_enabled"]).to be false
      end

      it "response excludes sensitive data" do
        post "/api/v1/signup", params: valid_params, as: :json

        json_response = JSON.parse(response.body)
        expect(json_response["data"]).not_to have_key("password")
        expect(json_response["data"]).not_to have_key("encrypted_password")
        expect(json_response["data"]).not_to have_key("otp_secret_key")
        expect(json_response["data"]).not_to have_key("backup_codes")
      end
    end

    context "with invalid email" do
      it "returns 422" do
        post "/api/v1/signup", params: {
          user: {
            email: "invalid-email",
            password: "password123"
          }
        }, as: :json

        expect(response).to have_http_status(:unprocessable_entity)
        json_response = JSON.parse(response.body)
        expect(json_response["errors"]).to be_present
      end
    end

    context "with missing password" do
      it "returns 422" do
        post "/api/v1/signup", params: {
          user: {
            email: "test@example.com"
          }
        }, as: :json

        expect(response).to have_http_status(:unprocessable_entity)
        json_response = JSON.parse(response.body)
        expect(json_response["errors"]).to be_present
      end
    end

    context "with duplicate email" do
      let!(:existing_user) { create(:user, email: "existing@example.com") }

      it "returns 422" do
        post "/api/v1/signup", params: {
          user: {
            email: "existing@example.com",
            password: "password123"
          }
        }, as: :json

        expect(response).to have_http_status(:unprocessable_entity)
        json_response = JSON.parse(response.body)
        expect(json_response["errors"]).to be_present
      end
    end
  end
end
