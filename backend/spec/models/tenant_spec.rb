require 'rails_helper'

RSpec.describe Tenant, type: :model do
  describe "validations" do
    subject { build(:tenant) }

    it { should validate_presence_of(:name) }
    it { should validate_presence_of(:subdomain) }
    it { should validate_uniqueness_of(:subdomain).case_insensitive }
    it { should validate_uniqueness_of(:domain).allow_nil }
    it { should validate_inclusion_of(:status).in_array(%w[active suspended cancelled]) }

    describe "subdomain format" do
      it "accepts valid subdomains" do
        valid_subdomains = %w[acme company-1 tenant123 my-tenant]
        valid_subdomains.each do |subdomain|
          tenant = build(:tenant, subdomain: subdomain)
          expect(tenant).to be_valid
        end
      end

      it "rejects invalid subdomains" do
        # Note: "ACME" would be normalized to "acme" which is valid
        # So we test with subdomains that remain invalid after normalization
        invalid_subdomains = [ "company_1", "tenant.123", "my tenant", "tenant@123" ]
        invalid_subdomains.each do |subdomain|
          tenant = build(:tenant, subdomain: subdomain)
          expect(tenant).not_to be_valid
          expect(tenant.errors[:subdomain]).to be_present
        end
      end
    end
  end

  describe "callbacks" do
    describe "normalize_subdomain" do
      it "normalizes subdomain to lowercase" do
        tenant = create(:tenant, subdomain: "ACME")
        expect(tenant.subdomain).to eq("acme")
      end

      it "strips whitespace from subdomain" do
        tenant = create(:tenant, subdomain: "  acme  ")
        expect(tenant.subdomain).to eq("acme")
      end
    end
  end

  describe "scopes" do
    let!(:active_tenant) { create(:tenant, status: "active") }
    let!(:suspended_tenant) { create(:tenant, status: "suspended") }
    let!(:cancelled_tenant) { create(:tenant, status: "cancelled") }

    describe ".active" do
      it "returns only active tenants" do
        expect(Tenant.active).to include(active_tenant)
        expect(Tenant.active).not_to include(suspended_tenant, cancelled_tenant)
      end
    end

    describe ".suspended" do
      it "returns only suspended tenants" do
        expect(Tenant.suspended).to include(suspended_tenant)
        expect(Tenant.suspended).not_to include(active_tenant, cancelled_tenant)
      end
    end

    describe ".cancelled" do
      it "returns only cancelled tenants" do
        expect(Tenant.cancelled).to include(cancelled_tenant)
        expect(Tenant.cancelled).not_to include(active_tenant, suspended_tenant)
      end
    end
  end

  describe "associations" do
    let(:tenant) { create(:tenant) }
    let(:user) { create(:user, tenant: tenant) }
    let(:customer) { create(:customer, tenant: tenant, user: user) }
    let(:subscription) { create(:subscription, customer: customer) }

    it "has many users" do
      expect(tenant.users).to include(user)
    end

    it "has many customers" do
      expect(tenant.customers).to include(customer)
    end

    it "has many subscriptions through customers" do
      expect(tenant.subscriptions).to include(subscription)
    end

    it "destroys associated users when tenant is destroyed" do
      tenant.users << user
      tenant.destroy
      expect(User.find_by(id: user.id)).to be_nil
    end

    it "destroys associated customers when tenant is destroyed" do
      tenant.customers << customer
      tenant.destroy
      expect(Customer.find_by(id: customer.id)).to be_nil
    end
  end

  describe "instance methods" do
    describe "#active?" do
      it "returns true for active tenant" do
        tenant = create(:tenant, status: "active")
        expect(tenant.active?).to be true
      end

      it "returns false for non-active tenant" do
        tenant = create(:tenant, status: "suspended")
        expect(tenant.active?).to be false
      end
    end

    describe "#suspended?" do
      it "returns true for suspended tenant" do
        tenant = create(:tenant, status: "suspended")
        expect(tenant.suspended?).to be true
      end

      it "returns false for non-suspended tenant" do
        tenant = create(:tenant, status: "active")
        expect(tenant.suspended?).to be false
      end
    end

    describe "#cancelled?" do
      it "returns true for cancelled tenant" do
        tenant = create(:tenant, status: "cancelled")
        expect(tenant.cancelled?).to be true
      end

      it "returns false for non-cancelled tenant" do
        tenant = create(:tenant, status: "active")
        expect(tenant.cancelled?).to be false
      end
    end
  end

  describe "acts_as_tenant exclusion" do
    it "does not scope Tenant queries by tenant_id" do
      tenant1 = create(:tenant, subdomain: "tenant1")
      tenant2 = create(:tenant, subdomain: "tenant2")

      ActsAsTenant.current_tenant = tenant1

      # Tenant queries should not be scoped
      expect(Tenant.all).to include(tenant1, tenant2)
      expect(Tenant.find_by(subdomain: "tenant2")).to eq(tenant2)
    end
  end
end
