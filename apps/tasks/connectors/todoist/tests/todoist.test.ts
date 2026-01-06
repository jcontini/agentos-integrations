/**
 * Todoist Connector Tests
 * 
 * Tests CRUD operations for the Todoist connector.
 * Requires: TODOIST_API_KEY or configured credential in AgentOS.
 */

import { testTasksConnector } from '../../../tests/tasks.test';

// Run standard CRUD tests for Todoist
testTasksConnector('todoist');
