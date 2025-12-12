class HealthController < ApplicationController
  def show
    status = {
      status: 'ok',
      service: 'backend',
      timestamp: Time.current.iso8601,
      version: '1.0.0',
      environment: Rails.env,
      database: database_status,
      redis: redis_status,
      sidekiq: sidekiq_status
    }

    http_status = status[:database][:connected] && status[:redis][:connected] && status[:sidekiq][:connected] ? :ok : :service_unavailable
    render json: status, status: http_status
  end

  private

  def database_status
    # Try to establish connection and execute a simple query
    ActiveRecord::Base.connection.execute('SELECT 1')
    {
      connected: true,
      pool_size: ActiveRecord::Base.connection_pool.size,
      checked_at: Time.current.iso8601
    }
  rescue StandardError => e
    {
      connected: false,
      error: e.message,
      checked_at: Time.current.iso8601
    }
  end

  def redis_status
    require 'redis'
    redis_client = Redis.new(url: ENV['REDIS_URL'] || 'redis://localhost:6379/0')
    redis_client.ping
    {
      connected: true,
      checked_at: Time.current.iso8601
    }
  rescue StandardError => e
    {
      connected: false,
      error: e.message,
      checked_at: Time.current.iso8601
    }
  end

  def sidekiq_status
    require 'sidekiq/api'
    stats = Sidekiq::Stats.new
    processes = Sidekiq::ProcessSet.new
    
    {
      connected: true,
      processes: processes.size,
      processed: stats.processed,
      failed: stats.failed,
      enqueued: stats.enqueued,
      scheduled: stats.scheduled_size,
      retry: stats.retry_size,
      dead: stats.dead_size,
      queues: stats.queues,
      checked_at: Time.current.iso8601
    }
  rescue StandardError => e
    {
      connected: false,
      error: e.message,
      checked_at: Time.current.iso8601
    }
  end
end

