# Pikori Docs

This directory documents the current Node.js + Express + EJS implementation of Pikori.

## Document Map

- `architecture.md`
  Overview of the runtime architecture, request flow, rendering model, and where state lives.
- `authentication-and-authorization.md`
  PocketBase login flow, session handling, feature authorization, and required collections/rules.
- `settings.md`
  Settings behavior, persistence model, defaults, and current save flows.
- `data-model.md`
  The current application data model across session state, local storage, and PocketBase.
- `llm-and-chat.md`
  How the chat feature works, how prompts are assembled, where model calls happen, and current payload structure.
- `tools-and-todos.md`
  Tenant-scoped tool loading, user tool preferences, ToDo persistence, and the chat-facing `todo-manager` flow.
- `extension-guide.md`
  Recommended patterns for adding features, pages, settings, tools, channels, and more persistence.

## Current App Shape

Pikori currently runs as a server-rendered Express app:

- `server.js`
  Main application entry point, middleware, and route registration.
- `server/routes/*.js`
  Route modules for auth, settings, chat, and page rendering.
- `server/services/model.js`
  Model endpoint helpers, adapters, tool planning, and chat reply generation.
- `server/prompts/chat.js`
  Chat system prompt and message assembly helpers.
- `server/pocketbase.js`
  PocketBase client helpers for auth, authorization, tenant resolution, models, and `user_settings` persistence.
- `server/services/tool-definitions.js`
  PocketBase-backed tool definitions, tenant tool records, and per-user tool preferences.
- `server/services/todos.js`
  ToDo normalization, tenant-aware reads, date handling, and persistence helpers.
- `server/tools/loader.js`
  Combines tool definitions, tenant tools, and user preferences into the effective tool list for chat and the Tools page.
- `server/data.js`
  Shared view-model builder and static/mock app data used by rendered pages.
- `views/layout.ejs`
  Main shell, sidebar, mobile chrome, and shared client-side behavior.
- `views/pages/*.ejs`
  Route-specific page templates.
- `views/partials/*.ejs`
  Shared sidebar and drawer partials.
- `css/styles.css`
  Global styling.

## Important Note

There is still a legacy static SPA codebase in:

- `legacy-ui-comps/index.html`
- `legacy-ui-comps/js/`

That code is no longer the primary runtime. The active app is the Express + EJS implementation described in these docs.

## In-App Docs Route

The active app now exposes documentation inside the UI at `/docs` with per-document routes under `/docs/:slug`.

Access to the docs UI is itself feature-gated through the `docs` authorization flag.
