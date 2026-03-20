# Extension Guide

## Overview

This document describes the recommended pattern for extending Pikori without fighting the current implementation.

## General Rule

Follow the current split:

- server route does validation + persistence + integration
- `server/data.js` provides defaults/fallbacks
- EJS templates render structure
- `views/layout.ejs` handles page-level enhancement and async actions
- PocketBase stores durable per-user data
- local storage stores browser-local or sensitive local-only data

## Adding A New Page

1. Add a new route id to `routeFeatureMap` in `server.js`.
2. Add it to `protectedRoutes` if it requires auth.
3. Add a nav item in `server/data.js`.
4. Create `views/pages/<page>.ejs`.
5. Ensure `getViewModel(...)` returns any required data.

## Adding A New Persisted Settings Section

1. Add defaults to `server/data.js`.
2. Add fields to `user_settings` in PocketBase.
3. Update `mapUserSettingsRecordToSettings(...)` in `server.js`.
4. Add a save route in `server.js`.
5. Add UI in `views/pages/settings.ejs`.
6. Add client submit handling in `views/layout.ejs`.

## Adding A New PocketBase Collection

Recommended process:

1. Define the collection and fields in PocketBase.
2. Add rules so users only access their own records when appropriate.
3. Add helpers in `server/pocketbase.js`.
4. Keep collection access out of templates.
5. Normalize data before putting it into session or view models.

## Extending Chat

Good extension points:

- `generateChatReply(...)` in `server.js`
  Current prompt composition + model call
- `getSessionSettings(req)`
  Current place where model and memory settings are pulled together
- `/chat/send`
  Current orchestration point for message handling

Recommended future refactors:

- extract prompt composition into `server/prompts/`
- extract model providers into `server/llm/`
- add separate provider adapters for:
  - Ollama local
  - Ollama cloud
  - OpenAI-compatible endpoints

## Adding Tools To Chat

The UI already exposes tool selection, but it is not yet used by the chat request.

Recommended path:

1. Include selected tool in the chat form POST.
2. Save it in session or request payload.
3. Extend prompt generation to mention the active tool.
4. Later, route tool-aware requests through actual tool integrations.

## Adding Durable Memories

Current intentional behavior:

- actual memories are local-only

If this changes later, define the policy clearly first:

- local-only
- encrypted server-side
- user-controlled sync

Do not silently move local sensitive memories into PocketBase without explicit product/security direction.

## Improving The Client Script

Right now `views/layout.ejs` contains a large shared inline script. It works, but it will become harder to maintain as the app grows.

Recommended next refactor:

- move page logic into `public/` modules such as:
  - `public/auth.js`
  - `public/settings.js`
  - `public/chat.js`
  - `public/sidebar.js`

Then keep `layout.ejs` responsible only for bootstrapping.

## Legacy Frontend Code

There is still older static app code under `js/`.

Recommendation:

- either archive it under a `legacy/` folder
- or remove it once the EJS implementation is fully stable

That will reduce confusion about which runtime is authoritative.
