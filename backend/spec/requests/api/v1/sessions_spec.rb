require "rails_helper"

RSpec.describe "Sessions API", type: :request do
  describe "POST /api/v1/login" do
    context "with valid credentials (no OTP)" do
      let!(:user) { create(:user, email: "test@example.com", password: "password123") }

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
      let!(:user) { create(:user, :with_otp, email: "test@example.com", password: "password123") }

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

    context "with the same email in multiple tenants" do
      let!(:default_tenant) do
        ActsAsTenant.without_tenant do
          Tenant.find_or_create_by!(subdomain: "default") do |tenant|
            tenant.name = "Default Tenant"
            tenant.status = "active"
            tenant.settings = {}
          end
        end
      end
      let!(:tenant_one) do
        ActsAsTenant.without_tenant do
          Tenant.find_or_create_by!(subdomain: "tenant-one") do |tenant|
            tenant.name = "Tenant One"
            tenant.status = "active"
            tenant.settings = {}
          end
        end
      end
      let!(:default_user) do
        ActsAsTenant.without_tenant do
          create(:user, email: "shared@example.com", password: "default-password", tenant: default_tenant)
        end
      end
      let!(:tenant_one_user) do
        ActsAsTenant.without_tenant do
          create(:user, email: "shared@example.com", password: "tenant-one-password", tenant: tenant_one)
        end
      end

      it "authenticates using tenant header context" do
        post "/api/v1/login", params: {
          user: {
            email: "shared@example.com",
            password: "tenant-one-password"
          }
        }, headers: { "X-Tenant-Subdomain" => "tenant-one" }, as: :json

        expect(response).to have_http_status(:ok)
        json_response = JSON.parse(response.body)
        expect(json_response.dig("data", "id")).to eq(tenant_one_user.id)
        expect(json_response.dig("data", "tenant_id")).to eq(tenant_one.id)
      end

      it "rejects credentials from a different tenant when header context is provided" do
        post "/api/v1/login", params: {
          user: {
            email: "shared@example.com",
            password: "default-password"
          }
        }, headers: { "X-Tenant-Subdomain" => "tenant-one" }, as: :json

        expect(response).to have_http_status(:unauthorized)
      end

      it "falls back to default tenant when no tenant context is provided" do
        post "/api/v1/login", params: {
          user: {
            email: "shared@example.com",
            password: "default-password"
          }
        }, as: :json

        expect(response).to have_http_status(:ok)
        json_response = JSON.parse(response.body)
        expect(json_response.dig("data", "id")).to eq(default_user.id)
        expect(json_response.dig("data", "tenant_id")).to eq(default_tenant.id)
      end

      it "returns unauthorized for a non-existent tenant header" do
        post "/api/v1/login", params: {
          user: {
            email: "shared@example.com",
            password: "default-password"
          }
        }, headers: { "X-Tenant-Subdomain" => "missing-tenant" }, as: :json

        expect(response).to have_http_status(:unauthorized)
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

  describe "POST /api/v1/google_login" do
    around do |example|
      previous_google_client_id = ENV["GOOGLE_CLIENT_ID"]
      ENV["GOOGLE_CLIENT_ID"] = "google-client-id"
      begin
        example.run
      ensure
        ENV["GOOGLE_CLIENT_ID"] = previous_google_client_id
      end
    end

    let(:google_payload) do
      {
        "email" => "google-user@example.com",
        "email_verified" => true
      }
    end

    before do
      allow(GoogleIdTokenVerifier).to receive(:verify!).and_return(google_payload)
    end

    context "with an existing user without OTP" do
      let!(:user) { create(:user, email: "google-user@example.com", password: "password123") }

      it "returns 200 and a JWT token" do
        post "/api/v1/google_login", params: { credential: "valid-google-token" }, as: :json

        expect(response).to have_http_status(:ok)
        expect(response.headers["Authorization"]).to start_with("Bearer ")
        expect(GoogleIdTokenVerifier).to have_received(:verify!).with("valid-google-token", audience: "google-client-id")

        json_response = JSON.parse(response.body)
        expect(json_response.dig("data", "id")).to eq(user.id)
        expect(json_response.dig("data", "email")).to eq(user.email)
      end
    end

    context "with an existing user with OTP enabled" do
      let!(:user) { create(:user, :with_otp, email: "google-user@example.com", password: "password123") }

      it "returns OTP required response without JWT" do
        post "/api/v1/google_login", params: { credential: "valid-google-token" }, as: :json

        expect(response).to have_http_status(:ok)
        expect(response.headers["Authorization"]).not_to be_present

        json_response = JSON.parse(response.body)
        expect(json_response["otp_required"]).to be(true)
        expect(json_response["user_id"]).to eq(user.id)
      end
    end

    context "when user does not exist" do
      it "creates a new user and customer in the current tenant" do
        default_tenant = ActsAsTenant.without_tenant { Tenant.find_by!(subdomain: "default") }

        expect do
          post "/api/v1/google_login", params: { credential: "valid-google-token" }, as: :json
        end.to change(User, :count).by(1).and change(Customer, :count).by(1)

        expect(response).to have_http_status(:ok)

        created_user = ActsAsTenant.without_tenant do
          User.find_by(email: "google-user@example.com", tenant_id: default_tenant.id)
        end
        expect(created_user).to be_present
      end
    end

    context "with invalid Google credential" do
      before do
        allow(GoogleIdTokenVerifier).to receive(:verify!)
          .and_raise(GoogleIdTokenVerifier::VerificationError, "bad token")
      end

      it "returns 401" do
        post "/api/v1/google_login", params: { credential: "invalid-token" }, as: :json

        expect(response).to have_http_status(:unauthorized)
      end
    end

    context "without credential param" do
      it "returns 401" do
        post "/api/v1/google_login", params: {}, as: :json

        expect(response).to have_http_status(:unauthorized)
      end
    end

    context "when Google client ID is not configured" do
      before do
        ENV["GOOGLE_CLIENT_ID"] = nil
      end

      it "returns 503" do
        post "/api/v1/google_login", params: { credential: "valid-google-token" }, as: :json

        expect(response).to have_http_status(:service_unavailable)
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
