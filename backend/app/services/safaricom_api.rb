# Wrapper service for M-Pesa API operations
# Provides a clean interface to the mpesa_stk gem
# Supports: STK Push, Ratiba (Standing Orders), B2C (Refunds), C2B, STK Query
# Documentation: https://github.com/mboya/mpesa_stk
class SafaricomApi
  class << self
    def client
      @client ||= Client.new
    end
  end

  class Client
    def mpesa
      @mpesa ||= MpesaClient.new
    end
  end

  class MpesaClient
    def stk_push
      @stk_push ||= StkPushClient.new
    end

    def stk_push_query
      @stk_push_query ||= StkPushQueryClient.new
    end

    def ratiba
      @ratiba ||= RatibaClient.new
    end

    def b2c
      @b2c ||= B2cClient.new
    end

    def c2b
      @c2b ||= C2bClient.new
    end
  end

  # STK Push Client - Lipa na M-Pesa Online
  # API: MpesaStk::Push.pay_bill(amount, phone_number, hash)
  #      MpesaStk::Push.buy_goods(amount, phone_number, hash)
  #      MpesaStk::PushPayment.call(amount, phone_number) # Uses ENV vars
  class StkPushClient
    def initiate(phone_number:, amount:, account_reference:, transaction_desc:, callback_url:, payment_type: 'pay_bill')
      # Convert amount to string (gem expects string)
      amount_str = amount.to_s
      
      # Build hash with required parameters
      params = {
        'key' => ENV.fetch('key', nil),
        'secret' => ENV.fetch('secret', nil),
        'business_short_code' => ENV.fetch('business_short_code', nil),
        'business_passkey' => ENV.fetch('business_passkey', nil),
        'callback_url' => callback_url || ENV.fetch('callback_url', nil),
        'account_reference' => account_reference,
        'transaction_desc' => transaction_desc
      }

      # Call appropriate method based on payment type
      response = case payment_type.to_s
      when 'buy_goods', 'till_number'
        params['till_number'] = ENV.fetch('till_number', ENV.fetch('business_short_code', nil))
        MpesaStk::Push.buy_goods(amount_str, phone_number, params)
      else
        MpesaStk::Push.pay_bill(amount_str, phone_number, params)
      end

      Response.new(response)
    end
  end

  # STK Push Query Client
  # API: MpesaStk::StkPushQuery.query(checkout_request_id, hash)
  class StkPushQueryClient
    def query(checkout_request_id:)
      params = {
        'business_short_code' => ENV.fetch('business_short_code', nil),
        'business_passkey' => ENV.fetch('business_passkey', nil),
        'key' => ENV.fetch('key', nil),
        'secret' => ENV.fetch('secret', nil)
      }

      response = MpesaStk::StkPushQuery.query(checkout_request_id, params)
      Response.new(response)
    end
  end

  # Ratiba (Standing Orders) Client
  # API: MpesaStk::Ratiba.create_standing_order(hash)
  class RatibaClient
    def create(standing_order_name:, phone_number:, amount:, frequency:, start_date:, end_date:, account_reference:, transaction_desc:, callback_url:)
      # Convert dates to string format (YYYY-MM-DD)
      start_date_str = start_date.is_a?(Date) ? start_date.strftime('%Y-%m-%d') : start_date.to_s
      end_date_str = end_date.is_a?(Date) ? end_date.strftime('%Y-%m-%d') : end_date.to_s
      
      # Convert amount to string
      amount_str = amount.to_s
      
      # Convert frequency to string (1=Daily, 2=Weekly, 3=Monthly, 4=Bi-Monthly, 5=Quarterly, 6=Half-Year, 7=Yearly)
      frequency_str = frequency.to_s

      # Build hash with all required parameters
      params = {
        'key' => ENV.fetch('key', nil),
        'secret' => ENV.fetch('secret', nil),
        'business_short_code' => ENV.fetch('business_short_code', nil),
        'standing_order_name' => standing_order_name,
        'amount' => amount_str,
        'party_a' => phone_number,
        'frequency' => frequency_str,
        'start_date' => start_date_str,
        'end_date' => end_date_str,
        'account_reference' => account_reference,
        'transaction_desc' => transaction_desc,
        'callback_url' => callback_url || ENV.fetch('callback_url', nil)
      }

      response = MpesaStk::Ratiba.create_standing_order(params)
      RatibaResponse.new(response)
    end

    def update(standing_order_id:, end_date:)
      # Note: The gem may not have an update method
      # This is a placeholder - actual implementation depends on M-Pesa API
      # You may need to cancel and recreate the standing order
      raise NotImplementedError, "Standing order update not directly supported. Cancel and recreate instead."
    end

    def cancel(standing_order_id:)
      # Note: The gem may not have a cancel method
      # Cancel by updating end_date to today or past date
      # This is a placeholder - actual implementation depends on M-Pesa API
      raise NotImplementedError, "Standing order cancellation not directly supported. Update end_date to past date instead."
    end
  end

  # B2C (Business to Customer) Client - Used for refunds
  # API: MpesaStk::B2C.pay(amount, phone_number, hash)
  class B2cClient
    def pay(phone_number:, amount:, command_id: 'BusinessPayment', remarks:, occasion: nil, result_url:, timeout_url:)
      # Convert amount to string
      amount_str = amount.to_s

      # Build hash with required parameters
      params = {
        'key' => ENV.fetch('key', nil),
        'secret' => ENV.fetch('secret', nil),
        'initiator_name' => ENV.fetch('initiator_name', ENV.fetch('initiator', nil)),
        'security_credential' => ENV.fetch('security_credential', nil),
        'command_id' => command_id,
        'remarks' => remarks,
        'occasion' => occasion,
        'result_url' => result_url,
        'queue_timeout_url' => timeout_url
      }

      response = MpesaStk::B2C.pay(amount_str, phone_number, params)
      B2cResponse.new(response)
    end
  end

  # C2B (Customer to Business) Client
  # API: MpesaStk::C2B.register_url(hash)
  #      MpesaStk::C2B.simulate(amount, phone_number, hash)
  class C2bClient
    def register_urls(confirmation_url:, validation_url: nil, response_type: 'Completed')
      params = {
        'key' => ENV.fetch('key', nil),
        'secret' => ENV.fetch('secret', nil),
        'short_code' => ENV.fetch('business_short_code', nil),
        'confirmation_url' => confirmation_url,
        'validation_url' => validation_url,
        'response_type' => response_type
      }

      response = MpesaStk::C2B.register_url(params)
      Response.new(response)
    end

    def simulate(phone_number:, amount:, bill_ref_number: nil, command_id: 'CustomerPayBillOnline')
      # For testing purposes only (sandbox)
      amount_str = amount.to_s

      params = {
        'key' => ENV.fetch('key', nil),
        'secret' => ENV.fetch('secret', nil),
        'short_code' => ENV.fetch('business_short_code', nil),
        'command_id' => command_id,
        'bill_ref_number' => bill_ref_number
      }

      response = MpesaStk::C2B.simulate(amount_str, phone_number, params)
      Response.new(response)
    end
  end

  # Response wrapper for STK Push and other APIs
  class Response
    attr_reader :raw_response

    def initialize(raw_response)
      @raw_response = raw_response || {}
    end

    def checkout_request_id
      raw_response['CheckoutRequestID'] || raw_response.dig('Body', 'stkCallback', 'CheckoutRequestID')
    end

    def merchant_request_id
      raw_response['MerchantRequestID'] || raw_response.dig('Body', 'stkCallback', 'MerchantRequestID')
    end

    def response_code
      raw_response['ResponseCode'] || raw_response.dig('Body', 'stkCallback', 'ResultCode')
    end

    def response_description
      raw_response['ResponseDescription'] || raw_response.dig('Body', 'stkCallback', 'ResultDesc')
    end

    def customer_message
      raw_response['CustomerMessage'] || raw_response.dig('Body', 'stkCallback', 'CustomerMessage')
    end

    def success?
      response_code == '0' || response_code == 0
    end

    def error_message
      response_description unless success?
    end

    def error_code
      raw_response['errorCode'] || raw_response['error_code']
    end
  end

  # Response wrapper for Ratiba (Standing Orders)
  # Ratiba API returns: {"ResponseHeader"=>{"responseRefID"=>"...", "responseCode"=>"200", "responseDescription"=>"..."}, 
  #                      "ResponseBody"=>{"responseDescription"=>"...", "responseCode"=>"200"}}
  class RatibaResponse
    attr_reader :raw_response

    def initialize(raw_response)
      @raw_response = raw_response || {}
      Rails.logger.info("Ratiba raw response: #{@raw_response.inspect}")
    end

    def standing_order_id
      # Ratiba doesn't return a standing_order_id immediately - it's async
      # Use the responseRefID as a reference
      raw_response.dig('ResponseHeader', 'responseRefID') ||
        raw_response['StandingOrderID'] || 
        raw_response['ConversationID'] ||
        raw_response.dig('Result', 'ConversationID') ||
        "RATIBA-#{SecureRandom.alphanumeric(10).upcase}"
    end

    def conversation_id
      raw_response.dig('ResponseHeader', 'responseRefID') ||
        raw_response['ConversationID'] || 
        raw_response.dig('Result', 'ConversationID')
    end

    def originator_conversation_id
      raw_response['OriginatorConversationID'] || raw_response.dig('Result', 'OriginatorConversationID')
    end

    def response_code
      # Check Ratiba-specific response structure first
      raw_response.dig('ResponseHeader', 'responseCode') ||
        raw_response.dig('ResponseBody', 'responseCode') ||
        raw_response['ResponseCode'] || 
        raw_response['responseCode'] ||
        raw_response['errorCode'] ||
        raw_response['ResultCode'] ||
        raw_response.dig('Result', 'ResultCode')
    end

    def response_description
      raw_response.dig('ResponseHeader', 'responseDescription') ||
        raw_response.dig('ResponseBody', 'responseDescription') ||
        raw_response['ResponseDescription'] || 
        raw_response['responseDescription'] ||
        raw_response['errorMessage'] ||
        raw_response['ResultDesc'] ||
        raw_response.dig('Result', 'ResultDesc')
    end

    def success?
      code = response_code.to_s
      # Ratiba uses "200" for success, STK Push uses "0"
      ['0', '200'].include?(code)
    end

    def error_message
      return nil if success?
      
      # Try multiple possible error message fields
      response_description.presence ||
        raw_response['errorMessage'].presence ||
        raw_response['error_message'].presence ||
        raw_response['message'].presence ||
        raw_response.dig('Fault', 'faultstring').presence ||
        raw_response.to_s.truncate(200)
    end
  end

  # Response wrapper for B2C
  class B2cResponse
    attr_reader :raw_response

    def initialize(raw_response)
      @raw_response = raw_response || {}
    end

    def conversation_id
      raw_response['ConversationID'] || raw_response.dig('Result', 'ConversationID')
    end

    def originator_conversation_id
      raw_response['OriginatorConversationID'] || raw_response.dig('Result', 'OriginatorConversationID')
    end

    def response_code
      raw_response['ResponseCode'] || raw_response.dig('Result', 'ResultCode')
    end

    def response_description
      raw_response['ResponseDescription'] || raw_response.dig('Result', 'ResultDesc')
    end

    def success?
      code = response_code
      code == '0' || code == 0
    end

    def error_message
      response_description unless success?
    end

    def transaction_id
      raw_response['TransactionID'] || raw_response.dig('Result', 'TransactionID')
    end
  end
end
