# Authentication And Authorization

## Provider

Pikori authenticates against PocketBase at:

- `https://api.people.engineering`

Defined in:

- `server/pocketbase.js`

## Authentication Flow

### Sign-In

The app starts at `/signin`.

Flow:

1. User submits email and password.
2. Client sends an async POST to `/signin`.
3. Server calls:
   - `signInWithPassword(email, password)`
4. PocketBase returns an authenticated client + auth result.
5. Server resolves the user record from:
   - `authData.record`
   - or `client.authStore.record`
6. Server loads:
   - authorization record
   - user settings record
7. Server stores relevant data in the Express session.
8. Client is redirected to the first authorized route.

### Logout

`/logout`:

- destroys the Express session
- clears the `pikori.sid` cookie
- redirects to `/signin`

## Session Contents

The session currently stores:

- `req.session.auth`
  - `token`
  - `user`
  - `authorization`
  - `api`
- `req.session.ui`
  - currently loaded settings state
- `req.session.chat`
  - current chat thread for the active login session

## Authorization Model

Route access is feature-flag based.

Current protected routes:

- `home`
- `chat`
- `tools`
- `todos`
- `reports`
- `channels`
- `settings`
- `profile`

Current feature mapping is defined in `server.js` in `routeFeatureMap`.

If a user is authenticated but not authorized for a route:

- the server redirects to the first enabled route

## PocketBase Collections

### Auth Collection

Usually:

- `users`

This can be overridden by environment variable:

- `PB_AUTH_COLLECTION`

### `authorizations`

Used for feature flags and API base details.

Expected important fields:

- `user` relation to auth collection
- `features` JSON
- `apiBase`
- optional `role`

### `user_settings`

Used for durable user-specific settings.

Currently used for:

- model settings
- memory settings

## Recommended PocketBase Rules

### `authorizations`

- `listRule`
  `@request.auth.id != "" && user = @request.auth.id`
- `viewRule`
  `@request.auth.id != "" && user = @request.auth.id`

Usually these records are pre-created/admin-managed.

### `user_settings`

- `listRule`
  `@request.auth.id != "" && user = @request.auth.id`
- `viewRule`
  `@request.auth.id != "" && user = @request.auth.id`
- `createRule`
  `@request.auth.id != "" && user = @request.auth.id`
- `updateRule`
  `@request.auth.id != "" && user = @request.auth.id`
- `deleteRule`
  optional; often better to keep this locked

Recommended DB-level uniqueness:

- one `user_settings` record per user

## Security Notes

- Session cookie is `httpOnly`.
- Feature authorization is enforced server-side.
- `user_settings` is intended for durable user config.
- local memories are intentionally not saved to PocketBase.

## Environment Variables

Current supported PocketBase-related env vars:

- `PB_API_BASE`
- `PB_AUTH_COLLECTION`
- `PB_AUTHZ_COLLECTION`
- `PB_USER_SETTINGS_COLLECTION`
- `SESSION_SECRET`
