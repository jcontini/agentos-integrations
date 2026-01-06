---
id: contacts
name: Contacts
description: Unified contact management across all your address books
icon: icon.svg
color: "#5856D6"

schema:
  contact:
    id:
      type: string
      required: true
      description: Unique identifier from the source system
    first_name:
      type: string
      description: First/given name
    last_name:
      type: string
      description: Last/family name
    middle_name:
      type: string
      description: Middle name
    nickname:
      type: string
      description: Nickname or preferred name
    display_name:
      type: string
      description: Computed display name (first + last, or organization)
    organization:
      type: string
      description: Company or organization
    job_title:
      type: string
      description: Job title or role
    department:
      type: string
      description: Department within organization
    phones:
      type: array
      items:
        type: object
        properties:
          label: { type: string, description: "mobile, home, work, etc." }
          value: { type: string, description: "Phone number (E.164 format preferred)" }
      description: Phone numbers with labels
    emails:
      type: array
      items:
        type: object
        properties:
          label: { type: string, description: "home, work, etc." }
          value: { type: string }
      description: Email addresses with labels
    urls:
      type: array
      items:
        type: object
        properties:
          label: { type: string, description: "homepage, LinkedIn, GitHub, etc." }
          value: { type: string }
      description: URLs with labels (social profiles, websites)
    addresses:
      type: array
      items:
        type: object
        properties:
          label: { type: string }
          street: { type: string }
          city: { type: string }
          state: { type: string }
          postal_code: { type: string }
          country: { type: string }
      description: Postal addresses
    notes:
      type: string
      description: Notes or biography
    photo_url:
      type: string
      description: URL to contact photo
    birthday:
      type: string
      description: Birthday (YYYY-MM-DD or MM-DD)
    url:
      type: string
      description: Deep link to contact in source system
    created_at:
      type: datetime
    updated_at:
      type: datetime

actions:
  list:
    description: List contacts with optional filters
    readonly: true
    params:
      query:
        type: string
        description: Search by name, email, phone, or organization
      organization:
        type: string
        description: Filter by organization/company
      limit:
        type: number
        default: 50
    returns: contact[]

  get:
    description: Get a single contact by ID with full details
    readonly: true
    params:
      id:
        type: string
        required: true
        description: Contact ID
    returns: contact

  search:
    description: Search contacts by text
    readonly: true
    params:
      query:
        type: string
        required: true
        description: Search text (matches name, email, phone, organization)
      limit:
        type: number
        default: 50
    returns: contact[]

  create:
    description: Create a new contact with any schema fields
    params:
      # Scalar fields
      first_name:
        type: string
        description: First name
      last_name:
        type: string
        description: Last name
      middle_name:
        type: string
        description: Middle name
      nickname:
        type: string
        description: Nickname
      organization:
        type: string
        description: Organization/company
      job_title:
        type: string
        description: Job title
      department:
        type: string
        description: Department
      birthday:
        type: string
        description: Birthday (YYYY-MM-DD)
      notes:
        type: string
        description: Notes
      # Array fields - can pass multiple items on create
      phones:
        type: array
        description: "Phone numbers [{label, value}]"
      emails:
        type: array
        description: "Email addresses [{label, value}]"
      urls:
        type: array
        description: "URLs [{label, value}]"
      addresses:
        type: array
        description: "Addresses [{label, street, city, state, postal_code, country}]"
    returns: contact

  update:
    description: Update scalar fields on a contact
    params:
      id:
        type: string
        required: true
        description: Contact ID
      # All scalar fields from schema
      first_name:
        type: string
        description: First name
      last_name:
        type: string
        description: Last name
      middle_name:
        type: string
        description: Middle name
      nickname:
        type: string
        description: Nickname
      organization:
        type: string
        description: Organization/company
      job_title:
        type: string
        description: Job title
      department:
        type: string
        description: Department
      birthday:
        type: string
        description: Birthday (YYYY-MM-DD)
      notes:
        type: string
        description: Notes
    returns: contact

  add:
    description: Add items to array fields (emails, phones, urls, addresses)
    params:
      id:
        type: string
        required: true
        description: Contact ID
      # Array fields - pass single item or array
      emails:
        type: object
        description: "Email to add {label?, value}"
      phones:
        type: object
        description: "Phone to add {label?, value}"
      urls:
        type: object
        description: "URL to add {label?, value}"
      addresses:
        type: object
        description: "Address to add {label?, street?, city?, state?, postal_code?, country?}"
    returns: contact

  remove:
    description: Remove items from array fields by matching value
    params:
      id:
        type: string
        required: true
        description: Contact ID
      # Match by value field
      emails:
        type: object
        description: "Email to remove {value} - matches by email address"
      phones:
        type: object
        description: "Phone to remove {value} - matches by phone number"
      urls:
        type: object
        description: "URL to remove {value} - matches by URL"
      addresses:
        type: object
        description: "Address to remove {label} - matches by label"
    returns: contact

  delete:
    description: Delete a contact
    params:
      id:
        type: string
        required: true
        description: Contact ID
    returns: void

