---
id: url-bar
name: URL Bar
description: Location bar with icon, connector info, and readonly URL/query display

props:
  value: string
  icon: string?
  connector: string?

root:
  type: container
  direction: row
  padding: medium
  gap: medium
  children:
    # Search/browse icon
    - type: icon
      name: "{{props.icon | default: 'globe'}}"
      size: 24
    
    # Input-style container for the query/URL - full width
    - type: container
      direction: row
      padding: small
      border: true
      grow: true
      children:
        - type: text
          value: "{{props.value}}"
---

# URL Bar

A location bar component showing an icon and URL/query text. Used at the top of browser-style views.

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `value` | string | Yes | — | The URL or query to display |
| `icon` | string | No | `globe` | Icon name (search, globe, etc.) |

## Usage

```yaml
# In an app view
- component: url-bar
  value: "{{request.query}}"
  icon: search
```

```yaml
# With default icon
- component: url-bar
  value: "{{response.url}}"
```

## Structure

```
┌─────────────────────────────────────┐
│ [icon] value text...                │
└─────────────────────────────────────┘
```

- Horizontal container with muted background
- Icon on the left
- Text truncates if too long

## Atoms Used

- `container` — Row layout with padding and background
- `icon` — Left-aligned icon
- `text` — Monospace, truncated URL/query text
