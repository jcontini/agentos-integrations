# Service & Agent Icons Plan

**Status:** 🟡 Planning  
**Created:** 2024-12-07  
**Goal:** Bundle all icons in this repo so Passport app makes zero external calls for icons.

---

## Context

The Passport app needs to be **strictly offline-first** after build. Currently, icons are fetched from external sources:

**Current external icon sources:**
- `https://cdn.simpleicons.org/todoist` — SimpleIcons CDN
- `https://www.google.com/s2/favicons?domain=...` — Google Favicon service
- `https://raindrop.io/favicon.ico` — Direct from service

**Problem:** These require internet access at runtime.

**Solution:** Host icons in this repo, serve via GitHub raw URLs (which Passport already fetches for skill metadata).

---

## Proposed Structure

```
passport-skills/
├── index.yaml              # Updated to reference local icons
├── icons/
│   ├── skills/             # App/service icons
│   │   ├── todoist.svg
│   │   ├── linear.svg
│   │   ├── exa.png
│   │   └── raindrop.png
│   │
│   └── agents/             # AI client icons
│       ├── claude.png
│       ├── chatgpt.png
│       ├── cursor.png
│       ├── windsurf.png
│       ├── zed.png
│       ├── vscode.png
│       ├── lmstudio.png
│       ├── librechat.png
│       ├── raycast.png
│       ├── continue.png
│       └── cline.png
│
└── skills/
    └── ... (existing skill docs)
```

---

## Icon Requirements

### Format
- **SVG preferred** — Scalable, small file size
- **PNG fallback** — 64x64 minimum, 128x128 preferred
- **No transparency issues** — Should look good on dark backgrounds

### Naming Convention
- Use skill/agent ID as filename: `todoist.svg`, `claude.png`
- Lowercase, no spaces

### Licensing
- Most service logos are trademarked but fair use for identification
- Use official brand assets where available
- SimpleIcons provides SVGs under CC0/MIT

---

## Icon Sources

### Skills

| Skill | Current Source | New Source |
|-------|----------------|------------|
| `todoist` | cdn.simpleicons.org | SimpleIcons SVG (download) |
| `linear` | cdn.simpleicons.org | SimpleIcons SVG (download) |
| `exa` | google favicons | Screenshot/request from Exa |
| `raindrop` | raindrop.io/favicon.ico | Download and convert |

### Agents

| Agent | Current Source | New Source |
|-------|----------------|------------|
| `claude` | google favicons | Anthropic brand assets |
| `chatgpt` | google favicons | OpenAI brand assets |
| `cursor` | google favicons | Cursor brand assets |
| `windsurf` | google favicons | Codeium brand assets |
| `zed` | google favicons | Zed brand assets |
| `vscode` | google favicons | Microsoft brand assets |
| `lmstudio` | google favicons | LM Studio assets |
| `librechat` | google favicons | LibreChat GitHub |
| `raycast` | google favicons | Raycast brand assets |
| `continue` | google favicons | Continue GitHub |
| `cline` | google favicons | Cline GitHub |

---

## index.yaml Changes

### Before (current)
```yaml
- id: todoist
  icon: https://cdn.simpleicons.org/todoist
```

### After (proposed)
```yaml
- id: todoist
  icon: icons/skills/todoist.svg
```

**Note:** Passport will construct the full GitHub raw URL:
```
https://raw.githubusercontent.com/jcontini/passport-skills/main/icons/skills/todoist.svg
```

---

## Implementation Steps

1. [ ] Create `icons/skills/` and `icons/agents/` directories
2. [ ] Download/create icons for each skill (4 skills currently)
3. [ ] Download/create icons for each agent (11 agents currently)
4. [ ] Update `index.yaml` to use relative paths
5. [ ] Update Passport's skill fetching logic to construct full URLs
6. [ ] Test offline by disabling network after initial fetch

---

## Passport App Changes Required

In `passport/src-tauri/src/skills.rs` (or wherever icons are resolved):

```rust
// Current: icon URL used directly
// New: Construct full GitHub raw URL if icon is relative path

fn resolve_icon_url(icon: &str, skills_source: &str) -> String {
    if icon.starts_with("http") {
        // Already absolute URL
        icon.to_string()
    } else {
        // Relative path — construct GitHub raw URL
        format!("{}/{}", skills_source, icon)
    }
}
```

---

## Caching Strategy

Once icons are hosted here, Passport can:
1. **First launch:** Fetch icons from GitHub (requires internet)
2. **Cache locally:** Store in `~/.passport/cache/icons/`
3. **Subsequent launches:** Use cached icons (fully offline)

This is a **future enhancement** — for now, icons are fetched each time but from our controlled source.

---

## Related Plans

- **Passport UI refactor:** `passport/.plan/svelte-refactor.md`
- **This plan:** `passport-skills/.plan/icons.md`
