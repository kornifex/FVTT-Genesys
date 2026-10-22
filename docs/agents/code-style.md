# Code style

How code, commits and pull requests are written in this repo. A rule a tool can check lives in that tool's config (tsconfig, ESLint, Prettier, CI) and is not repeated here: this file covers judgement.

When code you touch breaks a rule below, fix it in passing (scout rule) as long as the fix stays small next to the change. Sweeps over many files get their own PR.

## Architecture

- Domain logic lives in **deep modules**: pure functions over narrow types, unit-tested (`src/combat/InitiativeSlots.ts`, `src/dice/Check.ts`, `src/data/Skills.ts`). Foundry globals (`game`, `ui`, `canvas`, `CONFIG`) stay out of the logic; a module may expose one small function at its edge that reads them, like `worldCheckRules` in `Check.ts`.
- Foundry classes (documents, DataModels, sheets, apps) are **thin adapters**: they read Foundry state, call a module, and write the result.
- Vue components display state and delegate to modules.
- Names use the vocabulary of `GLOSSARY.md`.
- Supported Foundry versions are in ADR 0003. Code for a single version sits in a `*.v12.*` file or behind a `// v12:` comment, so it can be removed in one go.

## TypeScript

- Named exports. A file exports what another file or a test imports, and nothing more.
- Functions over narrow types; a class only where Foundry requires one.
- `type` aliases. Enumerations are literal unions or `as const` objects.
- Private members use `#private`.
- Types are named for what they are, without an `I` prefix.
- Prefer `unknown` and narrowing. An `any` carries `// eslint-disable-next-line @typescript-eslint/no-explicit-any -- <reason>`.
- Imports go through `@/` (and `@scss/` for styles).

## Files

- PascalCase for classes and domain modules (`GenesysCombat.ts`, `InitiativeSlots.ts`); camelCase for technical wiring: registration, config, helpers (`handlebars.ts`, `foundryGeneration.ts`); `N-kebab-case.ts` for migrations. A folder's `index.ts` registers it.
- Tests sit beside their source as `X.test.ts`, written with `describe`/`it` imported from `vitest`.
- A file starts with its imports, or with a one-line `/** @file … */` when the module needs an introduction its name doesn't give. Authorship lives in git and `LICENSE`.

## Comments

- English, full sentences, explaining **why**: the Genesys rule, the Foundry constraint or bug, the v12/v13 difference. The code says what.
- Short JSDoc on a module's exports and on the public methods of Foundry classes.
- Removed code leaves the file; git keeps it.

## Vue and SCSS

- `<script setup lang="ts">` and `<style lang="scss" scoped>`. An unscoped style says why in a comment.
- SCSS loads modules with `@use`.
- Vue drops the whitespace between two elements when it holds a line break, so a line Prettier breaks can lose or gain a visible space. Where it does, the element keeps its line under `<!-- prettier-ignore -->`.
- Prettier can't parse the Handlebars templates (blocks inside attributes, inline partials): they follow the same layout by hand.

## Text and i18n

- Every user-visible string goes through a localization key, in code and in templates.
- Keys are written as literals, so a search finds them. A dynamic key comes from a typed table that lists its values.
- `yaml/lang/en.yml` is the reference. `fr` is completed in the same PR; `es` when you can.

## Logs and errors

- Logs go through `src/log.ts`, which prefixes `Genesys |`.
- An error the player must act on goes to `ui.notifications` with a localization key.
- A `catch` logs the error, or its comment says why the error is expected.

## Testing a change

- Module logic: unit tests.
- Behaviour that depends on Foundry (turns, sockets, rendering, sheets): run it in Foundry v12 and v13 before opening the PR, with a scenario for the [e2e harness](../../e2e/README.md) compared against `origin/main`, and put a before/after table in the PR's Evidence.
- Every behaviour change goes into the release's test checklist issue (labelled `ready-for-human`; #37 for the next release): intended changes, divergences, and what to test.
- Mechanical PRs (deletions, formatting, renames): CI plus a **smoke test** in v12 and v13: open each sheet type, roll a check, play a combat round. PRs that change the toolchain also compare the bundle and `system.json` before and after.

## Git and pull requests

- One issue, one branch, one PR. Branches are named `type/<issue>-slug` (`fix/58-roll-turn-events`).
- PRs are squash-merged, so the PR title becomes the commit on `main`. Titles follow Conventional Commits, `type(scope)!: imperative summary`, with the types and scopes listed in `.github/workflows/pr-title.yml`: `fix(combat): keep the turn on its slot when an Extra Slot is added`.
- `!` and a `BREAKING CHANGE:` paragraph mark what breaks a macro, a module or world data.
- The PR body starts with `Closes #n`, then **Summary**, **Evidence** and **Merge Danger** (Door: one-way or two-way; Blast Radius).
- Commits and PRs end with their own content: no attribution trailers.
- Code, comments, docs, commits and PRs are written in English.
