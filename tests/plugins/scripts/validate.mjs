#!/usr/bin/env node
/**
 * Plugin validation for pre-commit hook.
 * 
 * Checks:
 * 1. Schema validation - YAML frontmatter matches plugin.schema.json
 * 2. Test coverage - every operation/utility has a test
 * 
 * Usage: node scripts/validate-schema.mjs [app1] [app2] ...
 *        node scripts/validate-schema.mjs --all
 *        node scripts/validate-schema.mjs --all --filter exa
 *        node scripts/validate-schema.mjs --all --no-move  (skip auto-move, for pre-commit)
 */

import { readFileSync, readdirSync, existsSync, renameSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { parse as parseYaml } from 'yaml';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../../..');  // tests/plugins/scripts/ -> root
const APPS_DIR = join(ROOT, 'plugins');
const NEEDS_WORK_DIR = join(APPS_DIR, '.needs-work');
const SCHEMA_PATH = join(__dirname, '..', 'plugin.schema.json');

// Load schema
const schema = JSON.parse(readFileSync(SCHEMA_PATH, 'utf-8'));
const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const validate = ajv.compile(schema);

// Parse YAML frontmatter
function parseFrontmatter(content) {
  if (!content.startsWith('---')) return null;
  const endIndex = content.indexOf('\n---', 3);
  if (endIndex === -1) return null;
  const yaml = content.slice(4, endIndex);
  return parseYaml(yaml);
}

// Get all tools (operations + utilities) from frontmatter
function getTools(frontmatter) {
  const tools = [];
  if (frontmatter.operations) {
    tools.push(...Object.keys(frontmatter.operations));
  }
  if (frontmatter.utilities) {
    tools.push(...Object.keys(frontmatter.utilities));
  }
  return tools;
}

// Find which tools are tested by parsing test files
function getTestedTools(pluginDir) {
  const testsDir = join(pluginDir, 'tests');
  if (!existsSync(testsDir)) return new Set();
  
  const testedTools = new Set();
  const testFiles = readdirSync(testsDir).filter(f => f.endsWith('.test.ts'));
  
  for (const file of testFiles) {
    const content = readFileSync(join(testsDir, file), 'utf-8');
    // Match tool: 'operation.name' or tool: "operation.name"
    const matches = content.matchAll(/tool:\s*['"]([^'"]+)['"]/g);
    for (const match of matches) {
      testedTools.add(match[1]);
    }
  }
  
  return testedTools;
}

// Ensure .needs-work directory exists
if (!existsSync(NEEDS_WORK_DIR)) {
  mkdirSync(NEEDS_WORK_DIR, { recursive: true });
}

// Move plugin to .needs-work
function moveToNeedsWork(pluginName) {
  const sourcePath = join(APPS_DIR, pluginName);
  const destPath = join(NEEDS_WORK_DIR, pluginName);
  
  if (existsSync(destPath)) {
    console.error(`⚠️  plugins/${pluginName}: Already exists in .needs-work, skipping move`);
    return false;
  }
  
  try {
    renameSync(sourcePath, destPath);
    console.log(`📦 Moved plugins/${pluginName} → plugins/.needs-work/${pluginName}`);
    return true;
  } catch (err) {
    console.error(`❌ Failed to move plugins/${pluginName}: ${err.message}`);
    return false;
  }
}

// Get all apps or filter by args
const args = process.argv.slice(2);
const filterIndex = args.indexOf('--filter');
const filterValue = filterIndex !== -1 ? args[filterIndex + 1] : null;
const validateAll = args.includes('--all') || args.length === 0;
const autoMove = !args.includes('--no-move');  // Auto-move by default, disable with --no-move

let apps = validateAll 
  ? readdirSync(APPS_DIR, { withFileTypes: true })
      .filter(d => d.isDirectory() && d.name !== '.needs-work')
      .map(d => d.name)
  : args.filter(a => !a.startsWith('--'));

// Apply filter if specified
if (filterValue) {
  apps = apps.filter(app => app.includes(filterValue));
}

let hasErrors = false;
let hasCoverageWarnings = false;
let movedCount = 0;

for (const app of apps) {
  const pluginDir = join(APPS_DIR, app);
  const readmePath = join(pluginDir, 'readme.md');
  let failed = false;
  let failureReason = '';
  
  if (!existsSync(readmePath)) {
    console.error(`❌ plugins/${app}: readme.md not found`);
    failureReason = 'readme.md not found';
    failed = true;
  } else {
    const content = readFileSync(readmePath, 'utf-8');
    const frontmatter = parseFrontmatter(content);

    if (!frontmatter) {
      console.error(`❌ plugins/${app}: No YAML frontmatter found`);
      failureReason = 'No YAML frontmatter found';
      failed = true;
    } else {
      const valid = validate(frontmatter);
      if (!valid) {
        console.error(`❌ plugins/${app}: Schema validation failed`);
        for (const err of validate.errors) {
          console.error(`   ${err.instancePath || '/'}: ${err.message}`);
        }
        failureReason = 'Schema validation failed';
        failed = true;
      } else {
        // Check icon.png exists (required for all plugins)
        const iconPath = join(pluginDir, 'icon.png');
        if (!existsSync(iconPath)) {
          console.error(`❌ plugins/${app}: icon.png not found (required)`);
          failureReason = 'icon.png not found';
          failed = true;
        } else {
          // Check test coverage (only for valid plugins)
          const tools = getTools(frontmatter);
          const testedTools = getTestedTools(pluginDir);
          const untestedTools = tools.filter(t => !testedTools.has(t));
          
          if (untestedTools.length > 0) {
            console.error(`❌ plugins/${app}: Missing tests for: ${untestedTools.join(', ')}`);
            failureReason = `Missing tests for: ${untestedTools.join(', ')}`;
            failed = true;
          } else if (tools.length > 0) {
            console.log(`✓ plugins/${app} (${tools.length} tools, all tested)`);
          } else {
            console.log(`✓ plugins/${app}`);
          }
        }
      }
    }
  }
  
  if (failed) {
    hasErrors = true;
    if (autoMove && moveToNeedsWork(app)) {
      movedCount++;
    }
  }
}

if (movedCount > 0) {
  console.log(`\n📦 Moved ${movedCount} plugin(s) to plugins/.needs-work/`);
}

if (hasErrors) {
  console.error('\n❌ Validation failed');
  process.exit(1);
} else {
  console.log('\n✅ All plugins valid');
  process.exit(0);
}
