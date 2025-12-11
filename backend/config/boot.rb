ENV["BUNDLE_GEMFILE"] ||= File.expand_path("../Gemfile", __dir__)

require "bundler/setup" # Set up gems listed in the Gemfile.

# Require tzinfo-data early for Alpine Linux (musl) compatibility
# This must be done before any gems that use tzinfo (like sidekiq-scheduler)
begin
  require "tzinfo/data"
rescue LoadError
  # tzinfo-data not available, will fall back to system zoneinfo
end
require "bootsnap/setup" # Speed up boot time by caching expensive operations.
