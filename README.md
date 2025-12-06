# Passport Skills

Open-source skill definitions for [Passport](https://github.com/jcontini/passport).

Skills teach AI agents how to use your connected apps — they're markdown files with API documentation and configuration.

## What's a Skill?

A skill is a markdown file with:
- **YAML frontmatter** — metadata (auth config, API settings)
- **Instructions** — API docs the AI reads to make requests

Example:
```yaml
---
id: todoist
name: Todoist
description: Personal task management
category: productivity

auth:
  type: api_key
  header: Authorization
  prefix: "Bearer "

api:
  type: rest    # rest, graphql, sqlite, local
  base_url: https://api.todoist.com
---

# Todoist

API documentation here...
```

## Permissions: See + Do

Passport uses a simple two-level permission model per account:

| Permission | Description | MCP Tool |
|------------|-------------|----------|
| **See** | Read data (always enabled if account exists) | `passport_see` |
| **Do** | Create, modify, delete data (user toggles this) | `passport_do` |

**Enforcement is based on API type:**
- **REST** (`type: rest`) — GET = See, POST/PUT/PATCH/DELETE = Do
- **GraphQL** (`type: graphql`) — query = See, mutation = Do  
- **SQLite** (`type: sqlite`) — SELECT = See, INSERT/UPDATE/DELETE = Do

**Default access levels** (configurable in Settings):
- **See only** — New accounts can only read data (safe default)
- **See + Do** — New accounts can read and take actions

Users can have different permissions per account (e.g., Personal has Do enabled, Work is See-only).

## Available Skills

| Skill | Category | Description |
|-------|----------|-------------|
| [Todoist](skills/todoist/skill.md) | Productivity | Personal task management |
| [Linear](skills/linear/skill.md) | Productivity | Issue tracking and project management |
| [Exa](skills/exa/skill.md) | Search | Semantic web search |
| [Raindrop](skills/raindrop/skill.md) | Productivity | Bookmark management |

## Using Skills

Skills are fetched by the Passport app when you browse and install them.

1. Open Passport → Apps tab
2. Browse available skills
3. Click "Install" on any skill
4. Connect your account (API key)
5. Your AI agents can now use that service

**Updating Skills:** Click "Update Skill Definition" in the app detail view to re-download the latest version from this repo.

## Contributing

Want to add a skill for a new service? See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT

