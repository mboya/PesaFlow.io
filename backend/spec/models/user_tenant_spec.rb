require 'rails_helper'

RSpec.describe User, type: :model do
  describe "multi-tenancy" do
    let!(:tenant1) { ActsAsTenant.without_tenant { create(:tenant, subdomain: 'tenant1') } }
    let!(:tenant2) { ActsAsTenant.without_tenant { create(:tenant, subdomain: 'tenant2') } }
    let!(:default_tenant) { ActsAsTenant.without_tenant { create(:tenant, subdomain: 'default') } }

    describe "tenant association" do
      it "belongs to tenant" do
        user = create(:user, tenant: tenant1)
        expect(user.tenant).to eq(tenant1)
      end

      it "can have nil tenant initially" do
        user = build(:user, tenant: nil)
        expect(user).to be_valid
      end
    end

    describe "ensure_tenant callback" do
      it "assigns default tenant on create if tenant_id is nil" do
        ActsAsTenant.without_tenant do
          user = create(:user, tenant_id: nil)
          expect(user.tenant_id).to eq(default_tenant.id)
        end
      end

      it "does not override explicitly set tenant" do
        ActsAsTenant.without_tenant do
          user = create(:user, tenant: tenant1)
          expect(user.tenant_id).to eq(tenant1.id)
        end
      end

      it "does not assign tenant if tenant_id is already present" do
        ActsAsTenant.without_tenant do
          user = build(:user, tenant_id: tenant1.id)
          user.valid?
          expect(user.tenant_id).to eq(tenant1.id)
        end
      end
    end

    describe "email uniqueness scoped by tenant" do
      it "allows same email for different tenants" do
        ActsAsTenant.without_tenant do
          user1 = create(:user, email: "test@example.com", tenant: tenant1)
          user2 = create(:user, email: "test@example.com", tenant: tenant2)
          expect(user1).to be_persisted
          expect(user2).to be_persisted
        end
      end

      it "prevents duplicate email within same tenant" do
        ActsAsTenant.without_tenant do
          create(:user, email: "test@example.com", tenant: tenant1)
          duplicate = build(:user, email: "test@example.com", tenant: tenant1)
          expect(duplicate).not_to be_valid
          expect(duplicate.errors[:email]).to be_present
        end
      end

      it "is case insensitive for uniqueness" do
        ActsAsTenant.without_tenant do
          create(:user, email: "Test@Example.com", tenant: tenant1)
          duplicate = build(:user, email: "test@example.com", tenant: tenant1)
          expect(duplicate).not_to be_valid
        end
      end
    end

    describe "tenant scoping" do
      let!(:user1) { ActsAsTenant.without_tenant { create(:user, tenant: tenant1, email: "user1@example.com") } }
      let!(:user2) { ActsAsTenant.without_tenant { create(:user, tenant: tenant2, email: "user2@example.com") } }

      it "scopes queries by current tenant" do
        ActsAsTenant.current_tenant = tenant1
        expect(User.all).to include(user1)
        expect(User.all).not_to include(user2)
      end

      it "allows querying without tenant scoping" do
        ActsAsTenant.current_tenant = tenant1
        ActsAsTenant.without_tenant do
          expect(User.all).to include(user1, user2)
        end
      end
    end
  end
end
