require "rails_helper"

RSpec.describe "Sessions API", type: :request do
  describe "POST /api/v1/login" do
    context "with valid credentials (no OTP)" do
      let(:user) { create(:user, email: "test@example.com", password: "password123") }

      it "returns 200 and JWT token" do
        post "/api/v1/login", params: {
          user: {
            email: "test@example.com",
            password: "password123"
          }
        }, as: :json

        expect(response).to have_http_status(:ok)
        expect(response.headers["Authorization"]).to be_present
        expect(response.headers["Authorization"]).to start_with("Bearer ")
      end

      it "includes Authorization header" do
        post "/api/v1/login", params: {
          user: {
            email: "test@example.com",
            password: "password123"
          }
        }, as: :json

        token = extract_jwt_token(response)
        expect(token).to be_present
      end
    end

    context "with valid credentials (OTP enabled)" do
      let(:user) { create(:user, :with_otp, email: "test@example.com", password: "password123") }

      it "returns 200 without JWT, requires OTP" do
        post "/api/v1/login", params: {
          user: {
            email: "test@example.com",
            password: "password123"
          }
        }, as: :json

        expect(response).to have_http_status(:ok)
        expect(response.headers["Authorization"]).not_to be_present

        json_response = JSON.parse(response.body)
        expect(json_response["otp_required"]).to be true
        expect(json_response["user_id"]).to eq(user.id)
      end
    end

    context "with invalid email" do
      it "returns 401" do
        post "/api/v1/login", params: {
          user: {
            email: "nonexistent@example.com",
            password: "password123"
          }
        }, as: :json

        expect(response).to have_http_status(:unauthorized)
      end
    end

    context "with invalid password" do
      let!(:user) { create(:user, email: "test@example.com", password: "password123") }

      it "returns 401" do
        post "/api/v1/login", params: {
          user: {
            email: "test@example.com",
            password: "wrongpassword"
          }
        }, as: :json

        expect(response).to have_http_status(:unauthorized)
      end
    end

    context "with missing params" do
      it "returns 401" do
        post "/api/v1/login", params: {
          user: {
            email: "test@example.com"
          }
        }, as: :json

        expect(response).to have_http_status(:unauthorized)
      end
    end
  end

  describe "DELETE /api/v1/logout" do
    let(:user) { create(:user) }
    let(:token) { login_user(user) }

    context "with valid token" do
      it "returns 200" do
        delete "/api/v1/logout", headers: auth_headers(token), as: :json

        expect(response).to have_http_status(:ok)
        json_response = JSON.parse(response.body)
        expect(json_response["status"]["message"]).to eq("Logged out successfully")
      end

      it "adds token to denylist" do
        delete "/api/v1/logout", headers: auth_headers(token), as: :json

        # Token should be revoked
        # We can verify by trying to use it again
        get "/api/v1/current_user", headers: auth_headers(token), as: :json
        expect(response).to have_http_status(:unauthorized)
      end
    end

    context "without token" do
      it "returns 401" do
        delete "/api/v1/logout", as: :json

        expect(response).to have_http_status(:unauthorized)
      end
    end

    context "with revoked token" do
      let(:token) { login_user(user) }

      before do
        delete "/api/v1/logout", headers: auth_headers(token), as: :json
      end

      it "returns 401" do
        delete "/api/v1/logout", headers: auth_headers(token), as: :json

        expect(response).to have_http_status(:unauthorized)
      end
    end
  end
end
