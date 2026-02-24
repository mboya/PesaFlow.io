require "rails_helper"

RSpec.describe WebhookLoggable do
  subject(:helper) { helper_class.new }

  let(:helper_class) do
    Class.new do
      include WebhookLoggable
    end
  end

  describe "#extract_event_type" do
    it "prefers event_type when provided as a symbol key" do
      payload = { "ResultCode" => 1 }.merge(event_type: "validation")
      event_type = helper.send(:extract_event_type, payload)

      expect(event_type).to eq("validation")
    end
  end

  describe "#filter_headers" do
    it "captures CONTENT_TYPE rack header format" do
      headers = { "CONTENT_TYPE" => "application/json" }
      filtered = helper.send(:filter_headers, headers)

      expect(filtered).to include("Content-Type" => "application/json")
    end
  end

  describe "#infer_tenant_from_webhook_payload" do
    it "finds tenant by AccountReference even when another tenant is current" do
      tenant_a = create(:tenant, subdomain: "alpha")
      tenant_b = create(:tenant, subdomain: "beta")
      user = ActsAsTenant.without_tenant { create(:user, tenant: tenant_a) }

      customer = ActsAsTenant.with_tenant(tenant_a) { create(:customer, user: user) }
      subscription = ActsAsTenant.with_tenant(tenant_a) do
        create(:subscription, customer: customer, reference_number: "SUB-ALPHA123")
      end

      ActsAsTenant.current_tenant = tenant_b
      inferred_tenant = helper.send(
        :infer_tenant_from_webhook_payload,
        { "AccountReference" => subscription.reference_number }
      )

      expect(inferred_tenant).to eq(tenant_a)
    end
  end
end
