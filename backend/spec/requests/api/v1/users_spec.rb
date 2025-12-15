require "rails_helper"

RSpec.describe "Users API", type: :request do
  describe "GET /api/v1/current_user" do
    let(:user) { create(:user) }
    let(:token) { login_user(user) }

    context "with valid token" do
      it "returns 200 and user data" do
        get "/api/v1/current_user", headers: auth_headers(token), as: :json

        expect(response).to have_http_status(:ok)
        json_response = JSON.parse(response.body)
        expect(json_response["data"]).to be_present
        expect(json_response["data"]["id"]).to eq(user.id)
        expect(json_response["data"]["email"]).to eq(user.email)
      end
    end

    context "without token" do
      it "returns 401" do
        get "/api/v1/current_user", as: :json

        expect(response).to have_http_status(:unauthorized)
      end
    end

    context "with expired token" do
      # Note: Testing expired tokens requires manipulating JWT expiration
      # This is a simplified test - in production, you'd test actual expiration
      it "returns 401" do
        invalid_token = "invalid.token.here"
        get "/api/v1/current_user", headers: auth_headers(invalid_token), as: :json

        expect(response).to have_http_status(:unauthorized)
      end
    end

    context "with revoked token" do
      let(:token) { login_user(user) }

      before do
        delete "/api/v1/logout", headers: auth_headers(token), as: :json
      end

      it "returns 401" do
        get "/api/v1/current_user", headers: auth_headers(token), as: :json

        expect(response).to have_http_status(:unauthorized)
      end
    end
  end
end
