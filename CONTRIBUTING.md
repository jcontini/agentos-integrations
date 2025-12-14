# Contributing Plugins

Plugins are best created with AI assistance through AgentOS.

## Quick Start

1. Fork this repo
2. Set your fork as the plugins source in AgentOS → Settings → Developer
3. Enable the **Plugin Development** skill in AgentOS → Plugins
4. Ask your AI to create/modify a plugin — it has full context on the schema and best practices
5. Test locally (changes hot-reload)
6. Submit a PR

## Manual Reference

If working without AgentOS, examine existing plugins in `plugins/` for patterns:

- `plugins/exa/` — Shell plugin with API calls
- `plugins/youtube/` — Shell plugin with CLI tool
- `plugins/browser/` — Complex plugin with scripts/ folder

The Plugin Development skill contains the complete schema documentation.

## Questions?

Open an issue or discussion!
