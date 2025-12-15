require "rails_helper"

RSpec.describe "Protected API", type: :request do
  describe "GET /api/v1/protected" do
    let(:user) { create(:user) }
    let(:token) { login_user(user) }

    context "with valid token" do
      it "returns 200" do
        get "/api/v1/protected", headers: auth_headers(token), as: :json

        expect(response).to have_http_status(:ok)
        json_response = JSON.parse(response.body)
        expect(json_response["data"]["message"]).to eq("This is a protected endpoint")
      end
    end

    context "without token" do
      it "returns 401" do
        get "/api/v1/protected", as: :json

        expect(response).to have_http_status(:unauthorized)
      end
    end
  end
end
