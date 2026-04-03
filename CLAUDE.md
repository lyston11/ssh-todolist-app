# Project Rules

## Environment

- All development, testing, and tooling must run inside the `conda` environment `ssh-todolist`.
- Do not install dependencies into `base`.
- Prefer `conda run -n ssh-todolist ...` when a shell is not already activated.

## Temporary Files

- Temporary scripts, smoke-test files, scratch notes, exported debug data, and one-off verification artifacts must be deleted after use.
- Generated caches and transient build artifacts must not be left in the project unless the user explicitly wants them kept.
- Before finishing a task, clean up obvious temporary outputs created during debugging or validation.

## Architecture

- Keep the app modular. Avoid mixing API calls, realtime sync, state, offline queueing, and DOM rendering into one undifferentiated file.
- Preserve the separation between `api`, `realtime`, `state`, `offline`, and `ui`.
- The app must integrate with the backend through explicit HTTP / WebSocket contracts, not repo-local assumptions.

## Change Discipline

- Make incremental changes that preserve working behavior.
- Keep verification steps scoped to the feature being changed.
