require "rails_helper"

RSpec.describe Customer, type: :model do
  describe "event publishing callbacks" do
    it "publishes customer.status_changed when status updates" do
      customer = create(:customer, status: "active")

      expect do
        customer.update!(status: "churned")
      end.to change(DomainEvent, :count).by(1)

      event = DomainEvent.order(:id).last
      expect(event.event_type).to eq("customer.status_changed")
      expect(event.subject).to eq(customer)
      expect(event.payload).to include(
        "from" => "active",
        "to" => "churned"
      )
    end

    it "publishes customer.failed_payment_count_changed when failed count updates" do
      customer = create(:customer, failed_payment_count: 0)

      expect do
        customer.update!(failed_payment_count: 1)
      end.to change(DomainEvent, :count).by(1)

      event = DomainEvent.order(:id).last
      expect(event.event_type).to eq("customer.failed_payment_count_changed")
      expect(event.subject).to eq(customer)
      expect(event.payload).to include(
        "from" => 0,
        "to" => 1
      )
    end
  end
end
