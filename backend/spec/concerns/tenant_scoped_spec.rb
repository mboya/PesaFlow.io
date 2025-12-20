require 'rails_helper'

# Test TenantScoped concern through request specs
# The concern is included in ApplicationController, so we test it via actual API endpoints
RSpec.describe TenantScoped, type: :request do
  let!(:default_tenant) { ActsAsTenant.without_tenant { create(:tenant, subdomain: 'default', status: 'active') } }
  let!(:tenant1) { ActsAsTenant.without_tenant { create(:tenant, subdomain: 'tenant1', status: 'active') } }
  let!(:suspended_tenant) { ActsAsTenant.without_tenant { create(:tenant, subdomain: 'suspended', status: 'suspended') } }
  let!(:user) { ActsAsTenant.without_tenant { create(:user, tenant: tenant1) } }
  let(:token) { login_user(user) }

  describe "#set_current_tenant" do
    context "with X-Tenant-Subdomain header" do
      it "sets tenant from header" do
        get "/api/v1/current_user", headers: auth_headers(token).merge('X-Tenant-Subdomain' => 'tenant1')
        expect(response).to have_http_status(:success)
      end

      it "is case insensitive" do
        get "/api/v1/current_user", headers: auth_headers(token).merge('X-Tenant-Subdomain' => 'TENANT1')
        expect(response).to have_http_status(:success)
      end

      it "strips whitespace" do
        get "/api/v1/current_user", headers: auth_headers(token).merge('X-Tenant-Subdomain' => '  tenant1  ')
        expect(response).to have_http_status(:success)
      end

      it "returns 403 for suspended tenant" do
        get "/api/v1/current_user", headers: auth_headers(token).merge('X-Tenant-Subdomain' => 'suspended')
        expect(response).to have_http_status(:forbidden)
        expect(JSON.parse(response.body)['error']).to include('suspended')
      end

      it "returns 403 for cancelled tenant" do
        cancelled = ActsAsTenant.without_tenant { create(:tenant, subdomain: 'cancelled', status: 'cancelled') }
        get "/api/v1/current_user", headers: auth_headers(token).merge('X-Tenant-Subdomain' => 'cancelled')
        expect(response).to have_http_status(:forbidden)
      end
    end

    context "with X-Tenant-ID header" do
      it "sets tenant from ID header" do
        get "/api/v1/current_user", headers: auth_headers(token).merge('X-Tenant-ID' => tenant1.id.to_s)
        expect(response).to have_http_status(:success)
      end
    end

    context "without tenant identification" do
      it "falls back to default tenant for API endpoints" do
        get "/api/v1/current_user", headers: auth_headers(token)
        expect(response).to have_http_status(:success)
      end
    end

    context "for webhook endpoints" do
      it "allows webhooks to proceed without tenant" do
        # Webhooks infer tenant from payload, so they can proceed without explicit tenant
        post "/webhooks/stk_push/callback", params: {}.to_json, 
             headers: { 'Content-Type' => 'application/json' }
        # Should not return 401/403 for missing tenant
        expect(response.status).not_to eq(401)
        expect(response.status).not_to eq(403)
      end
    end
  end
end

