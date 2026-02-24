require "rails_helper"

RSpec.describe Events::Publisher do
  describe ".publish" do
    it "creates a domain event with an explicit tenant" do
      tenant = create(:tenant)

      event = described_class.publish(
        event_type: "billing_attempt.created",
        tenant: tenant,
        source: "spec",
        payload: { amount: "1000.0" }
      )

      expect(event).to be_persisted
      expect(event.tenant).to eq(tenant)
      expect(event.event_type).to eq("billing_attempt.created")
      expect(event.payload).to include("amount" => "1000.0")
    end

    it "resolves tenant from subject when tenant is not passed" do
      customer = create(:customer)

      event = described_class.publish(
        event_type: "customer.updated",
        subject: customer,
        source: "spec",
        payload: { customer_id: customer.id }
      )

      expect(event).to be_persisted
      expect(event.tenant).to eq(customer.tenant)
      expect(event.subject).to eq(customer)
    end

    it "creates tenantless events when no tenant context exists" do
      event = ActsAsTenant.without_tenant do
        described_class.publish(
          event_type: "system.healthcheck",
          source: "spec",
          payload: { ok: true }
        )
      end

      expect(event).to be_persisted
      expect(event.tenant).to be_nil
      expect(event.payload).to include("ok" => true)
    end
  end
end
