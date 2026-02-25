require "rails_helper"

RSpec.describe AuditLog, type: :model do
  describe "immutability" do
    it "does not allow updates" do
      audit_log = AuditLog.create!(
        action: "spec.test",
        status: "success",
        request_id: SecureRandom.uuid,
        occurred_at: Time.current,
        changeset: {},
        metadata: {}
      )

      expect(audit_log.update(action: "spec.changed")).to be(false)
      expect(audit_log.errors[:base]).to include("Audit logs are immutable")
    end
  end

  describe "validations" do
    it "requires a valid status" do
      invalid_log = AuditLog.new(
        action: "spec.test",
        status: "unknown",
        request_id: SecureRandom.uuid,
        occurred_at: Time.current,
        changeset: {},
        metadata: {}
      )

      expect(invalid_log).not_to be_valid
      expect(invalid_log.errors[:status]).to be_present
    end
  end
end
