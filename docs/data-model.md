# Data Model

## Overview

The app currently uses a mix of:

- static defaults from `server/data.js`
- PocketBase collections
- Express session state
- browser local storage

## PocketBase Collections

### `users`

PocketBase auth collection.

Used for:

- login identity
- user id / email / name

### `authorizations`

Purpose:

- feature authorization
- API base information

Important fields:

- `user` relation
- `features` JSON
- `apiBase`
- `role`

Example `features` shape:

```json
{
  "home": true,
  "chat": true,
  "tools": true,
  "todos": true,
  "reports": true,
  "channels": true,
  "settings": true,
  "profile": true
}
```


### `tenants`

Purpose:

- shared workspace boundary for tenant-scoped resources

Important fields:

- `name`
- `slug`
- `owner` relation
- `status`

### `tenant_memberships`

Purpose:

- links users to tenants
- stores tenant role and active membership status

Important fields:

- `tenant` relation
- `user` relation
- `role`
- `active`

### `user_settings`

Purpose:

- durable user-specific settings

Currently used fields:

- `user`
- `modelProvider`
- `modelName`
- `modelEndpoint`
- `modelApiToken`
- `memoryEnabled`
- `memoryMaxSize`
- `memoryUserName`
- `memoryUserDescription`
- `memoryBotName`
- `memoryBotDescription`

More fields can be added over time for tools/channels/etc.

## Express Session Model

### `req.session.auth`

```js
{
  token,
  user: {
    id,
    email,
    name
  },
  authorization: {
    id,
    role,
    features
  },
  api: {
    endpoint,
    authCollection,
    tokenPreview
  }
}
```


### `req.session.tenant`

```js
{
  id,
  name,
  slug,
  status,
  role,
  membershipId,
  ownerId
}
```

This stores the active tenant context resolved during sign-in.

### `req.session.ui`

Holds currently loaded settings derived from `user_settings`.

Current shape:

```js
{
  settings: {
    model: {
      provider,
      model,
      endpoint,
      apiKey
    },
    memory: {
      enabled,
      maxSize,
      userName,
      userDescription,
      botName,
      botDescription
    }
  }
}
```

### `req.session.chat`

```js
{
  messages: [
    {
      id,
      role,
      author,
      text,
      time
    }
  ]
}
```

This persists only for the current login session.

## Local Storage

### `pikori.sidebar.minimized`

Boolean-like string:

- `"true"`
- `"false"`

Used to preserve minimized sidebar state across page navigations.

### `pikori.memories`

JSON array.

Used for protected local-only memories.

This is intentionally not persisted to PocketBase.

## `server/data.js` Defaults

This file provides static defaults and mock data for:

- profile
- settings
- tool catalog
- reports
- channels
- todos
- navigation

Important note:

`server/data.js` is a fallback/default source, not the source of truth for authenticated persisted settings.


### `todos`

Purpose:

- tenant-scoped shared task list

Important fields:

- `tenant` relation
- `title`
- `status`
- `dueDate` (stored in UTC)
- `details`
- `ownerType`
- `ownerUser`
- `ownerLabel`
- `createdBy`

Current app behavior:

- todos are read from PocketBase by active tenant id
- due dates are displayed in America/New_York in the UI
- priority is intentionally ignored in the first integration pass

## Tenant-Aware Protected Flow

Protected app routes should require both:
- an authenticated user session
- an active tenant session context

The active tenant is resolved during sign-in and stored in `req.session.tenant`.
