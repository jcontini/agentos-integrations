/**
 * About Panel Component
 * 
 * Displays AgentOS system information:
 * - Version
 * - System paths (data, integrations)
 * - Database stats
 * - Recent errors
 * 
 * @example
 * ```yaml
 * - component: about-panel
 * ```
 */

import React, { useState, useEffect } from 'react';

// =============================================================================
// Types
// =============================================================================

interface SystemStatus {
  version: string;
  paths: {
    data: string;
    integrations: string;
  };
  database: {
    path: string;
    size_bytes: number;
  };
  plugins_loaded: number;
  sources_configured: number;
  logging_enabled: boolean;
  terminal_enabled: boolean;
}

interface RecentError {
  created_at: string;
  entity: string;
  operation: string;
  error: string;
  connector: string | null;
}

interface AboutPanelProps {
  /** Additional CSS class */
  className?: string;
}

// =============================================================================
// API Helpers
// =============================================================================

async function fetchStatus(): Promise<SystemStatus> {
  const response = await fetch('/api/tools/call', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tool: 'Settings',
      arguments: { action: 'status' }
    })
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch status: ${response.statusText}`);
  }
  
  const data = await response.json();
  return data.result;
}

async function fetchRecentErrors(): Promise<RecentError[]> {
  const response = await fetch('/api/tools/call', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tool: 'Settings',
      arguments: { action: 'recent_errors', params: { limit: 5 } }
    })
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch errors: ${response.statusText}`);
  }
  
  const data = await response.json();
  return data.result?.errors || [];
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatRelativeTime(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

// =============================================================================
// Component
// =============================================================================

export function AboutPanel({ className = '' }: AboutPanelProps) {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [errors, setErrors] = useState<RecentError[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [showLogs, setShowLogs] = useState(false);

  useEffect(() => {
    let cancelled = false;
    
    // Fetch status and errors with a timeout to prevent hanging
    const timeoutMs = 5000;
    
    const fetchWithTimeout = async <T,>(promise: Promise<T>): Promise<T> => {
      const timeout = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
      );
      return Promise.race([promise, timeout]);
    };
    
    Promise.all([
      fetchWithTimeout(fetchStatus()),
      fetchWithTimeout(fetchRecentErrors())
    ])
      .then(([statusData, errorsData]) => {
        if (!cancelled) {
          setStatus(statusData);
          setErrors(errorsData);
          setLoading(false);
        }
      })
      .catch(err => {
        if (!cancelled) {
          setFetchError(err.message);
          setLoading(false);
        }
      });
    
    return () => { cancelled = true; };
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className={`about-panel about-panel--loading ${className}`}>
        <div className="about-panel-loading">
          <div className="progress-bar" role="progressbar" aria-label="Loading system info..." />
          <span className="about-panel-loading-text">Loading system info...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (fetchError || !status) {
    return (
      <div className={`about-panel about-panel--error ${className}`}>
        <div className="about-panel-error">
          <span className="about-panel-error-icon">⚠</span>
          <span className="about-panel-error-text">{fetchError || 'Failed to load status'}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`about-panel ${className}`}>
      {/* Header */}
      <div className="about-panel-header">
        <h2 className="about-panel-title">AgentOS</h2>
        <p className="about-panel-tagline">
          The semantic layer between AI assistants and your digital life
        </p>
        <p className="about-panel-version">Version {status.version}</p>
      </div>

      {/* System Info */}
      <fieldset className="about-panel-section">
        <legend>System</legend>
        <dl className="about-panel-info">
          <div className="about-panel-row">
            <dt>Plugins loaded</dt>
            <dd>{status.plugins_loaded}</dd>
          </div>
          <div className="about-panel-row">
            <dt>Plugin sources</dt>
            <dd>{status.sources_configured}</dd>
          </div>
          <div className="about-panel-row">
            <dt>Activity logging</dt>
            <dd>{status.logging_enabled ? 'Enabled' : 'Disabled'}</dd>
          </div>
          <div className="about-panel-row">
            <dt>Terminal access</dt>
            <dd>{status.terminal_enabled ? 'Enabled' : 'Disabled'}</dd>
          </div>
        </dl>
      </fieldset>

      {/* Paths */}
      <fieldset className="about-panel-section">
        <legend>Paths</legend>
        <dl className="about-panel-info about-panel-info--paths">
          <div className="about-panel-row">
            <dt>Data</dt>
            <dd className="about-panel-path">{status.paths.data}</dd>
          </div>
          <div className="about-panel-row">
            <dt>Integrations</dt>
            <dd className="about-panel-path">{status.paths.integrations}</dd>
          </div>
          <div className="about-panel-row">
            <dt>Database</dt>
            <dd className="about-panel-path">
              {status.database.path}
              <span className="about-panel-size">({formatBytes(status.database.size_bytes)})</span>
            </dd>
          </div>
        </dl>
      </fieldset>

      {/* Recent Errors - compact summary with expandable logs */}
      <fieldset className="about-panel-section">
        <legend>Recent Errors</legend>
        {errors.length === 0 ? (
          <p className="about-panel-no-errors">No recent errors</p>
        ) : (
          <div className="about-panel-errors-summary">
            <div className="about-panel-errors-status">
              <span className="about-panel-last-error">
                Last error: {formatRelativeTime(errors[0].created_at)}
              </span>
              <span className="about-panel-error-count">
                ({errors.length} total)
              </span>
            </div>
            <button 
              type="button"
              className="about-panel-view-logs"
              onClick={() => setShowLogs(!showLogs)}
              aria-expanded={showLogs}
            >
              {showLogs ? 'Hide Logs' : 'View Logs'}
            </button>
          </div>
        )}
        
        {/* Expandable error list */}
        {showLogs && errors.length > 0 && (
          <ul className="about-panel-errors">
            {errors.map((err, i) => (
              <li key={i} className="about-panel-error-item">
                <span className="about-panel-error-time">{formatRelativeTime(err.created_at)}</span>
                <span className="about-panel-error-context">
                  {err.entity}.{err.operation}
                  {err.connector && ` (${err.connector})`}
                </span>
                <span className="about-panel-error-message">{err.error}</span>
              </li>
            ))}
          </ul>
        )}
      </fieldset>
    </div>
  );
}

export default AboutPanel;
