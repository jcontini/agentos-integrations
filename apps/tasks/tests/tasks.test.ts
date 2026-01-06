/**
 * Tasks App - Basic Connector Tests
 * 
 * Tests that all Tasks connectors support basic CRUD operations.
 * Each connector must pass these tests before migration is complete.
 */

import { describe, it, expect, afterAll, beforeAll } from 'vitest';
import { aos, testContent, TEST_PREFIX } from '../../../tests/utils/fixtures';

// Track created items for cleanup
const createdItems: Array<{ id: string; connector: string }> = [];

/**
 * Test a Tasks connector's CRUD operations
 */
export function testTasksConnector(
  connector: string,
  options: {
    /** Account name (for multi-account connectors like Linear) */
    account?: string;
    /** Extra params needed for create (e.g., team_id for Linear) */
    createParams?: object;
    /** Skip create/update/delete tests (for read-only connectors) */
    readOnly?: boolean;
  } = {}
) {
  const { account, createParams = {}, readOnly = false } = options;
  const baseParams = account ? { connector, account } : { connector };

  describe(`Tasks/${connector}`, () => {
    // Clean up after tests
    afterAll(async () => {
      for (const item of createdItems.filter(i => i.connector === connector)) {
        try {
          await aos().call('Tasks', {
            action: 'delete',
            ...baseParams,
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
        const tasks = await aos().call('Tasks', {
          action: 'list',
          ...baseParams,
          params: { limit: 5 },
        });

        expect(Array.isArray(tasks)).toBe(true);
      });

      it('tasks have required schema fields', async () => {
        const tasks = await aos().call('Tasks', {
          action: 'list',
          ...baseParams,
          params: { limit: 5 },
        });

        for (const task of tasks) {
          // Required fields per schema
          expect(task.id).toBeDefined();
          expect(task.title).toBeDefined();
          expect(task.connector).toBe(connector);

          // Status should be one of the valid values
          if (task.status) {
            expect(['open', 'in_progress', 'done', 'cancelled']).toContain(task.status);
          }
        }
      });

      it('accepts limit parameter', async () => {
        // Note: Not all APIs support limit - this just verifies the call doesn't error
        const tasks = await aos().call('Tasks', {
          action: 'list',
          ...baseParams,
          params: { limit: 3 },
        });

        expect(Array.isArray(tasks)).toBe(true);
        
        // Log if limit isn't respected (informational, not a failure)
        if (tasks.length > 3) {
          console.log(`  Note: ${connector} returned ${tasks.length} items (limit=3 not enforced by API)`);
        }
      });
    });

    if (!readOnly) {
      describe('create → get → update → delete', () => {
        let createdTask: any;

        it('can create a task', async () => {
          const title = testContent('task');
          
          createdTask = await aos().call('Tasks', {
            action: 'create',
            ...baseParams,
            params: {
              title,
              description: 'Created by AgentOS integration test',
              ...createParams,
            },
            execute: true,
          });

          expect(createdTask).toBeDefined();
          expect(createdTask.id).toBeDefined();
          
          // Track for cleanup
          createdItems.push({ id: createdTask.id, connector });
        });

        it('can get the created task', async () => {
          if (!createdTask?.id) {
            console.log('  Skipping: no task was created');
            return;
          }

          const task = await aos().call('Tasks', {
            action: 'get',
            ...baseParams,
            params: { id: createdTask.id },
          });

          expect(task).toBeDefined();
          expect(task.id).toBe(createdTask.id);
          expect(task.title).toContain(TEST_PREFIX);
        });

        it('can update the task', async () => {
          if (!createdTask?.id) {
            console.log('  Skipping: no task was created');
            return;
          }

          const newTitle = testContent('updated task');
          
          const updated = await aos().call('Tasks', {
            action: 'update',
            ...baseParams,
            params: {
              id: createdTask.id,
              title: newTitle,
            },
            execute: true,
          });

          expect(updated).toBeDefined();
          // Note: Some APIs return the updated task, others return success
        });

        it('can complete the task', async () => {
          if (!createdTask?.id) {
            console.log('  Skipping: no task was created');
            return;
          }

          const result = await aos().call('Tasks', {
            action: 'complete',
            ...baseParams,
            params: { id: createdTask.id },
            execute: true,
          });

          expect(result).toBeDefined();
        });

        it('can delete the task', async () => {
          if (!createdTask?.id) {
            console.log('  Skipping: no task was created');
            return;
          }

          const result = await aos().call('Tasks', {
            action: 'delete',
            ...baseParams,
            params: { id: createdTask.id },
            execute: true,
          });

          expect(result).toBeDefined();
          
          // Remove from cleanup list since we deleted it
          const idx = createdItems.findIndex(i => i.id === createdTask.id);
          if (idx >= 0) createdItems.splice(idx, 1);
        });
      });
    }

    describe('projects', () => {
      it('can list projects', async () => {
        const projects = await aos().call('Tasks', {
          action: 'projects',
          ...baseParams,
        });

        expect(Array.isArray(projects)).toBe(true);
        
        for (const project of projects) {
          expect(project.id).toBeDefined();
          expect(project.name).toBeDefined();
        }
      });
    });
  });
}

// Export for connector-specific test files
export { aos, testContent, TEST_PREFIX };
