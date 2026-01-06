---
id: books
name: Books
description: Track your reading library - pull from Goodreads, push to Hardcover
icon: icon.svg
color: "#8B4513"

schema:
  book:
    id:
      type: string
      required: true
      description: Unique identifier
    goodreads_id:
      type: string
      unique: true
      description: Goodreads Book ID (for deduplication)
    hardcover_id:
      type: string
      unique: true
      description: Hardcover Book ID (for deduplication)
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

  pull:
    description: Pull books from an external service into local library
    params:
      connector:
        type: string
        required: true
        description: Service to pull from (goodreads, hardcover)
      path:
        type: string
        description: Path to file (for connectors like goodreads that use CSV)
      on_conflict:
        type: string
        default: merge
        description: How to handle conflicts (merge, replace, skip)
      dry_run:
        type: boolean
        default: false
        description: Preview without pulling
    returns:
      type: object
      properties:
        pulled: { type: number }
        skipped: { type: number }
        errors: { type: array }

  push:
    description: Push books from local library to an external service
    params:
      connector:
        type: string
        required: true
        description: Service to push to (hardcover)
      on_conflict:
        type: string
        default: skip
        description: How to handle conflicts (merge, replace, skip)
      dry_run:
        type: boolean
        default: false
        description: Preview without pushing
    returns:
      type: object
      properties:
        pushed: { type: number }
        skipped: { type: number }
        errors: { type: array }

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
  The Books app connects to book tracking services like Goodreads and Hardcover.
  
  **Getting started:**
  1. Pull your Goodreads library: `Books(action: "pull", connector: "goodreads", path: "~/Downloads/goodreads_library_export.csv")`
  2. Pull from Hardcover: `Books(action: "pull", connector: "hardcover")`
  3. Push to Hardcover: `Books(action: "push", connector: "hardcover")`
  
  **Connectors:**
  - `goodreads` - Pull from CSV export
  - `hardcover` - Pull and push via API
---

# Books

Track your reading library - pull from Goodreads, push to Hardcover, search Google Books and OpenLibrary.

## Quick Start

### Pull from Goodreads

1. Export your Goodreads library: goodreads.com → My Books → Import/Export → Export Library
2. Pull the CSV into your library:

```
Books(action: "pull", connector: "goodreads", path: "~/Downloads/goodreads_library_export.csv")
```

### Pull from Hardcover

```
Books(action: "pull", connector: "hardcover")   # Pull your library
```

### Push to Hardcover

```
Books(action: "push", connector: "hardcover", dry_run: true)   # Preview
Books(action: "push", connector: "hardcover")                   # Push
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

| Connector | Pull | Push | Notes |
|-----------|------|------|-------|
| `goodreads` | ✅ CSV | ❌ | Import from CSV export |
| `hardcover` | ✅ | ✅ | Full API support |
