require "digest"

module IdempotentRequest
  extend ActiveSupport::Concern

  # Wrap a mutating action to make it idempotent when callers provide an Idempotency-Key header.
  #
  # Usage:
  #   def create
  #     perform_idempotent(endpoint: "subscriptions#create") do
  #       ... existing action body ...
  #     end
  #   end
  #
  # When Idempotency-Key is absent (or user is nil), this behaves like a normal yield.
  def perform_idempotent(endpoint:)
    key = request.headers["Idempotency-Key"] || request.headers["X-Idempotency-Key"]
    user = respond_to?(:current_api_v1_user) ? current_api_v1_user : nil

    if key.blank? || user.blank?
      yield
      return
    end

    fingerprint = Digest::SHA256.hexdigest(
      {
        method: request.method,
        path: request.path,
        params: request.filtered_parameters.except("controller", "action"),
        body: request.raw_post.presence
      }.to_json
    )

    record = IdempotencyKey.find_by(user_id: user.id, endpoint: endpoint, idempotency_key: key)

    if record
      if record.request_hash != fingerprint
        if respond_to?(:render_enveloped_error)
          render_enveloped_error(
            status_code: 409,
            message: "Idempotency key already used with a different request",
            error_code: "idempotency_conflict",
            http_status: :conflict
          )
        else
          render json: { error: "Idempotency key conflict" }, status: :conflict
        end
        return
      end

      body = record.response_body
      if body.present?
        begin
          parsed = JSON.parse(body)
          render json: parsed, status: record.response_status
        rescue JSON::ParserError
          render plain: body, status: record.response_status
        end
      else
        head(record.response_status || :ok)
      end
      return
    end

    record = IdempotencyKey.create!(
      user_id: user.id,
      endpoint: endpoint,
      idempotency_key: key,
      request_hash: fingerprint
    )

    yield

    record.update!(
      response_status: response.status,
      response_body: response.body
    )
  end
end

