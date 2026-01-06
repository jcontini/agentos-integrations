# AgentOS Integrations

Open-source apps and connectors for [AgentOS](https://github.com/jcontini/agentos).

## Mental Model

```
┌─────────────────────────────────────────────────────────────────────┐
│  INTERFACES: MCP Server • HTTP API • CarPlay • Widgets • ...       │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  APPS: Tasks • Databases • Messages • Calendar • Finance • Web     │
│  Location: apps/{app}/readme.md — schema + actions                  │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  CONNECTORS: todoist • linear • postgres • copilot • imessage      │
│  Location: apps/{app}/connectors/{connector}/readme.md              │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  EXECUTORS: rest: • graphql: • sql: • swift: • csv: • command:     │
│  Location: AgentOS Core (Rust)                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## Structure

```
apps/
  tasks/
    readme.md              # Schema + actions
    connectors/
      todoist/
        readme.md          # Auth + action implementations
      linear/
        readme.md
  databases/
    readme.md
    connectors/
      postgres/
        readme.md
      sqlite/
        readme.md
```

## Core Concepts

| Layer | What | Examples |
|-------|------|----------|
| **App** | Capability with unified schema | Tasks, Databases, Messages |
| **Connector** | Service that implements app(s) | todoist, postgres, linear |
| **Executor** | Protocol handler (Rust) | `rest:`, `sql:`, `graphql:` |

### How It Works

```
AI calls: Tasks(action: "list", connector: "todoist")
    ↓
AgentOS loads: apps/tasks/connectors/todoist/readme.md
    ↓
Executes: rest: block with injected credentials
    ↓
Returns: Unified task schema
```

## Current Apps

| App | Connectors |
|-----|------------|
| Tasks | todoist, linear |
| Messages | imessage, whatsapp, cursor |
| Databases | postgres, sqlite, mysql |
| Calendar | apple |
| Contacts | apple |
| Finance | copilot |
| Web | exa, firecrawl, reddit |

## Development

```bash
git clone https://github.com/jcontini/agentos-integrations
cd agentos-integrations
npm install    # Sets up pre-commit hooks via husky
```

## Contributing

See **[CONTRIBUTING.md](CONTRIBUTING.md)** for:
- App schema definition
- Connector YAML format  
- Executor blocks (rest, graphql, sql, applescript)
- Security architecture

## License

MIT
