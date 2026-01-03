/**
 * Books App Tests
 * 
 * Tests for the Books app CRUD operations and schema validation.
 * Uses the test database at ~/.agentos/data/test/books.db
 */

import { describe, it, expect, afterAll } from 'vitest';
import { aos, testContent, cleanupTestData, TEST_PREFIX } from '../../../tests/utils/fixtures';

describe('Books App', () => {
  // Clean up test data after all tests
  afterAll(async () => {
    const deleted = await cleanupTestData('Books');
    if (deleted > 0) {
      console.log(`  Cleaned up ${deleted} test books`);
    }
  });

  describe('List', () => {
    it('can list all books', async () => {
      const books = await aos().books.list();
      
      expect(books).toBeDefined();
      expect(Array.isArray(books)).toBe(true);
    });

    it('can filter by status', async () => {
      const books = await aos().books.list({ status: 'read' });
      
      expect(Array.isArray(books)).toBe(true);
      for (const book of books) {
        expect(book.status).toBe('read');
      }
    });

    it('can filter by rating', async () => {
      const books = await aos().books.list({ rating: 5 });
      
      expect(Array.isArray(books)).toBe(true);
      for (const book of books) {
        expect(book.rating).toBe(5);
      }
    });

    it('respects limit parameter', async () => {
      const books = await aos().books.list({ limit: 5 });
      
      expect(Array.isArray(books)).toBe(true);
      expect(books.length).toBeLessThanOrEqual(5);
    });
  });

  describe('Get/Update/Delete', () => {
    // Note: Books app doesn't have a 'create' action - books are added via import.
    // These tests use existing imported books.
    
    it('can get a book by ID', async () => {
      // Get any existing book
      const books = await aos().books.list({ limit: 1 });
      if (books.length === 0) {
        console.log('  Skipping: no books in database');
        return;
      }

      const book = await aos().books.get(books[0].id);

      expect(book).toBeDefined();
      expect(book.id).toBe(books[0].id);
      expect(book.title).toBeDefined();
    });

    it('can update a book', async () => {
      // Get any existing book
      const books = await aos().books.list({ limit: 1 });
      if (books.length === 0) {
        console.log('  Skipping: no books in database');
        return;
      }

      const original = books[0];
      const newRating = original.rating === 5 ? 4 : 5;

      // Update rating
      const updated = await aos().books.update(original.id, {
        rating: newRating,
      });

      expect(updated).toBeDefined();
      expect(updated.rating).toBe(newRating);

      // Restore original rating
      await aos().books.update(original.id, { rating: original.rating });
    });
  });

  describe('Data Integrity', () => {
    it('books have required fields', async () => {
      const books = await aos().books.list({ limit: 10 });

      for (const book of books) {
        // Required fields
        expect(book.id).toBeDefined();
        expect(book.title).toBeDefined();
        expect(book.status).toBeDefined();
        expect(book.source_connector).toBeDefined();
        expect(book.source_id).toBeDefined();

        // Status should be valid
        expect(['want_to_read', 'reading', 'read', 'dnf', 'none']).toContain(book.status);

        // Rating should be 1-5 or null
        if (book.rating != null) {
          expect(book.rating).toBeGreaterThanOrEqual(1);
          expect(book.rating).toBeLessThanOrEqual(5);
        }
      }
    });

    it('books have source tracking', async () => {
      const books = await aos().books.list({ limit: 10 });

      for (const book of books) {
        expect(typeof book.source_connector).toBe('string');
        expect(typeof book.source_id).toBe('string');
        expect(book.source_connector.length).toBeGreaterThan(0);
        expect(book.source_id.length).toBeGreaterThan(0);
      }
    });
  });
});
