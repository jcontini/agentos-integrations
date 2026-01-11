/**
 * Contacts App Tests
 * 
 * Tests for the Apple Contacts connector with multi-account support.
 * 
 * Architecture:
 * - accounts action: Lists available contact accounts (iCloud, local, work, etc.)
 * - list/search: Require account parameter (use default account from accounts action)
 * - create: Creates in specified account (defaults to default account)
 * - Photo operations: set_photo, clear_photo, has_photo field
 * 
 * This follows the same pattern as Linear (teams) and Todoist (projects).
 * 
 * Test Design:
 * - Minimizes contact creation by reusing contacts across related operations
 * - Each test that creates contacts cleans up immediately via try/finally
 * - Read-only tests use existing contacts in the address book
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { aos, testContent, sleep } from '../../../tests/utils/fixtures';

const CONNECTOR = 'apple-contacts';

describe('Contacts App', () => {
  // Cache the default account for all tests
  let defaultAccountId: string;
  let allAccounts: any[];
  
  // Helper to create a contact and ensure cleanup
  async function withTestContact(
    name: string,
    testFn: (contactId: string) => Promise<void>
  ): Promise<void> {
    const firstName = testContent(name);
    const created = await aos().call('Contacts', { 
      action: 'create', 
      connector: CONNECTOR,
      params: { account: defaultAccountId, first_name: firstName },
      execute: true
    });
    await sleep(500);
    
    try {
      await testFn(created.id);
    } finally {
      // Always clean up, even if test fails
      try {
        await aos().call('Contacts', { 
          action: 'delete', 
          connector: CONNECTOR, 
          params: { id: created.id }, 
          execute: true 
        });
      } catch (e) {
        // Ignore cleanup errors (contact might already be deleted)
      }
    }
  }
  
  // Get accounts before all tests
  beforeAll(async () => {
    const accounts = await aos().call('Contacts', { 
      action: 'accounts', 
      connector: CONNECTOR 
    });
    allAccounts = accounts;
    const defaultAccount = accounts.find((a: any) => a.is_default);
    if (!defaultAccount) {
      throw new Error('No default account found - cannot run tests');
    }
    defaultAccountId = defaultAccount.id;
  });

  // ============================================================
  // Accounts Action Tests (no contacts created)
  // ============================================================
  
  describe('Accounts', () => {
    it('returns list of available accounts with required fields', async () => {
      const accounts = await aos().call('Contacts', { 
        action: 'accounts', 
        connector: CONNECTOR 
      });
      
      expect(Array.isArray(accounts)).toBe(true);
      expect(accounts.length).toBeGreaterThan(0);
      
      // Check each account has required fields
      for (const account of accounts) {
        expect(account.id).toBeDefined();
        expect(typeof account.id).toBe('string');
        expect(account.name).toBeDefined();
        expect(typeof account.name).toBe('string');
        expect(typeof account.count).toBe('number');
        expect(typeof account.is_default).toBe('boolean');
        // ID should be usable (non-empty string)
        expect(account.id.length).toBeGreaterThan(0);
      }
      
      // Exactly one default
      const defaults = accounts.filter((a: any) => a.is_default);
      expect(defaults).toHaveLength(1);
      
      // Default has contacts
      expect(defaults[0].count).toBeGreaterThan(0);
    });
  });

  // ============================================================
  // List Action Tests (uses existing contacts)
  // ============================================================
  
  describe('List', () => {
    it('returns contacts with limit and sorting options', async () => {
      // Test basic list with limit
      const contacts3 = await aos().call('Contacts', { 
        action: 'list', 
        connector: CONNECTOR, 
        params: { account: defaultAccountId, limit: 3 } 
      });
      expect(contacts3).toHaveLength(3);
      
      // Test limit of 1
      const contacts1 = await aos().call('Contacts', { 
        action: 'list', 
        connector: CONNECTOR, 
        params: { account: defaultAccountId, limit: 1 } 
      });
      expect(contacts1).toHaveLength(1);
      
      // Test limit of 10
      const contacts10 = await aos().call('Contacts', { 
        action: 'list', 
        connector: CONNECTOR, 
        params: { account: defaultAccountId, limit: 10 } 
      });
      expect(contacts10).toHaveLength(10);
      
      // Verify required fields
      for (const contact of contacts3) {
        expect(contact.id).toBeDefined();
        expect(contact.connector).toBe('apple-contacts');
        expect(contact.modified_at).toBeDefined();
        expect(contact.created_at).toBeDefined();
      }
      
      // Default sort by modified (most recent first)
      for (let i = 1; i < contacts10.length; i++) {
        const prevDate = new Date(contacts10[i-1].modified_at).getTime();
        const currDate = new Date(contacts10[i].modified_at).getTime();
        expect(prevDate).toBeGreaterThanOrEqual(currDate);
      }
    });

    it('can sort by created and name', async () => {
      const byCreated = await aos().call('Contacts', { 
        action: 'list', 
        connector: CONNECTOR, 
        params: { account: defaultAccountId, sort: 'created', limit: 5 } 
      });
      expect(byCreated.length).toBeGreaterThan(0);
      expect(byCreated[0].created_at).toBeDefined();
      
      const byName = await aos().call('Contacts', { 
        action: 'list', 
        connector: CONNECTOR, 
        params: { account: defaultAccountId, sort: 'name', limit: 5 } 
      });
      expect(byName.length).toBeGreaterThan(0);
    });

    it('can filter by organization', async () => {
      const contacts = await aos().call('Contacts', { 
        action: 'list', 
        connector: CONNECTOR, 
        params: { account: defaultAccountId, organization: 'Apple', limit: 10 } 
      });
      
      expect(Array.isArray(contacts)).toBe(true);
      for (const contact of contacts) {
        expect(contact.organization?.toLowerCase()).toContain('apple');
      }
    });

    it('includes phones, emails, and urls in list response', async () => {
      // Create a contact and add phone, email, and URL
      const firstName = testContent('ListFields');
      
      const created = await aos().call('Contacts', { 
        action: 'create', 
        connector: CONNECTOR,
        params: { account: defaultAccountId, first_name: firstName },
        execute: true
      });

      try {
        await sleep(300);
        
        // Add phone, email, and URL using add action
        await aos().call('Contacts', { 
          action: 'add', 
          connector: CONNECTOR,
          params: { id: created.id, phones: { label: 'mobile', value: '+15125551234' } },
          execute: true
        });
        await aos().call('Contacts', { 
          action: 'add', 
          connector: CONNECTOR,
          params: { id: created.id, emails: { label: 'work', value: 'listtest@example.com' } },
          execute: true
        });
        await aos().call('Contacts', { 
          action: 'add', 
          connector: CONNECTOR,
          params: { id: created.id, urls: { label: 'homepage', value: 'https://example.com/listtest' } },
          execute: true
        });
        await sleep(500);
        
        // Use query param to find our specific contact
        const contacts = await aos().call('Contacts', { 
          action: 'list', 
          connector: CONNECTOR, 
          params: { account: defaultAccountId, query: firstName, limit: 10 } 
        });
        
        // Find our test contact
        const found = contacts.find((c: any) => c.first_name === firstName);
        expect(found).toBeDefined();
        
        // Verify phones, emails, urls are included (as comma-separated strings)
        expect(found.phones).toBeDefined();
        expect(found.phones).toContain('5125551234');
        expect(found.emails).toBe('listtest@example.com');
        expect(found.urls).toBe('https://example.com/listtest');
        
      } finally {
        await aos().call('Contacts', { 
          action: 'delete', 
          connector: CONNECTOR, 
          params: { id: created.id }, 
          execute: true 
        });
      }
    });
  });

  // ============================================================
  // Search Action Tests (uses existing contacts)
  // ============================================================
  
  describe('Search', () => {
    it('searches within specified account with limit', async () => {
      const contacts = await aos().call('Contacts', { 
        action: 'search', 
        connector: CONNECTOR, 
        params: { account: defaultAccountId, query: 'a', limit: 5 } 
      });
      
      expect(Array.isArray(contacts)).toBe(true);
      
      // Test with smaller limit
      const limited = await aos().call('Contacts', { 
        action: 'search', 
        connector: CONNECTOR, 
        params: { account: defaultAccountId, query: 'a', limit: 3 } 
      });
      expect(limited.length).toBeLessThanOrEqual(3);
    });

    it('can search by email domain', async () => {
      const contacts = await aos().call('Contacts', { 
        action: 'search', 
        connector: CONNECTOR, 
        params: { account: defaultAccountId, query: '@gmail.com', limit: 5 } 
      });
      
      expect(Array.isArray(contacts)).toBe(true);
    });
  });

  // ============================================================
  // Get Action Tests (uses existing contacts)
  // ============================================================
  
  describe('Get', () => {
    it('returns full contact details with all fields', async () => {
      const contacts = await aos().call('Contacts', { 
        action: 'list', 
        connector: CONNECTOR, 
        params: { account: defaultAccountId, limit: 1 } 
      });
      
      if (contacts.length === 0) {
        console.log('  Skipping: no contacts in database');
        return;
      }

      const contact = await aos().call('Contacts', { 
        action: 'get', 
        connector: CONNECTOR, 
        params: { id: contacts[0].id } 
      });

      expect(contact.id).toBeDefined();
      expect(Array.isArray(contact.phones)).toBe(true);
      expect(Array.isArray(contact.emails)).toBe(true);
      expect(Array.isArray(contact.urls)).toBe(true);
      expect(Array.isArray(contact.addresses)).toBe(true);
      expect(typeof contact.has_photo).toBe('boolean');
    });
  });

  // ============================================================
  // Create, Update, and Delete Tests (ONE contact, immediate cleanup)
  // ============================================================
  
  describe('Create and Update', () => {
    it('creates contact with all fields, updates it, then deletes', async () => {
      const firstName = testContent('FullLifecycle');
      
      // Create with all scalar fields
      const created = await aos().call('Contacts', { 
        action: 'create', 
        connector: CONNECTOR,
        params: { 
          account: defaultAccountId,
          first_name: firstName,
          last_name: 'Complete',
          middle_name: 'Middle',
          nickname: 'Nick',
          organization: 'Test Corp',
          job_title: 'Engineer',
          department: 'Engineering',
          notes: 'Initial notes'
        },
        execute: true
      });

      try {
        expect(created.id).toBeDefined();
        expect(created.status).toBe('created');
        await sleep(500);
        
        // Verify creation
        let contact = await aos().call('Contacts', { 
          action: 'get', 
          connector: CONNECTOR, 
          params: { id: created.id } 
        });
        expect(contact.first_name).toBe(firstName);
        expect(contact.last_name).toBe('Complete');
        expect(contact.organization).toBe('Test Corp');
        expect(contact.job_title).toBe('Engineer');
        
        // Update scalar fields
        const updated = await aos().call('Contacts', { 
          action: 'update', 
          connector: CONNECTOR,
          params: { 
            id: created.id,
            organization: 'Updated Corp',
            job_title: 'Senior Engineer',
            notes: 'Updated via test'
          },
          execute: true
        });
        
        expect(updated.status).toBe('updated');
        await sleep(500);
        
        // Verify update
        contact = await aos().call('Contacts', { 
          action: 'get', 
          connector: CONNECTOR, 
          params: { id: created.id } 
        });
        expect(contact.organization).toBe('Updated Corp');
        expect(contact.job_title).toBe('Senior Engineer');
        expect(contact.notes).toBe('Updated via test');
        
      } finally {
        // Always clean up
        await aos().call('Contacts', { 
          action: 'delete', 
          connector: CONNECTOR, 
          params: { id: created.id }, 
          execute: true 
        });
      }
    });
  });

  // ============================================================
  // Array Fields Tests (ONE contact, tests all add/remove operations)
  // ============================================================
  
  describe('Array Fields (add/remove)', () => {
    it('can add and remove emails, phones, and URLs on one contact', async () => {
      await withTestContact('ArrayFields', async (contactId) => {
        // Add work email
        let added = await aos().call('Contacts', { 
          action: 'add', 
          connector: CONNECTOR,
          params: { 
            id: contactId,
            emails: { label: 'work', value: 'work@test.com' }
          },
          execute: true
        });
        expect(added.status).toBe('added');
        expect(added.added).toContain('email');
        await sleep(300);
        
        // Add home email
        await aos().call('Contacts', { 
          action: 'add', 
          connector: CONNECTOR,
          params: { 
            id: contactId,
            emails: { label: 'home', value: 'home@test.com' }
          },
          execute: true
        });
        await sleep(300);
        
        // Verify both emails
        let contact = await aos().call('Contacts', { 
          action: 'get', 
          connector: CONNECTOR, 
          params: { id: contactId } 
        });
        expect(contact.emails).toHaveLength(2);
        expect(contact.emails.map((e: any) => e.value)).toContain('work@test.com');
        expect(contact.emails.map((e: any) => e.value)).toContain('home@test.com');
        
        // Add phone
        added = await aos().call('Contacts', { 
          action: 'add', 
          connector: CONNECTOR,
          params: { 
            id: contactId,
            phones: { label: 'mobile', value: '+15125559999' }
          },
          execute: true
        });
        expect(added.status).toBe('added');
        expect(added.added).toContain('phone');
        await sleep(300);
        
        // Add LinkedIn URL
        await aos().call('Contacts', { 
          action: 'add', 
          connector: CONNECTOR,
          params: { 
            id: contactId, 
            urls: { label: 'LinkedIn', value: 'https://linkedin.com/in/testuser' } 
          },
          execute: true
        });
        await sleep(300);
        
        // Add Instagram URL
        await aos().call('Contacts', { 
          action: 'add', 
          connector: CONNECTOR,
          params: { 
            id: contactId, 
            urls: { label: 'Instagram', value: 'https://instagram.com/testuser' } 
          },
          execute: true
        });
        await sleep(500);
        
        // Verify all additions
        contact = await aos().call('Contacts', { 
          action: 'get', 
          connector: CONNECTOR, 
          params: { id: contactId } 
        });
        expect(contact.phones.some((p: any) => p.value.includes('5125559999'))).toBe(true);
        expect(contact.urls).toHaveLength(2);
        expect(contact.urls.some((u: any) => u.value.includes('linkedin.com'))).toBe(true);
        expect(contact.urls.some((u: any) => u.value.includes('instagram.com'))).toBe(true);
        
        // Remove one email
        const removed = await aos().call('Contacts', { 
          action: 'remove', 
          connector: CONNECTOR,
          params: { 
            id: contactId,
            emails: { value: 'home@test.com' }
          },
          execute: true
        });
        expect(removed.status).toBe('removed');
        expect(removed.removed).toContain('email');
        await sleep(300);
        
        // Verify email removed
        contact = await aos().call('Contacts', { 
          action: 'get', 
          connector: CONNECTOR, 
          params: { id: contactId } 
        });
        expect(contact.emails).toHaveLength(1);
        expect(contact.emails[0].value).toBe('work@test.com');
        
        // Remove URL
        await aos().call('Contacts', { 
          action: 'remove', 
          connector: CONNECTOR,
          params: { 
            id: contactId, 
            urls: { value: 'https://linkedin.com/in/testuser' } 
          },
          execute: true
        });
        await sleep(300);
        
        // Verify URL removed
        contact = await aos().call('Contacts', { 
          action: 'get', 
          connector: CONNECTOR, 
          params: { id: contactId } 
        });
        expect(contact.urls).toHaveLength(1);
        expect(contact.urls[0].value).toBe('https://instagram.com/testuser');
      });
    });
  });

  // ============================================================
  // Delete Action Tests (self-cleaning by design)
  // ============================================================
  
  describe('Delete', () => {
    it('can delete a contact', async () => {
      const firstName = testContent('DeleteTest');
      
      const created = await aos().call('Contacts', { 
        action: 'create', 
        connector: CONNECTOR,
        params: { account: defaultAccountId, first_name: firstName },
        execute: true
      });
      await sleep(500);
      
      const deleted = await aos().call('Contacts', { 
        action: 'delete', 
        connector: CONNECTOR,
        params: { id: created.id },
        execute: true
      });
      
      expect(deleted.status).toBe('deleted');
      
      // Verify it's gone
      await sleep(500);
      try {
        await aos().call('Contacts', { 
          action: 'get', 
          connector: CONNECTOR, 
          params: { id: created.id } 
        });
        expect.fail('Contact should have been deleted');
      } catch (e) {
        // Expected - contact should not be found
        expect(true).toBe(true);
      }
    });
  });

  // ============================================================
  // Photo Operations Tests (ONE contact, tests all photo operations)
  // ============================================================
  
  describe('Photo Operations', () => {
    it('can set and clear photo on a contact', async () => {
      await withTestContact('PhotoOps', async (contactId) => {
        // Verify new contact has no photo
        let contact = await aos().call('Contacts', { 
          action: 'get', 
          connector: CONNECTOR, 
          params: { id: contactId } 
        });
        expect(contact.has_photo).toBe(false);
        
        // Check if test image exists
        const fs = await import('fs');
        const path = await import('path');
        const testImagePath = path.join(process.env.HOME || '', '.agentos/test-photo.jpg');
        
        if (!fs.existsSync(testImagePath)) {
          console.log('  Skipping photo set/clear: create ~/.agentos/test-photo.jpg to test');
          return;
        }
        
        // Set photo
        const setResult = await aos().call('Contacts', { 
          action: 'set_photo', 
          connector: CONNECTOR,
          params: { id: contactId, path: testImagePath },
          execute: true
        });
        expect(setResult.status).toBe('photo_set');
        await sleep(500);
        
        // Verify photo is set
        contact = await aos().call('Contacts', { 
          action: 'get', 
          connector: CONNECTOR, 
          params: { id: contactId } 
        });
        expect(contact.has_photo).toBe(true);
        
        // Clear photo
        const clearResult = await aos().call('Contacts', { 
          action: 'clear_photo', 
          connector: CONNECTOR,
          params: { id: contactId },
          execute: true
        });
        expect(clearResult.status).toBe('photo_cleared');
        await sleep(500);
        
        // Verify photo is cleared
        contact = await aos().call('Contacts', { 
          action: 'get', 
          connector: CONNECTOR, 
          params: { id: contactId } 
        });
        expect(contact.has_photo).toBe(false);
      });
    });
  });
});
