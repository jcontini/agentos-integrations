---
id: linear
name: Linear
description: Project management for engineering teams
icon: icon.png
color: "#5E6AD2"

website: https://linear.app
privacy_url: https://linear.app/privacy
terms_url: https://linear.app/terms

api:
  graphql_endpoint: "https://api.linear.app/graphql"

auth:
  type: api_key
  header: Authorization
  prefix: ""
  label: API Key
  help_url: https://linear.app/settings/api
  
  actions:
    whoami:
      description: Get current authenticated user
      graphql:
        query: "{ viewer { id name email } }"
        response:
          root: "data.viewer"
      returns:
        id: { type: string }
        name: { type: string }
        email: { type: string }

# Action implementations (merged from mapping.yaml - AGE-267)
# Linear-specific helper actions (not part of unified schema)
extended_actions:
  get_teams:
    description: List all teams (needed to create issues)
    graphql:
      query: "{ teams { nodes { id key name } } }"
      response:
        root: "data.teams.nodes"

  get_workflow_states:
    description: List workflow states for a team
    params:
      team_id: { type: string, required: true }
    graphql:
      query: |
        query($teamId: ID!) {
          workflowStates(filter: { team: { id: { eq: $teamId } } }) {
            nodes { id name type position }
          }
        }
      variables:
        teamId: "{{params.team_id}}"
      response:
        root: "data.workflowStates.nodes"

  get_cycles:
    description: List cycles for a team
    params:
      team_id: { type: string, required: true }
    graphql:
      query: |
        query($teamId: ID!) {
          team(id: $teamId) {
            cycles { nodes { id number startsAt endsAt } }
          }
        }
      variables:
        teamId: "{{params.team_id}}"
      response:
        root: "data.team.cycles.nodes"

