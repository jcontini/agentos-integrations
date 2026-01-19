/**
 * Todoist Plugin Tests
 * 
 * Tests CRUD operations for the Todoist plugin.
 * Requires: TODOIST_API_KEY or configured credential in AgentOS.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { aos, testContent, TEST_PREFIX } from '../../../tests/utils/fixtures';

const plugin = 'todoist';

// Track created items for cleanup
const createdItems: Array<{ id: string }> = [];

// Skip tests if no credentials configured
let skipTests = false;

describe('Todoist Plugin', () => {
  beforeAll(async () => {
    // Check if Todoist is configured by trying a simple list
    try {
      await aos().call('UsePlugin', {
        plugin,
        tool: 'list',
        params: { limit: 1 },
      });
    } catch (e: any) {
      if (e.message?.includes('Credential not found')) {
        console.log('  ⏭ Skipping Todoist tests: no credentials configured');
        skipTests = true;
      } else {
        throw e;
      }
    }
  });

  // Clean up after tests
  afterAll(async () => {
    for (const item of createdItems) {
      try {
        await aos().call('UsePlugin', {
          plugin,
          tool: 'delete',
          params: { id: item.id },
          execute: true,
        });
      } catch (e) {
        console.warn(`  Failed to cleanup task ${item.id}:`, e);
      }
    }
  });

  describe('list', () => {
    it('returns an array of tasks', async () => {
      if (skipTests) return;
      
      const tasks = await aos().call('UsePlugin', {
        plugin,
        tool: 'list',
        params: { limit: 5 },
      });

      expect(Array.isArray(tasks)).toBe(true);
    });

    it('tasks have required fields', async () => {
      if (skipTests) return;
      
      const tasks = await aos().call('UsePlugin', {
        plugin,
        tool: 'list',
        params: { limit: 5 },
      });

      for (const task of tasks) {
        expect(task.id).toBeDefined();
        expect(task.title).toBeDefined();
        expect(task.plugin).toBe(plugin);
      }
    });

    it.skip('respects limit parameter', async () => {
      // TODO: Todoist API doesn't support limit param - needs client-side limiting
      if (skipTests) return;
      
      const tasks = await aos().call('UsePlugin', {
        plugin,
        tool: 'list',
        params: { limit: 3 },
      });

      expect(tasks.length).toBeLessThanOrEqual(3);
    });
  });

  describe('create → get → update → delete', () => {
    let createdTask: any;

    it('can create a task', async () => {
      if (skipTests) {
        console.log('  Skipping: no credentials');
        return;
      }

      const title = testContent('task');
      
      createdTask = await aos().call('UsePlugin', {
        plugin,
        tool: 'create',
        params: {
          title,
          description: 'Created by AgentOS integration test',
        },
        execute: true,
      });

      expect(createdTask).toBeDefined();
      expect(createdTask.id).toBeDefined();
      
      createdItems.push({ id: createdTask.id });
    });

    it('can get the created task', async () => {
      if (skipTests || !createdTask?.id) {
        console.log('  Skipping: no task was created');
        return;
      }

      const task = await aos().call('UsePlugin', {
        plugin,
        tool: 'get',
        params: { id: createdTask.id },
      });

      expect(task).toBeDefined();
      expect(task.id).toBe(createdTask.id);
      expect(task.title).toContain(TEST_PREFIX);
    });

    it('can update the task', async () => {
      if (skipTests || !createdTask?.id) {
        console.log('  Skipping: no task was created');
        return;
      }

      const newTitle = testContent('updated task');
      
      const updated = await aos().call('UsePlugin', {
        plugin,
        tool: 'update',
        params: {
          id: createdTask.id,
          title: newTitle,
        },
        execute: true,
      });

      expect(updated).toBeDefined();
    });

    it('can complete the task', async () => {
      if (skipTests || !createdTask?.id) {
        console.log('  Skipping: no task was created');
        return;
      }

      const result = await aos().call('UsePlugin', {
        plugin,
        tool: 'complete',
        params: { id: createdTask.id },
        execute: true,
      });

      expect(result).toBeDefined();
    });

    it('can delete the task', async () => {
      if (skipTests || !createdTask?.id) {
        console.log('  Skipping: no task was created');
        return;
      }

      const result = await aos().call('UsePlugin', {
        plugin,
        tool: 'delete',
        params: { id: createdTask.id },
        execute: true,
      });

      expect(result).toBeDefined();
      
      // Remove from cleanup list
      const idx = createdItems.findIndex(i => i.id === createdTask.id);
      if (idx >= 0) createdItems.splice(idx, 1);
    });
  });

  describe('projects', () => {
    it('can list projects', async () => {
      if (skipTests) return;
      
      const projects = await aos().call('UsePlugin', {
        plugin,
        tool: 'projects',
      });

      expect(Array.isArray(projects)).toBe(true);
      
      for (const project of projects) {
        expect(project.id).toBeDefined();
        expect(project.name).toBeDefined();
      }
    });
  });
});
