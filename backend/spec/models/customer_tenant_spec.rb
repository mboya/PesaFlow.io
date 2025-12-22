require 'rails_helper'

RSpec.describe Customer, type: :model do
  describe "multi-tenancy" do
    let!(:tenant1) { ActsAsTenant.without_tenant { create(:tenant, subdomain: 'tenant1') } }
    let!(:tenant2) { ActsAsTenant.without_tenant { create(:tenant, subdomain: 'tenant2') } }
    let!(:user1) { ActsAsTenant.without_tenant { create(:user, tenant: tenant1) } }
    let!(:user2) { ActsAsTenant.without_tenant { create(:user, tenant: tenant2) } }

    describe "tenant association" do
      it "belongs to tenant" do
        customer = create(:customer, user: user1, tenant: tenant1)
        expect(customer.tenant).to eq(tenant1)
      end

      it "sets tenant from user on create" do
        customer = create(:customer, user: user1)
        expect(customer.tenant_id).to eq(user1.tenant_id)
      end

      it "sets tenant from user on save" do
        customer = build(:customer, user: user1, tenant_id: nil)
        customer.save
        expect(customer.tenant_id).to eq(user1.tenant_id)
      end
    end

    describe "set_tenant_from_user callback" do
      it "sets tenant_id from user when creating customer" do
        customer = create(:customer, user: user1, tenant_id: nil)
        expect(customer.tenant_id).to eq(user1.tenant_id)
      end

      it "does not override explicitly set tenant" do
        customer = create(:customer, user: user1, tenant: tenant2)
        expect(customer.tenant_id).to eq(tenant2.id)
      end

      it "handles user without tenant gracefully" do
        user_without_tenant = ActsAsTenant.without_tenant { create(:user, tenant_id: nil) }
        customer = build(:customer, user: user_without_tenant, tenant_id: nil)
        customer.save
        # Should not raise error, tenant_id may remain nil
      end
    end

    describe "uniqueness validations scoped by tenant" do
      it "allows same phone number for different tenants" do
        ActsAsTenant.without_tenant do
          phone = "254700000001"
          customer1 = create(:customer, user: user1, phone_number: phone, tenant: tenant1)
          customer2 = create(:customer, user: user2, phone_number: phone, tenant: tenant2)
          expect(customer1).to be_persisted
          expect(customer2).to be_persisted
        end
      end

      it "prevents duplicate phone number within same tenant" do
        ActsAsTenant.without_tenant do
          phone = "254700000000"
          create(:customer, user: user1, phone_number: phone, tenant: tenant1)
          duplicate = build(:customer, user: user1, phone_number: phone, tenant: tenant1)
          expect(duplicate).not_to be_valid
          expect(duplicate.errors[:phone_number]).to be_present
        end
      end

      it "allows same email for different tenants" do
        ActsAsTenant.without_tenant do
          email = "test-tenant-scoped@example.com"
          customer1 = create(:customer, user: user1, email: email, tenant: tenant1)
          customer2 = create(:customer, user: user2, email: email, tenant: tenant2)
          expect(customer1).to be_persisted
          expect(customer2).to be_persisted
        end
      end

      it "prevents duplicate email within same tenant" do
        ActsAsTenant.without_tenant do
          email = "test@example.com"
          create(:customer, user: user1, email: email, tenant: tenant1)
          duplicate = build(:customer, user: user1, email: email, tenant: tenant1)
          expect(duplicate).not_to be_valid
          expect(duplicate.errors[:email]).to be_present
        end
      end
    end

    describe "tenant scoping" do
      let!(:customer1) { ActsAsTenant.without_tenant { create(:customer, user: user1, tenant: tenant1) } }
      let!(:customer2) { ActsAsTenant.without_tenant { create(:customer, user: user2, tenant: tenant2) } }

      it "scopes queries by current tenant" do
        ActsAsTenant.current_tenant = tenant1
        expect(Customer.all).to include(customer1)
        expect(Customer.all).not_to include(customer2)
      end

      it "allows querying without tenant scoping" do
        ActsAsTenant.current_tenant = tenant1
        ActsAsTenant.without_tenant do
          expect(Customer.all).to include(customer1, customer2)
        end
      end
    end
  end
end
