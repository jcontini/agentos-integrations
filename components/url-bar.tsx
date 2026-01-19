/**
 * URL Bar Component
 * 
 * A browser-style location bar for the observation layer. Display-only by design—
 * shows what the AI searched or navigated to, not for user input.
 * 
 * Features:
 * - Navigation buttons (back, forward, refresh, stop) — grayed out in observation mode
 * - Mode-aware icon (search or globe)
 * - Loading spinner during pending requests
 * - Source attribution (which plugin performed the action)
 * 
 * @example
 * ```yaml
 * toolbar:
 *   - component: url-bar
 *     props:
 *       mode: search
 *       value: "rust programming language"
 *       loading: false
 *       source: exa
 * ```
 */

import { useState, useRef, useEffect } from 'react';

interface UrlBarProps {
  /** Display mode: 'search' shows query, 'url' shows address */
  mode?: 'search' | 'url';
  /** The query or URL to display */
  value?: string;
  /** Show loading spinner */
  loading?: boolean;
  /** Source plugin that performed the action (e.g., 'exa', 'firecrawl') */
  source?: string;
  /** Source plugin icon URL */
  sourceIcon?: string;
  /** Can navigate back in history */
  canGoBack?: boolean;
  /** Can navigate forward in history */
  canGoForward?: boolean;
  /** Callback when back button clicked */
  onBack?: () => void;
  /** Callback when forward button clicked */
  onForward?: () => void;
}

// Simple SVG icons - inline to avoid external dependencies
const Icons = {
  back: (
    <svg viewBox="0 0 16 16" fill="currentColor" width="12" height="12">
      <path d="M11 2L5 8l6 6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  forward: (
    <svg viewBox="0 0 16 16" fill="currentColor" width="12" height="12">
      <path d="M5 2l6 6-6 6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  refresh: (
    <svg viewBox="0 0 16 16" fill="currentColor" width="12" height="12">
      <path d="M14 8A6 6 0 1 1 8 2" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/>
      <path d="M14 2v4h-4" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  stop: (
    <svg viewBox="0 0 16 16" fill="currentColor" width="12" height="12">
      <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  search: (
    <svg viewBox="0 0 16 16" fill="currentColor" width="14" height="14">
      <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="2" fill="none"/>
      <path d="M10 10l4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  globe: (
    <svg viewBox="0 0 16 16" fill="currentColor" width="14" height="14">
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      <ellipse cx="8" cy="8" rx="3" ry="6.5" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      <path d="M1.5 8h13M2.5 4.5h11M2.5 11.5h11" stroke="currentColor" strokeWidth="1"/>
    </svg>
  ),
  loading: (
    <svg viewBox="0 0 16 16" width="14" height="14" className="url-bar-spinner">
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.3"/>
      <path d="M8 2a6 6 0 0 1 6 6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/>
    </svg>
  ),
};

export function UrlBar({
  mode = 'search',
  value = '',
  loading = false,
  source,
  sourceIcon,
  canGoBack = false,
  canGoForward = false,
  onBack,
  onForward,
}: UrlBarProps) {
  // Navigation is enabled when callbacks are provided and history exists
  const backEnabled = canGoBack && !!onBack;
  const forwardEnabled = canGoForward && !!onForward;

  return (
    <div className="url-bar" data-mode={mode} data-loading={loading}>
      {/* Navigation buttons - enabled when history navigation is available */}
      <div className="url-bar-nav">
        <button
          className="url-bar-nav-button"
          disabled={!backEnabled}
          onClick={backEnabled ? onBack : undefined}
          aria-label="Back"
          title={backEnabled ? "Go back in history" : "No previous history"}
        >
          {Icons.back}
        </button>
        <button
          className="url-bar-nav-button"
          disabled={!forwardEnabled}
          onClick={forwardEnabled ? onForward : undefined}
          aria-label="Forward"
          title={forwardEnabled ? "Go forward in history" : "At latest"}
        >
          {Icons.forward}
        </button>
        <button
          className="url-bar-nav-button"
          disabled={true}
          aria-label={loading ? "Stop" : "Refresh"}
          title={loading ? "Loading..." : "Refresh (observation mode)"}
        >
          {loading ? Icons.stop : Icons.refresh}
        </button>
      </div>

      {/* Location field */}
      <div className="url-bar-field">
        {/* Mode icon or loading spinner */}
        <span className="url-bar-icon" aria-hidden="true">
          {loading ? Icons.loading : (mode === 'search' ? Icons.search : Icons.globe)}
        </span>

        {/* Value display (readonly) */}
        <span className="url-bar-value" title={value}>
          {value || (mode === 'search' ? 'Search the web...' : 'Enter a URL...')}
        </span>

        {/* Source attribution */}
        {source && (
          <span className="url-bar-source" title={`via ${source}`}>
            {sourceIcon ? (
              <img 
                src={sourceIcon} 
                alt={source} 
                className="url-bar-source-icon"
                width="14"
                height="14"
              />
            ) : null}
            <span className="url-bar-source-name">{source}</span>
          </span>
        )}
      </div>
    </div>
  );
}

export default UrlBar;
