---
id: email
name: Email
description: Read and search email from local email clients
icon: icon.svg
color: "#EF4444"

schema:
  email:
    id:
      type: string
      required: true
      description: Unique identifier from the source
    thread_id:
      type: string
      description: Thread/conversation this email belongs to
    account_id:
      type: string
      required: true
      description: Email account identifier
    
    # Core fields
    subject:
      type: string
      description: Email subject line
    snippet:
      type: string
      description: Preview text (first ~100 chars)
    from:
      type: object
      properties:
        name: { type: string }
        email: { type: string, required: true }
      description: Sender
    to:
      type: array
      items:
        type: object
        properties:
          name: { type: string }
          email: { type: string }
      description: To recipients
    cc:
      type: array
      items:
        type: object
        properties:
          name: { type: string }
          email: { type: string }
      description: CC recipients
    bcc:
      type: array
      items:
        type: object
        properties:
          name: { type: string }
          email: { type: string }
      description: BCC recipients
    
    # Body (lazy-loaded via get action)
    body_text:
      type: string
      description: Plain text body
    body_html:
      type: string
      description: HTML body
    
    # Timestamps
    date_sent:
      type: datetime
      description: When the email was sent
    date_received:
      type: datetime
      description: When the email was received
    
    # Flags
    is_unread:
      type: boolean
      description: Unread status
    is_flagged:
      type: boolean
      description: Starred/flagged
    is_draft:
      type: boolean
      description: Draft email
    is_sent:
      type: boolean
      description: In sent folder
    is_trash:
      type: boolean
      description: In trash
    is_spam:
      type: boolean
      description: Marked as spam
    
    # Attachments
    has_attachments:
      type: boolean
      description: Has file attachments
    attachments:
      type: array
      items:
        type: object
        properties:
          id: { type: string }
          filename: { type: string }
          mime_type: { type: string }
          size: { type: integer }
      description: File attachments
    
    # Folders/Labels
    mailboxes:
      type: array
      items: { type: string }
      description: Mailbox names this email is in
    
    # External references
    refs:
      type: object
      properties:
        message_id: { type: string, description: "RFC Message-ID header" }

  thread:
    id:
      type: string
      required: true
    account_id:
      type: string
      required: true
    subject:
      type: string
      description: Subject of first/latest message
    snippet:
      type: string
      description: Preview of latest message
    message_count:
      type: integer
      description: Number of messages in thread
    has_attachments:
      type: boolean
    date_updated:
      type: datetime
      description: Date of most recent message
    is_unread:
      type: boolean
      description: Has unread messages

  mailbox:
    id:
      type: string
      required: true
    account_id:
      type: string
      required: true
    name:
      type: string
      required: true
      description: Display name
    role:
      type: enum
      values: [inbox, drafts, sent, trash, spam, important, starred, archive, custom]
      description: Special mailbox role
    unread_count:
      type: integer
    total_count:
      type: integer
    color:
      type: string
      description: Display color (hex)

  account:
    id:
      type: string
      required: true
    email:
      type: string
      required: true
      description: Email address
    name:
      type: string
      description: Display name
    color:
      type: string
      description: Account color

actions:
  list:
    description: List emails with optional filters
    readonly: true
    params:
      account:
        type: string
        description: Filter by account email address
      mailbox:
        type: string
        description: Filter by mailbox (inbox, sent, drafts, trash, spam)
      is_unread:
        type: boolean
        description: Filter by unread status
      is_flagged:
        type: boolean
        description: Filter by flagged status
      search:
        type: string
        description: Search in subject and snippet
      limit:
        type: number
        default: 50
    returns: email[]

  get:
    description: Get full email including body content
    readonly: true
    params:
      id:
        type: string
        required: true
        description: Email ID
    returns: email

  search:
    description: Full-text search across emails
    readonly: true
    params:
      query:
        type: string
        required: true
        description: Search query
      account:
        type: string
        description: Limit to specific account
      limit:
        type: number
        default: 50
    returns: email[]

  unread:
    description: Get unread emails
    readonly: true
    params:
      account:
        type: string
        description: Filter by account
      limit:
        type: number
        default: 50
    returns: email[]

  list_threads:
    description: List email threads/conversations
    readonly: true
    params:
      account:
        type: string
      mailbox:
        type: string
      limit:
        type: number
        default: 50
    returns: thread[]

  get_thread:
    description: Get a thread with all its messages
    readonly: true
    params:
      id:
        type: string
        required: true
    returns:
      thread: thread
      emails: email[]

  mailboxes:
    description: List mailboxes/folders
    readonly: true
    params:
      account:
        type: string
        description: Filter by account
    returns: mailbox[]

  accounts:
    description: List email accounts
    readonly: true
    returns: account[]

instructions: |
  When working with email:
  - All email connectors are read-only (no sending/composing)
  - Use `list` for browsing, `get` for full email content
  - The `list` action returns metadata only (no body) for performance
  - Use `unread` as a shortcut for unread emails
  - Mailbox roles: inbox, drafts, sent, trash, spam, important, starred
  - Timestamps are ISO 8601 format
---

# Email

Read and search email from local email clients.

## Schema

The `email` entity represents an email message with normalized fields across different email clients.

### Email Flags

| Flag | Description |
|------|-------------|
| `is_unread` | Not yet read |
| `is_flagged` | Starred/important |
| `is_draft` | Draft in progress |
| `is_sent` | In sent folder |
| `is_trash` | Deleted |
| `is_spam` | Spam/junk |

### Mailbox Roles

| Role | Description |
|------|-------------|
| `inbox` | Main inbox |
| `drafts` | Draft emails |
| `sent` | Sent emails |
| `trash` | Deleted emails |
| `spam` | Spam/junk |
| `important` | Important/priority |
| `starred` | Flagged emails |
| `archive` | Archived |
| `custom` | User-created folder |

## Actions

### list

List emails with filters.

```
Email(action: "list", connector: "mimestream")
Email(action: "list", connector: "mimestream", params: { mailbox: "inbox", is_unread: true })
Email(action: "list", connector: "mimestream", params: { account: "joe@example.com", limit: 20 })
```

### get

Get full email with body content.

```
Email(action: "get", connector: "mimestream", params: { id: "123" })
```

### search

Search emails by content.

```
Email(action: "search", connector: "mimestream", params: { query: "invoice" })
Email(action: "search", connector: "mimestream", params: { query: "meeting", account: "work@example.com" })
```

### unread

Get unread emails.

```
Email(action: "unread", connector: "mimestream")
Email(action: "unread", connector: "mimestream", params: { account: "joe@example.com" })
```

### mailboxes

List available mailboxes/folders.

```
Email(action: "mailboxes", connector: "mimestream")
```

### accounts

List email accounts.

```
Email(action: "accounts", connector: "mimestream")
```

## Connectors

| Connector | Client | Features |
|-----------|--------|----------|
| `mimestream` | Mimestream (macOS) | Read emails, threads, search |

## Tips

- Mimestream stores emails locally in SQLite - no API auth needed
- Use `list` for browsing (fast, metadata only)
- Use `get` when you need the full email body
- Thread view groups related emails together
- Multiple accounts are supported
