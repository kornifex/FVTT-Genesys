# Code style

How code, commits and pull requests are written in this repo. A rule a tool can check lives in that tool's config (tsconfig, ESLint, Prettier, CI) and is not repeated here: this file covers judgement. The sources and the reasoning behind the general rules are in [`docs/research/code-style-state-of-the-art.md`](../research/code-style-state-of-the-art.md).

## The change

- Build what the issue asks for. Options, settings, flags, compatibility shims and features nobody asked for stay out.
- The diff stays inside the issue. When code you touch breaks a rule below, fix it in passing (scout rule) as long as the fix stays small, in a commit of its own. Sweeps over many files get their own PR.
- Structural changes (renames, moves, extractions, tidying) and behaviour changes go in separate commits, so a review can read them apart; a structural part of more than a few lines gets its own PR, since the squash merge folds commits together.
- When existing code breaks this file, write the new code to it and flag the old pattern in the PR, rather than copying it.
- An agent shows the output of the checks (see Git and pull requests) before saying the work is done.

## Architecture

- Domain logic lives in **deep modules**: pure functions over narrow types, unit-tested (`src/combat/InitiativeSlots.ts`, `src/dice/Check.ts`, `src/data/Skills.ts`). Foundry globals (`game`, `ui`, `canvas`, `CONFIG`) stay out of the logic; a module may expose one small function at its edge that reads them, like `worldCheckRules` in `Check.ts`.
- Foundry classes (documents, DataModels, sheets, apps) are **thin adapters**: they read Foundry state, call a module, and write the result.
- Vue components display state and delegate to modules.
- **Split for depth, not for length**, with no line limit on functions or files. Extract a function or a module when it can be understood without reading its caller, and its caller without it. A helper called once that hides nothing stays inline. A function or a layer that only passes its arguments on is removed: every module hides something.
- Inside a function, one level of abstraction, and names that state the intent.
- Names use the vocabulary of `GLOSSARY.md`.
- Supported Foundry versions are in ADR 0003. Code for a single version sits in a file suffixed with that version (`*.v13.*`) or behind a comment marked with it (`// v13:`), so it can be removed in one go.

## Duplication

- Search `src/` for an existing function before writing a new one.
- Duplicated knowledge (one Genesys rule written twice) is the problem; similar-looking code is not. Extract a shared function at the third occurrence, not the second.
- A shared function that needs a flag or a branch per caller is the wrong abstraction: inline it back into its callers.

## Types and validation

- **Parse at the boundary.** Data that comes from outside the code (socket and query payloads, world settings, imported JSON, document data before its DataModel) is parsed once where it enters, into a precise type; inner code receives that type and does not validate it again.
- Make illegal states unrepresentable: a discriminated union rather than a type full of optional fields.
- An `as` or a `!` carries a comment saying what the type system cannot see.

## TypeScript

- Named exports. A file exports what another file or a test imports, and nothing more.
- Functions over narrow types; a class only where Foundry requires one.
- Erasable syntax only (`erasableSyntaxOnly` in every tsconfig): no `enum`, no parameter properties, no runtime `namespace`, no `<T>value` assertions. The code stays typed JavaScript, as the e2e harness and the build scripts already need, since Node runs them by stripping their types.
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

- English, full sentences, explaining **why**: the Genesys rule, the Foundry constraint or bug, the difference between Foundry versions. The code says what.
- Short JSDoc on a module's exports and on the public methods of Foundry classes: the **contract** (what it guarantees, what it does with invalid input), not a paraphrase of the body.
- Clean code needs few comments. A comment that restates the code or narrates the change (« added », « now uses », « fixed ») is removed.
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

- **Fail fast.** Catch an error only where the code can handle it. A silent fallback value (an empty list, a `0`, a default object standing in for a failure) is a bug. Unexpected errors travel up to Foundry's handler, which logs them.
- **Expected failures are values.** A failure the rules expect (not enough Story Points, no valid target, a slot already taken) is returned as a `Result` or a union of error types, so the signature shows it and the caller must handle it. Exceptions are for bugs and Foundry failures.
- Logs go through `src/log.ts`, which prefixes `Genesys |`.
- An error the player must act on goes to `ui.notifications` with a localization key.
- A `catch` logs the error, or its comment says why the error is expected.

