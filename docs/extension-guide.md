# Extension Guide

## Overview

This document describes the recommended pattern for extending Pikori without fighting the current implementation.

## General Rule

Follow the current split:

- route modules do validation and orchestration
- `server/services/*` handle integration logic and data mapping
- `server/data.js` provides shell defaults and fallback view-model data
- EJS templates render structure
- `views/layout.ejs` handles page-level enhancement and async actions
- PocketBase stores durable per-user and per-tenant data
- local storage stores browser-local state only

## Adding A New Page

1. Add the route to the render/router flow.
2. Add feature gating if the page should be protected.
3. Add a nav item in `server/data.js` if it belongs in the sidebar.
4. Create `views/pages/<page>.ejs`.
5. Load any route-specific data in the relevant route module.
6. Ensure `renderRoute(...)` receives the required page data on `req`.

## Adding A New Persisted Settings Section

1. Add defaults or display shape in `server/data.js` if helpful.
2. Add fields or a new collection in PocketBase.
3. Add validation in `server/lib/validation.js`.
4. Update `mapUserSettingsRecordToSettings(...)` in `server/lib/session.js` if the values belong in `req.session.ui.settings`.
5. Add a save route in `server/routes/settings.js`.
6. Add UI in `views/pages/settings.ejs`.
7. Add client submit handling in `views/layout.ejs`.

## Adding A New Tool

Current runtime pattern:

1. Define or reuse a service in `server/services/tools/<tool>.js`.
2. Register it in `server/services/tools/index.js`.
3. Add a registry entry in `server/tools/registry.js`.
4. Ensure PocketBase has:
   - a `tool_definitions` record
   - a `tenant_tools` record for each tenant that should have it
5. If it should appear in model prompts, implement `getPromptDefinition(...)`.
6. If it can run automatically, implement `shouldAutoExecute(...)`.
7. If it can answer directly, optionally implement `shouldDirectHandle(...)`.
8. If it should return deterministic text, implement `formatResultForAssistant(...)`.

Important note:

- the effective tool list comes from `server/tools/loader.js`, not from `server/data.js`

## Extending Chat

Good extension points:

- `server/routes/chat.js`
  chat session orchestration and session patch application
- `server/prompts/chat.js`
  base prompt composition
- `server/services/model.js`
  model transport, planner passes, tool execution, and synthesis
- `server/services/model-adapters/*.js`
  provider/model-specific parsing behavior

Recommended approach:

1. Decide whether the feature belongs in the first pass, a planner pass, or direct tool execution.
2. Keep tool execution server-side.
3. Preserve user wording for high-risk fields such as due dates whenever possible.
4. Add explicit debug logging only through the existing `PIKORI_TOOL_DEBUG` flow.

## Adding A New PocketBase Collection

Recommended process:

1. Define the collection and fields in PocketBase.
2. Add rules so users only access their own or tenant-scoped records as appropriate.
3. Add helpers in `server/pocketbase.js` or a focused service module.
4. Keep collection access out of templates.
5. Normalize records before putting them into session or view models.

## Adding A New ToDo Flow

Use:

- `server/services/todos.js`
- `server/routes/todos.js`
- `server/services/tools/todo-manager.js`

Keep page-based todo editing and chat-based todo editing consistent by reusing shared todo normalization and validation helpers.

## Improving The Client Script

Right now `views/layout.ejs` contains a large shared inline script. It works, but it will become harder to maintain as the app grows.

Recommended refactor path:

- move page logic into `public/` modules
- keep `layout.ejs` responsible only for bootstrapping shared state

## Legacy Frontend Code

There is still older static app code under `legacy-ui-comps/`.

Recommendation:

- either archive it more explicitly
- or remove it once the EJS implementation is fully stable
