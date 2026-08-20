# Turistguide Maps CLI Contract

## Identity
- Executable: `turistguide-maps`
- Consumers: agents, scripts, and maintainers managing the PostgreSQL itinerary store.
- Entry point: `node bin/turistguide-maps.mjs`; it loads `.env` then `.env.local`.
- Runtime: Node.js, TypeScript via the repository's `tsx`, Effect and Drizzle repositories.

## Commands
- Discovery: `commands`, `schema`.
- Plans: `plan list|get|create|update|delete`.
- Days: `day add|update|remove`.
- Stops: `stop add|update|remove|audio`.
- Reads use explicit identifiers such as `--slug`, `--day`, and `--stop-id`.
- Writes take `--input <file|->`, a JSON object. File paths resolve only below the caller's current directory; `-` explicitly reads stdin.

## Output and failures
- Every successful command writes one JSON envelope to stdout:
  `{"ok":true,"type":"...","schemaVersion":1,"data":{},"meta":{}}`.
- `--raw` omits the trailing newline. `--select field,field` projects top-level fields. `plan list` defaults to `--limit 50`, maximum 100.
- Diagnostics and errors are written only to stderr. A non-zero command writes one error envelope and no stdout.
- Exit codes: `0` success, `2` invalid input, `3` missing configuration, `5` not found or conflict, `1` unexpected failure.

## Side effects
- `plan delete`, `day remove`, and `stop remove` return a preview until passed an exact `--confirm` identifier.
- Creation rejects an existing day number or a duplicate stop title. Existing plans/stops are changed only with an explicit update command.
- `DATABASE_URL` is mandatory for any data command. Credentials are never emitted.

## Verification
- Process-level tests exercise help/discovery and error envelopes.
- Use `npm run test:run` and `npm run build` before release.
