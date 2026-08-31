# Coding standards (review)

Apply when reviewing or finishing a change. Implementation agents: follow these; do not restate them in `AGENTS.md`.

## Exports and modules

- Named exports only — no default exports.
- Prefer pure functions in `src/services/*`. Wire VS Code APIs in `src/extension.ts` and `src/tree/*`.

## Types

- Avoid `any`. Prefer explicit types, `unknown`, or narrowed `Record<string, unknown>`.

## Tests

- New unit tests under `test/unit/`, named after the service (e.g. `fooBar.test.ts`).
- Use the existing mock: `test/helpers/register-vscode-mock.cjs` (via `npm run test:unit`).
- Do not treat empty `test/integration` or `test/e2e` as coverage.

## Done gate

After behavior changes, before claiming done:

1. `npm run compile`
2. `npm test`

## Do not commit

- `*.vsix` (gitignored)
- Secrets, PATs, Open VSX tokens
