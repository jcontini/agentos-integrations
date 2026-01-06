# Contributing to AgentOS Integrations

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│  INTERFACES: MCP Server • HTTP API • CarPlay • Widgets • ...       │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  APPS: Tasks • Books • Messages • Calendar • Finance • Databases   │
│  Location: apps/{app}/readme.md                                     │
│    - Schema defines the data contract                               │
│    - Actions define what the app can do                             │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  CONNECTORS: todoist • linear • goodreads • postgres • copilot     │
│  Location: apps/{app}/connectors/{connector}/readme.md              │
│    - Auth config + action implementations in YAML frontmatter       │
│    - Maps unified actions to service-specific APIs                  │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  EXECUTORS: rest: • graphql: • sql: • csv: • command: • swift:     │
│  Location: AgentOS Core (Rust) — you don't modify these            │
└─────────────────────────────────────────────────────────────────────┘
```

**Every action requires a `connector` parameter:**
```
Tasks(action: "list", connector: "linear")    → Linear GraphQL API
Books(action: "pull", connector: "goodreads") → Goodreads CSV import
Finance(action: "list", connector: "copilot") → Copilot REST API
```

---

## File Structure

```
apps/
  books/
    readme.md           ← Schema + actions
    icon.svg            ← App icon (required)
    connectors/
      goodreads/
        readme.md       ← Auth config + action implementations
        icon.png
      hardcover/
        readme.md
        icon.png
    tests/
      books.test.ts     ← App tests
```

---

## Creating an App

**Reference:** See `apps/books/readme.md` for a complete example.

### App readme.md structure

```yaml
---
id: books
name: Books
description: Track your reading library
icon: icon.svg
color: "#8B4513"

schema:
  book:
    id: { type: string, required: true }
    title: { type: string, required: true }
    # ... more fields

actions:
  list:
    description: List books from library
    readonly: true
    params:
      status: { type: string }
      limit: { type: number, default: 50 }
    returns: book[]
  # ... actions define what the app can do

instructions: |
  Context for AI when using this app.
---

# Human-readable documentation below the YAML frontmatter
```

### Schema field types

| Type | Example | Notes |
|------|---------|-------|
| `string` | `title: { type: string }` | |
| `number` | `rating: { type: number, min: 1, max: 5 }` | |
| `boolean` | `completed: { type: boolean }` | |
| `datetime` | `created_at: { type: datetime }` | ISO 8601 |
| `enum` | `status: { type: enum, values: [a, b, c] }` | |
| `array` | `tags: { type: array, items: { type: string } }` | |
| `object` | `refs: { type: object }` | JSON blob |

### Standard fields

Every schema should include:

```yaml
id: { type: string, required: true }       # AgentOS internal ID
refs: { type: object }                     # IDs in external systems
metadata: { type: object }                 # Connector-specific extras
created_at: { type: datetime }
updated_at: { type: datetime }
```

**refs** = External IDs for dedup: `{ goodreads: "123", isbn: "978..." }`  
**metadata** = Connector-specific data: `{ average_rating: 4.2, num_pages: 350 }`

---

## Creating a Connector

**Reference:** See `apps/tasks/connectors/linear/readme.md` for GraphQL API, `apps/finance/connectors/copilot/readme.md` for REST API.

### Connector structure

```
apps/books/connectors/goodreads/
  readme.md       ← Auth config + action implementations (YAML frontmatter)
  icon.png        ← Service icon
```

### Connector readme.md

Everything goes in YAML frontmatter — auth config and action implementations:

```yaml
---
name: Linear
auth:
  type: api_key
  header: Authorization
  prefix: "Bearer "
  label: API Token
  help_url: https://linear.app/settings/api

actions:
  list:
    graphql:
      query: "{ items { id name } }"
      response:
        root: "data.items"
        mapping:
          id: "[].id"
          title: "[].name"
---

# Linear

Human-readable docs about this connector.
```

---

## Executors

| Executor | Use case | Example |
|----------|----------|---------|
| `rest:` | REST APIs | `apps/finance/connectors/copilot/readme.md` |
| `graphql:` | GraphQL APIs | `apps/tasks/connectors/linear/readme.md` |
| `csv:` | CSV file parsing | `apps/books/connectors/goodreads/readme.md` |
| `sql:` | Database queries | `apps/databases/connectors/postgres/readme.md` |
| `command:` | CLI tools | `apps/files/connectors/macos/readme.md` |
| `swift:` | macOS Swift scripts | `apps/calendar/connectors/apple-calendar/readme.md` |

### REST executor

```yaml
rest:
  method: GET
  url: "https://api.example.com/items/{{params.id}}"
  headers:
    X-Custom: "value"
  body: { field: "{{params.value}}" }
  response:
    mapping:
      id: ".id"
      title: ".name"
