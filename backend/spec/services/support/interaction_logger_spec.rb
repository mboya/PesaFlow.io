require "rails_helper"

RSpec.describe Support::InteractionLogger do
  describe ".log" do
    it "creates support interaction and emits support.interaction.logged event" do
      customer = create(:customer)
      subscription = create(:subscription, customer: customer)

      expect do
        described_class.log(
          channel: "sms",
          topic: "manual_payment_instruction",
          message: "Please pay your invoice",
          customer: customer,
          subscription: subscription
        )
      end.to change(SupportInteraction, :count).by(1)
        .and change(DomainEvent, :count).by(1)

      interaction = SupportInteraction.order(:id).last
      event = DomainEvent.order(:id).last

      expect(interaction.tenant).to eq(subscription.tenant)
      expect(interaction.channel).to eq("sms")
      expect(interaction.topic).to eq("manual_payment_instruction")
      expect(event.event_type).to eq("support.interaction.logged")
      expect(event.subject).to eq(interaction)
      expect(event.tenant).to eq(subscription.tenant)
    end
  end
end
