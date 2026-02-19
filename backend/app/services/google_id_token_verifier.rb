require "json"
require "net/http"
require "uri"

class GoogleIdTokenVerifier
  class VerificationError < StandardError; end

  ISSUERS = [ "accounts.google.com", "https://accounts.google.com" ].freeze
  JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs"
  CACHE_KEY = "google_id_token_verifier/jwks"
  CACHE_TTL = 6.hours
  HTTP_OPEN_TIMEOUT_SECONDS = 3
  HTTP_READ_TIMEOUT_SECONDS = 3

  def self.verify!(id_token, audience:)
    raise VerificationError, "Google credential is missing" if id_token.blank?
    raise VerificationError, "Google client ID is missing" if audience.blank?

    payload = JWT.decode(
      id_token,
      nil,
      true,
      algorithms: [ "RS256" ],
      aud: audience,
      verify_aud: true,
      iss: ISSUERS,
      verify_iss: true,
      jwks: jwks_loader
    ).first

    email_verified = ActiveModel::Type::Boolean.new.cast(payload["email_verified"])
    raise VerificationError, "Google account email is not verified" unless email_verified
    raise VerificationError, "Google account email is missing" if payload["email"].blank?

    payload
  rescue JWT::DecodeError, JWT::VerificationError => e
    raise VerificationError, e.message
  end

  def self.jwks_loader
    lambda do |options|
      Rails.cache.delete(CACHE_KEY) if options[:invalidate]
      { keys: fetch_jwks_keys }
    end
  end

  def self.fetch_jwks_keys
    Rails.cache.fetch(CACHE_KEY, expires_in: CACHE_TTL) do
      response = fetch_jwks_response
      parsed = JSON.parse(response.body)
      parsed.fetch("keys")
    end
  end

  def self.fetch_jwks_response
    uri = URI(JWKS_URL)
    http = Net::HTTP.new(uri.host, uri.port)
    http.use_ssl = true
    http.open_timeout = HTTP_OPEN_TIMEOUT_SECONDS
    http.read_timeout = HTTP_READ_TIMEOUT_SECONDS

    response = http.get(uri.request_uri)
    return response if response.is_a?(Net::HTTPSuccess)

    raise VerificationError, "Failed to fetch Google JWKS"
  rescue StandardError => e
    raise VerificationError, e.message
  end
end
