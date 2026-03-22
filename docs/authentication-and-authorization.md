# Authentication And Authorization

## Provider

Pikori authenticates against PocketBase.

Default base URL:

- `https://api.people.engineering`

Defined in:

- `server/pocketbase.js`

## Authentication Flow

### Sign-In

The app starts at `/signin`.

Flow:

1. User submits email and password.
2. Client sends an async POST to `/signin`.
3. Server calls `signInWithPassword(email, password)`.
4. PocketBase returns an authenticated client plus auth data.
5. Server resolves the user record from:
   - `authData.record`
   - or `client.authStore.record`
6. Server loads:
   - authorization record
   - user settings record
   - active tenant context
   - active tenant members
7. Server stores the normalized auth, tenant, tenant-user, and settings data in the Express session.
8. Client is redirected to the first authorized route.

### Logout

`/logout`:

- destroys the Express session
- clears the `pikori.sid` cookie
- redirects to `/signin`

## Session Contents

The session currently stores:

- `req.session.auth`
  - token
  - user
  - authorization
  - api metadata
- `req.session.tenant`
  - active tenant id, role, time zone, and owner metadata
- `req.session.tenant.users`
  - normalized active tenant user directory
- `req.session.ui`
  - currently loaded settings state
- `req.session.chat`
  - current chat thread plus pending ToDo follow-up state

## Authorization Model

Route access is feature-flag based.

Current protected routes include:

- `home`
- `chat`
- `tools`
- `todos`
- `reports`
- `channels`
- `settings`
- `docs`

Important notes:

- `/docs` is protected by the `docs` feature flag
- authenticated users also need an active tenant session for protected in-app routes
- if a user is authenticated but not authorized for a route, the server redirects to the first enabled route

## PocketBase Collections

### Auth Collection

Usually:

- `users`

This can be overridden by:

- `PB_AUTH_COLLECTION`

### `authorizations`

Used for:

- feature flags
- API base details
- optional role metadata

Expected important fields:

- `user` relation to the auth collection
- `features` JSON
- `apiBase`
- optional `role`

### `user_settings`

Used for durable user-specific settings.

Currently used for:

- selected model
- memory settings

### `tenants`

Used for:

- active workspace boundary
- tenant status and time zone

### `tenant_memberships`

Used for:

- mapping users into tenants
- tenant role and active membership state

## Recommended PocketBase Rules

### `authorizations`

- `listRule`
  `@request.auth.id != "" && user = @request.auth.id`
- `viewRule`
  `@request.auth.id != "" && user = @request.auth.id`

### `user_settings`

- `listRule`
  `@request.auth.id != "" && user = @request.auth.id`
- `viewRule`
  `@request.auth.id != "" && user = @request.auth.id`
- `createRule`
  `@request.auth.id != "" && user = @request.auth.id`
- `updateRule`
  `@request.auth.id != "" && user = @request.auth.id`

Recommended DB-level uniqueness:

- one `user_settings` record per user

### `tenant_memberships`

Recommended read rules should ensure users can only see memberships relevant to tenants they belong to, or only their own membership records if you want a tighter model.

### `tenants`

Recommended read rules should allow members of the tenant to read tenant records needed for session bootstrapping.

## Security Notes

- the session cookie is `httpOnly`
- feature authorization is enforced server-side
- protected routes require both auth and tenant context
- `user_settings` is intended for durable user config
- local memories are intentionally not saved to PocketBase

## Environment Variables

Current PocketBase-related env vars used by the runtime:

- `PB_API_BASE`
- `PB_AUTH_COLLECTION`
- `PB_AUTHZ_COLLECTION`
- `PB_USER_SETTINGS_COLLECTION`
- `PB_MODELS_COLLECTION`
- `PB_TENANTS_COLLECTION`
- `PB_TENANT_MEMBERSHIPS_COLLECTION`
- `PB_TODOS_COLLECTION`
- `PB_TOOL_DEFINITIONS_COLLECTION`
- `PB_TENANT_TOOLS_COLLECTION`
- `PB_USER_TOOL_PREFERENCES_COLLECTION`
- `SESSION_SECRET`
