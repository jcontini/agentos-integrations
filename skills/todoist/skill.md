# Todoist

Personal task management - create, list, complete, update, delete tasks.

## Critical: Todoist API Quirks

> **Updates use POST, not PUT!** Todoist returns 405 if you use PUT.
>
> **Cannot change project_id!** To move a task to a different project, you must delete it and recreate it with the new project_id.

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

## Important Notes

- **Subtasks:** Query with `?parent_id={task_id}` to get a task's subtasks
- **Priority:** 1=normal, 4=urgent (counterintuitive!)
- **Rate limits:** ~450 requests per 15 minutes
- **Updates:** Always use POST method, never PUT

## Full API Docs

https://developer.todoist.com/rest/v2/
