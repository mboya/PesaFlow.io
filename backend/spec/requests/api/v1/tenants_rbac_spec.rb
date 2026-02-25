require "rails_helper"

RSpec.describe "Tenants RBAC", type: :request do
  describe "POST /api/v1/tenants" do
    let(:member_user) { create(:user) }
    let(:admin_user) { create(:user, :admin) }
    let(:member_token) { login_user(member_user) }
    let(:admin_token) { login_user(admin_user) }

    let(:tenant_payload) do
      {
        tenant: {
          name: "Security Tenant",
          subdomain: "security-tenant-#{SecureRandom.hex(4)}",
          status: "active"
        }
      }
    end

    before do
      member_token
      admin_token
    end

    it "denies member users from creating tenants and writes an audit denial" do
      expect do
        post "/api/v1/tenants", params: tenant_payload, headers: auth_headers(member_token), as: :json
      end.not_to change { ActsAsTenant.without_tenant { Tenant.count } }

      expect(response).to have_http_status(:forbidden)

      denied_log_exists = ActsAsTenant.without_tenant do
        AuditLog.where(action: "authorization.denied", status: "denied")
                .where("metadata ->> 'permission' = ?", "manage_tenants")
                .exists?
      end
      expect(denied_log_exists).to be(true)
    end

    it "allows admin users to create tenants and writes an audit log" do
      expect do
        post "/api/v1/tenants", params: tenant_payload, headers: auth_headers(admin_token), as: :json
      end.to change { ActsAsTenant.without_tenant { Tenant.count } }.by(1)

      expect(response).to have_http_status(:created)

      created_tenant_id = JSON.parse(response.body)["id"]
      created_log_exists = ActsAsTenant.without_tenant do
        AuditLog.where(action: "tenant.created", status: "success")
                .where(auditable_type: "Tenant", auditable_id: created_tenant_id)
                .exists?
      end
      expect(created_log_exists).to be(true)
    end
  end
end
