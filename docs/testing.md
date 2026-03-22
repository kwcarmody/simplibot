# Testing

This document describes the current automated test suite for Pikori/simplibot, how to run it, and what each group of tests is intended to protect.

## Running the Test Suite

Run the full suite with:

```bash
npm test
```

This uses Node's built-in test runner:

```bash
node --test
```

You can also run an individual file:

```bash
node --test test/validation.test.js
```

Or use watch mode when supported by your local Node version:

```bash
node --test --watch
```

## Why These Tests Exist

The current suite is designed to create a practical safety net before larger refactors. The goal is not exhaustive coverage. The goal is to lock down the most important behavior so changes can be made without breaking core flows silently.

The suite currently emphasizes:

- application boot and route-level smoke coverage
- validation behavior
- search intent classification and grounded result shaping
- model request behavior and error handling
- tool execution helpers and configuration normalization
- extracted planner, policy, and orchestrator module behavior after the model-service modularization

## Current Test Files

### `test/app-smoke.test.js`
Protects the app from obvious startup regressions.

It verifies that:

- the Express app exports successfully from `server.js`
- the app can bind to an ephemeral port
- an unknown route returns a valid HTTP response instead of crashing the process

### `test/validation.test.js`
Protects the most basic settings and chat validation logic.

It verifies that:

- chat model configuration rejects missing provider/model/endpoint data
- cloud models still require an API token
- memory settings reject invalid max size and missing identity fields
- valid model and memory settings pass validation cleanly

### `test/web-search.test.js`
Protects the logic-heavy search classification and grounded formatting behavior.

It verifies that:

- greetings and personal/meta prompts do not trigger web search behavior
- stable historical prompts classify as `known_static`
- factual lookups classify as `encyclopedic_fact`
- local or time-sensitive prompts classify as `regional_live`
- grounded search results are normalized and deduplicated
- assistant-facing formatting remains sane for empty, factual, and event-style results

### `test/chat-routes.test.js`
Protects chat route guardrails.

It verifies that:

- unauthenticated chat sends are rejected
- empty authenticated chat messages are rejected
- unauthenticated chat resets are rejected

These tests are intentionally simple smoke checks, not full end-to-end session/auth coverage.

### `test/model-helpers.test.js`
Protects basic model request helper behavior.

It verifies that:

- chat endpoints are resolved correctly for default and OpenAI-style APIs
- model request headers include authentication only when appropriate

### `test/model-request.test.js`
Protects model HTTP request behavior more directly.

It verifies that:

- model requests are posted to the expected endpoint
- request payloads include model and message data
- the `think` flag is added when enabled for the default adapter flow
- failed model responses surface useful error messages
- empty model payloads fail loudly instead of silently returning junk

### `test/web-search-execute.test.js`
Protects the web-search tool's execution path.

It verifies that:

- invalid search configuration and empty queries are rejected
- strong search prompts auto-execute while greetings do not
- the configured search endpoint is called with expected query parameters
- encyclopedic searches are rewritten with the Wikipedia site filter
- failed search API calls surface useful errors

### `test/tool-definitions.test.js`
Protects small but important configuration parsing behavior.

It verifies that:

- valid JSON strings are parsed correctly
- invalid JSON falls back safely
- object input is returned unchanged
- falsy input uses the provided fallback value

## What the Current Suite Does Not Cover Yet

The current suite does **not** yet provide deep coverage for:

- PocketBase integration paths
- authenticated end-to-end chat flows with real session state
- EJS rendering details
- full tool planner execution inside `generateChatReply()`
- browser/UI interaction behavior

Those are reasonable next targets, but they are intentionally deferred until the current baseline is stable.

## Testing Philosophy for This Repo

A good test in this codebase should usually do one of these things:

- lock down behavior before refactoring
- guard high-risk orchestration or classification logic
- fail clearly when external-request behavior changes unexpectedly
- catch startup or routing regressions early

Avoid adding tests that are only checking implementation trivia, exact prompt prose, or styling details unless those things are genuinely critical behavior.
o tooling is unavailable
- internal search-meta questions can be answered locally without a model planner pass
- plain chat messages still fall back to the default non-tool flow

## What the Current Suite Does Not Cover Yet

The current suite does **not** yet provide deep coverage for:

- PocketBase integration paths
- authenticated end-to-end chat flows with real session state
- EJS rendering details
- full tool planner execution inside `generateChatReply()`
- browser/UI interaction behavior

Those are reasonable next targets, but they are intentionally deferred until the current baseline is stable.

## Testing Philosophy for This Repo

A good test in this codebase should usually do one of these things:

- lock down behavior before refactoring
- guard high-risk orchestration or classification logic
- fail clearly when external-request behavior changes unexpectedly
- catch startup or routing regressions early

Avoid adding tests that are only checking implementation trivia, exact prompt prose, or styling details unless those things are genuinely critical behavior.
