# Force tzinfo to use tzinfo-data gem for Alpine Linux (musl)
# This is required because Alpine doesn't have system zoneinfo files
# and sidekiq-scheduler depends on tzinfo for timezone handling

begin
  require 'tzinfo/data'
rescue LoadError
  # tzinfo-data not available, will use system zoneinfo
end

# Set data source to Ruby (tzinfo-data) if available
if defined?(TZInfo::DataSources::RubyDataSource)
  TZInfo::DataSource.set(:ruby)
end

