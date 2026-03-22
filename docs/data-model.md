# Data Model

## Overview

The app currently uses a mix of:

- static defaults from `server/data.js`
- PocketBase collections
- Express session state
- browser local storage

`server/data.js` is primarily a fallback/view-model source for shell content and placeholder UI. PocketBase and session state are the real source of truth for authenticated runtime behavior.

## PocketBase Collections

### `users`

PocketBase auth collection.

Used for:

- login identity
- user id, email, and name

### `authorizations`

Purpose:

- feature authorization
- API base information

Important fields:

- `user` relation
- `features` JSON
- `apiBase`
- optional `role`

Important notes:

- `docs` is now part of the supported feature set
- feature checks are enforced server-side before rendering protected pages

### `models`

Purpose:

- selectable model catalog for the Settings page
- adapter metadata used by chat generation

Important fields used by the app:

- `name`
- `provider`
- `modelId`
- `baseUrl`
- `apiKey`
- `adapterKey`
- `apiType`
- `contextWindow`
- `maxTokens`
- `thinking`
- `supportsTools`
- optional `input`

### `user_settings`

Purpose:

- durable user-specific settings

Fields currently used by the app:

- `user`
- `model` relation
- legacy/fallback model fields:
  - `modelProvider`
  - `modelName`
  - `modelEndpoint`
  - `modelApiToken`
- memory fields:
  - `memoryEnabled`
  - `memoryMaxSize`
  - `memoryUserName`
  - `memoryUserDescription`
  - `memoryBotName`
  - `memoryBotDescription`

### `tenants`

Purpose:

- shared workspace boundary for tenant-scoped resources

Important fields:

- `name`
- `slug`
- `owner` relation
- `status`
- `timeZone`

### `tenant_memberships`

Purpose:

- links users to tenants
- stores tenant role and active membership status

Important fields:

- `tenant` relation
- `user` relation
- `role`
- `active`

### `tool_definitions`

Purpose:

- global tool catalog metadata

Important fields used by the app:

- `name`
- `toolKey`
- `description`
- `sortOrder`
- `autonomous`
- `configSchema`

### `tenant_tools`

Purpose:

- tenant-specific tool activation and config

Important fields used by the app:

- `tenant`
- `tool`
- `active`
- `config`

### `user_tool_preferences`

Purpose:

- per-user enabled/disabled state for tools within a tenant

Important fields used by the app:

- `user`
- `tenant`
- `tool`
- `enabled`
- optional `autonomous`

### `todos`

Purpose:

- tenant-scoped personal task storage

Important fields:

- `tenant`
- `title`
- `status`
- `dueDate` in UTC
- `details`
- `ownerType`
- `ownerUser`
- `ownerLabel`
- `createdBy`

Current app behavior:

- the `/todos` page lists only `ownerType = "user"` todos for the signed-in user
- create/update routes enforce tenant ownership
- only the current user's own user-owned todos can be edited through the page flow
- bot-owned todos are part of the schema, but are not the main `/todos` page path today

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
  timeZone,
  role,
  membershipId,
  ownerId,
  users: [
    {
      id,
      name,
      email,
      role
    }
  ]
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
      selectedId,
      provider,
      model,
      modelName,
      endpoint,
      apiKey,
      adapterKey,
      apiType,
      contextWindow,
      maxTokens,
      thinking,
      supportsTools,
      input
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
  ],
  pendingTodoFollowup,
  pendingTodoQuery
}
```

This is session-scoped and supports chat follow-up workflows for the ToDo manager.

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
- settings shell defaults
- tool catalog placeholders
- reports
- channels
- todos
- navigation

It should be treated as fallback or presentational data, not as the authoritative durable data model for authenticated features.

## Tenant-Aware Protected Flow

Protected app routes require:

- an authenticated user session
- an active tenant session context
- the relevant feature flag when the route is feature-gated

The active tenant is resolved during sign-in and stored in `req.session.tenant`.
