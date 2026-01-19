/**
 * Plugin Preferences Component
 * 
 * Displays entities with their available plugins for drag-to-reorder preference setting.
 * Plugins are tried in preference order during entity.operation execution.
 * 
 * Uses the same visual pattern as URL/File handlers for consistency.
 * Drag-and-drop uses native HTML5 DnD (no external dependencies).
 * 
 * @example
 * ```yaml
 * - component: plugin-preferences
 * ```
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';

// =============================================================================
// Types
// =============================================================================

interface PluginInfo {
  id: string;
  name: string;
  hasCredentials: boolean;
}

interface EntityPreferences {
  id: string;
  plugins: PluginInfo[];
  preferences: string[];
}

interface PluginPreferencesProps {
  /** Additional CSS class */
  className?: string;
}

// =============================================================================
// API Helpers
// =============================================================================

async function fetchPluginPreferences(): Promise<{ entities: EntityPreferences[] }> {
  const response = await fetch('/api/plugin-preferences');
  
  if (!response.ok) {
    throw new Error(`Failed to fetch plugin preferences: ${response.statusText}`);
  }
  
  return response.json();
}

async function savePreferences(entity: string, plugins: string[]): Promise<void> {
  // First get current preferences, then update just this entity
  const currentResponse = await fetch('/api/settings/plugin_preferences');
  const current = await currentResponse.json();
  const currentPrefs = current.value || {};
  
  // Update this entity's preferences
  const newPrefs = { ...currentPrefs, [entity]: plugins };
  
  // Save via settings API
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
// Draggable Plugin Chip Component
// =============================================================================

interface PluginChipProps {
  plugin: PluginInfo;
  index: number;
  isOnly: boolean;
  entityId: string;
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
  entityId,
  onDragStart, 
  onDragOver, 
  onDragEnd,
  isDragging,
  dragOverIndex
}: PluginChipProps) {
  // For single plugins, just show the name without drag handle
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
      data-entity={entityId}
      data-index={index}
    >
      <span className="drag-handle" aria-hidden="true">⋮⋮</span>
      <span className="plugin-rank">{index + 1}.</span>
      {plugin.name}
    </span>
  );
}

// =============================================================================
// Entity Row Component
// =============================================================================

interface EntityRowProps {
  entity: EntityPreferences;
  onReorder: (entityId: string, plugins: string[]) => void;
  saving: boolean;
}

function EntityRow({ entity, onReorder, saving }: EntityRowProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  
  // Get ordered list: preferences first, then remaining plugins
  const orderedPlugins = React.useMemo(() => {
    const prefSet = new Set(entity.preferences);
    const inPrefs = entity.preferences
      .map(id => entity.plugins.find(p => p.id === id))
      .filter((p): p is PluginInfo => p !== undefined);
    const notInPrefs = entity.plugins.filter(p => !prefSet.has(p.id));
    return [...inPrefs, ...notInPrefs];
  }, [entity.plugins, entity.preferences]);

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
      // Reorder
      const newOrder = [...orderedPlugins];
      const [removed] = newOrder.splice(dragIndex, 1);
      newOrder.splice(dragOverIndex, 0, removed);
      onReorder(entity.id, newOrder.map(p => p.id));
    }
    setDragIndex(null);
    setDragOverIndex(null);
  }, [dragIndex, dragOverIndex, orderedPlugins, onReorder, entity.id]);

  const isOnly = orderedPlugins.length <= 1;

  return (
    <div className="setting-handler-entry">
      <span className="setting-handler-plugin">{entity.id}</span>
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
            entityId={entity.id}
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

export function PluginPreferences({ className = '' }: PluginPreferencesProps) {
  const [data, setData] = useState<EntityPreferences[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Fetch on mount
  useEffect(() => {
    let cancelled = false;
    
    fetchPluginPreferences()
      .then(result => {
        if (!cancelled) {
          setData(result.entities);
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

  // Handle reorder
  const handleReorder = useCallback(async (entityId: string, plugins: string[]) => {
    setSaving(true);
    
    try {
      await savePreferences(entityId, plugins);
      // Update local state
      setData(prev => prev.map(e => 
        e.id === entityId ? { ...e, preferences: plugins } : e
      ));
    } catch (err) {
      console.error('Failed to save preferences:', err);
    } finally {
      setSaving(false);
    }
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className={`setting-item ${className}`}>
        <div className="list list--loading">
          <div className="list-loading">
            <div className="progress-bar" role="progressbar" aria-label="Loading..." />
            <span className="list-loading-text">Loading plugin preferences...</span>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`setting-item ${className}`}>
        <div className="list list--error">
          <div className="list-error">
            <span className="list-error-icon">⚠</span>
            <span className="list-error-text">{error}</span>
          </div>
        </div>
      </div>
    );
  }

  // No entities with plugins
  const entitiesWithPlugins = data.filter(e => e.plugins.length > 0);
  
  if (entitiesWithPlugins.length === 0) {
    return (
      <div className={`setting-item ${className}`}>
        <span className="setting-label">Entity Preferences</span>
        <div className="setting-description">
          No entities with available plugins. Add credentials for plugins to enable entity operations.
        </div>
      </div>
    );
  }

  return (
    <div className={`setting-item ${className}`}>
      <span className="setting-label">Entity Preferences</span>
      <div className="setting-description">
        Route entity operations to preferred plugins. Drag to reorder priority.
      </div>
      <div className="setting-handlers">
        {entitiesWithPlugins.map(entity => (
          <EntityRow
            key={entity.id}
            entity={entity}
            onReorder={handleReorder}
            saving={saving}
          />
        ))}
      </div>
    </div>
  );
}

export default PluginPreferences;
