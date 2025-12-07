# Todoist

Personal task management - create, list, complete, update, delete tasks.

## Critical: Todoist API Quirks

> **Updates use POST, not PUT!** Todoist returns 405 if you use PUT.
>
> **Cannot change project_id!** To move a task to a different project, you must delete it and recreate it with the new project_id.
>
> **⚠️ CRITICAL: Recurring Tasks** - When updating a recurring task's due date, you MUST preserve the recurring pattern or you will convert it to a one-time task! See "Recurring Tasks" section below.

## Endpoints

| Operation | Method | Path |
|-----------|--------|------|
| List tasks | GET | `tasks` |
| Get task | GET | `tasks/{id}` |
| Create task | POST | `tasks` |
| **Update task** | **POST** | `tasks/{id}` |
| Complete task | POST | `tasks/{id}/close` |
| Reopen task | POST | `tasks/{id}/reopen` |
| Delete task | DELETE | `tasks/{id}` |
| List projects | GET | `projects` |
| Get project | GET | `projects/{id}` |
| List labels | GET | `labels` |

## Filters (query params)

| Filter | Example |
|--------|---------|
| Due today | `tasks?filter=today` |
| Due this week | `tasks?filter=7%20days` |
| Overdue | `tasks?filter=overdue` |
| No due date | `tasks?filter=no%20date` |
| By project | `tasks?project_id={id}` |
| Subtasks | `tasks?parent_id={id}` |

## Create Task

```json
{
  "content": "Task name",
  "due_string": "today",
  "labels": ["AI"],
  "priority": 4,
  "project_id": "123",
  "description": "Optional notes"
}
```

**Fields:**
- `content` (required): Task title
- `due_string`: Natural language (`today`, `tomorrow`, `next monday`, `2025-01-15`)
- `labels`: Array of label names - **always include `["AI"]` for AI-created tasks**
- `priority`: 1 (normal) to 4 (urgent)
- `project_id`: Target project - **set at creation, cannot be changed later!**
- `parent_id`: Create as subtask

## Update Task (POST, not PUT!)

```json
POST tasks/{id}
{
  "content": "Updated title",
  "due_string": "tomorrow",
  "priority": 2
}
```

**Updateable fields:** `content`, `description`, `due_string`, `due_date`, `priority`, `labels`

**NOT updateable:** `project_id` - must delete and recreate to move task

## ⚠️ Recurring Tasks - CRITICAL WARNING

**Recurring tasks can be accidentally converted to one-time tasks if not handled carefully!**

### How Recurring Tasks Work

When you GET a task, recurring tasks have:
- `"is_recurring": true`
- `"due"` object with a `"recurring"` property (e.g., `{"recurring": true, "string": "every saturday"}`)

### The Problem

If you update a recurring task with just `"due_string": "today"`, Todoist will:
- ✅ Update the due date to today
- ❌ **Convert it to a one-time task** (`is_recurring` becomes `false`)
- ❌ **Lose the recurring pattern forever**

### The Solution

**Before updating ANY task's due date:**

1. **Always GET the task first** to check if `is_recurring: true`
2. **If recurring:** Preserve the recurring pattern in your update
3. **If not recurring:** Update normally

### Examples

**❌ WRONG - This breaks recurring tasks:**
```json
POST tasks/123
{
  "due_string": "today"  // Converts recurring task to one-time!
}
```

**✅ CORRECT - Preserve recurring pattern:**
```json
// First, GET the task to see its recurring pattern
GET tasks/123
// Response: {"is_recurring": true, "due": {"recurring": true, "string": "every saturday"}}

// Then update preserving the pattern
POST tasks/123
{
  "due_string": "every saturday"  // Preserves recurrence
}
```

**✅ CORRECT - For overdue recurring tasks:**

If a recurring task is overdue (e.g., "every saturday" but today is Sunday):
- **Option 1:** Leave it as-is (it will recur on the next Saturday)
- **Option 2:** Complete it (`POST tasks/{id}/close`) - Todoist will create the next occurrence
- **Option 3:** Ask the user how they want to handle it
- **Option 4:** Only update if you preserve the pattern: `"due_string": "every saturday"`

**✅ CORRECT - Converting recurring to one-time (if user wants):**
```json
// User explicitly wants to convert recurring task to one-time
POST tasks/123
{
  "due_string": "today"  // OK if user explicitly requested this
}
```

### Best Practice

**When updating task due dates:**
1. GET the task first
2. Check `is_recurring`
3. If `true`, either:
   - Preserve the pattern in `due_string` (e.g., "every saturday")
   - Ask the user if they want to convert it to one-time
   - Leave it unchanged if it's just overdue
4. If `false`, update normally

## Move Task to Different Project (Workaround)

Since `project_id` cannot be updated, to move a task:

1. GET the task to preserve its data
2. DELETE the old task
3. POST a new task with the new `project_id` and all preserved fields

## Complete/Reopen Task

```json
POST tasks/{id}/close   // Complete
POST tasks/{id}/reopen  // Reopen
```

No body required.

## AI Defaults

When creating tasks:
1. Always add `"labels": ["AI"]` so user knows it was AI-created
2. Use `"due_string": "today"` if no date specified
3. Set `project_id` at creation if user specifies a project (can't change later!)

When updating tasks:
1. **ALWAYS GET the task first** to check if it's recurring (`is_recurring: true`)
2. **If recurring:** Preserve the recurring pattern in `due_string` or ask user before converting to one-time
3. **Never update `due_string` on recurring tasks** without preserving the pattern unless user explicitly requests it

## Important Notes

- **Subtasks:** Query with `?parent_id={task_id}` to get a task's subtasks
- **Priority:** 1=normal, 4=urgent (counterintuitive!)
- **Rate limits:** ~450 requests per 15 minutes
- **Updates:** Always use POST method, never PUT

## Full API Docs

https://developer.todoist.com/rest/v2/
