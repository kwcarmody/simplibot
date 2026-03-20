# Settings

## Overview

The Settings page currently has these sections:

- Model Settings
- Memory Settings
- Tools Settings
- Channel Settings
- Session & API

Only some sections currently persist real data.

## Current Persistence Status

### Persisted To PocketBase

- Model Settings
- Memory Settings

Saved into:

- `user_settings`

### Session/Display Only

- Tools Settings
- Channel Settings
- Session & API

These currently render values, but do not yet have full persistence logic.

## Model Settings

### Fields

- Provider
  - `None`
  - `Ollama-Cloud`
  - `Ollama-Local`
- Model
  Depends on provider.
- API Endpoint
- API Token
  Required only for cloud models.

### Save Behavior

Route:

- `/settings/model`

Server flow:

1. Validate required fields.
2. Run a live model connectivity test.
3. Upsert model fields into `user_settings`.
4. Update session copy of settings.
5. Return JSON response to the page.

### Model Connectivity Test

Implemented in `server.js`.

The server sends a real chat-style request to the configured endpoint using:

- selected model
- `messages`
- `stream: false`

This matches the current Ollama-compatible integration pattern.

## Memory Settings

### Defaults

- enabled: `false`
- memories saved: `0`
- max size: `100`
- user name: `User`
- user description: blank
- bot name: `Pikori`
- bot description: `You're a helpful robot assistant.`

### Save Behavior

Route:

- `/settings/memory`

Server flow:

1. Validate fields.
2. Save memory settings fields into `user_settings`.
3. Update session copy of settings.

### Delete All Behavior

When the user clicks `Delete All`:

1. A confirmation modal appears.
2. If confirmed:
   - local memories are cleared from browser storage
   - memory settings are reset to defaults
   - default settings are saved back to PocketBase

## Session & API Panel

This panel shows the active authenticated session context:

- API endpoint
- auth collection
- user
- token preview
- enabled features

This is informational and is useful for debugging the current user/session context.

## Client Logic

The interactive behavior for settings currently lives in:

- `views/layout.ejs`

It handles:

- provider-dependent model field visibility
- async form POSTs
- inline validation errors
- toast feedback
- memory count from local storage
- memory delete modal behavior

## Extending Settings

To add a new persisted settings section:

1. Add UI in `views/pages/settings.ejs`
2. Add defaults in `server/data.js`
3. Add save route in `server.js`
4. Save fields into `user_settings`
5. Extend `mapUserSettingsRecordToSettings(...)`
6. Add client-side submit handling in `views/layout.ejs`

This is the current established pattern.
