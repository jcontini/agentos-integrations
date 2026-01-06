---
id: mimestream
name: Mimestream
description: Read emails from Mimestream macOS email client
icon: icon.svg
color: "#3B82F6"

website: https://mimestream.com
platform: macos

# No auth block = no credentials needed (local database)

database: "~/Library/Containers/com.mimestream.Mimestream/Data/Library/Application Support/Mimestream/Mimestream.sqlite"
---

# Mimestream Connector

Read emails from [Mimestream](https://mimestream.com/), a native macOS email client for Gmail.

## Requirements

- Mimestream installed on macOS
- Read access to Mimestream's application container

## Database Location

Mimestream stores emails in a Core Data SQLite database at:

```
~/Library/Containers/com.mimestream.Mimestream/Data/Library/Application Support/Mimestream/Mimestream.sqlite
```

## Supported Features

| Feature | Supported |
|---------|-----------|
| List emails | ✅ |
| Get email details | ✅ |
| Search emails | ✅ |
| List threads | ✅ |
| List mailboxes | ✅ |
| List accounts | ✅ |
| Send email | ❌ (read-only) |
| Compose draft | ❌ (read-only) |

## Notes

- This connector is read-only - it cannot send emails or modify mailbox state
- Mimestream syncs with Gmail, so data reflects what's synced locally
- Core Data timestamps use Apple's reference date (2001-01-01), converted automatically
