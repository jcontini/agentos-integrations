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
│    - Schema (YAML) auto-generates database tables                   │
│    - Actions define what the app can do                             │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  CONNECTORS: todoist • linear • goodreads • hardcover • postgres   │
│  Location: apps/{app}/connectors/{connector}/mapping.yaml          │
│    - Maps unified actions to service-specific APIs                  │
│    - Transforms responses to app schema                             │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  EXECUTORS: rest: • graphql: • sql: • csv: • command: • app:       │
│  Location: AgentOS Core (Rust) — you don't modify these            │
└─────────────────────────────────────────────────────────────────────┘
```

**Every action requires a `connector` parameter:**
```
Books(action: "list", connector: "local")     → Local SQLite
Books(action: "pull", connector: "goodreads") → Goodreads CSV
Tasks(action: "list", connector: "linear")    → Linear API
```

---

## File Structure

```
apps/
  books/
    readme.md           ← Schema + actions (auto-generates DB)
    icon.svg            ← App icon (required)
    connectors/
      goodreads/
        readme.md       ← Auth config
        mapping.yaml    ← Action implementations
        icon.png
      hardcover/
        readme.md
        mapping.yaml
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
    # ... fields define database columns

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

**Reference:** See `apps/books/connectors/goodreads/mapping.yaml` for CSV import, `apps/tasks/connectors/linear/mapping.yaml` for GraphQL API.

### Connector structure

```
apps/books/connectors/goodreads/
  readme.md       ← Auth config
  mapping.yaml    ← Action implementations
  icon.png        ← Service icon
```

### Auth configuration (readme.md)

```yaml
# API key auth
auth:
  type: api_key
  header: Authorization
  prefix: "Bearer "
  label: API Token
  help_url: https://service.com/api-docs

# No auth needed (file imports)
auth: null
```

### Action mapping (mapping.yaml)

```yaml
actions:
  list:
    graphql:
      query: "{ items { id name } }"
      response:
        root: "data.items"
        mapping:
          id: "[].id"
          title: "[].name"
```

---

## Executors

| Executor | Use case | Example |
|----------|----------|---------|
| `rest:` | REST APIs | `apps/finance/connectors/copilot/mapping.yaml` |
| `graphql:` | GraphQL APIs | `apps/tasks/connectors/linear/mapping.yaml` |
| `csv:` | CSV file import | `apps/books/connectors/goodreads/mapping.yaml` |
| `sql:` | Database queries | `apps/databases/connectors/postgres/mapping.yaml` |
| `app:` | Local DB operations | Used in pull workflows |
| `command:` | CLI tools | `apps/files/connectors/macos/mapping.yaml` |

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

**See:** `apps/tasks/connectors/linear/mapping.yaml` for real chained executor examples.

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

**Quick start:**
```bash
npm install
npm test                    # Run all tests
npm test -- apps/books      # Run app tests
npm test -- --watch         # Watch mode
```

Tests live with the code they test:
- `apps/books/tests/books.test.ts`
- `apps/books/connectors/goodreads/tests/pull.test.ts`

---

## Quick Reference

| To do this... | Look at... |
|--------------|------------|
| Create a data app | `apps/books/readme.md` |
| Create a pass-through app | `apps/tasks/readme.md` |
| Build a CSV connector | `apps/books/connectors/goodreads/mapping.yaml` |
| Build a GraphQL connector | `apps/tasks/connectors/linear/mapping.yaml` |
| Build a REST connector | `apps/finance/connectors/copilot/mapping.yaml` |
| Add auth | `apps/tasks/connectors/linear/readme.md` |
| Write tests | `apps/books/tests/books.test.ts` |
