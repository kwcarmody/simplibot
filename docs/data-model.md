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
