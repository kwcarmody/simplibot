# LLM And Chat

## Overview

The Chat view is backed by:

- server session chat history
- model settings loaded from `user_settings`
- memory settings loaded from `user_settings`
- an Ollama-compatible HTTP chat call

## Chat UX

Current behavior:

- chat is empty by default
- a centered friendly prompt tells the user to type below
- user messages are appended to the thread
- a temporary assistant spinner bubble appears while waiting
- assistant replies are appended after the model returns
- `+ Session` clears the chat history for the current login session

Chat history remains available while the user navigates around the app, until:

- logout
- or `+ Session`

## Routes

### `POST /chat/send`

Responsibilities:

1. Validate sign-in state.
2. Validate message text.
3. Validate that model settings are usable.
4. Append the user message into `req.session.chat.messages`.
5. Generate the model request payload.
6. Call the configured model endpoint.
7. Append the assistant reply into session.
8. Return the full chat message list as JSON.

### `POST /chat/reset`

Responsibilities:

- clear `req.session.chat.messages`

## Prompt Assembly

Prompt construction now happens in:

- `server/prompts/chat.js`
  functions: `buildChatSystemPrompt(...)` and `buildChatMessages(...)`

Model calling remains in:

- `server/services/model.js`
  function: `generateChatReply(...)`

## Persona And Memory Context

The server injects these settings into the system prompt:

- `Bot name`
- `Bot description`
- `User name`
- `User description` if present

Current system prompt structure is conceptually:

```txt
Your name is <Bot name>.
You are <Bot description>.
The user's name is <User name>.
User description: <User description>.
Be helpful, concise, and conversational.
```

That system message is prepended ahead of the conversational turns.

## Message History Sent To The Model

The payload includes:

- one `system` message
- the session chat history mapped into:
  - `user`
  - `assistant`

## Ollama-Compatible Payload

Current request shape:

```json
{
  "model": "<selected-model>",
  "stream": false,
  "messages": [
    {
      "role": "system",
      "content": "..."
    },
    {
      "role": "user",
      "content": "..."
    },
    {
      "role": "assistant",
      "content": "..."
    }
  ]
}
```

This is sent to the configured endpoint. If the endpoint does not already end with:

- `/api/chat`
- or `/v1/chat/completions`

the app currently appends:

- `/api/chat`

## Response Parsing

The server currently accepts either of these shapes:

- `data.message.content`
- `data.choices[0].message.content`

That allows compatibility with both Ollama-style and OpenAI-like chat response shapes.

## Current Limitations

- Tool selection in the chat composer is not yet part of the model request.
- Memory list from local protected storage is not yet injected into the prompt.
- Chat history is session-scoped, not durable across logout.
- There is not yet a server-side prompt templating layer beyond `generateChatReply(...)`.

