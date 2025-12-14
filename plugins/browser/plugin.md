---
id: browser
name: Browser
description: Browser automation with console/network diagnostics for testing and debugging
category: automation
icon: material-symbols:web
color: "#4285F4"

settings:
  headless:
    label: Headless Mode
    description: Run browser invisibly (off = you can watch the browser)
    type: boolean
    default: "true"

requires:
  - name: node
    install:
      macos: brew install node
      linux: sudo apt install -y nodejs
  - name: npx
    install:
      macos: brew install node
      linux: sudo apt install -y nodejs

helpers: |
  # Ensure Playwright browsers are installed (runs once, fast if already done)
  ensure_playwright() {
    cd "$PLUGIN_DIR/scripts" && npx --yes playwright install chromium >&2
  }
  
  # Run browser action
  browser() {
    ensure_playwright
    node "$PLUGIN_DIR/scripts/browser.mjs"
  }

actions:
  inspect:
    description: Get a diagnostic overview of a page - headings, buttons, inputs, console logs, network activity. Efficient alternative to screenshots.
    params:
      url:
        type: string
        required: true
        description: URL to inspect
      wait_ms:
        type: integer
        default: "1000"
        description: Time to wait after page load (ms)
      screenshot:
        type: boolean
        default: "false"
        description: Also capture a screenshot (expensive, use sparingly)
    run: browser

  console:
    description: Get console logs and errors from a page. Great for debugging JavaScript issues.
    params:
      url:
        type: string
        required: true
        description: URL to check
      wait_ms:
        type: integer
        default: "2000"
        description: Time to wait for console activity (ms)
    run: browser

  network:
    description: Get network requests and errors from a page. Great for debugging API issues.
    params:
      url:
        type: string
        required: true
        description: URL to check
      wait_ms:
        type: integer
        default: "2000"
        description: Time to wait for network activity (ms)
    run: browser

  click:
    description: Click an element on a page. Returns console/network errors if any.
    params:
      url:
        type: string
        required: true
        description: URL to navigate to
      selector:
        type: string
        required: true
        description: CSS selector of element to click
      wait_ms:
        type: integer
        default: "1000"
        description: Time to wait after click (ms)
      screenshot:
        type: boolean
        default: "false"
        description: Capture a screenshot after clicking (expensive)
    run: browser

  type:
    description: Type text into an input field. Returns console/network errors if any.
    params:
      url:
        type: string
        required: true
        description: URL to navigate to
      selector:
        type: string
        required: true
        description: CSS selector of input element
      text:
        type: string
        required: true
        description: Text to type
      wait_ms:
        type: integer
        default: "500"
        description: Time to wait after typing (ms)
      screenshot:
        type: boolean
        default: "false"
        description: Capture a screenshot after typing (expensive)
    run: browser

  get_text:
    description: Get text content from elements matching a selector
    params:
      url:
        type: string
        required: true
        description: URL to navigate to
      selector:
        type: string
        required: true
        description: CSS selector to get text from
      wait_ms:
        type: integer
        default: "1000"
        description: Time to wait after page load (ms)
    run: browser

  evaluate:
    description: Run JavaScript in the page context and return the result
    params:
      url:
        type: string
        required: true
        description: URL to navigate to
      script:
        type: string
        required: true
        description: JavaScript code to evaluate in page context
      wait_ms:
        type: integer
        default: "1000"
        description: Time to wait after page load (ms)
    run: browser

  screenshot:
    description: Take a screenshot of a page. Use sparingly - expensive in tokens. Prefer inspect/console/network.
    params:
      url:
        type: string
        required: true
        description: URL to screenshot
      selector:
        type: string
        description: Optional CSS selector to screenshot a specific element
      wait_ms:
        type: integer
        default: "1000"
        description: Time to wait after page load before screenshot (ms)
    run: browser

  get_html:
    description: Get HTML content from the page or a specific element
    params:
      url:
        type: string
        required: true
        description: URL to navigate to
      selector:
        type: string
        description: Optional CSS selector (returns full page HTML if not specified)
      wait_ms:
        type: integer
        default: "1000"
        description: Time to wait after page load (ms)
    run: browser
---

# Browser

Automate browser interactions with full diagnostic visibility. Captures console logs, network requests, and errors automatically.

## Recommended Workflow

**For debugging (low tokens):**
1. `inspect` — Get page structure, buttons, inputs, console/network logs
2. `console` — Focus on JavaScript errors
3. `network` — Focus on failed API requests

**For interaction:**
1. `click` / `type` — Interact with elements (returns any errors)
2. `get_text` — Verify content
3. `evaluate` — Run custom JavaScript

**Last resort (high tokens):**
- `screenshot` — Only when visual verification is absolutely needed

## Tools

### inspect ⚡ (recommended)
Get a diagnostic overview: headings, buttons, inputs, console logs, network activity.

```
tool: inspect
params: {url: "http://localhost:5173"}
```

### console
Get console logs and JavaScript errors.

```
tool: console
params: {url: "http://localhost:5173"}
```

### network
Get network requests and failed API calls.

```
tool: network
params: {url: "http://localhost:5173"}
```

### click
Click an element.

```
tool: click
params: {url: "http://localhost:5173", selector: "text=Plugins"}
```

### type
Type into an input.

```
tool: type
params: {url: "http://localhost:5173", selector: "input[type='text']", text: "hello"}
```

### get_text
Get text from elements.

```
tool: get_text
params: {url: "http://localhost:5173", selector: "h1"}
```

### evaluate
Run JavaScript in the page.

```
tool: evaluate
params: {url: "http://localhost:5173", script: "document.title"}
```

### screenshot 📸 (expensive)
Capture a screenshot. Use sparingly.

```
tool: screenshot
params: {url: "http://localhost:5173"}
```

## CSS Selectors

- `text=Click me` — Element containing text (Playwright syntax)
- `#id` — By ID
- `.class` — By class
- `button` — By tag
- `[data-testid="submit"]` — By attribute
