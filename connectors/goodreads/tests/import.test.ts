/**
 * Goodreads Connector Tests
 * 
 * Tests for Goodreads CSV import functionality.
 * Uses fixture files in the fixtures/ directory.
 */

import { describe, it, expect, afterAll } from 'vitest';
import { aos, cleanupTestData } from '../../../tests/utils/fixtures';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const fixturesDir = join(__dirname, 'fixtures');

describe('Goodreads Connector', () => {
  // Clean up any imported test data
  afterAll(async () => {
    const deleted = await cleanupTestData('Books', 
      (book) => book.source_connector === 'goodreads' && book.title?.startsWith('[TEST]')
    );
    if (deleted > 0) {
      console.log(`  Cleaned up ${deleted} imported test books`);
    }
  });

  describe('CSV Import', () => {
    it('imports books from CSV (dry run)', async () => {
      const csvPath = join(fixturesDir, 'sample-export.csv');
      
      const result = await aos().books.import('goodreads', csvPath, true);

      expect(result).toBeDefined();
      expect(result.imported).toBeGreaterThan(0);
      expect(result.errors).toEqual([]);
    });

    it('actually imports books from CSV', async () => {
      const csvPath = join(fixturesDir, 'sample-export.csv');
      
      // Import for real
      const result = await aos().books.import('goodreads', csvPath, false);
      // On re-run, might be 0 (already imported) due to UNIQUE constraint
      expect(result.imported).toBeGreaterThanOrEqual(0);
      expect(result.errors).toEqual([]);

      // Verify books exist (either just imported or previously imported)
      const books = await aos().books.list({ limit: 100 });
      const importedBook = books.find(b => b.source_id === '12345');
      
      expect(importedBook).toBeDefined();
      expect(importedBook.source_connector).toBe('goodreads');
    });
  });

  describe('Field Mapping', () => {
    it('maps title correctly', async () => {
      const csvPath = join(fixturesDir, 'sample-export.csv');
      await aos().books.import('goodreads', csvPath, false);

      const books = await aos().books.list();
      const book = books.find(b => b.source_id === '12345');

      expect(book?.title).toBe('[TEST] The Great Gatsby');
    });

    it('maps authors correctly', async () => {
      const books = await aos().books.list();
      const book = books.find(b => b.source_id === '12345');

      expect(book?.authors).toBeDefined();
      expect(Array.isArray(book?.authors)).toBe(true);
      expect(book?.authors).toContain('F. Scott Fitzgerald');
    });

    it('strips ISBN quotes wrapper', async () => {
      const books = await aos().books.list();
      const book = books.find(b => b.source_id === '12345');

      // Goodreads CSVs have ISBNs like ="0743273567"
      // Should be stripped to just the number
      expect(book?.isbn).toBe('0743273567');
      expect(book?.isbn).not.toContain('=');
      expect(book?.isbn).not.toContain('"');
    });

    it('maps exclusive shelf to status', async () => {
      const books = await aos().books.list();
      
      // Check different shelf mappings from fixture
      const readBook = books.find(b => b.source_id === '12345');
      const readingBook = books.find(b => b.source_id === '12346');
      const toReadBook = books.find(b => b.source_id === '12347');

      expect(readBook?.status).toBe('read');
      expect(readingBook?.status).toBe('reading');
      expect(toReadBook?.status).toBe('want_to_read');
    });

    it('maps rating correctly (0 = null)', async () => {
      const books = await aos().books.list();
      
      const ratedBook = books.find(b => b.source_id === '12345');
      const unratedBook = books.find(b => b.source_id === '12347');

      expect(ratedBook?.rating).toBe(5);
      expect(unratedBook?.rating).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('handles empty CSV gracefully', async () => {
      const csvPath = join(fixturesDir, 'empty.csv');
      
      const result = await aos().books.import('goodreads', csvPath, true);

      expect(result.imported).toBe(0);
      expect(result.errors).toEqual([]);
    });

    it('reports errors for rows with missing title', async () => {
      const csvPath = join(fixturesDir, 'missing-fields.csv');
      
      const result = await aos().books.import('goodreads', csvPath, true);

      // File has 2 rows - one missing title (should error), one valid
      expect(result).toBeDefined();
      // Should report the error for the row with missing title
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].error).toContain('Missing title');
    });
  });
});
