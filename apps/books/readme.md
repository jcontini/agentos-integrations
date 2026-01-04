---
id: books
name: Books
description: Track your reading library - import from Goodreads, sync to Hardcover
icon: icon.svg
color: "#8B4513"

schema:
  book:
    id:
      type: string
      required: true
      description: Unique identifier
    isbn:
      type: string
      description: ISBN-10
    isbn13:
      type: string
      description: ISBN-13
    title:
      type: string
      required: true
    authors:
      type: array
      items: { type: string }
      description: List of author names
    publisher:
      type: string
    published_year:
      type: number
    page_count:
      type: number
    description:
      type: string
    cover_url:
      type: string
    genres:
      type: array
      items: { type: string }
    status:
      type: enum
      values: [want_to_read, reading, read, dnf, none]
      description: Reading status
    rating:
      type: number
      min: 1
      max: 5
      description: Personal rating (1-5 stars)
    review:
      type: string
      description: Personal review text
    notes:
      type: string
      description: Private notes
    date_added:
      type: string
      description: When added to library
    date_started:
      type: string
      description: When started reading
    date_finished:
      type: string
      description: When finished reading
    tags:
      type: array
      items: { type: string }
      description: User organization tags (shelves, categories)
    refs:
      type: object
      description: IDs in external systems (goodreads, hardcover, isbn, etc.)
    metadata:
      type: object
      description: Connector-specific extras
    created_at:
      type: datetime
      description: When record was created
    updated_at:
      type: datetime
      description: When record was last updated

actions:
  list:
    description: List books from library with optional filters
    readonly: true
    params:
      status:
        type: string
        description: Filter by status (want_to_read, reading, read, dnf)
      shelf:
        type: string
        description: Filter by shelf name
      rating:
        type: number
        description: Filter by minimum rating
      search:
        type: string
        description: Search title or author
      limit:
        type: number
        default: 50
    returns: book[]

  get:
    description: Get a single book by ID or ISBN
    readonly: true
    params:
      id:
        type: string
        description: Book ID
      isbn:
        type: string
        description: ISBN-10 or ISBN-13
    returns: book

  search:
    description: Search for books (metadata lookup from APIs)
    readonly: true
    params:
      query:
        type: string
        required: true
        description: Search query (title, author, or ISBN)
      connector:
        type: string
        description: Which API to search (google_books, openlibrary)
      limit:
        type: number
        default: 10
    returns: book[]

  create:
    description: Add a book to library
    params:
      title:
        type: string
        required: true
      authors:
        type: array
        description: List of author names
      isbn:
        type: string
      status:
        type: string
        default: none
      rating:
        type: number
    returns: book

  update:
    description: Update a book's status, rating, review, etc.
    params:
      id:
        type: string
        required: true
      status:
        type: string
      rating:
        type: number
      review:
        type: string
      notes:
        type: string
      date_started:
        type: string
      date_finished:
        type: string
    returns: book

  delete:
    description: Remove a book from library
    params:
      id:
        type: string
        required: true
    returns: void

  import:
    description: Import books from a file (CSV, JSON)
    params:
      path:
        type: string
        required: true
        description: Path to import file
      connector:
        type: string
        required: true
        description: Source format (goodreads, storygraph)
      dry_run:
        type: boolean
        default: false
        description: Preview without importing
    returns:
      type: object
      properties:
        imported: { type: number }
        skipped: { type: number }
        errors: { type: array }

  export:
    description: Export library to file
    readonly: true
    params:
      path:
        type: string
        required: true
        description: Output file path
      format:
        type: string
        default: json
        description: Export format (json, csv)
      status:
        type: string
        description: Only export books with this status
    returns:
      type: object
      properties:
        exported: { type: number }
        path: { type: string }

  sync:
    description: Sync books to/from an external service
    params:
      connector:
        type: string
        required: true
        description: Service to sync with (hardcover)
      direction:
        type: string
        default: push
        description: push (to service), pull (from service), or both
      dry_run:
        type: boolean
        default: false
    returns:
      type: object
      properties:
        pushed: { type: number }
        pulled: { type: number }
        conflicts: { type: number }

  diff:
    description: Preview what would change in a sync
    readonly: true
    params:
      connector:
        type: string
        required: true
    returns:
      type: object
      properties:
        to_push: { type: number }
        to_pull: { type: number }
        conflicts: { type: array }

  shelves:
    description: List all shelves
    readonly: true
    returns:
      type: array
      items:
        id: { type: string }
        name: { type: string }
        book_count: { type: number }

  add_to_shelf:
    description: Add a book to a shelf
    params:
      book_id:
        type: string
        required: true
      shelf:
        type: string
        required: true
        description: Shelf name (creates if doesn't exist)
    returns: void

  remove_from_shelf:
    description: Remove a book from a shelf
    params:
      book_id:
        type: string
        required: true
      shelf:
        type: string
        required: true
    returns: void

instructions: |
  The Books app manages your reading library with import/export capabilities.
  
  **Getting started:**
  1. Import your Goodreads library: `Books(action: "import", connector: "goodreads", path: "~/Downloads/goodreads_library_export.csv")`
  2. View your library: `Books(action: "list")`
  3. Update a book: `Books(action: "update", id: "...", rating: 5, status: "read")`
  
  **Connectors:**
  - `goodreads` - Import only (CSV export, no API)
  - `hardcover` - Full sync (API)
  - `google_books` - Search/metadata only
  - `openlibrary` - Search/metadata only
---

# Books

Track your reading library - import from Goodreads, sync to Hardcover, search Google Books and OpenLibrary.

## Quick Start

### Import from Goodreads

1. Export your Goodreads library: goodreads.com → My Books → Import/Export → Export Library
2. Import the CSV:

```
Books(action: "import", connector: "goodreads", path: "~/Downloads/goodreads_library_export.csv")
```

### Browse Your Library

```
Books(action: "list")                           # All books
Books(action: "list", status: "read")           # Books you've read
Books(action: "list", status: "reading")        # Currently reading
Books(action: "list", rating: 4)                # 4+ star books
Books(action: "list", search: "Sanderson")      # Search by title/author
```

### Update Books

```
Books(action: "update", id: "abc123", rating: 5, review: "Loved it!")
Books(action: "update", id: "abc123", status: "read", date_finished: "2024-01-15")
```

### Search for New Books

```
Books(action: "search", query: "Project Hail Mary")
Books(action: "search", query: "isbn:9780593135204")
```

### Sync to Hardcover

```
Books(action: "diff", connector: "hardcover")   # Preview changes
Books(action: "sync", connector: "hardcover")   # Push to Hardcover
```

## Schema

### Status Values

| Status | Description |
|--------|-------------|
| `want_to_read` | On your to-read list |
| `reading` | Currently reading |
| `read` | Finished |
| `dnf` | Did not finish |
| `none` | In library but no status |

### Rating

1-5 stars, where 5 is best.

## Connectors

| Connector | Import | Export | Sync | Notes |
|-----------|--------|--------|------|-------|
| `goodreads` | ✅ CSV | ❌ | ❌ | No API since ~2020 |
| `hardcover` | ✅ | ✅ | ✅ | Full API support |
| `google_books` | ❌ | ❌ | ❌ | Metadata search only |
| `openlibrary` | ❌ | ❌ | ❌ | Metadata search only |

## Data Storage

Books are stored locally in `~/.agentos/data/books.db` (SQLite).

Your reading data stays on your machine - only pushed to external services when you explicitly sync.
