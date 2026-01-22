/**
 * Credential List Component
 * 
 * Displays configured credential accounts grouped by plugin.
 * Only shows account names, never actual secrets.
 * 
 * @example
 * ```yaml
 * - component: credential-list
 * ```
 */

import React, { useState, useEffect } from 'react';

// =============================================================================
// Types
// =============================================================================

interface Credential {
  account: string;
  plugin: string;
}

interface PluginGroup {
  plugin: string;
  accounts: string[];
}

interface CredentialListProps {
  /** Additional CSS class */
  className?: string;
}

// =============================================================================
// API Helpers
// =============================================================================

async function fetchCredentials(): Promise<Credential[]> {
  const response = await fetch('/api/tools/call', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tool: 'Settings',
      arguments: { action: 'list_credentials' }
    })
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch credentials: ${response.statusText}`);
  }
  
  const data = await response.json();
  return data.result?.credentials || [];
}

function groupByPlugin(credentials: Credential[]): PluginGroup[] {
  const groups = new Map<string, string[]>();
  
  for (const cred of credentials) {
    const accounts = groups.get(cred.plugin) || [];
    accounts.push(cred.account);
    groups.set(cred.plugin, accounts);
  }
  
  // Sort plugins alphabetically
  return Array.from(groups.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([plugin, accounts]) => ({ plugin, accounts }));
}

// =============================================================================
// Component
// =============================================================================

export function CredentialList({ className = '' }: CredentialListProps) {
  const [groups, setGroups] = useState<PluginGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    
    fetchCredentials()
      .then(credentials => {
        if (!cancelled) {
          setGroups(groupByPlugin(credentials));
          setLoading(false);
        }
      })
      .catch(err => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      });
    
    return () => { cancelled = true; };
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className={`credential-list credential-list--loading ${className}`}>
        <div className="credential-list-loading">
          <div className="progress-bar" role="progressbar" aria-label="Loading accounts..." />
          <span className="credential-list-loading-text">Loading accounts...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`credential-list credential-list--error ${className}`}>
        <div className="credential-list-error">
          <span className="credential-list-error-icon">⚠</span>
          <span className="credential-list-error-text">{error}</span>
        </div>
      </div>
    );
  }

  // Empty state
  if (groups.length === 0) {
    return (
      <div className={`credential-list credential-list--empty ${className}`}>
        <div className="credential-list-empty">
          <span className="credential-list-empty-icon">🔑</span>
          <span className="credential-list-empty-text">No accounts configured</span>
          <span className="credential-list-empty-hint">
            Add credentials to ~/.agentos/credentials.json
          </span>
        </div>
      </div>
    );
  }

  // Credential groups
  return (
    <div className={`credential-list ${className}`}>
      {groups.map(group => (
        <fieldset key={group.plugin} className="credential-group">
          <legend className="credential-group-name">{group.plugin}</legend>
          <ul className="credential-accounts">
            {group.accounts.map(account => (
              <li key={account} className="credential-account">
                <span className="credential-account-icon">●</span>
                <span className="credential-account-name">{account}</span>
              </li>
            ))}
          </ul>
        </fieldset>
      ))}
    </div>
  );
}

export default CredentialList;
