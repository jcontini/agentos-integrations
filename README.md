# agentOS Plugins

Open-source plugin definitions for [agentOS](https://github.com/jcontini/agentos).

Plugins teach AI agents how to use your connected apps — they're markdown files with API documentation and configuration.

## What's a Plugin?

A plugin is a markdown file with:
- **YAML frontmatter** — metadata (protocol, auth config, actions/API settings)
- **Instructions** — API docs the AI reads to make requests

### Two Protocol Types

**1. Shell Protocol** — Executes local commands (e.g., YouTube, Exa)

```yaml
---
id: youtube
name: YouTube
description: Get video transcripts and download videos
category: media
icon: https://cdn.simpleicons.org/youtube
color: "#FF0000"
protocol: shell

requires:
  - yt-dlp

actions:
  transcribe:
    description: Get transcript text from a YouTube video
    params:
      url:
        type: string
        required: true
        description: YouTube video URL
      lang:
        type: string
        default: en
        description: Subtitle language code
    run: |
      yt-dlp --skip-download --write-auto-sub \
        --sub-lang "$PARAM_LANG" "$PARAM_URL"
---

# YouTube

Instructions for using YouTube...
```

**2. REST/GraphQL Protocol** — Cloud APIs (e.g., Todoist, Linear)

```yaml
---
id: todoist
name: Todoist
description: Personal task management
category: productivity
icon: https://cdn.simpleicons.org/todoist
color: "#E44332"
protocol: rest  # or graphql

auth:
  type: api_key
  header: Authorization
  prefix: "Bearer "
  help_url: https://todoist.com/app/settings/integrations

api:
  type: rest
  base_url: https://api.todoist.com
---

# Todoist

API documentation here...
```

## Plugin Schema

Plugins have a YAML frontmatter section with metadata and a markdown body with instructions.

**Required fields:** `id`, `name`, `description`, `category`, `protocol`  
**Optional fields:** `icon`, `color`, `requires` (for shell), `actions` (for shell), `api` (for rest/graphql), `auth`

For complete schema documentation, examples, and all authentication types, see [CONTRIBUTING.md](CONTRIBUTING.md).

## Available Plugins

| Plugin | Category | Protocol | Description |
|--------|----------|----------|-------------|
| [Todoist](plugins/todoist/plugin.md) | Productivity | Shell | Personal task management |
| [Linear](plugins/linear/plugin.md) | Productivity | Shell | Issue tracking and project management |
| [Exa](plugins/exa/plugin.md) | Search | Shell | Semantic web search |
| [YouTube](plugins/youtube/plugin.md) | Media | Shell | Video transcripts and downloads |
| [Finder](plugins/finder/plugin.md) | Productivity | Shell | macOS file system access |

## Using Plugins

Plugins are fetched by the agentOS app when you browse and install them.

1. Open agentOS → Plugins tab
2. Browse available plugins
3. Click to enable a plugin
4. Connect your account (API key) if required
5. Your AI agents can now use that service

**Updating Plugins:** Plugin definitions are automatically synced from this repo.

## Contributing

Want to add a plugin for a new service? See [CONTRIBUTING.md](CONTRIBUTING.md).

### Validating Plugins

Before submitting a PR, validate your plugins:

```bash
npm install
npm run validate
```

This checks all plugins against the schema and reports any errors or warnings.

## License

MIT
