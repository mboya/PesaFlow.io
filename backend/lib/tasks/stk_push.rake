namespace :stk_push do
  desc "Check pending STK Push transactions and process successful ones"
  task check_pending: :environment do
    puts "Checking pending STK Push transactions..."
    CheckStkPushStatusJob.perform_now
    puts "Done!"
  end

  desc "Check a specific billing attempt by ID"
  task :check_attempt, [ :attempt_id ] => :environment do |_t, args|
    attempt_id = args[:attempt_id]
    if attempt_id.blank?
      puts "Usage: rake stk_push:check_attempt[123]"
      exit 1
    end

    puts "Checking STK Push status for billing attempt #{attempt_id}..."
    CheckStkPushStatusJob.perform_now(attempt_id.to_i)
    puts "Done!"
  end

  desc "Check STK Push by checkout request ID"
  task :query, [ :checkout_id ] => :environment do |_t, args|
    checkout_id = args[:checkout_id]
    if checkout_id.blank?
      puts "Usage: rake stk_push:query[ws_CO_DMZ_123456...]"
      exit 1
    end

    puts "Querying STK Push status for checkout ID: #{checkout_id}"

    response = SafaricomApi.client.mpesa.stk_push_query.query(
      checkout_request_id: checkout_id
    )

    puts "Response:"
    puts "  Success: #{response.success?}"
    puts "  Response Code: #{response.response_code}"
    puts "  Response Description: #{response.response_description}"
    puts "  Raw Response: #{response.raw_response.inspect}"
  end
end
