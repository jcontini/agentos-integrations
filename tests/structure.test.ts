/**
 * Structure Validation Tests
 * 
 * Ensures all apps and connectors have required files and valid structure.
 * These tests run without MCP - they just check the filesystem.
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';

const INTEGRATIONS_ROOT = join(__dirname, '..');
const APPS_DIR = join(INTEGRATIONS_ROOT, 'apps');
const CONNECTORS_DIR = join(INTEGRATIONS_ROOT, 'connectors');

// Get all app directories
const getApps = () => readdirSync(APPS_DIR, { withFileTypes: true })
  .filter(d => d.isDirectory())
  .map(d => d.name);

// Get all connector directories
const getConnectors = () => readdirSync(CONNECTORS_DIR, { withFileTypes: true })
  .filter(d => d.isDirectory())
  .map(d => d.name);

describe('App Structure', () => {
  const apps = getApps();

  it('has at least one app', () => {
    expect(apps.length).toBeGreaterThan(0);
  });

  describe.each(apps)('apps/%s', (app) => {
    const appDir = join(APPS_DIR, app);

    it('has readme.md', () => {
      expect(existsSync(join(appDir, 'readme.md'))).toBe(true);
    });

    it('has icon.svg', () => {
      const iconPath = join(appDir, 'icon.svg');
      expect(existsSync(iconPath)).toBe(true);
    });

    it('icon.svg is valid SVG', () => {
      const iconPath = join(appDir, 'icon.svg');
      if (existsSync(iconPath)) {
        const content = readFileSync(iconPath, 'utf-8');
        expect(content).toContain('<svg');
        expect(content).toContain('</svg>');
        // Should use currentColor for theming
        expect(content.toLowerCase()).toMatch(/fill="currentcolor"|stroke="currentcolor"|fill="none"/);
      }
    });

    it('readme.md has required sections', () => {
      const readmePath = join(appDir, 'readme.md');
      if (existsSync(readmePath)) {
        const content = readFileSync(readmePath, 'utf-8').toLowerCase();
        // Should have a title (# App Name)
        expect(content).toMatch(/^#\s+\w+/m);
      }
    });

    // Data apps should have schema.sql
    it('data apps have schema.sql', () => {
      const schemaPath = join(appDir, 'schema.sql');
      const readmePath = join(appDir, 'readme.md');
      
      // If readme explicitly mentions schema.sql or "local database", it's a data app
      // Don't trigger on "database" alone (the Databases app queries external DBs)
      if (existsSync(readmePath)) {
        const readme = readFileSync(readmePath, 'utf-8').toLowerCase();
        const isDataApp = readme.includes('schema.sql') || 
                          readme.includes('local database') ||
                          readme.includes('per-app database');
        
        if (isDataApp) {
          expect(existsSync(schemaPath)).toBe(true);
        }
      }
    });
  });
});

describe('Connector Structure', () => {
  const connectors = getConnectors();

  it('has at least one connector', () => {
    expect(connectors.length).toBeGreaterThan(0);
  });

  describe.each(connectors)('connectors/%s', (connector) => {
    const connectorDir = join(CONNECTORS_DIR, connector);

    it('has readme.md', () => {
      expect(existsSync(join(connectorDir, 'readme.md'))).toBe(true);
    });

    it('has at least one app yaml or icon', () => {
      const files = readdirSync(connectorDir);
      const hasYaml = files.some(f => f.endsWith('.yaml'));
      const hasIcon = files.some(f => f.startsWith('icon.'));
      // Connector should have either a yaml config or at least an icon
      expect(hasYaml || hasIcon).toBe(true);
    });

    it('yaml files reference valid apps', () => {
      const files = readdirSync(connectorDir).filter(f => f.endsWith('.yaml'));
      const validApps = getApps();
      
      for (const file of files) {
        // Filename should match an app (e.g., books.yaml → books app)
        const appName = file.replace('.yaml', '');
        expect(validApps).toContain(appName);
      }
    });
  });
});

describe('Icon Quality', () => {
  const apps = getApps();

  describe.each(apps)('apps/%s icon', (app) => {
    const iconPath = join(APPS_DIR, app, 'icon.svg');

    it('uses viewBox for scalability', () => {
      if (existsSync(iconPath)) {
        const content = readFileSync(iconPath, 'utf-8');
        expect(content).toContain('viewBox');
      }
    });

    it('does not have hardcoded colors (except currentColor)', () => {
      if (existsSync(iconPath)) {
        const content = readFileSync(iconPath, 'utf-8');
        // Should not have hex colors or named colors (except in comments)
        const hasHardcodedColor = /#[0-9a-fA-F]{3,6}/.test(content) ||
                                  /fill="(?!currentColor|none)[a-z]+"/i.test(content) ||
                                  /stroke="(?!currentColor|none)[a-z]+"/i.test(content);
        expect(hasHardcodedColor).toBe(false);
      }
    });

    it('is reasonably sized (under 5KB)', () => {
      if (existsSync(iconPath)) {
        const content = readFileSync(iconPath, 'utf-8');
        expect(content.length).toBeLessThan(5000);
      }
    });
  });
});
