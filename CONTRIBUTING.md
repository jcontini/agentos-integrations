# Contributing to AgentOS

This repo contains **connectors** — YAML configs that connect AgentOS to external services.

## Quick Start

```yaml
# connectors/myservice/readme.md
---
id: myservice
name: My Service
description: What this connector does
tags: [category]  # tasks, books, messages, calendar, contacts, finance, web, etc.

auth:
  type: api_key
  header: Authorization
  help_url: https://myservice.com/api-keys

actions:
  list:
    provides: task_list           # Capability for UI routing
    description: List items
    readonly: true
    rest:
      method: GET
      url: "https://api.myservice.com/items"
      response:
        mapping:
          # Must match capability schema (see tests/connector.schema.json)
          tasks:
            each: "[]"
            map:
              id: ".id"
              title: ".name"
---

# My Service

Human-readable documentation goes here.
```

## Folder Structure

```
connectors/
  linear/           # Each connector is a folder
    readme.md       # YAML frontmatter + markdown docs
    icon.png        # Square icon (PNG or SVG)
    tests/          # Optional integration tests
      linear.test.ts
```

## Capabilities

Actions can declare a `provides:` field that maps to a **capability**. This tells the UI which App to use for rendering results.

```yaml
actions:
  search:
    provides: web_search    # → renders in Browser App
    rest:
      # ...
  
  list:
    provides: task_list     # → renders in Tasks App
    rest:
      # ...
```

**Common capabilities:**

| App | Capabilities |
|-----|--------------|
| Browser | `web_search`, `web_read` |
| Tasks | `task_list`, `task_get`, `task_create`, `task_update`, `task_delete` |
| Contacts | `contact_list`, `contact_get`, `contact_create`, ... |
| Calendar | `event_list`, `event_get`, `event_create`, ... |
| Books | `book_list`, `book_get` |

**Source of truth:** See `tests/connector.schema.json` for the full enum of valid capabilities. The schema validates `provides` values — typos will fail CI.

**Response mapping:** When you declare `provides: web_search`, your response mapping must output the schema that capability expects. See the app specs in the main repo (`.specs/apps/`) for schema definitions.

## Executors

Executors are how actions actually run. **Auth is injected automatically** — never put credentials in configs.

### `rest:` — REST APIs

```yaml
actions:
  list:
    rest:
      method: GET
      url: "https://api.example.com/items?limit={{params.limit}}"
      response:
        mapping:
          id: "[].id"
          name: "[].title"
```

### `graphql:` — GraphQL APIs

```yaml
actions:
  list:
    graphql:
      query: |
        query($limit: Int) {
          items(first: $limit) { nodes { id name } }
        }
      variables:
        limit: "{{params.limit | default: 50}}"
      response:
        root: "data.items.nodes"
        mapping:
          id: "[].id"
          name: "[].name"
```

### `sql:` — Local Databases

```yaml
actions:
  list:
    sql:
      database: "~/Library/Messages/chat.db"
      query: |
        SELECT * FROM message 
        WHERE text LIKE '%{{params.query}}%'
        LIMIT {{params.limit | default: 50}}
      response:
        mapping:
          id: "[].ROWID"
          text: "[].text"
```

### `swift:` — macOS Native APIs

```yaml
actions:
  list:
    swift:
      script: |
        import Contacts
        import Foundation
        let store = CNContactStore()
        // ... Swift code ...
        print(jsonString)  // Output JSON to stdout
```

### `command:` — Shell Commands

```yaml
actions:
  echo:
    command:
      binary: echo
      args: ["{{params.message}}"]
```

## Chained Actions

Chain multiple steps with `as:` to pass data between them:

```yaml
actions:
  complete:
    - graphql:
        query: "{ issue(id: $id) { team { states { nodes { id } } } } }"
        variables: { id: "{{params.id}}" }
      as: lookup
    - graphql:
        query: "mutation { issueUpdate(id: $id, input: $input) { success } }"
        variables:
          id: "{{params.id}}"
          input:
            stateId: "{{lookup.data.issue.team.states.nodes[0].id}}"
```

**Access patterns by executor:**
| Executor | Result | Access |
|----------|--------|--------|
| `graphql:` | Object | `{{step.data.field}}` |
| `sql:` | Array | `{{step[0].column}}` |
| `command:` | String | `{{step}}` |

## Security

**Never expose credentials.** Executors handle auth automatically.

```yaml
# Auth is injected by AgentOS — never do this:
headers:
  Authorization: "Bearer {{env.API_KEY}}"  # WRONG

# Just declare the auth type:
auth:
  type: api_key
  header: Authorization
```

The pre-commit hook blocks:
- `$AUTH_TOKEN` or `${AUTH_TOKEN}` in configs
- `curl`/`wget` with auth headers
- `Bearer $` patterns

## Testing

Tests are E2E — they call the real AgentOS binary with real APIs.

```typescript
// connectors/myservice/tests/myservice.test.ts
import { describe, it, expect } from 'vitest';
import { aos, testContent, TEST_PREFIX } from '../../../tests/utils/fixtures';

describe('My Service', () => {
  it('can list items', async () => {
    const result = await aos.call({
      app: 'myservice',
      action: 'list',
      params: { limit: 5 }
    });
    expect(Array.isArray(result)).toBe(true);
  });
});
```

**Test data:** Use `[TEST]` prefix via `testContent('name')` for cleanup.

```bash
npm test                    # All tests
npm test connectors/myservice     # Single connector
```

## Git Hooks

| Hook | What runs | Speed |
|------|-----------|-------|
| `pre-commit` | Schema validation, security checks | ~1s |
| `pre-push` | Full integration tests for changed files | varies |

## Reference

### Schema (Source of Truth)

**`tests/connector.schema.json`** — JSON Schema that validates all connector configs. Contains:
- All valid `provides:` capability values (enum)
- Required fields and types
- Auth configuration options
- Executor definitions

### Example Connectors

| Pattern | Example |
|---------|---------|
| REST + capabilities | `connectors/exa/readme.md` |
| REST API | `connectors/demo/readme.md` |
| GraphQL API | `connectors/linear/readme.md` |
| Local SQLite | `connectors/imessage/readme.md` |
| macOS Swift | `connectors/apple-calendar/readme.md` |
| Cookie auth | `connectors/instagram/readme.md` |

## Checklist

Before submitting:

- [ ] `id` is lowercase with hyphens (`my-service`)
- [ ] `tags` includes at least one category
- [ ] `provides:` set on actions (see `tests/connector.schema.json` for valid values)
- [ ] Response mapping matches capability schema
- [ ] `readonly: true` on read-only actions
- [ ] Icon is square PNG or SVG
- [ ] No credentials in config
- [ ] Tests pass (if added)
