require 'rails_helper'

RSpec.describe "Tenant Identification", type: :request do
  let!(:default_tenant) { ActsAsTenant.without_tenant { create(:tenant, subdomain: 'default', status: 'active') } }
  let!(:tenant1) { ActsAsTenant.without_tenant { create(:tenant, subdomain: 'tenant1', status: 'active') } }
  let!(:suspended_tenant) { ActsAsTenant.without_tenant { create(:tenant, subdomain: 'suspended', status: 'suspended') } }
  let!(:user) { ActsAsTenant.without_tenant { create(:user, tenant: tenant1) } }
  let(:token) { login_user(user) }

  describe "X-Tenant-Subdomain header" do
    it "identifies tenant from header" do
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
    end
  end

  describe "X-Tenant-ID header" do
    it "identifies tenant from ID header" do
      get "/api/v1/current_user", headers: auth_headers(token).merge('X-Tenant-ID' => tenant1.id.to_s)
      expect(response).to have_http_status(:success)
    end
  end

  describe "authenticated user tenant" do
    it "uses user's tenant when no header provided" do
      get "/api/v1/current_user", headers: auth_headers(token)
      expect(response).to have_http_status(:success)
      # User's tenant should be used
    end

    it "assigns default tenant to user without tenant" do
      user_without_tenant = ActsAsTenant.without_tenant { create(:user, tenant_id: nil) }
      token = login_user(user_without_tenant)

      get "/api/v1/current_user", headers: auth_headers(token)
      expect(response).to have_http_status(:success)

      user_without_tenant.reload
      expect(user_without_tenant.tenant_id).to eq(default_tenant.id)
    end
  end

  describe "fallback to default tenant" do
    it "uses default tenant when no identification method works" do
      # Create a user without tenant and don't provide headers
      user_without_tenant = ActsAsTenant.without_tenant { create(:user, tenant_id: nil) }
      token = login_user(user_without_tenant)

      get "/api/v1/current_user", headers: auth_headers(token)
      expect(response).to have_http_status(:success)
    end
  end

  describe "tenant scoping in queries" do
    let!(:customer1) { ActsAsTenant.without_tenant { create(:customer, user: user, tenant: tenant1) } }
    let!(:subscription1) { ActsAsTenant.without_tenant { create(:subscription, customer: customer1, tenant: tenant1) } }

    let!(:tenant2) { ActsAsTenant.without_tenant { create(:tenant, subdomain: 'tenant2') } }
    let!(:user2) { ActsAsTenant.without_tenant { create(:user, tenant: tenant2) } }
    let!(:customer2) { ActsAsTenant.without_tenant { create(:customer, user: user2, tenant: tenant2) } }
    let!(:subscription2) { ActsAsTenant.without_tenant { create(:subscription, customer: customer2, tenant: tenant2) } }

    it "only returns subscriptions for current tenant" do
      get "/api/v1/subscriptions", headers: auth_headers(token).merge('X-Tenant-Subdomain' => 'tenant1')
      expect(response).to have_http_status(:success)

      json_response = JSON.parse(response.body)
      subscriptions = json_response.is_a?(Array) ? json_response : (json_response['data'] || [])
      subscription_ids = subscriptions.map { |s| s['id'] || s[:id] }

      expect(subscription_ids).to include(subscription1.id)
      expect(subscription_ids).not_to include(subscription2.id)
    end
  end
end
