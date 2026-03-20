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
- `extension-guide.md`
  Recommended patterns for adding features, pages, settings, tools, channels, and more persistence.

## Current App Shape

Pikori currently runs as a server-rendered Express app:

- `server.js`
  Main application server, routes, auth flow, settings saves, and chat requests.
- `server/pocketbase.js`
  PocketBase client helpers for auth, authorization, and `user_settings` persistence.
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

- `index.html`
- `js/`

That code is no longer the primary runtime. The active app is the Express + EJS implementation described in these docs.
