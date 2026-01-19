/**
 * Web Defaults Component
 * 
 * Configure default plugins for web operations (search and read).
 * Uses fieldset style consistent with other settings.
 * 
 * @example
 * ```yaml
 * - component: web-defaults
 * ```
 */

import React, { useState, useEffect, useCallback } from 'react';

// =============================================================================
// Types
// =============================================================================

interface PluginInfo {
  id: string;
  name: string;
}

interface OperationPrefs {
  id: string;
  label: string;
  plugins: PluginInfo[];
  preferences: string[];
}

interface WebDefaultsProps {
  className?: string;
}

// =============================================================================
// API Helpers
// =============================================================================

async function fetchWebDefaults(): Promise<{ operations: OperationPrefs[] }> {
  const response = await fetch('/api/web-defaults');
  if (!response.ok) {
    throw new Error(`Failed to fetch web defaults: ${response.statusText}`);
  }
  return response.json();
}

async function savePreferences(operationKey: string, plugins: string[]): Promise<void> {
  const currentResponse = await fetch('/api/settings/plugin_preferences');
  const current = await currentResponse.json();
  const currentPrefs = current.value || {};
  
  const newPrefs = { ...currentPrefs, [operationKey]: plugins };
  
  const response = await fetch('/api/settings/plugin_preferences', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ value: newPrefs })
  });
  
  if (!response.ok) {
    throw new Error(`Failed to save preferences: ${response.statusText}`);
  }
}

// =============================================================================
// Plugin Chip Component (with drag support)
// =============================================================================

interface PluginChipProps {
  plugin: PluginInfo;
  index: number;
  isOnly: boolean;
  operationId: string;
  onDragStart: (e: React.DragEvent, index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDragEnd: () => void;
  isDragging: boolean;
  dragOverIndex: number | null;
}

function PluginChip({ 
  plugin, 
  index, 
  isOnly, 
  onDragStart, 
  onDragOver, 
  onDragEnd,
  isDragging,
  dragOverIndex
}: PluginChipProps) {
  if (isOnly) {
    return (
      <span className="setting-handler-pattern">
        {plugin.name}
      </span>
    );
  }

  const isOver = dragOverIndex === index;

  return (
    <span
      className={`setting-handler-pattern ${isDragging ? 'dragging' : ''} ${isOver ? 'drag-over' : ''}`}
      draggable
      onDragStart={(e) => onDragStart(e, index)}
      onDragOver={(e) => onDragOver(e, index)}
      onDragEnd={onDragEnd}
    >
      <span className="drag-handle" aria-hidden="true">⋮⋮</span>
      <span className="plugin-rank">{index + 1}.</span>
      {plugin.name}
    </span>
  );
}

// =============================================================================
// Operation Row Component
// =============================================================================

interface OperationRowProps {
  operation: OperationPrefs;
  onReorder: (operationId: string, plugins: string[]) => void;
  saving: boolean;
}

function OperationRow({ operation, onReorder, saving }: OperationRowProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  
  // Get ordered list: preferences first, then remaining plugins
  const orderedPlugins = React.useMemo(() => {
    const prefSet = new Set(operation.preferences);
    const inPrefs = operation.preferences
      .map(id => operation.plugins.find(p => p.id === id))
      .filter((p): p is PluginInfo => p !== undefined);
    const notInPrefs = operation.plugins.filter(p => !prefSet.has(p.id));
    return [...inPrefs, ...notInPrefs];
  }, [operation.plugins, operation.preferences]);

  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  }, []);

  const handleDragEnd = useCallback(() => {
    if (dragIndex !== null && dragOverIndex !== null && dragIndex !== dragOverIndex) {
      const newOrder = [...orderedPlugins];
      const [removed] = newOrder.splice(dragIndex, 1);
      newOrder.splice(dragOverIndex, 0, removed);
      onReorder(operation.id, newOrder.map(p => p.id));
    }
    setDragIndex(null);
    setDragOverIndex(null);
  }, [dragIndex, dragOverIndex, orderedPlugins, onReorder, operation.id]);

  const isOnly = orderedPlugins.length <= 1;

  return (
    <div className="setting-handler-entry">
      <span className="setting-handler-plugin">{operation.label}</span>
      <div 
        className="setting-handler-patterns"
        onDragLeave={() => setDragOverIndex(null)}
      >
        {orderedPlugins.map((plugin, index) => (
          <PluginChip
            key={plugin.id}
            plugin={plugin}
            index={index}
            isOnly={isOnly}
            operationId={operation.id}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            isDragging={dragIndex === index}
            dragOverIndex={dragOverIndex}
          />
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function WebDefaults({ className = '' }: WebDefaultsProps) {
  const [data, setData] = useState<OperationPrefs[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    
    fetchWebDefaults()
      .then(result => {
        if (!cancelled) {
          setData(result.operations);
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

  const handleReorder = useCallback(async (operationId: string, plugins: string[]) => {
    setSaving(true);
    
    try {
      await savePreferences(operationId, plugins);
      setData(prev => prev.map(op => 
        op.id === operationId ? { ...op, preferences: plugins } : op
      ));
    } catch (err) {
      console.error('Failed to save preferences:', err);
    } finally {
      setSaving(false);
    }
  }, []);

  if (loading) {
    return (
      <fieldset className={`setting-fieldset ${className}`}>
        <legend>Web Defaults</legend>
        <div className="list list--loading" style={{ minHeight: '60px' }}>
          <div className="list-loading">
            <div className="progress-bar" role="progressbar" aria-label="Loading..." />
          </div>
        </div>
      </fieldset>
    );
  }

  if (error) {
    return (
      <fieldset className={`setting-fieldset ${className}`}>
        <legend>Web Defaults</legend>
        <div className="list-error">
          <span className="list-error-icon">⚠</span>
          <span className="list-error-text">{error}</span>
        </div>
      </fieldset>
    );
  }

  if (data.length === 0) {
    return (
      <fieldset className={`setting-fieldset ${className}`}>
        <legend>Web Defaults</legend>
        <div className="setting-description">
          No web plugins configured. Add credentials for Exa, Firecrawl, or Brave to enable.
        </div>
      </fieldset>
    );
  }

  return (
    <fieldset className={`setting-fieldset ${className}`}>
      <legend>Web Defaults</legend>
      <div className="setting-handlers">
        {data.map(operation => (
          <OperationRow
            key={operation.id}
            operation={operation}
            onReorder={handleReorder}
            saving={saving}
          />
        ))}
      </div>
    </fieldset>
  );
}

export default WebDefaults;
