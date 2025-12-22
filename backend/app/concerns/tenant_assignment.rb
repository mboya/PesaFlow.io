# Concern for models that belong to a subscription and need tenant assignment
# Automatically sets tenant_id from the associated subscription
module TenantAssignment
  extend ActiveSupport::Concern

  included do
    before_validation :set_tenant_from_subscription, on: :create
    before_save :set_tenant_from_subscription
  end

  private

  def set_tenant_from_subscription
    return unless respond_to?(:subscription) && respond_to?(:tenant_id)
    
    if subscription.present? && subscription.tenant_id.present? && tenant_id.nil?
      self.tenant_id = subscription.tenant_id
    end
  end
end
