# Active KB MVP Plan

## Goal

Make Theora usable from any directory by adding a persistent global `activeKb`, a small saved KB registry, and commands to manage them:

```bash
theora kb use /path/to/knowledge-base
theora kb list
```

This MVP does not include shell keybindings, a terminal widget, or interactive multi-KB selection. It adds one global active KB plus a lightweight list of known KBs.

## Current State

- Theora is already globally installable as the `theora` binary.
- Most KB-aware commands resolve the active knowledge base from `process.cwd()` by walking upward until they find `.theora/config.json`.
- If no KB is found from the current directory, commands fail with "Not inside a knowledge base."
- Theora already uses `~/.theora/` for global state, so this is the right place to store a persistent active KB.

## MVP Scope

### In scope

- Persist a global `activeKb` path in `~/.theora/config.json`
- Persist a lightweight `knownKbs` list in `~/.theora/config.json`
- Add `theora kb use <path>` to validate, save, and activate that path
- Add `theora kb list` to show saved KBs and mark the active one
- Update KB resolution so commands fall back to `activeKb` when no KB is found from the current directory
- Show the active KB in `theora settings`
- Add tests for KB resolution precedence and `kb use` validation
- Document the new workflow in `README.md`

### Out of scope

- Shell integration (`theora shell install`, keybindings, widgets)
- `--kb <path>` flags on every command
- Interactive chooser when no active KB is set
- Auto-detection of "best" KB outside the current directory

## Desired Behavior

### Resolution order

For this MVP, KB resolution should work in this order:

1. Nearest KB from the current working directory
2. Global `activeKb` from `~/.theora/config.json`
3. Error if neither exists

This keeps current behavior intact inside a KB while adding the minimum fallback needed to run from anywhere.

### `theora kb use`

Command contract:

```bash
theora kb use /path/to/kb
```

Behavior:

- Resolve the provided path to an absolute path
- Verify that the path exists
- Verify that the path is a valid Theora KB by checking for `.theora/config.json`
- Create `~/.theora/` if it does not exist
- Add or update the KB in `knownKbs`
- Write `activeKb` to `~/.theora/config.json`
- Print the selected KB path and KB name

### `theora kb list`

Command contract:

```bash
theora kb list
```

Behavior:

- Read `knownKbs` from `~/.theora/config.json`
- Print KB name and path for each saved KB
- Mark the active KB clearly
- Show a helpful empty state if no KBs have been saved yet
- Make the active KB visible here instead of requiring a separate `kb current` command

## Implementation Plan

### 1. Add global config helpers

Create a small module for global config, for example:

- `src/lib/global-config.ts`

Responsibilities:

- Resolve `~/.theora/config.json`
- Read config safely when missing
- Write config atomically enough for a local CLI
- Define a typed shape such as:

```ts
interface GlobalConfig {
  activeKb?: string
  knownKbs?: Array<{
    name: string
    path: string
  }>
}
```

This should stay separate from per-KB config in `src/lib/config.ts`.

### 2. Refactor KB resolution

Update `src/lib/paths.ts` so KB resolution can fall back to the global config.

Recommended changes:

- Keep the current upward search logic as a separate helper, such as `findKbRootFrom(startDir)`
- Add a new `findActiveKbRoot(from = process.cwd())`
- Make `requireKbRoot()` use `findActiveKbRoot()`

Rules:

- Prefer the nearest KB from the current directory
- Only fall back to `activeKb` if no local KB is found
- If `activeKb` is set but invalid, fail with a clear error explaining how to fix it with `theora kb use <path>`

This keeps the existing call sites mostly unchanged.

### 3. Add `kb` command

Create a new command module:

- `src/commands/kb.ts`

Subcommands:

- `theora kb use <path>`
- `theora kb list`

Wire it into:

- `src/index.ts`

Validation for `kb use`:

- Path exists
- Path is a directory
- Path contains `.theora/config.json`

Output should confirm:

- KB root path
- KB name from the KB config if available

Behavior for `kb list`:

- Read the saved KB registry
- Mark the active entry
- Handle missing or stale entries predictably

### 4. Update settings output

Extend `src/lib/settings.ts` and `src/commands/settings.ts` to display:

- Whether a global config file exists
- The configured `activeKb`, if any
- How many saved KBs exist
- Whether the current session resolved the KB from cwd or global fallback

This will make the feature debuggable without guesswork.

### 5. Add tests

Add focused tests around resolution and validation. Suggested coverage:

- Finds local KB when running inside a KB
- Falls back to global `activeKb` when outside a KB
- Errors when global `activeKb` points to a missing path
- Errors when `kb use` points at a non-KB directory
- Persists absolute paths, not relative paths
- `kb use` upserts into `knownKbs` without duplicating the same path
- `kb list` marks the active KB correctly

If test coverage for command modules is awkward, prioritize testing the new helpers in `src/lib/`.

### 6. Update docs

Update `README.md` with a short section like:

```bash
theora kb use ~/research/my-kb
theora ask "what are the main themes?"
```

Explain that:

- Inside a KB, local discovery still wins
- Outside a KB, Theora uses the globally selected `activeKb`

## File-Level Change List

- `src/lib/paths.ts`
- `src/lib/settings.ts`
- `src/commands/settings.ts`
- `src/index.ts`
- `README.md`
- `src/commands/kb.ts` (new)
- `src/lib/global-config.ts` (new)
- Tests under `src/lib/` or `src/commands/`

## Risks

### Stale global path

If a user moves or deletes the selected KB, every command from outside a KB will fail until they reset `activeKb`.

Mitigation:

- Validate on read
- Return a precise error with the stored path
- Tell the user to run `theora kb use <path>` again

### Stale saved KB entries

If a user moves or deletes a previously saved KB, `kb list` can show dead entries.

Mitigation:

- Mark missing paths clearly in `kb list`
- Do not silently delete entries
- Keep cleanup as a later enhancement

### Confusing precedence

Users may forget that cwd-based resolution still overrides the global KB.

Mitigation:

- Show the KB source in `theora settings`
- Keep the resolution order simple and document it clearly

## Acceptance Criteria

- `theora kb use /valid/kb/path` saves a persistent active KB
- `theora kb use /valid/kb/path` also saves that KB in the registry
- `theora kb list` shows saved KBs and identifies the active one
- Running `theora ask ...` from outside any KB uses that active KB
- Running from inside a KB still uses the local KB
- Invalid active KB state produces a clear fix-forward error
- `theora settings` makes the active KB visible
- README documents the new flow

## Suggested Branch Goal After This MVP

Once this lands, the next feature can safely build on it:

- `theora shell install`
- keybinding-triggered ask flow
- optional named KB registry
