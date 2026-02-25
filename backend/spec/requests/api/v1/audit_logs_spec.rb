require "rails_helper"

RSpec.describe "Audit Logs API", type: :request do
  let(:tenant) { create(:tenant) }
  let(:member_user) { ActsAsTenant.without_tenant { create(:user, tenant: tenant) } }
  let(:support_user) { ActsAsTenant.without_tenant { create(:user, :support, tenant: tenant) } }
  let(:member_token) { login_user(member_user) }
  let(:support_token) { login_user(support_user) }

  before do
    ActsAsTenant.with_tenant(tenant) do
      AuditLog.create!(
        tenant: tenant,
        actor: support_user,
        action: "spec.seeded",
        status: "success",
        request_id: SecureRandom.uuid,
        occurred_at: Time.current,
        changeset: { email: "user@example.com" },
        metadata: { source: "spec" }
      )
    end
  end

  describe "GET /api/v1/audit_logs" do
    it "forbids regular members" do
      get "/api/v1/audit_logs", headers: auth_headers(member_token), as: :json

      expect(response).to have_http_status(:forbidden)
    end

    it "allows support users and returns logs" do
      get "/api/v1/audit_logs", headers: auth_headers(support_token), as: :json

      expect(response).to have_http_status(:ok)
      parsed = JSON.parse(response.body)
      expect(parsed["data"]).to be_an(Array)
      expect(parsed["data"].first).to include("action")
    end
  end
end
