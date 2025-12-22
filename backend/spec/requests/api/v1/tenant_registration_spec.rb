require 'rails_helper'

RSpec.describe "Tenant Assignment During Registration", type: :request do
  let!(:default_tenant) { ActsAsTenant.without_tenant { create(:tenant, subdomain: 'default', status: 'active') } }
  let!(:tenant1) { ActsAsTenant.without_tenant { create(:tenant, subdomain: 'tenant1', status: 'active') } }

  describe "POST /api/v1/signup" do
    let(:user_params) do
      {
        user: {
          email: "newuser@example.com",
          password: "password123"
        }
      }
    end

    context "with X-Tenant-Subdomain header" do
      it "assigns tenant from header to new user" do
        post "/api/v1/signup", params: user_params,
             headers: { 'X-Tenant-Subdomain' => 'tenant1' }, as: :json

        expect(response).to have_http_status(:ok)

        user = User.find_by(email: "newuser@example.com")
        expect(user).to be_present
        expect(user.tenant_id).to eq(tenant1.id)
      end

      it "creates customer with same tenant" do
        post "/api/v1/signup", params: user_params,
             headers: { 'X-Tenant-Subdomain' => 'tenant1' }, as: :json

        expect(response).to have_http_status(:ok)

        user = User.find_by(email: "newuser@example.com")
        customer = Customer.find_by(user: user)
        expect(customer).to be_present
        expect(customer.tenant_id).to eq(tenant1.id)
      end
    end

    context "with X-Tenant-ID header" do
      it "assigns tenant from ID header to new user" do
        post "/api/v1/signup", params: user_params,
             headers: { 'X-Tenant-ID' => tenant1.id.to_s }, as: :json

        expect(response).to have_http_status(:ok)

        user = User.find_by(email: "newuser@example.com")
        expect(user.tenant_id).to eq(tenant1.id)
      end
    end

    context "without tenant header" do
      it "falls back to default tenant" do
        post "/api/v1/signup", params: user_params, as: :json

        expect(response).to have_http_status(:ok)

        user = User.find_by(email: "newuser@example.com")
        expect(user).to be_present
        expect(user.tenant_id).to eq(default_tenant.id)
      end
    end

    context "with invalid tenant" do
      it "returns error for non-existent tenant" do
        post "/api/v1/signup", params: user_params,
             headers: { 'X-Tenant-Subdomain' => 'nonexistent' }, as: :json

        expect(response).to have_http_status(:unprocessable_entity)
        expect(JSON.parse(response.body)['status']['message']).to include('tenant')
      end

      it "returns error for suspended tenant" do
        suspended = ActsAsTenant.without_tenant { create(:tenant, subdomain: 'suspended', status: 'suspended') }
        post "/api/v1/signup", params: user_params,
             headers: { 'X-Tenant-Subdomain' => 'suspended' }, as: :json

        # Suspended tenant returns 403 (forbidden) from TenantScoped concern
        expect(response).to have_http_status(:forbidden)
      end
    end

    context "email uniqueness scoped by tenant" do
      xit "allows same email for different tenants" do
        ActsAsTenant.without_tenant do
          # Create user in tenant1
          post "/api/v1/signup", params: user_params,
               headers: { 'X-Tenant-Subdomain' => 'tenant1' }, as: :json
          expect(response).to have_http_status(:ok)

          # Create user with same email in default tenant
          user_params2 = {
            user: {
              email: "newuser@example.com",
              password: "password123"
            }
          }
          post "/api/v1/signup", params: user_params2,
               headers: { 'X-Tenant-Subdomain' => 'default' }, as: :json
          expect(response).to have_http_status(:ok)

          # Both users should exist
          expect(User.where(email: "newuser@example.com").count).to eq(2)
        end
      end

      it "prevents duplicate email within same tenant" do
        ActsAsTenant.without_tenant do
          # Create first user
          post "/api/v1/signup", params: user_params,
               headers: { 'X-Tenant-Subdomain' => 'tenant1' }, as: :json
          expect(response).to have_http_status(:ok)

          # Try to create duplicate
          post "/api/v1/signup", params: user_params,
               headers: { 'X-Tenant-Subdomain' => 'tenant1' }, as: :json
          expect(response).to have_http_status(:unprocessable_entity)
        end
      end
    end
  end
end
