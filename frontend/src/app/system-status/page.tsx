'use client';

import { useEffect, useState } from 'react';

interface HealthStatus {
  status: string;
  service: string;
  timestamp?: string;
  version?: string;
  environment?: string;
  database?: {
    connected: boolean;
    error?: string;
  };
  redis?: {
    connected: boolean;
    error?: string;
  };
  sidekiq?: {
    connected: boolean;
    processes?: number;
    processed?: number;
    failed?: number;
    enqueued?: number;
    scheduled?: number;
    retry?: number;
    dead?: number;
    queues?: Record<string, number>;
    error?: string;
  };
  uptime?: number;
  memory?: {
    used: number;
    total: number;
    unit: string;
  };
  error?: string;
}

export default function SystemStatusPage() {
  const [frontendHealth, setFrontendHealth] = useState<HealthStatus | null>(null);
  const [backendHealth, setBackendHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchHealth = async () => {
    setLoading(true);
    try {
      // Fetch frontend health
      const frontendResponse = await fetch('/api/health', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      if (!frontendResponse.ok) {
        throw new Error(`Frontend health check failed: ${frontendResponse.status} ${frontendResponse.statusText}`);
      }
      const frontendText = await frontendResponse.text();
      if (!frontendText || frontendText.trim() === '') {
        throw new Error('Empty response from frontend health endpoint');
      }
      let frontendData;
      try {
        frontendData = JSON.parse(frontendText);
      } catch (parseError) {
        throw new Error(`Invalid JSON response: ${frontendText.substring(0, 100)}`);
      }
      setFrontendHealth(frontendData);

      // Fetch backend health through proxy
      try {
        const backendResponse = await fetch('/api/proxy/api/v1/health', {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        if (!backendResponse.ok) {
          throw new Error(`Backend health check failed: ${backendResponse.status} ${backendResponse.statusText}`);
        }
        const backendText = await backendResponse.text();
        if (!backendText || backendText.trim() === '') {
          throw new Error('Empty response from backend health endpoint');
        }
        let backendData;
        try {
          backendData = JSON.parse(backendText);
        } catch (parseError) {
          throw new Error(`Invalid JSON response: ${backendText.substring(0, 100)}`);
        }
        setBackendHealth(backendData);
      } catch (error) {
        setBackendHealth({
          status: 'error',
          service: 'backend',
          error: error instanceof Error ? error.message : 'Failed to connect to backend',
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      setFrontendHealth({
        status: 'error',
        service: 'frontend',
        error: error instanceof Error ? error.message : 'Failed to fetch health status',
        timestamp: new Date().toISOString()
      });
    } finally {
      setLoading(false);
      setLastUpdated(new Date());
    }
  };

  useEffect(() => {
    fetchHealth();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ok':
        return 'text-green-600 dark:text-green-400';
      case 'error':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-yellow-600 dark:text-yellow-400';
    }
  };

  const getStatusBadge = (status: string) => {
    const isOk = status === 'ok';
    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          isOk
            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
        }`}
      >
        {isOk ? '✓ Healthy' : '✗ Unhealthy'}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white dark:bg-zinc-900 shadow rounded-lg">
          <div className="px-6 py-5 border-b border-zinc-200 dark:border-zinc-700">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                System Status
              </h1>
              <button
                onClick={fetchHealth}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-zinc-900 dark:bg-zinc-50 rounded-md hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          </div>

          <div className="px-6 py-5 space-y-6">
            {/* Frontend Status */}
            <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                  Frontend Service
                </h2>
                {frontendHealth && getStatusBadge(frontendHealth.status)}
              </div>
              {frontendHealth ? (
                <div className="space-y-2 text-sm">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-zinc-500 dark:text-zinc-400">Status:</span>
                      <span className={`ml-2 font-medium ${getStatusColor(frontendHealth.status)}`}>
                        {frontendHealth.status.toUpperCase()}
                      </span>
                    </div>
                    {frontendHealth.version && (
                      <div>
                        <span className="text-zinc-500 dark:text-zinc-400">Version:</span>
                        <span className="ml-2 font-medium text-zinc-900 dark:text-zinc-50">
                          {frontendHealth.version}
                        </span>
                      </div>
                    )}
                    {frontendHealth.environment && (
                      <div>
                        <span className="text-zinc-500 dark:text-zinc-400">Environment:</span>
                        <span className="ml-2 font-medium text-zinc-900 dark:text-zinc-50">
                          {frontendHealth.environment}
                        </span>
                      </div>
                    )}
                    {frontendHealth.uptime && (
                      <div>
                        <span className="text-zinc-500 dark:text-zinc-400">Uptime:</span>
                        <span className="ml-2 font-medium text-zinc-900 dark:text-zinc-50">
                          {Math.floor(frontendHealth.uptime)}s
                        </span>
                      </div>
                    )}
                  </div>
                  {frontendHealth.memory && (
                    <div className="pt-2 border-t border-zinc-200 dark:border-zinc-700">
                      <span className="text-zinc-500 dark:text-zinc-400">Memory:</span>
                      <span className="ml-2 font-medium text-zinc-900 dark:text-zinc-50">
                        {frontendHealth.memory.used} / {frontendHealth.memory.total} {frontendHealth.memory.unit}
                      </span>
                    </div>
                  )}
                  {frontendHealth.error && (
                    <div className="pt-2 text-red-600 dark:text-red-400">
                      Error: {frontendHealth.error}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-zinc-500 dark:text-zinc-400">Loading...</div>
              )}
            </div>

            {/* Backend Status */}
            <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                  Backend Service
                </h2>
                {backendHealth && getStatusBadge(backendHealth.status)}
              </div>
              {backendHealth ? (
                <div className="space-y-2 text-sm">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-zinc-500 dark:text-zinc-400">Status:</span>
                      <span className={`ml-2 font-medium ${getStatusColor(backendHealth.status)}`}>
                        {backendHealth.status.toUpperCase()}
                      </span>
                    </div>
                    {backendHealth.version && (
                      <div>
                        <span className="text-zinc-500 dark:text-zinc-400">Version:</span>
                        <span className="ml-2 font-medium text-zinc-900 dark:text-zinc-50">
                          {backendHealth.version}
                        </span>
                      </div>
                    )}
                    {backendHealth.environment && (
                      <div>
                        <span className="text-zinc-500 dark:text-zinc-400">Environment:</span>
                        <span className="ml-2 font-medium text-zinc-900 dark:text-zinc-50">
                          {backendHealth.environment}
                        </span>
                      </div>
                    )}
                  </div>
                  {backendHealth.database && (
                    <div className="pt-2 border-t border-zinc-200 dark:border-zinc-700">
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-500 dark:text-zinc-400">Database:</span>
                        <span
                          className={`font-medium ${
                            backendHealth.database.connected
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-red-600 dark:text-red-400'
                          }`}
                        >
                          {backendHealth.database.connected ? '✓ Connected' : '✗ Disconnected'}
                        </span>
                      </div>
                      {backendHealth.database.error && (
                        <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                          {backendHealth.database.error}
                        </div>
                      )}
                    </div>
                  )}
                  {backendHealth.redis && (
                    <div className="pt-2 border-t border-zinc-200 dark:border-zinc-700">
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-500 dark:text-zinc-400">Redis:</span>
                        <span
                          className={`font-medium ${
                            backendHealth.redis.connected
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-red-600 dark:text-red-400'
                          }`}
                        >
                          {backendHealth.redis.connected ? '✓ Connected' : '✗ Disconnected'}
                        </span>
                      </div>
                      {backendHealth.redis.error && (
                        <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                          {backendHealth.redis.error}
                        </div>
                      )}
                    </div>
                  )}
                  {backendHealth.sidekiq && (
                    <div className="pt-2 border-t border-zinc-200 dark:border-zinc-700">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-zinc-500 dark:text-zinc-400">Sidekiq:</span>
                        <span
                          className={`font-medium ${
                            backendHealth.sidekiq.connected
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-red-600 dark:text-red-400'
                          }`}
                        >
                          {backendHealth.sidekiq.connected ? '✓ Running' : '✗ Not Running'}
                        </span>
                      </div>
                      {backendHealth.sidekiq.connected && (
                        <div className="grid grid-cols-2 gap-2 text-xs mt-2">
                          {backendHealth.sidekiq.processes !== undefined && (
                            <div>
                              <span className="text-zinc-500 dark:text-zinc-400">Processes:</span>
                              <span className="ml-1 font-medium text-zinc-900 dark:text-zinc-50">
                                {backendHealth.sidekiq.processes}
                              </span>
                            </div>
                          )}
                          {backendHealth.sidekiq.processed !== undefined && (
                            <div>
                              <span className="text-zinc-500 dark:text-zinc-400">Processed:</span>
                              <span className="ml-1 font-medium text-zinc-900 dark:text-zinc-50">
                                {backendHealth.sidekiq.processed.toLocaleString()}
                              </span>
                            </div>
                          )}
                          {backendHealth.sidekiq.failed !== undefined && (
                            <div>
                              <span className="text-zinc-500 dark:text-zinc-400">Failed:</span>
                              <span
                                className={`ml-1 font-medium ${
                                  backendHealth.sidekiq.failed > 0
                                    ? 'text-red-600 dark:text-red-400'
                                    : 'text-zinc-900 dark:text-zinc-50'
                                }`}
                              >
                                {backendHealth.sidekiq.failed.toLocaleString()}
                              </span>
                            </div>
                          )}
                          {backendHealth.sidekiq.enqueued !== undefined && (
                            <div>
                              <span className="text-zinc-500 dark:text-zinc-400">Enqueued:</span>
                              <span className="ml-1 font-medium text-zinc-900 dark:text-zinc-50">
                                {backendHealth.sidekiq.enqueued.toLocaleString()}
                              </span>
                            </div>
                          )}
                          {backendHealth.sidekiq.scheduled !== undefined && backendHealth.sidekiq.scheduled > 0 && (
                            <div>
                              <span className="text-zinc-500 dark:text-zinc-400">Scheduled:</span>
                              <span className="ml-1 font-medium text-zinc-900 dark:text-zinc-50">
                                {backendHealth.sidekiq.scheduled.toLocaleString()}
                              </span>
                            </div>
                          )}
                          {backendHealth.sidekiq.retry !== undefined && backendHealth.sidekiq.retry > 0 && (
                            <div>
                              <span className="text-zinc-500 dark:text-zinc-400">Retry:</span>
                              <span className="ml-1 font-medium text-yellow-600 dark:text-yellow-400">
                                {backendHealth.sidekiq.retry.toLocaleString()}
                              </span>
                            </div>
                          )}
                          {backendHealth.sidekiq.dead !== undefined && backendHealth.sidekiq.dead > 0 && (
                            <div>
                              <span className="text-zinc-500 dark:text-zinc-400">Dead:</span>
                              <span className="ml-1 font-medium text-red-600 dark:text-red-400">
                                {backendHealth.sidekiq.dead.toLocaleString()}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                      {backendHealth.sidekiq.error && (
                        <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                          {backendHealth.sidekiq.error}
                        </div>
                      )}
                    </div>
                  )}
                  {backendHealth.error && (
                    <div className="pt-2 text-red-600 dark:text-red-400">
                      Error: {backendHealth.error}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-zinc-500 dark:text-zinc-400">Loading...</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

