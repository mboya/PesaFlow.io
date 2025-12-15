require 'sidekiq'
require 'sidekiq-scheduler'

Sidekiq.configure_server do |config|
  config.redis = { url: ENV.fetch('REDIS_URL', 'redis://localhost:6379/0') }
  
  # Load scheduled jobs
  config.on(:startup) do
    Sidekiq.schedule = YAML.load_file(Rails.root.join('config', 'schedule.yml')) if File.exist?(Rails.root.join('config', 'schedule.yml'))
    SidekiqScheduler::Scheduler.instance.reload_schedule!
  end
end

Sidekiq.configure_client do |config|
  config.redis = { url: ENV.fetch('REDIS_URL', 'redis://localhost:6379/0') }
end