```

### GraphQL executor

```yaml
graphql:
  query: |
    query($id: ID!) {
      item(id: $id) { id name status }
    }
  variables:
    id: "{{params.id}}"
  response:
    root: "data.item"
    mapping:
      id: ".id"
      title: ".name"
```

### CSV executor

```yaml
csv:
  path: "{{params.path}}"
  response:
    mapping:
      title: "[].'Column Name'"
      rating: "[].'Rating' | to_int"
```

### Chained executors

Chain multiple steps with `as:` to name outputs:

```yaml
actions:
  complete:
    # Step 1: Look up the completed state
    - graphql:
        query: |
          query($id: String!) {
            issue(id: $id) {
              team { states(filter: { type: { eq: "completed" } }) { nodes { id } } }
            }
          }
        variables:
          id: "{{params.id}}"
      as: lookup
    
    # Step 2: Use the lookup result
    - graphql:
        query: |
          mutation($id: String!, $input: IssueUpdateInput!) {
            issueUpdate(id: $id, input: $input) { success }
          }
        variables:
          id: "{{params.id}}"
          input:
            stateId: "{{lookup.data.issue.team.states.nodes[0].id}}"
```

**See:** `apps/tasks/connectors/linear/readme.md` for real chained executor examples.

---

## Response Mapping

Transform API responses to app schema:

```yaml
response:
  root: "data.items"          # Where to find the data
  mapping:
    # Direct field
    id: ".id"
    
    # Array iteration (use [] prefix)
    title: "[].name"
    
    # Transforms
    authors: "[].author | to_array"
    isbn: "[].isbn | strip_quotes"
    rating: "[].rating | to_int"
    
    # Conditionals
    status: ".done ? 'completed' : 'open'"
    
    # Complex conditionals
    status: |
      .state == 'finished' ? 'done' :
      .state == 'working' ? 'in_progress' : 'open'
    
    # Static values
    connector: "'goodreads'"
    
    # Nested objects
    refs:
      goodreads: "[].id"
      isbn: "[].isbn | strip_quotes"
```

### Built-in transforms

| Transform | Description |
|-----------|-------------|
| `to_array` | Wrap single value in array |
| `to_int` | Convert to integer |
| `strip_quotes` | Remove `="..."` wrapper (CSV exports) |
| `trim` | Remove whitespace |
| `split:,` | Split string to array |
| `nullif:0` | Return null if equals value |
| `default:value` | Use value if null/empty |
| `replace:from:to` | Text replacement |

---

## Icons

Every app and connector needs an icon.

**Apps:** `icon.svg` — must use `viewBox` and `currentColor`  
**Connectors:** `icon.png` or `icon.svg` — service branding

### App icon requirements

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" 
     fill="none" stroke="currentColor" stroke-width="2">
  <path d="..."/>
</svg>
```

- Use `viewBox` (scales properly)
- Use `currentColor` (adapts to themes)
- Under 5KB

**Sources:** [Lucide](https://lucide.dev/), [Heroicons](https://heroicons.com/), [Tabler](https://tabler.io/icons)

---

## Security

**No shell scripts.** Connectors use declarative YAML only — credentials never leave Rust core.

---

## Testing

See [TESTING.md](./TESTING.md) for the full testing guide.

**Pre-commit hook enforces tests.** If you modify an app or connector, you must have tests for it.

```bash
npm install
npm test                    # Run all tests
npm test -- apps/books      # Run app tests
npm test -- --watch         # Watch mode
```

### Test Data Convention

Use `[TEST]` prefix for test data:
```typescript
import { testContent, TEST_PREFIX } from '../../../tests/utils/fixtures';

const title = testContent('my task');  // → "[TEST] my task abc123"
```

---

## Quick Reference

| To do this... | Look at... |
|--------------|------------|
| Create an app | `apps/books/readme.md` |
| Build a CSV connector | `apps/books/connectors/goodreads/readme.md` |
| Build a GraphQL connector | `apps/tasks/connectors/linear/readme.md` |
| Build a REST connector | `apps/finance/connectors/copilot/readme.md` |
| Build a Swift connector | `apps/calendar/connectors/apple-calendar/readme.md` |
| Write tests | `apps/tasks/connectors/linear/tests/linear.test.ts` |
