# Wrapper service for M-Pesa API operations
# Provides a clean interface to the mpesa_stk gem
# Supports: STK Push, Ratiba (Standing Orders), B2C (Refunds), C2B, STK Query
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

  # STK Push Client
  class StkPushClient
    def initiate(phone_number:, amount:, account_reference:, transaction_desc:, callback_url:)
      response = MpesaStk::Push.pay_bill(
        amount,
        phone_number,
        {
          'business_short_code' => ENV.fetch('business_short_code', nil),
          'callback_url' => callback_url || ENV.fetch('callback_url', nil),
          'business_passkey' => ENV.fetch('business_passkey', nil),
          'key' => ENV.fetch('key', nil),
          'secret' => ENV.fetch('secret', nil)
        }
      )

      Response.new(response)
    end

    def query(checkout_request_id:)
      response = MpesaStk::StkPushQuery.query(
        checkout_request_id,
        {
          'business_short_code' => ENV.fetch('business_short_code', nil),
          'business_passkey' => ENV.fetch('business_passkey', nil),
          'key' => ENV.fetch('key', nil),
          'secret' => ENV.fetch('secret', nil)
        }
      )

      Response.new(response)
    end
  end

  # Ratiba (Standing Orders) Client
  class RatibaClient
    def create(standing_order_name:, phone_number:, amount:, frequency:, start_date:, end_date:, account_reference:, transaction_desc:, callback_url:)
      # Map frequency: 1=Daily, 2=Weekly, 3=Monthly, 4=Bi-Monthly, 5=Quarterly, 6=Half-Year, 7=Yearly
      response = MpesaStk::Ratiba.create_standing_order_external(
        standing_order_name,
        phone_number,
        amount,
        frequency,
        start_date,
        end_date,
        account_reference,
        transaction_desc,
        callback_url,
        {
          'business_short_code' => ENV.fetch('business_short_code', nil),
          'key' => ENV.fetch('key', nil),
          'secret' => ENV.fetch('secret', nil)
        }
      )

      RatibaResponse.new(response)
    end

    def update(standing_order_id:, end_date:)
      # Update standing order end date (effectively canceling it)
      # Note: Actual implementation depends on M-Pesa API availability
      # This may require creating a new standing order and canceling the old one
      response = MpesaStk::Ratiba.update_standing_order(
        standing_order_id,
        end_date,
        {
          'business_short_code' => ENV.fetch('business_short_code', nil),
          'key' => ENV.fetch('key', nil),
          'secret' => ENV.fetch('secret', nil)
        }
      )

      RatibaResponse.new(response)
    end

    def cancel(standing_order_id:)
      # Cancel standing order by updating end date to today
      update(standing_order_id: standing_order_id, end_date: Date.current)
    end
  end

  # B2C (Refunds) Client
  class B2cClient
    def pay(phone_number:, amount:, command_id: 'BusinessPayment', remarks:, occasion:, result_url:, timeout_url:)
      response = MpesaStk::B2c.pay(
        phone_number,
        amount,
        command_id,
        remarks,
        occasion,
        result_url,
        timeout_url,
        {
          'business_short_code' => ENV.fetch('business_short_code', nil),
          'initiator_name' => ENV.fetch('initiator_name', nil),
          'security_credential' => ENV.fetch('security_credential', nil),
          'key' => ENV.fetch('key', nil),
          'secret' => ENV.fetch('secret', nil)
        }
      )

      B2cResponse.new(response)
    end
  end

  # C2B Client
  class C2bClient
    def register_urls(confirmation_url:, validation_url:)
      response = MpesaStk::C2b.register_url(
        confirmation_url,
        validation_url,
        {
          'short_code' => ENV.fetch('business_short_code', nil),
          'key' => ENV.fetch('key', nil),
          'secret' => ENV.fetch('secret', nil)
        }
      )

      Response.new(response)
    end

    def simulate(phone_number:, amount:, bill_ref_number:)
      # For testing purposes only
      response = MpesaStk::C2b.simulate(
        phone_number,
        amount,
        bill_ref_number,
        {
          'short_code' => ENV.fetch('business_short_code', nil),
          'key' => ENV.fetch('key', nil),
          'secret' => ENV.fetch('secret', nil)
        }
      )

      Response.new(response)
    end
  end

  # Response wrapper for STK Push
  class Response
    attr_reader :raw_response

    def initialize(raw_response)
      @raw_response = raw_response || {}
    end

    def checkout_request_id
      raw_response['CheckoutRequestID']
    end

    def merchant_request_id
      raw_response['MerchantRequestID']
    end

    def response_code
      raw_response['ResponseCode']
    end

    def response_description
      raw_response['ResponseDescription']
    end

    def customer_message
      raw_response['CustomerMessage']
    end

    def success?
      response_code == '0'
    end

    def error_message
      response_description unless success?
    end
  end

  # Response wrapper for Ratiba
  class RatibaResponse
    attr_reader :raw_response

    def initialize(raw_response)
      @raw_response = raw_response || {}
    end

    def standing_order_id
      raw_response['StandingOrderID'] || raw_response['ConversationID']
    end

    def conversation_id
      raw_response['ConversationID']
    end

    def originator_conversation_id
      raw_response['OriginatorConversationID']
    end

    def response_code
      raw_response['ResponseCode']
    end

    def response_description
      raw_response['ResponseDescription']
    end

    def success?
      response_code == '0'
    end

    def error_message
      response_description unless success?
    end
  end

  # Response wrapper for B2C
  class B2cResponse
    attr_reader :raw_response

    def initialize(raw_response)
      @raw_response = raw_response || {}
    end

    def conversation_id
      raw_response['ConversationID']
    end

    def originator_conversation_id
      raw_response['OriginatorConversationID']
    end

    def response_code
      raw_response['ResponseCode']
    end

    def response_description
      raw_response['ResponseDescription']
    end

    def success?
      response_code == '0'
    end

    def error_message
      response_description unless success?
    end
  end
end
