'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { getStatusColor } from '@/lib/utils';

import {
  AuthGuard,
  Navigation,
  BackgroundDecorations,
  PageHeader,
  LoadingState,
} from '@/components';

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

function ServiceBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.08em] ${getStatusColor(status, 'system')}`}>
      {status === 'ok' ? 'Healthy' : 'Unhealthy'}
    </span>
  );
}

function StatRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-200/70 py-2.5 last:border-b-0">
      <span className="text-sm text-slate-600">{label}</span>
      <span className="text-sm font-medium text-slate-900">{value}</span>
    </div>
  );
}

export default function SystemStatusPage() {
  const [frontendHealth, setFrontendHealth] = useState<HealthStatus | null>(null);
  const [backendHealth, setBackendHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchHealth = async () => {
    setLoading(true);
    try {
      const frontendResponse = await fetch('/api/health', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
        },
      });
      if (!frontendResponse.ok) {
        throw new Error(`Frontend health check failed: ${frontendResponse.status} ${frontendResponse.statusText}`);
      }
      const frontendText = await frontendResponse.text();
      if (!frontendText || frontendText.trim() === '') {
        throw new Error('Empty response from frontend health endpoint');
      }
      const frontendData = JSON.parse(frontendText);
      setFrontendHealth(frontendData);

      try {
        const backendResponse = await fetch('/api/proxy/api/v1/health', {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
            Pragma: 'no-cache',
          },
        });
        if (!backendResponse.ok) {
          throw new Error(`Backend health check failed: ${backendResponse.status} ${backendResponse.statusText}`);
        }
        const backendText = await backendResponse.text();
        if (!backendText || backendText.trim() === '') {
          throw new Error('Empty response from backend health endpoint');
        }
        const backendData = JSON.parse(backendText);
        setBackendHealth(backendData);
      } catch (error) {
        setBackendHealth({
          status: 'error',
          service: 'backend',
          error: error instanceof Error ? error.message : 'Failed to connect to backend',
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      setFrontendHealth({
        status: 'error',
        service: 'frontend',
        error: error instanceof Error ? error.message : 'Failed to fetch health status',
        timestamp: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
      setLastUpdated(new Date());
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <AuthGuard>
      <div className="app-shell">
        <BackgroundDecorations />
        <Navigation />

        <main className="app-main-narrow relative">
          <PageHeader
            title="System Status"
            description={`Last updated: ${lastUpdated.toLocaleTimeString()}`}
            action={
              <button onClick={fetchHealth} disabled={loading} className="app-btn-secondary">
                {loading ? 'Refreshing...' : 'Refresh'}
              </button>
            }
          />

          {loading && !frontendHealth && !backendHealth ? (
            <LoadingState message="Checking service health..." />
          ) : (
            <div className="space-y-6">
              <div className="app-card">
                <div className="app-card-header">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="app-section-title">Frontend Service</h2>
                    {frontendHealth && <ServiceBadge status={frontendHealth.status} />}
                  </div>
                </div>
                <div className="app-card-body">
                  {frontendHealth ? (
                    <div>
                      <StatRow label="Status" value={frontendHealth.status.toUpperCase()} />
                      {frontendHealth.version && <StatRow label="Version" value={frontendHealth.version} />}
                      {frontendHealth.environment && <StatRow label="Environment" value={frontendHealth.environment} />}
                      {frontendHealth.uptime && <StatRow label="Uptime" value={`${Math.floor(frontendHealth.uptime)}s`} />}
                      {frontendHealth.memory && (
                        <StatRow
                          label="Memory"
                          value={`${frontendHealth.memory.used} / ${frontendHealth.memory.total} ${frontendHealth.memory.unit}`}
                        />
                      )}
                      {frontendHealth.error && <p className="mt-3 text-sm text-red-700">Error: {frontendHealth.error}</p>}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-600">No data available.</p>
                  )}
                </div>
              </div>

              <div className="app-card">
                <div className="app-card-header">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="app-section-title">Backend Service</h2>
                    {backendHealth && <ServiceBadge status={backendHealth.status} />}
                  </div>
                </div>
                <div className="app-card-body">
                  {backendHealth ? (
                    <div>
                      <StatRow label="Status" value={backendHealth.status.toUpperCase()} />
                      {backendHealth.version && <StatRow label="Version" value={backendHealth.version} />}
                      {backendHealth.environment && <StatRow label="Environment" value={backendHealth.environment} />}

                      {backendHealth.database && (
                        <StatRow
                          label="Database"
                          value={backendHealth.database.connected ? 'Connected' : 'Disconnected'}
                        />
                      )}
                      {backendHealth.redis && (
                        <StatRow label="Redis" value={backendHealth.redis.connected ? 'Connected' : 'Disconnected'} />
                      )}

                      {backendHealth.sidekiq && (
                        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                          <div className="mb-2 flex items-center justify-between">
                            <p className="text-sm font-semibold text-slate-900">Sidekiq</p>
                            <span className={`text-xs font-semibold ${backendHealth.sidekiq.connected ? 'text-emerald-700' : 'text-red-700'}`}>
                              {backendHealth.sidekiq.connected ? 'Running' : 'Not Running'}
                            </span>
                          </div>

                          {backendHealth.sidekiq.connected && (
                            <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                              {backendHealth.sidekiq.processes !== undefined && <p>Processes: {backendHealth.sidekiq.processes}</p>}
                              {backendHealth.sidekiq.processed !== undefined && (
                                <p>Processed: {backendHealth.sidekiq.processed.toLocaleString()}</p>
                              )}
                              {backendHealth.sidekiq.failed !== undefined && (
                                <p className={backendHealth.sidekiq.failed > 0 ? 'text-red-700' : ''}>
                                  Failed: {backendHealth.sidekiq.failed.toLocaleString()}
                                </p>
                              )}
                              {backendHealth.sidekiq.enqueued !== undefined && (
                                <p>Enqueued: {backendHealth.sidekiq.enqueued.toLocaleString()}</p>
                              )}
                              {backendHealth.sidekiq.scheduled !== undefined && (
                                <p>Scheduled: {backendHealth.sidekiq.scheduled.toLocaleString()}</p>
                              )}
                              {backendHealth.sidekiq.retry !== undefined && (
                                <p className={backendHealth.sidekiq.retry > 0 ? 'text-amber-700' : ''}>
                                  Retry: {backendHealth.sidekiq.retry.toLocaleString()}
                                </p>
                              )}
                              {backendHealth.sidekiq.dead !== undefined && (
                                <p className={backendHealth.sidekiq.dead > 0 ? 'text-red-700' : ''}>
                                  Dead: {backendHealth.sidekiq.dead.toLocaleString()}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {backendHealth.error && <p className="mt-3 text-sm text-red-700">Error: {backendHealth.error}</p>}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-600">No data available.</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </AuthGuard>
  );
}