instructions: |
  When working with contacts:
  - Use connector: "apple-contacts" for macOS Contacts (iCloud synced)
  - Use `update` for scalar fields (name, organization, job_title, etc.)
  - Use `add` to append emails, phones, urls, or addresses
  - Use `remove` to delete emails, phones, urls, or addresses by value
  - Phone numbers are normalized to E.164 format (+1XXXXXXXXXX for US)
  - URL labels auto-detected: github.com → "GitHub", linkedin.com → "LinkedIn"
---

# Contacts

Unified contact management across Apple Contacts, Google Contacts, and other address books.

## Schema

The `contact` entity represents a person or organization with:
- **Scalar fields**: first_name, last_name, organization, job_title, notes, etc.
- **Array fields**: emails, phones, urls, addresses (each with label + value)

## Actions

### list / get / search

Query contacts.

```python
contacts.list()                              # All contacts
contacts.list(query: "John")                 # Search by name
contacts.list(organization: "Stripe")        # Filter by company
contacts.get(id: "ABC123:ABPerson")          # Full details
contacts.search(query: "john@example.com")   # Search any field
```

### create

Create with any schema fields. Arrays can have multiple items.

```python
# Simple
contacts.create(first_name: "John", last_name: "Doe")

# With arrays
contacts.create(
  first_name: "John",
  last_name: "Doe",
  organization: "Acme Inc",
  emails: [
    {label: "work", value: "john@acme.com"},
    {label: "home", value: "john@gmail.com"}
  ],
  phones: [{label: "mobile", value: "+15125551234"}]
)
```

### update

Update scalar fields only. Use `add`/`remove` for arrays.

```python
contacts.update(id: "ABC123", job_title: "Senior Engineer")
contacts.update(id: "ABC123", organization: "New Corp", notes: "Promoted 2024")
```

### add

Append to array fields (emails, phones, urls, addresses).

```python
contacts.add(id: "ABC123", emails: {label: "work", value: "john@work.com"})
contacts.add(id: "ABC123", phones: {label: "home", value: "+15125559999"})
contacts.add(id: "ABC123", urls: {label: "LinkedIn", value: "https://linkedin.com/in/john"})
contacts.add(id: "ABC123", addresses: {
  label: "home",
  street: "123 Main St",
  city: "Austin",
  state: "TX",
  postal_code: "78701"
})
```

### remove

Remove from array fields by matching value.

```python
contacts.remove(id: "ABC123", emails: {value: "old@email.com"})
contacts.remove(id: "ABC123", phones: {value: "+15125551234"})
contacts.remove(id: "ABC123", addresses: {label: "old home"})  # addresses match by label
```

### delete

Delete a contact.

```python
contacts.delete(id: "ABC123")
```

## Connectors

| Connector | Features | Notes |
|-----------|----------|-------|
| `apple-contacts` | Full CRUD, photos, multiple values | macOS only, AppleScript writes |

## Future Connectors

- Google Contacts (OAuth)
- CardDAV (generic)

## Tips

- macOS Contacts permission required: System Settings → Privacy & Security → Contacts
- iCloud contacts sync automatically
- Contact IDs can change after iCloud sync - always query by name after create
- US phone numbers auto-normalized: 5125551234 → +15125551234
- URL labels auto-detected: github.com → "GitHub", linkedin.com → "LinkedIn"
