class Webhooks::B2cController < ActionController::API
  include WebhookLoggable
  include Transactional
  
  # POST /webhooks/b2c/result
  def result
    # M-Pesa sends result after processing B2C payment (e.g., refunds)
    payload = JSON.parse(request.body.read)
    log_webhook('b2c', payload.merge(event_type: 'result'), request.env)
    
    Rails.logger.info("B2C Result received: #{payload.inspect}")
    
    # Find refund by conversation ID or transaction ID
    refund = find_refund_by_payload(payload)
    
    return head :ok unless refund
    
    if payload.dig('Result', 'ResultCode') == 0
      # Payment successful
      process_successful_b2c(refund, payload)
    else
      # Payment failed
      process_failed_b2c(refund, payload)
    end
    
    head :ok
  rescue JSON::ParserError => e
    Rails.logger.error("Failed to parse B2C result payload: #{e.message}")
    head :bad_request
  rescue StandardError => e
    Rails.logger.error("Error processing B2C result: #{e.message}")
    head :internal_server_error
  end
  
  # POST /webhooks/b2c/timeout
  def timeout
    # M-Pesa sends timeout notification if payment times out
    payload = JSON.parse(request.body.read)
    
    Rails.logger.warn("B2C Timeout received: #{payload.inspect}")
    
    # Find refund by conversation ID
    refund = find_refund_by_payload(payload)
    
    if refund
      refund.mark_as_failed!(reason: 'Payment timeout')
    end
    
    head :ok
  rescue JSON::ParserError => e
    Rails.logger.error("Failed to parse B2C timeout payload: #{e.message}")
    head :bad_request
  rescue StandardError => e
    Rails.logger.error("Error processing B2C timeout: #{e.message}")
    head :internal_server_error
  end
  
  private
  
  def find_refund_by_payload(payload)
    conversation_id = payload.dig('Result', 'ConversationID') || payload.dig('ConversationID')
    originator_conversation_id = payload.dig('Result', 'OriginatorConversationID') || payload.dig('OriginatorConversationID')
    
    Refund.find_by(conversation_id: conversation_id) ||
      Refund.find_by(originator_conversation_id: originator_conversation_id)
  end
  
  def process_successful_b2c(refund, payload)
    with_transaction do
      result = payload.dig('Result', 'ResultParameters', 'ResultParameter') || []
      
      transaction_id = result.find { |p| p['Key'] == 'TransactionReceipt' }&.dig('Value') ||
                       result.find { |p| p['Key'] == 'TransactionID' }&.dig('Value')
      conversation_id = payload.dig('Result', 'ConversationID')
      originator_conversation_id = payload.dig('Result', 'OriginatorConversationID')
      
      refund.mark_as_completed!(
        mpesa_transaction_id: transaction_id,
        conversation_id: conversation_id,
        originator_conversation_id: originator_conversation_id
      )
      
      # Update payment status
      refund.payment&.mark_as_refunded!
      
      # Send confirmation (non-blocking - enqueued)
      NotificationService.send_refund_confirmation(refund)
    end
  end
  
  def process_failed_b2c(refund, payload)
    with_transaction do
      result_desc = payload.dig('Result', 'ResultDesc') || 'Payment failed'
      refund.mark_as_failed!(reason: result_desc)
    end
  end
end

