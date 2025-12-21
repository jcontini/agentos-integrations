---
id: sql
name: SQL
description: Query SQL databases (Postgres, MySQL, SQLite), returns JSON
category: code
icon: https://cdn.simpleicons.org/postgresql
color: "#4169E1"

topics: [database, sql, postgres, mysql, sqlite]

auth:
  type: connection_string
  description: "Database connection string for your SQL database"
  examples:
    - "postgresql://user:password@localhost:5432/database"
    - "mysql://user:password@localhost:3306/database"
    - "/path/to/local/database.sqlite"

actions:
  query:
    description: Execute SQL query and return results as JSON
    params:
      sql:
        type: string
        required: true
        description: SQL query to execute
      account:
        type: string
        description: Account label (required if multiple accounts configured)
    sql:
      query: $PARAM_SQL
      format: json

  tables:
    readonly: true
    description: List all tables in the database
    params:
      account:
        type: string
        description: Account label (required if multiple accounts configured)
    sql:
      query: |
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name
      format: json

  describe:
    readonly: true
    description: Get table structure (columns, types, constraints)
    params:
      table:
        type: string
        required: true
        description: Table name to describe
      account:
        type: string
        description: Account label (required if multiple accounts configured)
    sql:
      query: |
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = '$PARAM_TABLE'
        ORDER BY ordinal_position
      params: ["$PARAM_TABLE"]
      format: json
---

# SQL

Query SQL databases directly. Supports **Postgres**, **MySQL**, and **SQLite**.

## Setup

Add database connections in Settings → SQL → Add Account:

- **Label**: Name like "Prod" or "Staging"  
- **Connection String**: Full database connection string

### Connection String Formats

```
# Postgres
postgresql://user:password@host:5432/database

# MySQL (coming soon)
mysql://user:password@host:3306/database

# SQLite (coming soon)
/path/to/database.sqlite
```

## Tools

### query

Execute any SQL query and get JSON results.

```
query(sql: "SELECT * FROM users LIMIT 5", account: "Staging")
```

### tables

List all tables in the database.

```
tables(account: "Staging")
```

### describe

Get table structure (columns, types).

```
describe(table: "users", account: "Staging")
```

## SSH Tunnels

For databases behind a firewall/bastion:

1. **Create tunnel credential** in Settings → Terminal → Add Tunnel:
   - Name: `prod-db`
   - Connection: `joe@bastion.example.com -L 5432:postgres.internal:5432`

2. **Create SQL credential** pointing to localhost:
   - Name: `Prod`
   - Value: `postgresql://user:pass@localhost:5432/mydb`

3. **Start tunnel before querying:**
   ```
   Terminal(action: "tunnel_start", name: "prod-db")
   query(sql: "SELECT 1", account: "Prod")
   ```

## Notes

- Results are always JSON arrays
- Use `account` param when you have multiple connections
- Empty results return `[]`
- All queries are logged to Activity
