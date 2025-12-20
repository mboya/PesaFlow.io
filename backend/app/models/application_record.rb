class ApplicationRecord < ActiveRecord::Base
  primary_abstract_class
  
  # Configure acts_as_tenant for all models that inherit from ApplicationRecord
  # Models that should NOT be tenant-scoped should override this or not inherit from ApplicationRecord
  # Set current_tenant in controllers using ActsAsTenant.current_tenant = tenant
  # Note: Some models like JwtDenylist and Tenant explicitly exclude tenant scoping
  # required: false allows models without tenant_id, but we still need to set a tenant for queries to work
  acts_as_tenant :tenant, required: false
end
