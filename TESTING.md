# Testing Guide

## Philosophy

**All tests are end-to-end.** We test the real AgentOS binary with real data. No mocking, no unit tests. If E2E passes, the whole stack works.

**Tests live with the code they test.** Each app and connector includes its own tests.

## What You Need

| You need | You don't need |
|----------|----------------|
| Node.js + npm | Rust |
| Vitest (test runner) | Playwright |
| AgentOS binary (built) | Core repo access |

Contributors write **YAML configs + tests**. The MCP client talks to the real AgentOS binary.

---

## Directory Structure

```
apps/
  books/
    readme.md
    tests/
      books.test.ts            ← App tests
      fixtures/
        sample-books.json
    connectors/
      goodreads/
        readme.md              ← Auth + actions in frontmatter
        tests/
          pull.test.ts         ← Connector tests
          fixtures/
            sample-export.csv
```

---

## Running Tests

```bash
npm test                           # All tests
npm test -- apps/books             # Specific app
npm test -- apps/books/connectors  # Specific connector
npm test -- --reporter=verbose     # Verbose output
npm test -- --watch                # Watch mode
```

---

## Writing App Tests

Test that the app's schema and CRUD work correctly:

```typescript
// apps/books/tests/books.test.ts
import { describe, it, expect, afterAll } from 'vitest';
import { aos, cleanupTestData, TEST_PREFIX } from '../../../tests/utils/fixtures';

describe('Books App', () => {
  afterAll(async () => {
    await cleanupTestData('Books');
  });

  it('can list all books', async () => {
    const books = await aos().books.list();
    expect(Array.isArray(books)).toBe(true);
  });

  it('can filter by status', async () => {
    const books = await aos().books.list({ status: 'read' });
    books.forEach(book => {
      expect(book.status).toBe('read');
    });
  });

  it('books have required fields', async () => {
    const books = await aos().books.list({ limit: 10 });
    for (const book of books) {
      expect(book.id).toBeDefined();
      expect(book.title).toBeDefined();
    }
  });
});
```

---

## Writing Connector Tests

Test that the connector correctly pulls/pushes data:

```typescript
// apps/books/connectors/goodreads/tests/pull.test.ts
import { describe, it, expect, afterAll } from 'vitest';
import { aos, cleanupTestData } from '../../../../../tests/utils/fixtures';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesDir = join(__dirname, 'fixtures');

describe('Goodreads Connector', () => {
  afterAll(async () => {
    await cleanupTestData('Books', 
      (book) => book.refs?.goodreads && book.title?.startsWith('[TEST]')
    );
  });

  it('pulls books from CSV (dry run)', async () => {
    const csvPath = join(fixturesDir, 'sample-export.csv');
    const result = await aos().books.pull('goodreads', { path: csvPath, dry_run: true });

    expect(result.pulled).toBeGreaterThan(0);
    expect(result.errors).toEqual([]);
  });

  it('maps title correctly', async () => {
    const csvPath = join(fixturesDir, 'sample-export.csv');
    await aos().books.pull('goodreads', { path: csvPath });

    const books = await aos().books.list();
    const book = books.find(b => b.refs?.goodreads === '12345');

    expect(book?.title).toBe('[TEST] The Great Gatsby');
  });
});
```

---

## Test Utilities

```typescript
import { aos, cleanupTestData, testContent, TEST_PREFIX } from '../../../tests/utils/fixtures';

// aos() - Get AgentOS instance
const books = await aos().books.list();
const result = await aos().books.pull('goodreads', { path, dry_run: true });
await aos().call('Books', { action: 'list', params: { status: 'read' } });

// cleanupTestData() - Remove test records
await cleanupTestData('Books');
await cleanupTestData('Books', (b) => b.refs?.goodreads != null);

// testContent() - Generate unique test content
const title = testContent('My Book');  // "[TEST] My Book 1704312000000_abc123"

// TEST_PREFIX
expect(book.title.startsWith(TEST_PREFIX)).toBe(true);
```

**The MCP connection is managed globally** — just use `aos()`.

---

## Test Fixtures

Place sample data in `tests/fixtures/` within each connector:

```
connectors/goodreads/tests/fixtures/
  sample-export.csv         # Normal export
  edge-case-quotes.csv      # ISBN formatting edge case
  empty.csv                 # Empty file edge case
```

**Best practices:**
- Use small fixtures (5-10 records)
- Include edge cases
- Use `[TEST]` prefix in titles for cleanup
- Don't commit real user data

---

## Test Environment

Tests run against a separate database:
- Location: `~/.agentos/data/test/{app}.db`
- Set via: `AGENTOS_ENV=test`

Your real data is never affected.

---

## Pre-commit Hook

A pre-commit hook runs automatically when you commit:

1. **Structure tests** — validates all apps/connectors have required files
2. **Dynamic app tests** — runs tests only for changed apps/connectors

**Progressive enforcement:** If you modify an app or connector, you must have tests for it. Untouched code won't block your commit.

```bash
# What happens on commit:
git commit -m "Update linear connector"
# → Runs structure tests (fast)
# → Detects apps/tasks/connectors/linear was changed
# → Runs apps/tasks/connectors/linear/tests/*.test.ts
# → Commit succeeds if tests pass
```

---

## Structure Validation

The `tests/structure.test.ts` file automatically validates all apps and connectors:

```bash
npm test -- tests/structure.test.ts
```

**What it checks:**

| For Apps | For Connectors | For Icons |
|----------|----------------|-----------|
| Has `readme.md` | Has `readme.md` | Uses `viewBox` |
| Has `icon.svg` | Has actions in frontmatter | Uses `currentColor` |
| Has schema/actions | Has icon | Under 5KB |

---

## Checklist

When contributing:

1. Create `tests/` directory in your app/connector
2. Add at least one test file (`*.test.ts`)
3. Include fixture files if needed
4. Run `npm test -- {your-path}` to verify
5. Pre-commit hook enforces tests for changed code
