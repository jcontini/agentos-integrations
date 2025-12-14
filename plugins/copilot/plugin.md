---
id: copilot
name: Copilot Money
description: Query financial data from Copilot Money's local database
category: finance
icon: https://cdn.jim-nielsen.com/ios/512/copilot-track-budget-money-2025-10-31.png
color: "#00C853"
platform: macos
protocol: shell

requires:
  - sqlite3  # Pre-installed on macOS
  - jq       # For JSON parsing

actions:
  list_transactions:
    description: List recent transactions
    params:
      limit:
        type: number
        default: 30
        description: Number of transactions to return
      days:
        type: number
        description: Only transactions from last N days
    run: |
      DB="$HOME/Library/Group Containers/group.com.copilot.production/database/CopilotDB.sqlite"
      require_file "$DB"
      
      DAYS_FILTER=""
      if [ -n "$PARAM_DAYS" ]; then
        DAYS_FILTER="AND date >= date('now', '-$PARAM_DAYS days')"
      fi
      
      sqlite3 "$DB" -json "
        SELECT 
          id,
          name as merchant,
          amount,
          date(date) as date,
          account_id,
          pending,
          recurring
        FROM Transactions 
        WHERE 1=1 $DAYS_FILTER
        ORDER BY date DESC 
        LIMIT ${PARAM_LIMIT:-30};
      "

  search:
    description: Search transactions by merchant name
    params:
      query:
        type: string
        required: true
        description: Merchant name to search for
      limit:
        type: number
        default: 30
        description: Max results to return
    run: |
      DB="$HOME/Library/Group Containers/group.com.copilot.production/database/CopilotDB.sqlite"
      require_file "$DB"
      
      sqlite3 "$DB" -json "
        SELECT 
          name as merchant,
          amount,
          date(date) as date,
          account_id
        FROM Transactions 
        WHERE name LIKE '%$PARAM_QUERY%'
        ORDER BY date DESC 
        LIMIT ${PARAM_LIMIT:-30};
      "

  spending_by_month:
    description: Get monthly spending totals (excludes payments/transfers)
    params:
      months:
        type: number
        default: 3
        description: Number of months to include
    run: |
      DB="$HOME/Library/Group Containers/group.com.copilot.production/database/CopilotDB.sqlite"
      require_file "$DB"
      
      sqlite3 "$DB" -json "
        SELECT 
          strftime('%Y-%m', date) as month,
          COUNT(*) as transaction_count,
          ROUND(ABS(SUM(amount)), 2) as total_spending
        FROM Transactions 
        WHERE amount < 0 
          AND date >= date('now', '-${PARAM_MONTHS:-3} months')
          AND name NOT LIKE '%AUTOPAY%'
          AND name NOT LIKE '%AUTOMATIC PAYMENT%'
          AND name NOT LIKE '%SCHWAB%'
          AND name NOT LIKE '%FEDWIRE%'
          AND name NOT LIKE '%MONEYLINK%'
          AND name NOT LIKE '%ZELLE%'
        GROUP BY month 
        ORDER BY month DESC;
      "

  spending_by_merchant:
    description: Get spending grouped by merchant (excludes payments/transfers)
    params:
      months:
        type: number
        default: 3
        description: Number of months to include
      limit:
        type: number
        default: 25
        description: Max merchants to return (sorted by spend)
    run: |
      DB="$HOME/Library/Group Containers/group.com.copilot.production/database/CopilotDB.sqlite"
      require_file "$DB"
      
      sqlite3 "$DB" -json "
        SELECT 
          name as merchant,
          ROUND(ABS(SUM(amount)), 2) as total_spending,
          COUNT(*) as transaction_count,
          date(MIN(date)) as first_seen,
          date(MAX(date)) as last_seen
        FROM Transactions 
        WHERE amount < 0 
          AND date >= date('now', '-${PARAM_MONTHS:-3} months')
          AND name NOT LIKE '%AUTOPAY%'
          AND name NOT LIKE '%AUTOMATIC PAYMENT%'
          AND name NOT LIKE '%SCHWAB%'
          AND name NOT LIKE '%FEDWIRE%'
          AND name NOT LIKE '%MONEYLINK%'
          AND name NOT LIKE '%ZELLE%'
        GROUP BY name 
        ORDER BY total_spending DESC
        LIMIT ${PARAM_LIMIT:-25};
      "

  spending_by_category:
    description: Get spending grouped by Plaid category (excludes payments/transfers)
    params:
      months:
        type: number
        default: 3
        description: Number of months to include
    run: |
      DB="$HOME/Library/Group Containers/group.com.copilot.production/database/CopilotDB.sqlite"
      require_file "$DB"
      
      sqlite3 "$DB" -json "
        SELECT 
          COALESCE(plaid_category_strings, '[\"Uncategorized\"]') as category,
          ROUND(ABS(SUM(amount)), 2) as total_spending,
          COUNT(*) as transaction_count
        FROM Transactions 
        WHERE amount < 0 
          AND date >= date('now', '-${PARAM_MONTHS:-3} months')
          AND name NOT LIKE '%AUTOPAY%'
          AND name NOT LIKE '%AUTOMATIC PAYMENT%'
          AND name NOT LIKE '%SCHWAB%'
          AND name NOT LIKE '%FEDWIRE%'
          AND name NOT LIKE '%MONEYLINK%'
          AND name NOT LIKE '%ZELLE%'
        GROUP BY plaid_category_strings 
        ORDER BY total_spending DESC;
      " | jq '[.[] | .category = (.category | fromjson | join(" > "))]'

  balances:
    description: Get latest account balances
    run: |
      DB="$HOME/Library/Group Containers/group.com.copilot.production/database/CopilotDB.sqlite"
      ACCOUNTS_DIR="$HOME/Library/Group Containers/group.com.copilot.production/widget-data"
      require_file "$DB"
      require_dir "$ACCOUNTS_DIR"
      
      CREDIT=$(cat "$ACCOUNTS_DIR/widgets-account-credit_accounts.json")
      OTHER=$(cat "$ACCOUNTS_DIR/widgets-account-other_accounts.json")
      ALL_ACCOUNTS=$(echo "$CREDIT $OTHER" | jq -s 'add')
      
      sqlite3 "$DB" -json "
        SELECT 
          account_id, 
          date, 
          current_balance, 
          available_balance,
          \"limit\" as credit_limit
        FROM accountDailyBalance 
        WHERE date = (
          SELECT MAX(date) 
          FROM accountDailyBalance adb2 
          WHERE adb2.account_id = accountDailyBalance.account_id
        );
      " | jq --argjson accounts "$ALL_ACCOUNTS" '
        ($accounts | map({(.id): .name}) | add) as $nameMap |
        [.[] | . + {account_name: ($nameMap[.account_id] // "Unknown")}]
        | sort_by(.account_name)
      '

  net_worth:
    description: Calculate net worth with account breakdown
    run: |
      DB="$HOME/Library/Group Containers/group.com.copilot.production/database/CopilotDB.sqlite"
      ACCOUNTS_DIR="$HOME/Library/Group Containers/group.com.copilot.production/widget-data"
      require_file "$DB"
      require_dir "$ACCOUNTS_DIR"
      
      CREDIT=$(cat "$ACCOUNTS_DIR/widgets-account-credit_accounts.json")
      OTHER=$(cat "$ACCOUNTS_DIR/widgets-account-other_accounts.json")
      ALL_ACCOUNTS=$(echo "$CREDIT $OTHER" | jq -s 'add')
      
      sqlite3 "$DB" -json "
        SELECT 
          account_id, 
          date, 
          current_balance, 
          available_balance, 
          \"limit\" as credit_limit
        FROM accountDailyBalance 
        WHERE date = (
          SELECT MAX(date) 
          FROM accountDailyBalance adb2 
          WHERE adb2.account_id = accountDailyBalance.account_id
        );
      " | jq --argjson creditAccounts "$CREDIT" --argjson allAccounts "$ALL_ACCOUNTS" '
        ($allAccounts | map({(.id): .name}) | add) as $nameMap |
        ($creditAccounts | map(.id)) as $creditIds |
        [.[] | .account_id as $aid | . + {
          account_name: ($nameMap[$aid] // "Unknown"),
          account_type: (if ($creditIds | index($aid)) != null then "credit" else "asset" end)
        }]
        | map({
            account_name: .account_name,
            current_balance: (.current_balance // 0),
            account_type: .account_type
          })
        | sort_by(.account_name)
        | . as $accounts |
        {
          accounts: $accounts,
          summary: {
            assets: ($accounts | map(select(.account_type == "asset") | .current_balance) | add // 0),
            liabilities: ($accounts | map(select(.account_type == "credit") | .current_balance) | add // 0),
            net_worth: (($accounts | map(select(.account_type == "asset") | .current_balance) | add // 0) - ($accounts | map(select(.account_type == "credit") | .current_balance) | add // 0))
          }
        }
      '

  recurring:
    description: List recurring transactions
    run: |
      DB="$HOME/Library/Group Containers/group.com.copilot.production/database/CopilotDB.sqlite"
      require_file "$DB"
      
      sqlite3 "$DB" -json "
        SELECT 
          name as merchant,
          ROUND(ABS(AVG(amount)), 2) as avg_amount,
          COUNT(*) as occurrence_count,
          date(MIN(date)) as first_seen,
          date(MAX(date)) as last_seen
        FROM Transactions 
        WHERE recurring = 1
          AND amount < 0
        GROUP BY name, recurring_id
        ORDER BY avg_amount DESC;
      "
---

# Copilot Money

Query financial data from [Copilot Money's](https://copilot.money) local SQLite database. This is read-only access to your accounts, balances, and transactions.

## Requirements

- **macOS only** - Reads from local Copilot database
- **Copilot Money app** - Must be installed and synced
- **jq** - For JSON processing (`brew install jq`)

## Tools

### list_transactions
List recent transactions.

**Parameters:**
- `limit` (optional): Number of transactions, default 30
- `days` (optional): Only transactions from last N days

**Examples:**
```
use-plugin(plugin: "copilot", tool: "list_transactions")
use-plugin(plugin: "copilot", tool: "list_transactions", params: {limit: 10, days: 7})
```

### search
Search transactions by merchant name.

**Parameters:**
- `query` (required): Merchant name to search for
- `limit` (optional): Max results, default 30

**Examples:**
```
use-plugin(plugin: "copilot", tool: "search", params: {query: "COSTCO"})
use-plugin(plugin: "copilot", tool: "search", params: {query: "Amazon", limit: 50})
```

### spending_by_month
Get monthly spending totals (excludes payments and transfers).

**Parameters:**
- `months` (optional): Number of months to include, default 3

**Example:**
```
use-plugin(plugin: "copilot", tool: "spending_by_month", params: {months: 6})
```

### spending_by_merchant
Get spending grouped by merchant (excludes payments and transfers).

**Parameters:**
- `months` (optional): Number of months to include, default 3
- `limit` (optional): Max merchants to return, default 25

**Example:**
```
use-plugin(plugin: "copilot", tool: "spending_by_merchant", params: {months: 1})
```

### spending_by_category
Get spending grouped by Plaid category (excludes payments and transfers).

**Parameters:**
- `months` (optional): Number of months to include, default 3

**Example:**
```
use-plugin(plugin: "copilot", tool: "spending_by_category")
```

### balances
Get latest account balances with account names.

**Example:**
```
use-plugin(plugin: "copilot", tool: "balances")
```

### net_worth
Calculate net worth with full account breakdown. Distinguishes between assets and liabilities (credit accounts).

**Example:**
```
use-plugin(plugin: "copilot", tool: "net_worth")
```

### recurring
List all recurring transactions with average amounts.

**Example:**
```
use-plugin(plugin: "copilot", tool: "recurring")
```

## Notes

- **Read-only** - Cannot modify transactions or accounts
- **Amount signs:** Negative = spending, positive = income/refunds
- **Spending filters:** Spending reports exclude credit card payments, investment transfers, wire transfers, and Zelle payments
- **Account types:** Credit accounts (from `credit_accounts.json`) are treated as liabilities; others as assets
- **Categories:** Uses Plaid category strings (e.g., "Shops > Clothing") when available

## Database Details

- **Database:** `~/Library/Group Containers/group.com.copilot.production/database/CopilotDB.sqlite`
- **Account names:** `~/Library/Group Containers/group.com.copilot.production/widget-data/widgets-account-*.json`
- **Date format:** `YYYY-MM-DD HH:MM:SS.000`
