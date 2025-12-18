require 'rails_helper'

RSpec.describe SafaricomApi do
  describe '.client' do
    it 'returns a SafaricomApi::Client instance' do
      expect(SafaricomApi.client).to be_a(SafaricomApi::Client)
    end

    it 'returns the same instance on multiple calls' do
      client1 = SafaricomApi.client
      client2 = SafaricomApi.client
      expect(client1).to be(client2)
    end
  end

  describe SafaricomApi::Client do
    describe '#mpesa' do
      it 'returns a MpesaClient instance' do
        client = SafaricomApi::Client.new
        expect(client.mpesa).to be_a(SafaricomApi::MpesaClient)
      end
    end
  end

  describe SafaricomApi::MpesaClient do
    describe '#stk_push' do
      it 'returns a StkPushClient instance' do
        client = SafaricomApi::MpesaClient.new
        expect(client.stk_push).to be_a(SafaricomApi::StkPushClient)
      end
    end
  end

  describe SafaricomApi::StkPushClient do
    describe '#initiate' do
      let(:phone_number) { '254712345678' }
      let(:amount) { 100.0 }
      let(:account_reference) { 'SUB-12345678' }
      let(:transaction_desc) { 'Test payment' }
      let(:callback_url) { 'https://example.com/callback' }

      let(:mpesa_response) do
        {
          'CheckoutRequestID' => 'CHECKOUT123',
          'MerchantRequestID' => 'MERCHANT123',
          'ResponseCode' => '0',
          'ResponseDescription' => 'Success',
          'CustomerMessage' => 'Success. Request accepted for processing'
        }
      end

      before do
        allow(MpesaStk::Push).to receive(:pay_bill).and_return(mpesa_response)
        allow(ENV).to receive(:fetch).and_call_original
        allow(ENV).to receive(:fetch).with('business_short_code', nil).and_return('174379')
        allow(ENV).to receive(:fetch).with('callback_url', nil).and_return(callback_url)
        allow(ENV).to receive(:fetch).with('business_passkey', nil).and_return('passkey')
        allow(ENV).to receive(:fetch).with('key', nil).and_return('consumer_key')
        allow(ENV).to receive(:fetch).with('secret', nil).and_return('consumer_secret')
      end

      it 'calls MpesaStk::Push.pay_bill with correct parameters' do
        expect(MpesaStk::Push).to receive(:pay_bill).with(
          amount.to_s,  # Amount should be string
          phone_number,
          hash_including(
            'business_short_code' => '174379',
            'callback_url' => callback_url,
            'account_reference' => account_reference,
            'transaction_desc' => transaction_desc
          )
        )

        SafaricomApi.client.mpesa.stk_push.initiate(
          phone_number: phone_number,
          amount: amount,
          account_reference: account_reference,
          transaction_desc: transaction_desc,
          callback_url: callback_url
        )
      end

      it 'returns a Response object' do
        response = SafaricomApi.client.mpesa.stk_push.initiate(
          phone_number: phone_number,
          amount: amount,
          account_reference: account_reference,
          transaction_desc: transaction_desc,
          callback_url: callback_url
        )

        expect(response).to be_a(SafaricomApi::Response)
      end
    end
  end

  describe SafaricomApi::Response do
    let(:raw_response) do
      {
        'CheckoutRequestID' => 'CHECKOUT123',
        'MerchantRequestID' => 'MERCHANT123',
        'ResponseCode' => '0',
        'ResponseDescription' => 'Success',
        'CustomerMessage' => 'Success. Request accepted for processing'
      }
    end

    let(:response) { SafaricomApi::Response.new(raw_response) }

    describe '#checkout_request_id' do
      it 'returns the CheckoutRequestID' do
        expect(response.checkout_request_id).to eq('CHECKOUT123')
      end
    end

    describe '#merchant_request_id' do
      it 'returns the MerchantRequestID' do
        expect(response.merchant_request_id).to eq('MERCHANT123')
      end
    end

    describe '#response_code' do
      it 'returns the ResponseCode' do
        expect(response.response_code).to eq('0')
      end
    end

    describe '#response_description' do
      it 'returns the ResponseDescription' do
        expect(response.response_description).to eq('Success')
      end
    end

    describe '#customer_message' do
      it 'returns the CustomerMessage' do
        expect(response.customer_message).to eq('Success. Request accepted for processing')
      end
    end

    describe '#success?' do
      context 'when ResponseCode is 0' do
        it 'returns true' do
          expect(response.success?).to be true
        end
      end

      context 'when ResponseCode is not 0' do
        before do
          raw_response['ResponseCode'] = '1'
        end

        it 'returns false' do
          expect(response.success?).to be false
        end
      end
    end
  end
end
