# Settings

## Overview

The Settings page currently has these sections:

- Model Settings
- Memory Settings
- Tools Settings
- Channel Settings
- Session & API

Only the first two sections currently save through dedicated server routes. The other sections are still mostly informational or placeholder UI.

## Current Persistence Status

### Persisted To PocketBase

- selected model reference in `user_settings.model`
- memory settings fields in `user_settings`

### Session/Display Only

- Tools Settings panel in the Settings page
- Channel Settings panel
- Session & API panel

Important distinction:

- per-user tool enablement does exist today, but it is managed through `/tools` and PocketBase tool preference records, not through the Settings page

## Model Settings

### Source Of Truth

The saved model selection is a relation to the PocketBase `models` collection.

The active session copy is derived through:

- `server/pocketbase.js`
- `server/lib/session.js`

### Fields Exposed In Session/UI

- selected model id
- provider
- model id
- display name
- base endpoint
- API key
- adapter key
- API type
- context window
- max tokens
- thinking support
- tool support
- optional input metadata

### Save Behavior

Route:

- `POST /settings/model`

Server flow:

1. Validate sign-in state.
2. Validate that a model id was submitted.
3. Load the selected model record from PocketBase.
4. Run a live connectivity test against that model's endpoint.
5. Save the selected model relation into `user_settings`.
6. Refresh the session copy of model settings from the selected record.
7. Return JSON to the page.

### Model Connectivity Test

Implemented in:

- `server/services/model.js`
  function: `testModelConnection(...)`

The server sends a real chat-style request using:

- selected model
- `messages`
- `stream: false`

## Memory Settings

### Defaults

- enabled: `false`
- max size: `100`
- user name: `User`
- user description: blank
- bot name: `Pikori`
- bot description: `You're a helpful robot assistant.`

### Save Behavior

Route:

- `POST /settings/memory`

Server flow:

1. Validate sign-in state.
2. Parse the submitted form values.
3. Validate memory settings.
4. Save the memory fields into `user_settings`.
5. Refresh the session copy of memory settings.
6. Return JSON to the page.

### Delete All Behavior

When the user clicks `Delete All` in the UI:

1. A confirmation modal appears.
2. If confirmed:
   - local memories are cleared from browser storage
   - the browser-visible memory count resets

This action does not currently wipe the server-side memory settings record itself. It clears the protected local memory list stored in the browser.

## Session & API Panel

This panel shows the active authenticated session context:

- API endpoint
- auth collection
- user
- token preview
- enabled features
- active tenant context, when available in the rendered view model

This panel is informational and useful for debugging the current session.

## Client Logic

Most interactive Settings behavior currently lives in:

- `views/layout.ejs`

It handles:

- async form POSTs
- inline validation errors
- toast feedback
- memory count from local storage
- memory delete modal behavior

## Related Runtime Behavior

Although not saved from the Settings page, these runtime areas depend on settings:

- chat reads model and memory settings from `req.session.ui.settings`
- model adapter choice comes from the selected model record
- tool availability in chat depends on loaded tenant tools and user tool preferences

## Extending Settings

To add a new persisted settings section:

1. Add UI in `views/pages/settings.ejs`.
2. Add defaults or fallback display shape in `server/data.js` if needed.
3. Add validation in `server/lib/validation.js` when appropriate.
4. Add a save route in `server/routes/settings.js`.
5. Save fields into the appropriate PocketBase collection.
6. Extend `mapUserSettingsRecordToSettings(...)` in `server/lib/session.js` if the values belong in session-backed settings.
7. Add client-side submit handling in `views/layout.ejs`.
