/**
 * Entity Schema Validation Tests
 * 
 * Validates:
 * - All entity files have valid structure
 * - Required fields are present
 * - Properties have types
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { parse as parseYaml } from 'yaml';

const INTEGRATIONS_ROOT = join(__dirname, '../..');
const ENTITIES_DIR = join(INTEGRATIONS_ROOT, 'entities');

// Get all entity files (excluding graph.yaml)
const getEntityFiles = () => existsSync(ENTITIES_DIR)
  ? readdirSync(ENTITIES_DIR).filter(f => f.endsWith('.yaml') && f !== 'graph.yaml')
  : [];

describe('Entity Schema Validation', () => {
  const entityFiles = getEntityFiles();

  it('has entity files', () => {
    expect(entityFiles.length).toBeGreaterThan(0);
  });

  describe.each(entityFiles)('entities/%s', (file) => {
    const filePath = join(ENTITIES_DIR, file);
    let entity: Record<string, unknown>;

    it('is valid YAML', () => {
      const content = readFileSync(filePath, 'utf-8');
      entity = parseYaml(content);
      expect(entity).toBeDefined();
    });

    it('has required fields', () => {
      const content = readFileSync(filePath, 'utf-8');
      entity = parseYaml(content);
      
      expect(entity.id, `${file} missing 'id'`).toBeDefined();
      expect(entity.name, `${file} missing 'name'`).toBeDefined();
      expect(entity.description, `${file} missing 'description'`).toBeDefined();
      expect(entity.properties, `${file} missing 'properties'`).toBeDefined();
      expect(entity.operations, `${file} missing 'operations'`).toBeDefined();
    });

    it('has valid operations list', () => {
      const content = readFileSync(filePath, 'utf-8');
      entity = parseYaml(content);
      
      expect(Array.isArray(entity.operations), `${file} operations should be array`).toBe(true);
      expect((entity.operations as unknown[]).length, `${file} should have at least one operation`).toBeGreaterThan(0);
    });

    it('has properties with types', () => {
      const content = readFileSync(filePath, 'utf-8');
      entity = parseYaml(content);
      
      const properties = entity.properties as Record<string, unknown>;
      expect(typeof properties).toBe('object');
      
      for (const [propName, propDef] of Object.entries(properties)) {
        const def = propDef as Record<string, unknown>;
        expect(def.type, `${file}.properties.${propName} missing 'type'`).toBeDefined();
      }
    });
  });
});
