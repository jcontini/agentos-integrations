---
id: mimestream
name: Mimestream
description: Read emails from Mimestream macOS email client
icon: icon.png
color: "#3B82F6"
tags: [email, mail, inbox]

website: https://mimestream.com
platform: macos

# No auth block = no credentials needed (local database)

database: "~/Library/Containers/com.mimestream.Mimestream/Data/Library/Application Support/Mimestream/Mimestream.sqlite"

# Action implementations (merged from mapping.yaml)
actions:
  accounts:
    readonly: true
    sql:
      query: |
        SELECT 
          Z_PK as id,
          ZNAME as email,
          ZCOLOR as color
        FROM ZACCOUNT
        ORDER BY ZDISPLAYORDER

  mailboxes:
    readonly: true
    sql:
      query: |
        SELECT 
          m.Z_PK as id,
          m.ZNAME as name,
          m.ZROLE as role,
          m.ZUNREADMESSAGECOUNT as unread_count,
          m.ZTOTALMESSAGECOUNT as total_count,
          m.ZTAGBACKGROUNDCOLOR as color,
          a.Z_PK as account_id,
          a.ZNAME as account_email
        FROM ZMAILBOX m
        LEFT JOIN ZACCOUNT a ON m.ZACCOUNT = a.Z_PK
        WHERE m.ZROLE IS NOT NULL
          AND ('{{params.account}}' = '' OR a.ZNAME = '{{params.account}}')
        ORDER BY 
          a.ZDISPLAYORDER,
          CASE m.ZROLE 
            WHEN 'INBOX' THEN 1
            WHEN 'INBOX_PRIMARY' THEN 2
            WHEN 'DRAFT' THEN 3
            WHEN 'SENT' THEN 4
            WHEN 'IMPORTANT' THEN 5
            WHEN 'TRASH' THEN 6
            WHEN 'SPAM' THEN 7
            ELSE 10
          END

  list:
    readonly: true
    sql:
      query: |
        SELECT 
          m.Z_PK as id,
          m.ZSUBJECT as subject,
          m.ZSNIPPET as snippet,
          datetime(m.ZDATERECEIVED + 978307200, 'unixepoch') as date_received,
          datetime(m.ZDATESENT + 978307200, 'unixepoch') as date_sent,
          m.ZISUNREAD as is_unread,
          m.ZISFLAGGED as is_flagged,
          m.ZISDRAFT as is_draft,
          m.ZISSENT as is_sent,
          m.ZISTRASHED as is_trash,
          m.ZISSPAM as is_spam,
          m.ZHASATTACHMENT as has_attachments,
          t.Z_PK as thread_id,
          a.ZNAME as account_email,
          CASE 
            WHEN instr(m.ZFROMHEADER, '<') > 0 
            THEN trim(substr(m.ZFROMHEADER, 1, instr(m.ZFROMHEADER, '<') - 1), ' "')
            ELSE NULL 
          END as from_name,
          CASE 
            WHEN instr(m.ZFROMHEADER, '<') > 0 
            THEN trim(replace(substr(m.ZFROMHEADER, instr(m.ZFROMHEADER, '<') + 1), '>', ''))
            ELSE trim(m.ZFROMHEADER) 
          END as from_email
        FROM ZMESSAGE m
        LEFT JOIN ZACCOUNT a ON m.ZACCOUNT = a.Z_PK
        LEFT JOIN ZMESSAGETHREAD t ON m.ZTHREAD = t.Z_PK
        WHERE m.ZISTRASHED = 0 
          AND m.ZISSPAM = 0
          AND ('{{params.account}}' = '' OR a.ZNAME = '{{params.account}}')
          AND ('{{params.is_unread}}' = '' OR m.ZISUNREAD = {{params.is_unread | default: 0}})
          AND ('{{params.is_flagged}}' = '' OR m.ZISFLAGGED = {{params.is_flagged | default: 0}})
          AND ('{{params.mailbox}}' = '' OR (
            ('{{params.mailbox}}' = 'inbox' AND m.ZISININBOX = 1) OR
            ('{{params.mailbox}}' = 'sent' AND m.ZISSENT = 1) OR
            ('{{params.mailbox}}' = 'drafts' AND m.ZISDRAFT = 1) OR
            ('{{params.mailbox}}' = 'trash' AND m.ZISTRASHED = 1) OR
            ('{{params.mailbox}}' = 'spam' AND m.ZISSPAM = 1) OR
            ('{{params.mailbox}}' = 'flagged' AND m.ZISFLAGGED = 1)
          ))
          AND ('{{params.search}}' = '' OR m.ZSUBJECT LIKE '%{{params.search}}%' OR m.ZSNIPPET LIKE '%{{params.search}}%')
        ORDER BY m.ZDATERECEIVED DESC
        LIMIT {{params.limit | default: 50}}

  get:
    readonly: true
    sql:
      query: |
        SELECT 
          m.Z_PK as id,
          m.ZSUBJECT as subject,
          m.ZSNIPPET as snippet,
          datetime(m.ZDATERECEIVED + 978307200, 'unixepoch') as date_received,
          datetime(m.ZDATESENT + 978307200, 'unixepoch') as date_sent,
          m.ZISUNREAD as is_unread,
          m.ZISFLAGGED as is_flagged,
          m.ZISDRAFT as is_draft,
          m.ZISSENT as is_sent,
          m.ZISTRASHED as is_trash,
          m.ZISSPAM as is_spam,
          m.ZHASATTACHMENT as has_attachments,
          t.Z_PK as thread_id,
          a.ZNAME as account_email,
          CASE 
            WHEN instr(m.ZFROMHEADER, '<') > 0 
            THEN trim(substr(m.ZFROMHEADER, 1, instr(m.ZFROMHEADER, '<') - 1), ' "')
            ELSE NULL 
          END as from_name,
          CASE 
            WHEN instr(m.ZFROMHEADER, '<') > 0 
            THEN trim(replace(substr(m.ZFROMHEADER, instr(m.ZFROMHEADER, '<') + 1), '>', ''))
            ELSE trim(m.ZFROMHEADER) 
          END as from_email,
          c.ZTO as to_raw,
          c.ZCC as cc_raw,
          c.ZBCC as bcc_raw,
          c.ZBODYTEXT as body_text,
          c.ZBODYHTML as body_html,
          c.ZMESSAGEID as message_id
        FROM ZMESSAGE m
        LEFT JOIN ZACCOUNT a ON m.ZACCOUNT = a.Z_PK
        LEFT JOIN ZMESSAGETHREAD t ON m.ZTHREAD = t.Z_PK
        LEFT JOIN ZMESSAGECONTENT c ON m.ZCONTENT = c.Z_PK
        WHERE m.Z_PK = {{params.id}}

  search:
    readonly: true
    sql:
      query: |
        SELECT 
          m.Z_PK as id,
          m.ZSUBJECT as subject,
          m.ZSNIPPET as snippet,
          datetime(m.ZDATERECEIVED + 978307200, 'unixepoch') as date_received,
          m.ZISUNREAD as is_unread,
          m.ZISFLAGGED as is_flagged,
          m.ZHASATTACHMENT as has_attachments,
          t.Z_PK as thread_id,
          a.ZNAME as account_email,
          CASE 
            WHEN instr(m.ZFROMHEADER, '<') > 0 
            THEN trim(substr(m.ZFROMHEADER, 1, instr(m.ZFROMHEADER, '<') - 1), ' "')
            ELSE NULL 
          END as from_name,
          CASE 
            WHEN instr(m.ZFROMHEADER, '<') > 0 
            THEN trim(replace(substr(m.ZFROMHEADER, instr(m.ZFROMHEADER, '<') + 1), '>', ''))
            ELSE trim(m.ZFROMHEADER) 
          END as from_email
        FROM ZMESSAGE m
        LEFT JOIN ZACCOUNT a ON m.ZACCOUNT = a.Z_PK
        LEFT JOIN ZMESSAGETHREAD t ON m.ZTHREAD = t.Z_PK
        LEFT JOIN ZMESSAGECONTENT c ON m.ZCONTENT = c.Z_PK
        WHERE m.ZISTRASHED = 0 
          AND m.ZISSPAM = 0
          AND ('{{params.account}}' = '' OR a.ZNAME = '{{params.account}}')
          AND (
            m.ZSUBJECT LIKE '%{{params.query}}%' 
            OR m.ZSNIPPET LIKE '%{{params.query}}%'
            OR c.ZBODYTEXT LIKE '%{{params.query}}%'
            OR m.ZFROMHEADER LIKE '%{{params.query}}%'
          )
        ORDER BY m.ZDATERECEIVED DESC
        LIMIT {{params.limit | default: 50}}

  unread:
    readonly: true
    sql:
      query: |
        SELECT 
          m.Z_PK as id,
          m.ZSUBJECT as subject,
          m.ZSNIPPET as snippet,
          datetime(m.ZDATERECEIVED + 978307200, 'unixepoch') as date_received,
          m.ZHASATTACHMENT as has_attachments,
          t.Z_PK as thread_id,
          a.ZNAME as account_email,
          CASE 
            WHEN instr(m.ZFROMHEADER, '<') > 0 
            THEN trim(substr(m.ZFROMHEADER, 1, instr(m.ZFROMHEADER, '<') - 1), ' "')
            ELSE NULL 
          END as from_name,
          CASE 
            WHEN instr(m.ZFROMHEADER, '<') > 0 
            THEN trim(replace(substr(m.ZFROMHEADER, instr(m.ZFROMHEADER, '<') + 1), '>', ''))
            ELSE trim(m.ZFROMHEADER) 
          END as from_email
        FROM ZMESSAGE m
        LEFT JOIN ZACCOUNT a ON m.ZACCOUNT = a.Z_PK
        LEFT JOIN ZMESSAGETHREAD t ON m.ZTHREAD = t.Z_PK
        WHERE m.ZISUNREAD = 1
          AND m.ZISTRASHED = 0
          AND m.ZISSPAM = 0
          AND ('{{params.account}}' = '' OR a.ZNAME = '{{params.account}}')
        ORDER BY m.ZDATERECEIVED DESC
        LIMIT {{params.limit | default: 50}}

  list_threads:
    readonly: true
    sql:
      query: |
        SELECT 
          t.Z_PK as id,
          a.ZNAME as account_email,
          (SELECT ZSUBJECT FROM ZMESSAGE WHERE ZTHREAD = t.Z_PK ORDER BY ZDATERECEIVED DESC LIMIT 1) as subject,
          (SELECT ZSNIPPET FROM ZMESSAGE WHERE ZTHREAD = t.Z_PK ORDER BY ZDATERECEIVED DESC LIMIT 1) as snippet,
          (SELECT datetime(ZDATERECEIVED + 978307200, 'unixepoch') FROM ZMESSAGE WHERE ZTHREAD = t.Z_PK ORDER BY ZDATERECEIVED DESC LIMIT 1) as date_updated,
          (SELECT COUNT(*) FROM ZMESSAGE WHERE ZTHREAD = t.Z_PK) as message_count,
          (SELECT MAX(ZISUNREAD) FROM ZMESSAGE WHERE ZTHREAD = t.Z_PK) as has_unread,
          t.ZHASATTACHMENT as has_attachments
        FROM ZMESSAGETHREAD t
        LEFT JOIN ZACCOUNT a ON t.ZACCOUNT = a.Z_PK
        WHERE ('{{params.account}}' = '' OR a.ZNAME = '{{params.account}}')
        ORDER BY date_updated DESC
        LIMIT {{params.limit | default: 50}}

  get_thread:
    readonly: true
    sql:
      query: |
        SELECT 
          m.Z_PK as id,
          m.ZSUBJECT as subject,
          m.ZSNIPPET as snippet,
          datetime(m.ZDATERECEIVED + 978307200, 'unixepoch') as date_received,
          datetime(m.ZDATESENT + 978307200, 'unixepoch') as date_sent,
          m.ZISUNREAD as is_unread,
          m.ZISFLAGGED as is_flagged,
          m.ZHASATTACHMENT as has_attachments,
          t.Z_PK as thread_id,
          a.ZNAME as account_email,
          CASE 
            WHEN instr(m.ZFROMHEADER, '<') > 0 
            THEN trim(substr(m.ZFROMHEADER, 1, instr(m.ZFROMHEADER, '<') - 1), ' "')
            ELSE NULL 
          END as from_name,
          CASE 
            WHEN instr(m.ZFROMHEADER, '<') > 0 
            THEN trim(replace(substr(m.ZFROMHEADER, instr(m.ZFROMHEADER, '<') + 1), '>', ''))
            ELSE trim(m.ZFROMHEADER) 
          END as from_email,
          c.ZBODYTEXT as body_text
        FROM ZMESSAGE m
        LEFT JOIN ZACCOUNT a ON m.ZACCOUNT = a.Z_PK
        LEFT JOIN ZMESSAGETHREAD t ON m.ZTHREAD = t.Z_PK
        LEFT JOIN ZMESSAGECONTENT c ON m.ZCONTENT = c.Z_PK
        WHERE t.Z_PK = {{params.id}}
        ORDER BY m.ZDATERECEIVED ASC
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
