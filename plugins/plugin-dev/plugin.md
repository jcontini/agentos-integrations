---
id: plugin-dev
name: Plugin Development
description: Guide for building, auditing, and updating AgentOS plugins
category: code
icon: material-symbols:build
color: "#10B981"

auth:
  type: local
---

# Plugin Development Guide

Use this guide when building, auditing, or updating AgentOS plugins.

## Plugin Structure

Plugins live in `plugins/{id}/plugin.md` with YAML frontmatter + markdown body.

```yaml
---
id: my-plugin
name: My Plugin
description: What it does (one line)
category: productivity  # productivity, communication, search, code, finance, media
icon: material-symbols:icon-name  # Iconify format OR URL
color: "#hexcolor"

# Authentication (pick one)
auth:
  type: local  # No credentials needed

# OR
auth:
  type: api_key
  header: Authorization  # or X-Api-Key, etc.
  prefix: "Bearer "      # prefix before key
  help_url: https://...  # where to get the key

# Dependencies
requires:
  - curl  # Simple: binary name
  - name: yt-dlp  # Structured: with install commands
    install:
      macos: brew install yt-dlp
      linux: sudo apt install -y yt-dlp

# Shared functions (available to all actions)
helpers: |
  my_helper() {
    echo "reusable logic"
  }

# User-configurable settings
settings:
  num_results:
    label: Number of Results
    type: integer
    default: "5"
    min: 1
    max: 100
  mode:
    label: Mode
    type: enum
    default: "auto"
    options: [auto, fast, thorough]

actions:
  my_action:
    description: What this action does
    params:
      query:
        type: string
        required: true
        description: What this param is for
      limit:
        type: integer
        default: "10"
    run: |
      echo "Query: $PARAM_QUERY, Limit: $PARAM_LIMIT"
---

# My Plugin

Instructions for AI go here...
```

## Environment Variables

These are auto-injected into every `run:` script:

| Variable | Description |
|----------|-------------|
| `PARAM_{NAME}` | Each param value (uppercased) |
| `PARAM_ACTION` | The action being called |
| `PLUGIN_DIR` | Path to plugin folder (for scripts/) |
| `AUTH_TOKEN` | Credential if auth configured |
| `SETTING_{NAME}` | Plugin settings (uppercased) |
| `AGENTOS_DOWNLOADS` | User's downloads folder |
| `AGENTOS_CACHE` | Cache directory |
| `AGENTOS_DATA` | Data directory |

## Built-in Helper Functions

Available in all `run:` scripts:

```bash
error "message"      # Print to stderr and exit 1
warn "message"       # Print warning to stderr
downloads            # Echo the downloads path
require_file "path"  # Error if file doesn't exist
require_dir "path"   # Error if dir doesn't exist
```

## The `helpers:` Block

Define shared functions used by multiple actions:

```yaml
helpers: |
  ensure_deps() {
    command -v jq || error "jq required"
  }
  
  call_api() {
    curl -s -H "Authorization: Bearer $AUTH_TOKEN" "$1"
  }

actions:
  list:
    run: |
      ensure_deps
      call_api "https://api.example.com/items" | jq .
  
  get:
    run: |
      ensure_deps
      call_api "https://api.example.com/items/$PARAM_ID" | jq .
```

## Plugins with Scripts

For complex logic, use a `scripts/` folder:

```
plugins/
  browser/
    plugin.md
    scripts/
      browser.mjs   # Node.js, Python, etc.
```

Reference via `$PLUGIN_DIR`:

```yaml
helpers: |
  browser() {
    node "$PLUGIN_DIR/scripts/browser.mjs"
  }

actions:
  click:
    run: browser
```

## Icons

Two formats supported:

1. **Iconify** (preferred): `icon: material-symbols:web`
2. **URL**: `icon: https://cdn.simpleicons.org/todoist`

Browse icons: https://icon-sets.iconify.design/

## Categories

| Category | Use for |
|----------|---------|
| `productivity` | Tasks, notes, bookmarks |
| `communication` | Email, messaging |
| `search` | Web search, extraction |
| `code` | GitHub, dev tools |
| `finance` | Banking, payments |
| `media` | Video, audio, images |

Unknown categories automatically map to "Other".

## Best Practices

### Do ✅

- Use `helpers:` for shared logic
- Use `error()` for failures (visible in activity log)
- Keep `run:` blocks simple (call helpers)
- Use `$PLUGIN_DIR` for scripts, not hardcoded paths
- Return JSON for structured data

### Don't ❌

- Suppress stderr (`2>/dev/null` hides errors)
- Use complex inline scripts (use helpers or scripts/)
- Hardcode paths (use env vars)
- Ignore exit codes

## Param Types

| Type | Description |
|------|-------------|
| `string` | Text input |
| `integer` | Number |
| `boolean` | true/false |

## Settings Types

| Type | Description |
|------|-------------|
| `string` | Text input |
| `integer` | Number with optional `min`/`max` |
| `boolean` | Toggle (default as `"true"` or `"false"` string) |
| `enum` | Dropdown with `options` array |

## macOS Permissions

For plugins accessing protected resources:

```yaml
permissions:
  - full_disk_access   # Messages, Mail, Safari DBs
  - contacts           # Contacts database
  - calendar           # Calendar/Reminders
  - automation:Finder  # AppleScript control
```

## Testing Locally

1. Fork the plugins repo
2. In AgentOS Settings → Developer, set plugins source to your local path
3. Changes hot-reload automatically

## Auditing Plugins

When reviewing a plugin, check:

1. **Structure**: Valid YAML, required fields present
2. **Errors**: No stderr suppression, uses `error()` helper
3. **Helpers**: Shared logic extracted to `helpers:` block
4. **Paths**: Uses `$PLUGIN_DIR`, `$AGENTOS_DOWNLOADS`, not hardcoded
5. **Params**: All required params have descriptions
6. **Docs**: Markdown body explains usage clearly