actions:
  list:
    label: "List issues"
    graphql:
      query: |
        query($limit: Int, $teamId: ID, $stateId: ID) {
          issues(
            first: $limit
            filter: {
              team: { id: { eq: $teamId } }
              state: { id: { eq: $stateId } }
            }
          ) {
            nodes {
              id identifier title description
              state { id name type }
              priority
              dueDate
              assignee { id name }
              project { id name }
              team { id key name }
              cycle { id number }
              parent { id identifier }
              labels { nodes { name } }
              url
              createdAt updatedAt
            }
          }
        }
      variables:
        limit: "{{params.limit | default: 50}}"
        teamId: "{{params.team_id}}"
        stateId: "{{params.state_id}}"
      response:
        root: "data.issues.nodes"
        mapping:
          id: "[].id"
          source_id: "[].identifier"
          title: "[].title"
          description: "[].description"
          status: |
            [].state.type == 'completed' ? 'done' :
            [].state.type == 'canceled' ? 'cancelled' :
            [].state.type == 'started' ? 'in_progress' : 'open'
          priority: "[].priority"  # Direct: Linear 1=urgent → our 1
          due: "[].dueDate"
          assignee:
            id: "[].assignee.id"
            name: "[].assignee.name"
          project:
            id: "[].project.id"
            name: "[].project.name"
          team:
            id: "[].team.id"
            name: "[].team.name"
          cycle:
            id: "[].cycle.id"
            number: "[].cycle.number"
          state:
            id: "[].state.id"
            name: "[].state.name"
            type: "[].state.type"
          parent_id: "[].parent.id"
          labels: "[].labels.nodes[].name"
          url: "[].url"
          connector: "'linear'"
          created_at: "[].createdAt"
          updated_at: "[].updatedAt"

  get:
    label: "Get issue"
    graphql:
      query: |
        query($id: String!) {
          issue(id: $id) {
            id identifier title description
            state { id name type }
            priority url dueDate
            assignee { id name }
            project { id name }
            team { id key name }
            cycle { id number }
            parent { id identifier }
            children { nodes { id identifier title state { name } } }
            labels { nodes { name } }
            relations { nodes { type relatedIssue { id identifier } } }
            inverseRelations { nodes { type issue { id identifier } } }
            createdAt updatedAt
          }
        }
      variables:
        id: "{{params.id}}"
      response:
        root: "data.issue"
        mapping:
          id: ".id"
          source_id: ".identifier"
          title: ".title"
          description: ".description"
          status: |
            .state.type == 'completed' ? 'done' :
            .state.type == 'canceled' ? 'cancelled' :
            .state.type == 'started' ? 'in_progress' : 'open'
          priority: ".priority"  # Direct: Linear 1=urgent → our 1
          due: ".dueDate"
          assignee:
            id: ".assignee.id"
            name: ".assignee.name"
          project:
            id: ".project.id"
            name: ".project.name"
          team:
            id: ".team.id"
            name: ".team.name"
          cycle:
            id: ".cycle.id"
            number: ".cycle.number"
          state:
            id: ".state.id"
            name: ".state.name"
            type: ".state.type"
          parent_id: ".parent.id"
          labels: ".labels.nodes[].name"
          blocked_by: ".inverseRelations.nodes[?type=='blocks'].issue.id"
          blocks: ".relations.nodes[?type=='blocks'].relatedIssue.id"
          related: ".relations.nodes[?type=='related'].relatedIssue.id"
          children: ".children.nodes[].id"
          url: ".url"
          connector: "'linear'"
          created_at: ".createdAt"
          updated_at: ".updatedAt"

  create:
    label: "Create issue"
    graphql:
      query: |
        mutation($input: IssueCreateInput!) {
          issueCreate(input: $input) {
            success
            issue {
              id identifier title url
              state { name type }
              project { id name }
            }
          }
        }
      variables:
        input:
          teamId: "{{params.team_id}}"
          title: "{{params.title}}"
          description: "{{params.description}}"
          priority: "{{params.priority}}"  # Direct: Our 1=urgent → Linear 1
          projectId: "{{params.project_id}}"
          parentId: "{{params.parent_id}}"
          dueDate: "{{params.due}}"
      response:
        root: "data.issueCreate.issue"
        mapping:
          id: ".id"
          source_id: ".identifier"
          title: ".title"
          status: ".state.type == 'completed' ? 'done' : 'open'"
          url: ".url"
          connector: "'linear'"

  update:
    label: "Update issue"
    graphql:
      query: |
        mutation($id: String!, $input: IssueUpdateInput!) {
          issueUpdate(id: $id, input: $input) {
            success
            issue {
              id identifier title url
              state { name type }
            }
          }
        }
      variables:
        id: "{{params.id}}"
        input:
          title: "{{params.title}}"
          description: "{{params.description}}"
          priority: "{{params.priority}}"  # Direct: Our 1=urgent → Linear 1
          stateId: "{{params.state_id}}"
          dueDate: "{{params.due}}"
      response:
        root: "data.issueUpdate.issue"
        mapping:
          id: ".id"
          source_id: ".identifier"
          title: ".title"
          status: ".state.type == 'completed' ? 'done' : 'open'"
          url: ".url"
          connector: "'linear'"

  complete:
    # Chained executor: first find the completed state, then update the issue
    - graphql:
        query: |
          query($id: String!) {
            issue(id: $id) {
              team {
                states(filter: { type: { eq: "completed" } }) {
                  nodes { id name }
                }
              }
            }
          }
        variables:
          id: "{{params.id}}"
      as: lookup
    - graphql:
        query: |
          mutation($id: String!, $input: IssueUpdateInput!) {
            issueUpdate(id: $id, input: $input) {
              success
              issue { id identifier state { name type } }
            }
          }
        variables:
          id: "{{params.id}}"
          input:
            stateId: "{{lookup.data.issue.team.states.nodes[0].id}}"
        response:
          root: "data.issueUpdate.issue"
          mapping:
            id: ".id"
            source_id: ".identifier"
            status: "'done'"
            connector: "'linear'"

  reopen:
    # Chained executor: first find a backlog/unstarted state, then update the issue
    - graphql:
        query: |
          query($id: String!) {
            issue(id: $id) {
              team {
                states(filter: { type: { eq: "backlog" } }) {
                  nodes { id name }
                }
              }
            }
          }
        variables:
          id: "{{params.id}}"
      as: lookup
    - graphql:
        query: |
          mutation($id: String!, $input: IssueUpdateInput!) {
            issueUpdate(id: $id, input: $input) {
              success
              issue { id identifier state { name type } }
            }
          }
        variables:
          id: "{{params.id}}"
          input:
            stateId: "{{lookup.data.issue.team.states.nodes[0].id}}"
        response:
          root: "data.issueUpdate.issue"
          mapping:
            id: ".id"
            source_id: ".identifier"
            status: "'open'"
            connector: "'linear'"

  delete:
    label: "Delete issue"
    graphql:
      query: |
        mutation($id: String!) {
          issueDelete(id: $id) { success }
        }
      variables:
        id: "{{params.id}}"
      response:
        root: "data.issueDelete"
        mapping:
          success: ".success"

  projects:
    label: "List projects"
    graphql:
      query: "{ projects { nodes { id name state } } }"
      response:
        root: "data.projects.nodes"
        mapping:
          id: "[].id"
          name: "[].name"
          connector: "'linear'"

  # Relationship actions
  add_blocker:
    label: "Add blocker"
    graphql:
      query: |
        mutation($input: IssueRelationCreateInput!) {
          issueRelationCreate(input: $input) {
            success
            issueRelation { id type }
          }
        }
      variables:
        input:
          issueId: "{{params.blocker_id}}"
          relatedIssueId: "{{params.id}}"
          type: blocks
      response:
        root: "data.issueRelationCreate"
        mapping:
          success: ".success"

  remove_blocker:
    label: "Remove blocker"
    graphql:
      query: |
        mutation($issueId: String!, $relatedIssueId: String!) {
          issueRelationDelete(issueId: $issueId, relatedIssueId: $relatedIssueId) {
            success
          }
        }
      variables:
        issueId: "{{params.blocker_id}}"
        relatedIssueId: "{{params.id}}"
      response:
        root: "data.issueRelationDelete"
        mapping:
          success: ".success"

  add_related:
    label: "Add related issue"
    graphql:
      query: |
        mutation($input: IssueRelationCreateInput!) {
          issueRelationCreate(input: $input) {
            success
            issueRelation { id type }
          }
        }
      variables:
        input:
          issueId: "{{params.id}}"
          relatedIssueId: "{{params.related_id}}"
          type: related
      response:
        root: "data.issueRelationCreate"
        mapping:
          success: ".success"

  remove_related:
    label: "Remove related issue"
    graphql:
      query: |
        mutation($issueId: String!, $relatedIssueId: String!) {
          issueRelationDelete(issueId: $issueId, relatedIssueId: $relatedIssueId) {
            success
          }
        }
      variables:
        issueId: "{{params.id}}"
        relatedIssueId: "{{params.related_id}}"
      response:
        root: "data.issueRelationDelete"
        mapping:
          success: ".success"

instructions: |
  Linear-specific notes:
  - Uses GraphQL API
  - Issues have human-readable IDs like "AGE-123" (stored in source_id)
  - Priority: 0=None, 1=Urgent, 2=High, 3=Medium, 4=Low
  - Creating issues requires a team_id (use get_teams first)
  - Workflow states vary by team
---

# Linear

Project management integration for engineering teams.

## Setup

1. Get your API key from https://linear.app/settings/api
2. Add credential in AgentOS Settings → Connectors → Linear

**Important**: Linear API keys are used WITHOUT the "Bearer" prefix.

## Features

- Full CRUD for issues (tasks)
- Projects and cycles
- Workflow states (customizable per team)
- Sub-issues via parent_id
- Issue relationships (blocking, related)

## Extended Operations

Some Linear-specific operations are available through extended actions:

- `get_teams` - List teams (needed for creating issues)
- `get_workflow_states` - List states for a team
- `get_cycles` - List cycles for a team
- `add_blocking` - Set blocking relationships
- `add_related` - Link related issues
