class ProcessRefundJob < ApplicationJob
  queue_as :default
  
  def perform(refund_id)
    refund = Refund.find_by(id: refund_id)
    return unless refund
    
    # Skip if already processed or not in processable state
    return if refund.status.in?(['completed', 'failed', 'rejected'])
    
    # Auto-approve pending refunds
    refund.update!(status: 'approved') if refund.status == 'pending'
    
    # Use M-Pesa B2C API to process refund
    # This is a placeholder - actual implementation depends on M-Pesa B2C API
    response = initiate_b2c_refund(refund)
    
    if response&.dig('ResponseCode') == '0'
      # Refund initiated successfully - mark as completed
      refund.mark_as_completed!(
        conversation_id: response['ConversationID'],
        originator_conversation_id: response['OriginatorConversationID']
      )
      Rails.logger.info("Refund #{refund.id} initiated successfully")
    else
      # Refund failed
      refund.mark_as_failed!(reason: response&.dig('ResponseDescription') || 'Failed to initiate refund')
    end
  rescue StandardError => e
    Rails.logger.error("Error processing refund #{refund_id}: #{e.message}")
    refund&.mark_as_failed!(reason: e.message)
  end
  
  private
  
  def initiate_b2c_refund(refund)
    # TODO: Implement actual M-Pesa B2C API call
    # For now, return a placeholder response
    {
      'ResponseCode' => '0',
      'ResponseDescription' => 'Success',
      'ConversationID' => "CONV-#{SecureRandom.alphanumeric(10).upcase}",
      'OriginatorConversationID' => "ORIG-#{SecureRandom.alphanumeric(10).upcase}"
    }
  end
end

