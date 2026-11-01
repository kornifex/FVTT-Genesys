# Contributing
Thanks for helping keep the Genesys system going. Bug reports, feature requests and pull requests are all welcome, with no guarantee on response time.

## Reporting a bug or suggesting a feature
Open an [issue](https://github.com/kornifex/FVTT-Genesys/issues/new/choose) with the bug report or feature request form. Search the open issues first: if yours is already there, add what you saw as a comment. You can write issues in English or in French.

## Before you start
- For anything bigger than a small fix, open an issue or comment on one first, so we agree on the change before you write it.
- The Genesys Core Rulebook is the authority for the rules the system implements. A deliberate departure from it is a House Rule, which the GM usually turns on in the world settings.
- Some requests have been considered and left out for now: see [`.out-of-scope/`](.out-of-scope).
- The system keeps the id `genesys`, so existing worlds must keep working: a change to how data is stored keeps older data readable, with a migration in `src/migrations/` when it needs one.

## Setting up
You need Node 24 (see `.nvmrc`), pnpm (the version in `package.json`'s `packageManager`, which `corepack enable` provides), and a Foundry v13 or v14 install.

```sh
corepack enable
pnpm install
pnpm build
```

`pnpm build` writes the system to `dist/`. Back up and remove any installed `genesys` system, then link the build into your Foundry data folder, so Foundry lists the system:

```sh
ln -s "$PWD/dist" /path/to/foundrydata/Data/systems/genesys
```

To work with live reload, start Foundry on its default port (30000), run `pnpm dev`, and open <http://localhost:30001>. Vite serves the system from the sources and passes everything else to Foundry. If Foundry runs elsewhere, set `VITE_PROXY_HOST` and `VITE_PROXY_PORT` in a `.env` file at the root.

## Project layout
| Path | Holds |
| --- | --- |
| `src/` | The system's code, by domain: `actor`, `item`, `combat`, `dice`, `effects`, `migrations`… The entry point is `src/Genesys.ts`. |
| `src/vue/` | The sheets and windows, as Vue components ([ADR 0004](docs/adr/0004-vue-for-sheets.md)). |
| `public/` | Handlebars templates and assets, copied as they are. |
| `yaml/system.yml` | The system manifest, built into `system.json`. |
| `yaml/lang/` | Translations. `en.yml` is the reference. |
| `packs/` | Compendium sources, built into LevelDB packs. |
| `e2e/` | The end-to-end harness, which runs scenarios in real Foundry. |
| `GLOSSARY.md` | The domain vocabulary: names in code, docs and issues follow it. |
| `docs/adr/` | The decisions behind the architecture and the release lines. |

## Making a change
[`docs/agents/code-style.md`](docs/agents/code-style.md) describes how code, commits and pull requests are written here. It is written for coding agents, but it applies to every contributor. In short:

- Domain logic lives in pure, unit-tested modules; Foundry classes and Vue components stay thin and call them.
- Every user-visible string goes through a localization key in `yaml/lang/en.yml`. Add the French one too if you can; otherwise say so in the pull request.
- Comments are in English, and explain why: the Genesys rule, or the Foundry constraint.
- Code for a single Foundry version is marked with that version ([ADR 0003](docs/adr/0003-supported-foundry-versions.md)), so it can be removed in one go.

### Testing
- Module logic gets unit tests, beside its source as `X.test.ts` (Vitest).
- Behaviour that depends on Foundry (sheets, turns, sockets) gets `expect` steps in its domain's scenario in `e2e/scenarios/`, run with the [e2e harness](e2e/README.md). The harness needs licensed Foundry installs; if you can't run it, describe how you tested the change in Foundry, on which versions.

### Checks
CI runs these on every pull request. Run them before you push:

```sh
pnpm lint
pnpm knip
pnpm i18n
pnpm format:check   # pnpm format fixes it
pnpm typecheck
pnpm test
pnpm build
```

## Pull requests
- Branch from `main`, and name the branch `type/<issue>-slug`, such as `fix/58-roll-turn-events`. Fixes for Foundry v12 go to the `0.4.x` line: ask in the issue first.
- One issue, one branch, one pull request.
- Pull requests are squash-merged, so the title becomes the commit on `main` and the changelog entry. It follows [Conventional Commits](https://www.conventionalcommits.org/), `type(scope): summary`, starting with a lowercase letter and ending without a period: `fix(combat): keep the turn on its slot when an Extra Slot is added`. The scopes are `combat`, `dice`, `actor`, `item`, `effects`, `vehicle`, `migration`, `i18n` and `ui`. A check enforces it.
- A change that breaks a macro, a module or world data adds `!` to the type and a `BREAKING CHANGE:` paragraph.
- The body starts with `Closes #<issue>`, then a **Summary**, the **Evidence** (tests, and what you checked in Foundry), and the **Merge Danger**: whether the change can be undone, and what it can break.
- Don't change the version or `CHANGELOG.md`: release-please writes both ([releasing](docs/agents/releasing.md)).

## Rules for every contribution
- Only use FontAwesome Free icons. Foundry also displays FontAwesome Pro ones, but its license doesn't cover third-party systems: see [FontAwesome](README.md#fontawesome) in the README.
- If you adapt code from another source, add its license to the [Further Licenses](README.md#further-licenses) section of the README, with a license file next to the code where it applies.
- Unless its license says otherwise, a contribution falls under the project's [MIT License](LICENSE).
- AI-assisted contributions are accepted, as long as you say so in the pull request, and you have reviewed and tested the changes yourself.
- Contributors who act in a bad faith, hateful, or otherwise harmful manner will be blocked from making future contributions. This includes notable behavior outside this system and its community.
