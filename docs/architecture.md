# Architecture

## Runtime Model

Pikori is currently a hybrid server-rendered application:

- Express handles routing and server actions.
- EJS renders the shell and page markup.
- A shared inline script in `views/layout.ejs` powers interactive behavior such as:
  - mobile sidebar toggle
  - sidebar collapse state
  - async sign-in
  - model settings save
  - memory settings save/reset
  - chat send/reset
  - toast notifications

The app is not a client-side SPA in the primary implementation, although some behavior is progressively enhanced in-place after render.

## Main Files

- `server.js`
  Main application entry point.
- `server/pocketbase.js`
  PocketBase integration helpers.
- `server/data.js`
  Shared app state defaults and view-model builder.
- `views/layout.ejs`
  Outer shell and shared script logic.
- `views/pages/*.ejs`
  Page templates.
- `views/partials/sidebar.ejs`
  Sidebar UI.
- `views/partials/drawers/*.ejs`
  Right-side drawers.
- `css/styles.css`
  Shared styling.

## Request Flow

### Initial Request

1. Browser requests a route.
2. Express authenticates/authorizes the request.
3. `getViewModel(...)` builds the page model.
4. `layout.ejs` renders the shell and chosen page partial.
5. Shared client logic enhances the rendered page.

### Settings Save

For interactive settings sections:

1. Client intercepts form submit.
2. Client validates inputs where needed.
3. Client POSTs to a server route such as:
   - `/settings/model`
   - `/settings/memory`
4. Server validates again.
5. Server persists changes to PocketBase where appropriate.
6. Server updates session state.
7. Client shows a toast response.

### Chat Send

1. User submits prompt on `/chat`.
2. Client adds an optimistic user bubble and a pending assistant bubble.
3. Client POSTs to `/chat/send`.
4. Server reads model + memory settings from session.
5. Server generates an Ollama-compatible payload.
6. Server calls the configured model endpoint.
7. Server appends the assistant reply to session chat history.
8. Client re-renders the thread from the returned session-backed messages.

## State Layers

Pikori currently uses three different state layers.

### 1. Server Session

Stored via `express-session`.

Used for:

- authenticated user identity
- PocketBase token preview and API details
- feature authorization flags
- loaded `user_settings`
- current chat history

Session cookie:

- name: `pikori.sid`

### 2. PocketBase

Used for durable cross-session storage:

- authentication
- feature authorization
- user settings

Collections currently used:

- auth collection, usually `users`
- `authorizations`
- `user_settings`

### 3. Browser Local Storage

Used for client-local state that is intentionally not persisted to PocketBase:

- sidebar minimized state
- protected local memory list

Current keys:

- `pikori.sidebar.minimized`
- `pikori.memories`

## Rendering Strategy

Most pages are rendered server-side with the latest session state.

Some interactions re-render only a portion of the page:

- chat thread updates after message send
- settings panels stay in place and show toast feedback

The app shell is shared across pages so the UI feels consistent even though pages are route-based.

## Legacy Code

There is older frontend-only code under `js/` and `index.html`. It remains in the repo, but the current working product is the EJS app.
