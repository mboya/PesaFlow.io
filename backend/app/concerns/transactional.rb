# Concern to wrap methods in database transactions
# Any error within a transactional method will rollback all database changes
module Transactional
  extend ActiveSupport::Concern

  class_methods do
    # Wrap a method in a transaction
    # Usage: transactional :method_name
    def transactional(*method_names)
      method_names.each do |method_name|
        alias_method "#{method_name}_without_transaction", method_name

        define_method method_name do |*args, **kwargs, &block|
          ActiveRecord::Base.transaction do
            send("#{method_name}_without_transaction", *args, **kwargs, &block)
          end
        rescue StandardError => e
          Rails.logger.error("Transaction rolled back in #{self.class.name}##{method_name}: #{e.message}")
          Rails.logger.error(e.backtrace.first(10).join("\n"))
          raise
        end
      end
    end
  end

  # Instance method to wrap a block in a transaction
  def with_transaction(&block)
    ActiveRecord::Base.transaction do
      yield
    end
  rescue StandardError => e
    Rails.logger.error("Transaction rolled back in #{self.class.name}: #{e.message}")
    Rails.logger.error(e.backtrace.first(10).join("\n"))
    raise
  end
end
