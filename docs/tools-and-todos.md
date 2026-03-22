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

## Adding A New Tool

When adding a new tool, update the app in layers. The tool is not “done” when the service file exists — it has to be wired through registry, data, planner/orchestrator behavior if needed, PocketBase records, and tests.

### 1. Create the service module

Add a service file under:

- `server/services/tools/<tool>.js`

A tool service may implement some or all of these functions depending on its behavior:

- `normalizeConfig(config)`
  normalize tenant tool config before use
- `getPromptDefinition({ tool })`
  exposes the tool to model/planner prompts
- `shouldAutoExecute({ latestUserMessage, input, tool, context })`
  allows or denies autonomous execution for a specific request
- `shouldDirectHandle({ latestUserMessage, context, tool })`
  allows direct short-circuit execution without the model choosing the tool first
- `execute({ input, config, context, latestUserMessage })`
  performs the tool action
- `buildGroundedResult({ result, latestUserMessage })`
  optional reduction step for grounded follow-up/synthesis flows
- `formatResultForAssistant({ result, latestUserMessage })`
  deterministic assistant-facing formatter

If the tool is chat-exposed, `getPromptDefinition(...)` and `formatResultForAssistant(...)` are especially important.

### 2. Register the service implementation

Update:

- `server/services/tools/index.js`

You need to:

- import the new service module
- add it to the internal `services` map

If this step is skipped, the tool may appear in data records but will not execute server-side.

### 3. Add the tool registry entry

Update:

- `server/tools/registry.js`

Add:

- `toolKey`
- optional aliases
- `uiId`
- `serviceKey`
- default name/description

This is what connects persisted tool definitions to executable runtime behavior.

### 4. Add PocketBase records / schema support

Ensure PocketBase has the right data:

- a `tool_definitions` record for the tool
- one or more `tenant_tools` records enabling/configuring it per tenant
- optional `user_tool_preferences` records once users start toggling it

At minimum, the tool definition should align with the runtime registry and include:

- tool key / name
- description
- sort order
- config schema
- autonomous default if appropriate

### 5. Decide how chat should use it

There are three major patterns in the current app:

- **default tool flow**
  model sees the tool prompt definition and returns a tool call in the first pass
- **direct execution flow**
  `shouldDirectHandle(...)` lets the server bypass planner/model selection for specific safe requests
- **dedicated planner flow**
  tool gets its own planner pass and possibly synthesis logic, like `todo-manager` and `web-search`

If the tool needs custom routing, update or extend:

- `server/services/model/chat-orchestrator.js`
- `server/services/model/policies/*.js`
- `server/services/model/planners/*.js`
- `server/services/model/synthesis/*.js`

Only add a dedicated planner flow if the tool genuinely needs special prompt discipline, repair behavior, or grounded follow-up handling.

### 6. Make sure the tool shows up correctly in the UI

Effective tool loading comes from:

- `server/tools/loader.js`

The `/tools` page and chat both depend on this merged effective tool list.

You usually do **not** need to edit loader logic for a normal tool, but you should verify:

- the registry entry resolves correctly
- the config schema parses cleanly
- enabled / active / autonomous state is represented correctly

### 7. Add or update tests

At minimum, add tests in the areas the new tool touches.

#### Service-level tests

Usually add a new file like:

- `test/<tool>.test.js`

Test things like:

- config validation / normalization
- `shouldAutoExecute(...)`
- `shouldDirectHandle(...)` if present
- `execute(...)` result shape
- `formatResultForAssistant(...)`
- grounded result formatting if the tool uses it

#### Registry / loader tests

If the tool adds new aliases, config parsing, or runtime shape assumptions, update or add tests around:

- `server/tools/registry.js`
- `server/tools/loader.js`
- `server/services/tool-definitions.js`

#### Planner / policy / orchestrator tests

If the tool adds custom planner behavior, add tests under files like:

- `test/planners.test.js`
- `test/chat-orchestrator.test.js`
- or create a tool-specific planner/orchestrator test file

Test things like:

- planner prompt content
- repair behavior
- route selection in the orchestrator
- denial / confirmation / fallback behavior

#### Route-level tests

If the tool changes route behavior or depends on session state patches, add or extend route/orchestrator tests so request-level behavior stays covered.

### 8. Update the docs

As the tool surface expands, update the docs so the runtime shape remains understandable.

Usually update one or more of:

- `docs/tools-and-todos.md`
- `docs/llm-and-chat.md`
- `docs/architecture.md`
- `docs/testing.md`
- `docs/extension-guide.md`

### Recommended checklist

Before calling a tool integration “done,” confirm all of these:

- service file exists under `server/services/tools/`
- service is exported from `server/services/tools/index.js`
- registry entry exists in `server/tools/registry.js`
- PocketBase tool definition / tenant tool records exist
- tool appears on `/tools` when enabled for the tenant
- tool can load through `loadToolsForTenantUser(...)`
- chat behavior is wired for the correct flow type
- tests exist for service behavior and any custom orchestration/planner logic
- docs mention the tool where relevant

## Current Limitations

- the Settings page does not manage tool preferences; `/tools` does
- not every registered tool has a complete executable implementation yet
- the `/todos` page is currently focused on the signed-in user's own user-owned todos
- tool and planner coverage now exists, but there is still no full authenticated end-to-end tool-flow test with real PocketBase-backed tenant/session state
