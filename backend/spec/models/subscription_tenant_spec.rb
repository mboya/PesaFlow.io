require 'rails_helper'

RSpec.describe Subscription, type: :model do
  describe "multi-tenancy" do
    let!(:tenant1) { ActsAsTenant.without_tenant { create(:tenant, subdomain: 'tenant1') } }
    let!(:tenant2) { ActsAsTenant.without_tenant { create(:tenant, subdomain: 'tenant2') } }
    let!(:user1) { ActsAsTenant.without_tenant { create(:user, tenant: tenant1) } }
    let!(:user2) { ActsAsTenant.without_tenant { create(:user, tenant: tenant2) } }
    let!(:customer1) { ActsAsTenant.without_tenant { create(:customer, user: user1, tenant: tenant1) } }
    let!(:customer2) { ActsAsTenant.without_tenant { create(:customer, user: user2, tenant: tenant2) } }

    describe "tenant association" do
      it "belongs to tenant" do
        subscription = create(:subscription, customer: customer1, tenant: tenant1)
        expect(subscription.tenant).to eq(tenant1)
      end

      it "sets tenant from customer on create" do
        subscription = create(:subscription, customer: customer1)
        expect(subscription.tenant_id).to eq(customer1.tenant_id)
      end

      it "sets tenant from customer on save" do
        subscription = build(:subscription, customer: customer1, tenant_id: nil)
        subscription.save
        expect(subscription.tenant_id).to eq(customer1.tenant_id)
      end
    end

    describe "set_tenant_from_customer callback" do
      it "sets tenant_id from customer when creating subscription" do
        subscription = create(:subscription, customer: customer1, tenant_id: nil)
        expect(subscription.tenant_id).to eq(customer1.tenant_id)
      end

      it "does not override explicitly set tenant" do
        subscription = create(:subscription, customer: customer1, tenant: tenant2)
        expect(subscription.tenant_id).to eq(tenant2.id)
      end
    end

    describe "reference_number uniqueness scoped by tenant" do
      it "allows same reference number for different tenants" do
        ActsAsTenant.without_tenant do
          ref_number = "SUB-TEST123"
          subscription1 = create(:subscription, customer: customer1, reference_number: ref_number, tenant: tenant1)
          subscription2 = create(:subscription, customer: customer2, reference_number: ref_number, tenant: tenant2)
          expect(subscription1).to be_persisted
          expect(subscription2).to be_persisted
        end
      end

      it "prevents duplicate reference number within same tenant" do
        ActsAsTenant.without_tenant do
          ref_number = "SUB-TEST123"
          create(:subscription, customer: customer1, reference_number: ref_number, tenant: tenant1)
          duplicate = build(:subscription, customer: customer1, reference_number: ref_number, tenant: tenant1)
          expect(duplicate).not_to be_valid
          expect(duplicate.errors[:reference_number]).to be_present
        end
      end
    end

    describe "tenant scoping" do
      let!(:subscription1) { ActsAsTenant.without_tenant { create(:subscription, customer: customer1, tenant: tenant1) } }
      let!(:subscription2) { ActsAsTenant.without_tenant { create(:subscription, customer: customer2, tenant: tenant2) } }

      it "scopes queries by current tenant" do
        ActsAsTenant.current_tenant = tenant1
        expect(Subscription.all).to include(subscription1)
        expect(Subscription.all).not_to include(subscription2)
      end

      it "allows querying without tenant scoping" do
        ActsAsTenant.current_tenant = tenant1
        ActsAsTenant.without_tenant do
          expect(Subscription.all).to include(subscription1, subscription2)
        end
      end
    end
  end
end

