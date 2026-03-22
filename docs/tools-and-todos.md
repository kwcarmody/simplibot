# Tools And ToDos

## Overview

Two important runtime features now exist beyond basic page rendering:

- tenant-scoped tool loading with per-user enablement
- tenant-scoped ToDo persistence, both in the page UI and through chat

## Tool Model

The effective tool list for a user is built from three PocketBase layers:

1. `tool_definitions`
   global metadata such as tool key, description, sort order, and config schema
2. `tenant_tools`
   tenant-specific activation and config
3. `user_tool_preferences`
   per-user enabled or disabled state within that tenant

This merging happens in:

- `server/tools/loader.js`

## Tool Registry

Server-side executable tools are mapped through:

- `server/tools/registry.js`

Current registry entries include:

- `web-search`
- `calendar`
- `filesystem`
- `crm`
- `automation`
- `monitoring`
- `todo-manager`

Not every registered tool is fully executable yet, but they can still appear in UI and prompt definitions depending on setup.

## Tools Page

The `/tools` page:

- loads effective tools for the active tenant and current user
- shows only active tenant tools
- allows the user to toggle per-user enabled state

Save route:

- `POST /tools/preferences`

Current server behavior:

1. Validate auth and tenant session.
2. Validate the submitted tool id.
3. Confirm the tenant tool exists and is active.
4. Upsert the user preference record.
5. Redirect back to `/tools`.

## Chat And Tools

Chat loads the same effective tools through:

- `loadToolsForTenantUser(...)`

Only enabled tools are exposed to the model prompt and tool execution layer.

Important execution rules:

- only autonomous tools can execute without extra confirmation
- a tool service can still deny execution for a specific request
- tool denial returns a user-facing fallback instead of running the tool anyway

## `web-search`

Service file:

- `server/services/tools/web-search.js`

Current behavior:

- identifies search-like requests such as events, current facts, schedules, availability, and some identity lookups
- executes Brave-compatible search requests through the configured tenant tool endpoint
- reduces results into grounded facts
- formats deterministic fallback summaries when synthesis is weak

## `todo-manager`

Service file:

- `server/services/tools/todo-manager.js`

Current behavior:

- supports create, update, archive, and query operations
- can ask for follow-up clarification when required fields are missing
- returns session patches for follow-up handling
- operates within the current tenant and signed-in user context

## ToDo Page

The `/todos` page is backed by PocketBase records from the `todos` collection.

Current page behavior:

- list only the current user's user-owned todos for the active tenant
- optionally filter by status
- support create and update through the form flow
- load a selected todo for editing from the query string

Save route:

- `POST /todos/save`

Current server behavior:

1. Validate auth and tenant session.
2. Normalize form input through `normalizeTodoPayload(...)`.
3. Validate the todo payload.
4. Verify user ownership rules when assigning to another user.
5. If updating, verify the existing record belongs to the tenant and current user.
6. Create or update the PocketBase record.
7. Redirect back to `/todos`.

## Time Zone Handling

ToDo due dates are stored in UTC but are interpreted relative to the tenant time zone.

Current supported tenant time zone labels:

- `EST/EDT`
- `CST/CDT`
- `PST/PDT`

Conversion helpers live in:

- `server/services/todos.js`

## Current Limitations

- the Settings page does not manage tool preferences; `/tools` does
- not every registered tool has a complete executable implementation yet
- the `/todos` page is currently focused on the signed-in user's own user-owned todos
- there is no automated test suite covering current tool and todo flows
