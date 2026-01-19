---
id: browser
name: Browser
icon: globe
description: Web search and page reading
capabilities: [web_search, web_read]

views:
  search:
    when: "capability == 'web_search'"
    root:
      type: container
      direction: column
      children:
        # URL bar showing the search query
        - component: url-bar
          value: "{{request.query}}"
          icon: search
        
        # Search results list
        - type: container
          direction: column
          gap: small
          scroll: true
          repeat: "{{response.results}}"
          item:
            component: search-result
            title: "{{item.title}}"
            url: "{{item.url}}"
            snippet: "{{item.snippet}}"

  page:
    when: "capability == 'web_read'"
    root:
      type: container
      direction: column
      children:
        # URL bar showing the page URL
        - component: url-bar
          value: "{{response.url}}"
          icon: globe
        
        # Rendered markdown content
        - type: text
          format: markdown
          value: "{{response.content}}"
          scroll: true
---

# Browser

Renders web search results and page content.

## Capabilities

| Capability | View | Description |
|------------|------|-------------|
| `web_search` | search | List of search results with title, URL, snippet |
| `web_read` | page | Rendered markdown content from a URL |

## Views

### Search View

Triggered when `web_search` capability is used. Shows:
- URL bar with the search query
- Scrollable list of search results

### Page View

Triggered when `web_read` capability is used. Shows:
- URL bar with the page URL
- Rendered markdown content

## Components Used

- [`url-bar`](../../components/url-bar/readme.md) — Location bar at top
- [`search-result`](../../components/search-result/readme.md) — Individual result cards

## Data Binding

### Search View Context

```yaml
request:
  query: string        # The search query
response:
  results:             # Array of results
    - title: string    # Result title
      url: string      # Result URL
      snippet: string? # Optional snippet
```

### Page View Context

```yaml
response:
  url: string      # The page URL
  title: string?   # Optional page title
  content: string  # Markdown content
```
