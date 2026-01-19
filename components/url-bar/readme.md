---
id: url-bar
name: URL Bar
description: Location bar with icon and readonly URL/query display

props:
  value: string
  icon: string?

root:
  type: container
  direction: row
  padding: small
  background: muted
  gap: small
  children:
    - type: icon
      name: "{{props.icon | default: 'globe'}}"
    - type: text
      value: "{{props.value}}"
      style: monospace
      truncate: true
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
