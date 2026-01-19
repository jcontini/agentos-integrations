---
id: search-result
name: Search Result
description: A search result card with title, URL, and snippet

props:
  title: string
  url: string
  snippet: string?

root:
  type: container
  direction: column
  padding: medium
  border: true
  gap: tiny
  children:
    - type: text
      value: "{{props.title}}"
      style: [bold, large]
    - type: text
      value: "{{props.url}}"
      style: [muted, small]
    - type: text
      value: "{{props.snippet}}"
      if: "{{props.snippet}}"
---

# Search Result

Displays a single search result with title, URL, and optional snippet.

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `title` | string | Yes | Result title (displayed bold) |
| `url` | string | Yes | Result URL (displayed small, muted, monospace) |
| `snippet` | string | No | Text snippet (only shown if provided) |

## Usage

```yaml
# In a repeat loop
- type: container
  repeat: "{{response.results}}"
  item:
    component: search-result
    title: "{{item.title}}"
    url: "{{item.url}}"
    snippet: "{{item.snippet}}"
```

## Structure

```
┌─────────────────────────────────────┐
│ Title (bold)                        │
│ https://example.com (small, muted)  │
│ Snippet text here... (small)        │
└─────────────────────────────────────┘
```

- Vertical container with border and padding
- Title is bold
- URL is smaller, muted, monospace
- Snippet only appears if provided (conditional rendering)

## Atoms Used

- `container` — Column layout with border and padding
- `text` (x3) — Title, URL, and snippet with different styles
