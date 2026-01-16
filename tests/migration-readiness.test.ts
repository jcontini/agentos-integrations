/**
 * Migration Readiness Tests
 * 
 * ⚠️ DELETE THIS FILE AFTER MIGRATION COMPLETE (Phase 4)
 * 
 * Validates that connector configs are ready for the flat folder structure.
 * These tests check the new format requirements:
 * - `tags` field (not `apps`)
 * - No `extended_actions` (merged into `actions`)
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import * as yaml from 'yaml';

const INTEGRATIONS_ROOT = join(__dirname, '..');
const APPS_DIR = join(INTEGRATIONS_ROOT, 'apps');

// Connectors that should be migrated to the Apps tool
const APPS_TOOL_CONNECTORS = [
  'linear', 'todoist',           // tasks
  'hardcover', 'goodreads',      // books
  'imessage', 'whatsapp', 'instagram', 'cursor',  // messages
  'apple-contacts',              // contacts
  'apple-calendar',              // calendar
  'mimestream',                  // email
  'copilot',                     // finance
  'youtube',                     // media
  'exa', 'firecrawl', 'reddit', 'whois',  // web
];

interface ConnectorInfo {
  id: string;
  app: string;
  dir: string;
  readmePath: string;
}

// Find all connectors by ID
const findConnector = (connectorId: string): ConnectorInfo | null => {
  for (const appDir of readdirSync(APPS_DIR, { withFileTypes: true })) {
    if (!appDir.isDirectory()) continue;
    
    const connectorsDir = join(APPS_DIR, appDir.name, 'connectors');
    if (!existsSync(connectorsDir)) continue;
    
    for (const connectorDir of readdirSync(connectorsDir, { withFileTypes: true })) {
      if (!connectorDir.isDirectory()) continue;
      if (connectorDir.name === connectorId) {
        return {
          id: connectorId,
          app: appDir.name,
          dir: join(connectorsDir, connectorDir.name),
          readmePath: join(connectorsDir, connectorDir.name, 'readme.md'),
        };
      }
    }
  }
  return null;
};

// Parse frontmatter from readme.md
const parseFrontmatter = (readmePath: string): Record<string, any> | null => {
  if (!existsSync(readmePath)) return null;
  
  const content = readFileSync(readmePath, 'utf-8');
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;
  
  try {
    return yaml.parse(match[1]);
  } catch (e) {
    return null;
  }
};

// =============================================================================
// MIGRATION READINESS - DELETE AFTER MIGRATION
// =============================================================================

describe('Migration Readiness - DELETE AFTER MIGRATION', () => {
  
  describe.each(APPS_TOOL_CONNECTORS)('connector: %s', (connectorId) => {
    const connector = findConnector(connectorId);
    
    it('exists', () => {
      expect(connector).not.toBeNull();
    });
    
    if (!connector) return;
    
    const config = parseFrontmatter(connector.readmePath);
    
    it('has valid frontmatter', () => {
      expect(config).not.toBeNull();
    });
    
    if (!config) return;
    
    it('has id field', () => {
      expect(config.id).toBe(connectorId);
    });
    
    it('has tags field (not apps)', () => {
      // Should have tags, not apps
      expect(config.tags).toBeDefined();
      expect(Array.isArray(config.tags)).toBe(true);
      expect(config.tags.length).toBeGreaterThan(0);
      
      // Should NOT have apps field
      expect(config.apps).toBeUndefined();
    });
    
    it('has no extended_actions (should be merged into actions)', () => {
      expect(config.extended_actions).toBeUndefined();
    });
    
    it('has icon field', () => {
      expect(config.icon).toBeDefined();
    });
  });
});