## Testing a change

- Test behaviour through a module's public interface. Mock only what lies outside the module (Foundry globals, sockets, the clock); the module's own collaborators run for real.
- A bug fix starts with a test that fails on the bug.
- A failing test is never weakened, skipped or deleted to make the suite pass. A test that is wrong is fixed, and the PR says why.
- No coverage threshold: these rules decide what gets tested, a percentage would push toward testing details.
- Module logic: unit tests.
- Vue components: component tests through their props, events and DOM, mounted with `@vue/test-utils` in happy-dom: the test file starts with `// @vitest-environment happy-dom`, before its `@file` line (`src/vue/components/ContextMenu.test.ts`).
- Behaviour that depends on Foundry (turns, sockets, rendering, sheets): add or extend its domain's scenario in `e2e/scenarios/` with `expect` steps, rather than a one-off scenario out of the repo. While iterating, run the part under change (`--part`) with the [e2e harness](../../e2e/README.md). Before opening the PR, run the domain's whole scenario once on each Foundry version `main` supports (ADR 0003), compared against `origin/main`, whose step log comes from the harness's cache once a run filled it, and put a before/after table in the PR's Evidence. `pnpm e2e:all` stays the release gate ([`releasing.md`](releasing.md)).
- Every behaviour change goes into the release's test checklist issue (labelled `ready-for-human`; #411 for 0.6.0): intended changes, divergences, and what to test. An item a test proves arrives ticked, with a link to it: `src/dice/Check.test.ts › "…"` or `e2e/scenarios/combat.ts › step "…"`. Only an item no test can prove (a look, a feel, an engine-specific bug) arrives unticked.
- The checklist's body is long: edit it with `pnpm checklist`, which never prints it. `pnpm checklist <issue> add <section.md>` inserts a section before the trailing `## #37 …` carry-over section; `pnpm checklist <issue> tick "<text>" --note "<test link>"` ticks the one unticked item containing the text, and fails when none or several do; `pnpm checklist <issue> show "<heading>"` prints one section (`"#470"` for `## #470 …`).
- Mechanical PRs (deletions, formatting, renames): CI plus a **smoke test** on each supported Foundry version: open each sheet type, roll a check, play a combat round. PRs that change the toolchain also compare the bundle and `system.json` before and after.

## Git and pull requests

- One issue, one branch, one PR. Branches are named `type/<issue>-slug` (`fix/58-roll-turn-events`).
- PRs are squash-merged, so the PR title becomes the commit on `main`. Titles follow Conventional Commits, `type(scope)!: imperative summary`, with the types and scopes listed in `.github/workflows/pr-title.yml`: `fix(combat): keep the turn on its slot when an Extra Slot is added`.
- `!` and a `BREAKING CHANGE:` paragraph mark what breaks a macro, a module or world data.
- The PR body starts with `Closes #n`, then **Summary**, **Evidence** and **Merge Danger** (Door: one-way or two-way; Blast Radius).
- Issues and PRs are assigned to whoever works on them: `--assignee @me` on `gh issue create` and `gh pr create`, `gh issue edit <n> --add-assignee @me` on an issue picked up. A PR gets the milestone of the release it ships in, like its issue (`--milestone 0.6.0` on `main`).
- Before pushing, run every step of `.github/workflows/ci.yml` locally, not only the tests: `pnpm lint`, `knip`, `i18n`, `format:check`, `typecheck`, `test` and `build`.
- To bring a PR branch up to date, merge `origin/main` into it and push, rather than rebasing and force-pushing: the squash merge leaves the merge commits out of `main` anyway.
- Once a PR is merged, check that its issue is closed: `Closes #n` sometimes leaves it open. Close it with `gh issue close <n> -R kornifex/FVTT-Genesys -c "Done in #<pr>."`.
- Commits and PRs end with their own content: no attribution trailers.
- Code, comments, docs, commits and PRs are written in English.
