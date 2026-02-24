require "rails_helper"

RSpec.describe NotificationService do
  describe ".send_sms" do
    it "marks delivery as skipped when recipient is blank and emits notification.skipped" do
      expect do
        described_class.send_sms("", "Hello", template: "test_template")
      end.to change(NotificationDelivery, :count).by(1)
        .and change(DomainEvent, :count).by(1)

      delivery = NotificationDelivery.order(:id).last
      event = DomainEvent.order(:id).last

      expect(delivery.status).to eq("skipped")
      expect(delivery.error_message).to eq("Missing recipient phone number")
      expect(event.event_type).to eq("notification.skipped")
      expect(event.subject).to eq(delivery)
    end

    it "marks delivery as sent and emits notification.sent" do
      customer = create(:customer)
      subscription = create(:subscription, customer: customer)

      expect do
        described_class.send_sms(
          customer.phone_number,
          "Hello",
          template: "test_template",
          tenant: subscription.tenant,
          context: subscription
        )
      end.to change(NotificationDelivery, :count).by(1)
        .and change(DomainEvent, :count).by(1)

      delivery = NotificationDelivery.order(:id).last
      event = DomainEvent.order(:id).last

      expect(delivery.status).to eq("sent")
      expect(delivery.tenant).to eq(subscription.tenant)
      expect(delivery.context).to eq(subscription)
      expect(event.event_type).to eq("notification.sent")
      expect(event.subject).to eq(delivery)
      expect(event.tenant).to eq(subscription.tenant)
    end
  end

  describe ".send_email" do
    it "marks delivery as sent and includes payload context in event" do
      customer = create(:customer)

      expect do
        described_class.send_email(
          customer.email,
          "Subject",
          :test_template,
          { test: true },
          tenant: customer.tenant,
          context: customer
        )
      end.to change(NotificationDelivery, :count).by(1)
        .and change(DomainEvent, :count).by(1)

      delivery = NotificationDelivery.order(:id).last
      event = DomainEvent.order(:id).last

      expect(delivery.status).to eq("sent")
      expect(delivery.channel).to eq("email")
      expect(delivery.recipient).to eq(customer.email)
      expect(event.event_type).to eq("notification.sent")
      expect(event.subject).to eq(delivery)
      expect(event.payload).to include(
        "channel" => "email",
        "status" => "sent",
        "template" => "test_template"
      )
    end
  end
end
