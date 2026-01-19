/**
 * Schema Validation Tests
 * 
 * Validates that all plugin readme.md files have valid YAML frontmatter
 * that conforms to the plugin schema.
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { parse as parseYaml } from 'yaml';

const INTEGRATIONS_ROOT = join(__dirname, '..');
const PLUGINS_DIR = join(INTEGRATIONS_ROOT, 'plugins');
const SCHEMA_PATH = join(INTEGRATIONS_ROOT, 'tests', 'plugin.schema.json');

// Load and compile schema
const schema = JSON.parse(readFileSync(SCHEMA_PATH, 'utf-8'));
const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const validate = ajv.compile(schema);

// Get all plugin directories (flat structure)
const getPlugins = () => readdirSync(PLUGINS_DIR, { withFileTypes: true })
  .filter(d => d.isDirectory())
  .map(d => d.name);

// Parse YAML frontmatter from markdown
function parseFrontmatter(content: string): Record<string, unknown> | null {
  if (!content.startsWith('---')) return null;
  const endIndex = content.indexOf('\n---', 3);
  if (endIndex === -1) return null;
  const yaml = content.slice(4, endIndex);
  return parseYaml(yaml);
}

describe('Plugin Schema Validation', () => {
  const plugins = getPlugins();

  it('schema file exists', () => {
    expect(existsSync(SCHEMA_PATH)).toBe(true);
  });

  it('has plugins to validate', () => {
    expect(plugins.length).toBeGreaterThan(0);
  });

  describe.each(plugins)('plugins/%s', (plugin) => {
    const readmePath = join(PLUGINS_DIR, plugin, 'readme.md');

    it('has readme.md', () => {
      expect(existsSync(readmePath)).toBe(true);
    });

    it('has valid YAML frontmatter', () => {
      const content = readFileSync(readmePath, 'utf-8');
      const frontmatter = parseFrontmatter(content);
      expect(frontmatter).not.toBeNull();
    });

    it('conforms to plugin schema', () => {
      const content = readFileSync(readmePath, 'utf-8');
      const frontmatter = parseFrontmatter(content);
      if (!frontmatter) {
        throw new Error('No frontmatter found');
      }

      const valid = validate(frontmatter);
      if (!valid) {
        const errors = validate.errors?.map(e => 
          `  ${e.instancePath || '/'}: ${e.message}`
        ).join('\n');
        throw new Error(`Schema validation failed:\n${errors}`);
      }
      expect(valid).toBe(true);
    });

    it('has required icon file', () => {
      const pluginDir = join(PLUGINS_DIR, plugin);
      const files = readdirSync(pluginDir);
      const hasIcon = files.some(f => f.startsWith('icon.'));
      expect(hasIcon).toBe(true);
    });
  });
});

describe('Schema Completeness', () => {
  it('all plugins have tags', () => {
    for (const plugin of getPlugins()) {
      const content = readFileSync(join(PLUGINS_DIR, plugin, 'readme.md'), 'utf-8');
      const frontmatter = parseFrontmatter(content);
      expect(frontmatter?.tags, `${plugin} missing tags`).toBeDefined();
      expect(Array.isArray(frontmatter?.tags), `${plugin} tags should be array`).toBe(true);
    }
  });

  it('all plugins have at least one action', () => {
    for (const plugin of getPlugins()) {
      const content = readFileSync(join(PLUGINS_DIR, plugin, 'readme.md'), 'utf-8');
      const frontmatter = parseFrontmatter(content);
      const actions = frontmatter?.actions as Record<string, unknown> | undefined;
      expect(actions, `${plugin} missing actions`).toBeDefined();
      expect(Object.keys(actions || {}).length, `${plugin} has no actions`).toBeGreaterThan(0);
    }
  });
});
