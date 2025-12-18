---
id: plugin-dev
name: Plugin Development
description: Audit plugins against AgentOS standards
icon: material-symbols:build
color: "#10B981"

tags: [development, plugins, audit]

requires:
  - yq

actions:
  audit:
    readonly: true
    description: Audit a plugin for issues
    params:
      path:
        type: string
        required: true
        description: Path to plugin.md file
    run: |
      require_file "$PARAM_PATH"
      
      echo "# Plugin Audit: $PARAM_PATH"
      echo ""
      
      # Extract frontmatter to temp file for yq
      TMPYAML=$(mktemp)
      trap "rm -f $TMPYAML" EXIT
      sed -n '/^---$/,/^---$/p' "$PARAM_PATH" | sed '1d;$d' > "$TMPYAML"
      
      # Check required fields
      echo "## Required Fields"
      for field in id name description; do
        VAL=$(yq ".$field" "$TMPYAML" | grep -v '^null$')
        if [ -n "$VAL" ]; then
          echo "✅ $field: $VAL"
        else
          echo "❌ $field: MISSING"
        fi
      done
      
      # Check tags (optional but recommended)
      TAGS=$(yq '.tags' "$TMPYAML" | grep -v '^null$')
      if [ -n "$TAGS" ] && [ "$TAGS" != "[]" ]; then
        echo "✅ tags: $TAGS"
      else
        echo "⚠️  tags: not defined (recommended)"
      fi
      
      # Check for deprecated category field
      CATEGORY=$(yq '.category' "$TMPYAML" | grep -v '^null$')
      if [ -n "$CATEGORY" ]; then
        echo "❌ category: DEPRECATED - use 'tags' instead"
      fi
      
      # Check for deprecated topics field
      TOPICS=$(yq '.topics' "$TMPYAML" | grep -v '^null$')
      if [ -n "$TOPICS" ]; then
        echo "❌ topics: DEPRECATED - use 'tags' instead"
      fi
      echo ""
      
      # Check icon format
      echo "## Icon"
      ICON=$(yq '.icon' "$TMPYAML" | grep -v '^null$')
      if [ -n "$ICON" ]; then
        if echo "$ICON" | grep -q ":"; then
          echo "✅ Iconify format: $ICON"
        elif echo "$ICON" | grep -q "^http"; then
          echo "✅ URL format: $ICON"
        else
          echo "⚠️  Unknown icon format: $ICON"
        fi
      else
        echo "⚠️  No icon defined"
      fi
      echo ""
      
      # Check for forbidden patterns
      echo "## Error Handling"
      FOUND_ISSUES=0
      if grep -q '2>/dev/null' "$PARAM_PATH"; then
        echo "❌ Found '2>/dev/null' - hides errors"
        FOUND_ISSUES=1
      fi
      if grep -q '2>&-' "$PARAM_PATH"; then
        echo "❌ Found '2>&-' - closes stderr"
        FOUND_ISSUES=1
      fi
      if grep -q '&>/dev/null' "$PARAM_PATH"; then
        echo "❌ Found '&>/dev/null' - hides all output"
        FOUND_ISSUES=1
      fi
      if [ $FOUND_ISSUES -eq 0 ]; then
        echo "✅ No forbidden error suppression"
      fi
      echo ""
      
      # Check actions
      echo "## Actions"
      yq '.actions | keys | .[]' "$TMPYAML" | while read -r action; do
        DESC=$(yq ".actions.$action.description" "$TMPYAML" | grep -v '^null$')
        READONLY=$(yq ".actions.$action.readonly" "$TMPYAML")
        
        # Check action name
        if echo "$action" | grep -q "^list_"; then
          echo "❌ $action: use 'get_*' instead of 'list_*'"
        elif [ ${#action} -gt 15 ]; then
          echo "⚠️  $action: name too long (${#action} chars)"
        else
          echo -n "✅ $action"
        fi
        
        # Check description
        if [ -n "$DESC" ]; then
          DESC_LEN=${#DESC}
          if [ $DESC_LEN -gt 50 ]; then
            echo " - description too long ($DESC_LEN chars)"
          else
            echo ""
          fi
        else
          echo " - missing description"
        fi
      done
      echo ""
      
      # Check for readonly actions
      echo "## AI-First Design"
      READONLY_COUNT=$(yq '[.actions[] | select(.readonly == true)] | length' "$TMPYAML")
      ACTION_COUNT=$(yq '.actions | keys | length' "$TMPYAML")
      if [ "$READONLY_COUNT" -eq 0 ]; then
        echo "⚠️  No readonly actions - mark safe actions with 'readonly: true'"
      else
        echo "✅ $READONLY_COUNT/$ACTION_COUNT actions marked readonly"
      fi
      echo ""
      
      echo "✅ Audit complete"
      echo ""
      echo "For full plugin standards, see CONTRIBUTING.md"
---

# Plugin Development

Use the `audit` action to check a plugin against AgentOS standards.

## Usage

```
audit(path: "plugins/my-plugin/plugin.md")
```

## What It Checks

- Required fields (id, name, description)
- Tags (recommended)
- Deprecated fields (category, topics)
- Icon format
- Error suppression patterns
- Action naming (get_* not list_*)
- Action name length (under 15 chars)
- Description length (under 50 chars)
- Readonly markers

## Full Guide

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for the complete plugin development guide.
