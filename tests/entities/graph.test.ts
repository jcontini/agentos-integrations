/**
 * Entity Graph Validation Tests
 * 
 * Validates:
 * - graph.yaml references valid entities with no conflicts
 * - All relationships have required fields
 * - Plugin relationships reference valid graph relationships
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { parse as parseYaml } from 'yaml';

const INTEGRATIONS_ROOT = join(__dirname, '../..');
const ENTITIES_DIR = join(INTEGRATIONS_ROOT, 'entities');
const GRAPH_PATH = join(ENTITIES_DIR, 'graph.yaml');
const PLUGINS_DIR = join(INTEGRATIONS_ROOT, 'plugins');

// Get all entity files (excluding graph.yaml)
const getEntityFiles = () => existsSync(ENTITIES_DIR)
  ? readdirSync(ENTITIES_DIR).filter(f => f.endsWith('.yaml') && f !== 'graph.yaml')
  : [];

// Get all plugin directories (excluding .needs-work)
const getPlugins = () => readdirSync(PLUGINS_DIR, { withFileTypes: true })
  .filter(d => d.isDirectory() && d.name !== '.needs-work')
  .map(d => d.name);

// Parse YAML frontmatter from markdown
function parseFrontmatter(content: string): Record<string, unknown> | null {
  if (!content.startsWith('---')) return null;
  const endIndex = content.indexOf('\n---', 3);
  if (endIndex === -1) return null;
  const yaml = content.slice(4, endIndex);
  return parseYaml(yaml);
}

// Get valid relationship IDs from graph.yaml
const getValidRelationshipIds = () => {
  const content = readFileSync(GRAPH_PATH, 'utf-8');
  const graph = parseYaml(content);
  return new Set(Object.keys(graph.relationships || {}));
};

describe('Graph Validation', () => {
  it('graph.yaml exists', () => {
    expect(existsSync(GRAPH_PATH)).toBe(true);
  });

  it('graph.yaml is valid YAML', () => {
    const content = readFileSync(GRAPH_PATH, 'utf-8');
    const graph = parseYaml(content);
    expect(graph).toBeDefined();
    expect(graph.relationships).toBeDefined();
  });

  it('all relationship entities exist', () => {
    const graphContent = readFileSync(GRAPH_PATH, 'utf-8');
    const graph = parseYaml(graphContent);
    
    // Get valid entity IDs
    const validEntityIds = new Set<string>();
    for (const file of getEntityFiles()) {
      const content = readFileSync(join(ENTITIES_DIR, file), 'utf-8');
      const entity = parseYaml(content);
      if (entity.id) {
        validEntityIds.add(entity.id);
      }
    }
    
    const errors: string[] = [];
    
    for (const [relId, rel] of Object.entries(graph.relationships as Record<string, { from?: string; to?: string | string[] }>)) {
      if (rel.from && !validEntityIds.has(rel.from)) {
        errors.push(`Relationship '${relId}' references unknown 'from' entity: ${rel.from}`);
      }
      
      if (rel.to) {
        const toEntities = Array.isArray(rel.to) ? rel.to : [rel.to];
        for (const toEntity of toEntities) {
          if (!validEntityIds.has(toEntity)) {
            errors.push(`Relationship '${relId}' references unknown 'to' entity: ${toEntity}`);
          }
        }
      }
    }
    
    if (errors.length > 0) {
      throw new Error(`Graph validation errors:\n${errors.join('\n')}`);
    }
  });

  it('all relationships have required fields', () => {
    const content = readFileSync(GRAPH_PATH, 'utf-8');
    const graph = parseYaml(content);
    const errors: string[] = [];
    
    for (const [relId, rel] of Object.entries(graph.relationships as Record<string, { from?: string; to?: string | string[]; description?: string }>)) {
      if (!rel.from) errors.push(`Relationship '${relId}' missing 'from'`);
      if (!rel.to) errors.push(`Relationship '${relId}' missing 'to'`);
      if (!rel.description) errors.push(`Relationship '${relId}' missing 'description'`);
    }
    
    if (errors.length > 0) {
      throw new Error(`Missing required fields:\n${errors.join('\n')}`);
    }
  });

  it('no duplicate relationship IDs', () => {
    const content = readFileSync(GRAPH_PATH, 'utf-8');
    const graph = parseYaml(content);
    
    const ids = Object.keys(graph.relationships);
    const uniqueIds = new Set(ids);
    
    expect(ids.length).toBe(uniqueIds.size);
  });
});

describe('Plugin Relationship Validation', () => {
  const validRelationshipIds = getValidRelationshipIds();
  
  it('all plugin relationships reference valid graph.yaml relationships', () => {
    const errors: string[] = [];
    
    for (const plugin of getPlugins()) {
      const content = readFileSync(join(PLUGINS_DIR, plugin, 'readme.md'), 'utf-8');
      const frontmatter = parseFrontmatter(content);
      if (!frontmatter?.adapters) continue;
      
      const adapters = frontmatter.adapters as Record<string, { relationships?: Record<string, unknown> }>;
      for (const [entityType, adapter] of Object.entries(adapters)) {
        if (!adapter.relationships) continue;
        for (const relId of Object.keys(adapter.relationships)) {
          if (!validRelationshipIds.has(relId)) {
            errors.push(`Plugin '${plugin}' adapter '${entityType}' references unknown relationship: ${relId}`);
          }
        }
      }
    }
    
    if (errors.length > 0) {
      throw new Error(`Invalid plugin relationships:\n${errors.join('\n')}`);
    }
  });
});
