# What a new system id forces to migrate in a world

Research for [#605](https://github.com/kornifex/FVTT-Genesys/issues/605), part of the map [#601](https://github.com/kornifex/FVTT-Genesys/issues/601) (list the system under a new id, or stay off the registry). It revisits the claim of [ADR 0002](../adr/0002-publish-fork-under-genesys-id.md) that "a new id would force a risky migration of every existing world".

Sources, read on 2026-11-09:

-   This repository at `108e981` (`main`, 0.6.0-rc.1). References are `file:line` on that commit.
-   Foundry's **client-side** source of the local installs, v14.369 (`~/Developer/kornifex/foundry/foundryvtt-14`) and v13.348 (`…/foundryvtt`): the `client/`, `common/` and `templates/` folders, which the server sends to every browser. Paths below are relative to an install. No server-side code (`dist/`, `main.mjs`) was read.
-   Foundry's Knowledge Base and API documentation, community precedents, and third-party modules' public repositories, linked where used.

Claims marked **inference** are our reading of several sources together; claims marked **unconfirmed** have no primary source.

## Summary

-   **Foundry offers no way to move a world to another system.** The Knowledge Base says the game system "cannot be changed once the game world is created" ([Game Worlds](https://foundryvtt.com/article/game-worlds/)), and the Edit World form disables the system field (`templates/sidebar/apps/world-config.hbs:14`, v13 and v14). The only path is editing `"system"` in the world's `world.json` while Foundry is stopped, as Project FU did when it renamed `fabulaultima` to `projectfu` ([migration tutorial](https://github.com/League-of-Fabulous-Developers/FoundryVTT-Fabula-Ultima/wiki/Migration-Tutorial)). A world whose system isn't installed can't be launched (`MISSING_SYSTEM`).
-   **What Foundry itself ties to the id is small:** the world's `system` (and the `system` of its own compendium packs in `world.json`), the id of the system's pack (`genesys.crb-skills`, so every `Compendium.genesys.crb-skills…` uuid), the `systems/genesys/` URL, and the flag scopes `getFlag`/`setFlag` accept. Flag **data** under `genesys` survives a change of system; only the `getFlag` API refuses the scope.
-   **Everything else is our own convention:** the settings namespace, the sheet scope, `CONFIG.genesys`, the query names, the `genesys.pool.*` effect keys, the CSS classes and Palette, the Dice So Nice ids, the drag format and the i18n keys. Each can keep `genesys` or follow the new id. One cost decides for the settings: a setting whose namespace is neither the system's id nor a module's shows under an **"Unmapped"** tab in Configure Settings.
-   **A world stores, under `genesys`:** 15 world settings (and each browser 5 client settings), 3 live flags plus 4 legacy combat flags, sheet choices (`genesys.<SheetClass>`), uuids of the Skills Compendium in item stats, rich text, the Skills Compendium setting and the compendium configuration, and whatever macros or modules hard-code. Actor and item `type`s and `system` data don't depend on the id. The system ships no images, so no document points into `systems/genesys/`.
-   **Trap:** with a new settings namespace, the system would read the world's last Alpha notice as `0.0.0`, take an old world for a new one (`src/settings/alpha.ts:20-22`) and record every data migration as run without running it. Any migration of the id must copy the settings before `alphaNotice` and `migrations` read them.
-   **Third-party modules** written for Genesys (three, by Stormyvil) declare `relationships.systems: [{ id: "genesys" }]`, hard-code `systems/genesys/templates/…`, `CONFIG.genesys` and `genesys.pool.*`. Under a new id their manifests no longer name our system; the table's own modules declare no relationship on `genesys`.
-   **Options** (detailed at the end): a one-time migration inside the system after a hand edit of `world.json` (A), an offline script on the stopped world (B), a migrator module that copies the world into a new one (C), a period reading both namespaces (D), or a new package id that keeps `genesys` as the data namespace (E). A combination of A and E migrates the least: `world.json` by hand, the 20 settings and the sheet choices in code, uuids through Foundry's `CONFIG.compendium.uuidRedirects`, and flags left where they are.

## Part 1: what the codebase ties to `genesys`

`git grep -i genesys` matches about 270 files, almost all of them the word "Genesys" (class names, i18n keys, comments). The table keeps the places where `genesys` is a **namespace**: an identifier Foundry, a world or another package reads. "Id-bound" says whether Foundry ties it to the package id; "Stored" says whether a world keeps it.

| What | Where | Id-bound | Stored in worlds |
|---|---|---|---|
| Package id | `yaml/system.yml:1` | yes | `world.json` `system` |
| Pack `system` field and pack id | `yaml/system.yml:28-32`: `crb-skills`, `system: genesys`; Foundry names it `genesys.crb-skills` (`common/packages/base-package.mjs:151`) | yes | uuids, settings (below) |
| Default Skills Compendium | `src/settings/table.ts:58` `'genesys.crb-skills'` | yes (pack id) | world setting `genesys.skillsCompendium` once set |
| Paths `systems/genesys/…` | 15 literals in 10 runtime files: `src/alphaNotice.ts:26`, `src/app/StoryPointTracker.ts:161`, `src/combat/GenesysCombatTracker.ts:56-57`, `src/dice/CheckRoll.ts:14-15`, `src/dice/index.ts:34`, `src/effects/GenesysEffectSheet.ts:149`, `src/fonts/index.ts:12`, `src/item/ChatCards.ts:62,78,128,184`, `public/templates/chat/rolls/attack.hbs:35`, `public/templates/sidebar/combat/tracker.hbs:4` | yes (install folder) | no |
| Dev server and harness | `vite.config.ts:34,39-40` (`base`, proxy), `e2e/server.ts:28` (copies `dist` to `systems/genesys`), `CONTRIBUTING.md:25` (symlink) | yes | the harness worlds' `world.json` (outside the repo) |
| CSS `url()` of fonts | `src/fonts/scss/*.scss`, relative `assets/fonts/…` | no | no |
| World settings, namespace `genesys` | `NAMESPACE` at `src/settings/index.ts:11`; registered at `src/settings/index.ts:31`, `src/settings/alpha.ts:28,36`, `src/settings/storyPoints.ts:40`; typed at `src/global.d.ts:32,85-87`. 15 world settings: the 12 of `src/settings/table.ts:88-227`, `storyPoints`, `alphaVersion`, `migrationVersion` | no (convention, see below) | world `Setting` documents `genesys.<key>` |
| Client settings, namespace `genesys` | 5 settings, `src/settings/table.ts:230-282` | no | each browser's `localStorage`, key `genesys.<key>` |
| Document flags, scope `genesys` | `Actor` `independentMinion` (`src/operations/CloneActor.ts:24`, `src/vue/sheets/actor/MinionSheet.vue:12`); `ActiveEffect` `expired` (`src/effects/GenesysEffect.ts:34,51,56-57`, `src/effects/GenesysEffect.v13.ts:48`); `Item` `archetypeGrant` (`src/actor/data/character/Archetype.ts:136,151`); typed at `src/global.d.ts:80-81` | `getFlag`/`setFlag` only | `flags.genesys.*` |
| Legacy combat flags | `Combat` `slotClaims`, `extraSlots`, `claimants`, `Combatant` `initiativeSkill`, read and deleted by migration 6 (`src/migrations/6-combat-system-data.ts:5-15,35,52`, `src/migrations/index.ts:87,94`) | no | worlds not yet on 0.6.0 |
| Socket channel | none since the queries replaced it; 0.3.0 had `socket: true` and `system.genesys` (`release-0.3.0:src/socket/index.ts:12`) | (was yes) | no |
| Acting GM queries | `genesys.spendStoryPoint`, `genesys.claimInitiativeSlot`, `genesys.writeExtraSlotInitiative` (`src/queries/ActingGmQuery.ts:9-13`), keys of `CONFIG.queries` | no | no (in flight only) |
| Sheet scope | `registerSheet('genesys', …)`: `src/actor/sheets/index.ts:14`, `src/item/sheets/index.ts:36`, `src/effects/index.ts:12`. Foundry names each sheet `genesys.<class name>` (`client/applications/apps/document-sheet-config.mjs:413`) | no | `flags.core.sheetClass` of a document whose sheet was chosen by hand; world setting `core.sheetClasses` |
| `CONFIG.genesys` | `src/config.ts:22`; about 45 references in 21 files | no | no |
| Pool Modification effect keys | `genesys.pool.(check\|char\|skill).(self\|target)…`: `src/effects/PoolModifications.ts:142-144`, `src/effects/GenesysEffectSheet.ts:72-90` | no | `changes[].key` of every Active Effect that modifies a dice pool |
| CSS classes, Palette, Style | class `genesys` on sheets and tooltips (`src/actor/GenesysActorSheet.ts:20`, `src/item/GenesysItemSheet.ts:47`, `src/app/StoryPointTracker.ts:39`, `src/vue/components/Tooltip.vue:31`, `src/scss/nav.scss:5`, `src/scss/tooltip.scss:4`); `--genesys-<name>` properties and `data-genesys-style` (`src/scss/theme.scss:6-13`, `src/settings/table.ts:224`); Style value `'genesys'` (`src/settings/table.ts:219`) | no | the Style value; a GM's custom CSS may target them |
| Dice So Nice | systems `genesys`, `genesys-mg`, dice `genesys-<die>` (`src/dice/diceSoNice.ts:59-106`) | no | each user's Dice So Nice appearance flags name the dice system |
| Drag format | `genesys/<type>/<uuid>` (`src/data/DragTransferData.ts:17,34`) | no | no |
| i18n | about 770 `Genesys.*` key literals, `TYPES.*` (`build/i18nKeys.ts:3`); system document types are not prefixed by the id | no | no |
| Handlebars helpers, globals | generic helper names (`src/handlebars.ts`); no `game.genesys`, no `window` global | — | — |
| Release | `genesys.zip` (`.github/workflows/release.yml:85,91`, `build/releaseManifest.ts:9`, `yaml/system.yml` `download`), `package.json:2`, `release-please-config.json:8` | no (names only) | no |
| Pack sources | `_stats.systemId: genesys` in the 37 `packs/crb-skills/*.yml` | no (informational) | — |
| End-to-end tests | about 40 `game.settings.get/set('genesys', …)`, `'genesys.crb-skills'`, flag reads (`e2e/page.ts:628,633`, `e2e/scenarios/*.ts`) | follows the code | — |

### What Foundry enforces, and what it doesn't

-   **Flag scopes.** `getFlag`, `setFlag` and `unsetFlag` throw `Flag scope "…" is not valid or not currently active` unless the scope is `core`, `world`, the running system's id or an active module's (`common/abstract/document.mjs:948-949,975-976,995-996`; the list at `client/data/client-backend.mjs:646-653` in v14, `:480` in v13). The data itself survives: `flags` is a `DocumentFlagsField` that only checks each scope is a valid package-id string (`common/data/fields.mjs:4036-4057`). Reading `document.flags.genesys` or `_source.flags.genesys` and writing `update({ 'flags.genesys.x': … })` keep working under another system. **Inference** from the client code; the server's own validation was not read.
-   **Settings namespaces.** `ClientSettings#register` accepts any namespace (`client/helpers/client-settings.mjs:125-161`, same in v13 at `:130`). A setting stays readable while registered. An unregistered world setting keeps its `Setting` document, readable raw through `game.settings.storage.get('world').getSetting('genesys.<key>')` (`client/documents/collections/world-settings.mjs:35-47`); without a registration its value isn't cast (`client/documents/setting.mjs:24-34`, `_castType`). The cost of a foreign namespace is the Configure Settings window: it files settings by namespace, under the system's tab only when it equals `game.system.id`, else under a module's, else under **"Unmapped"** (`client/applications/settings/config.mjs:145-157`).
-   **Sheet ids.** The scope is a free string. A document whose `core.sheetClass` names no registered sheet falls back to the default sheet of its type (`client/documents/abstract/client-document.mjs:255-268`).
-   **Compendium uuids.** A system pack's id is `<package id>.<pack name>`; a world pack's is `world.<name>`, whatever the system (`common/packages/base-package.mjs:151`). Foundry v13 and v14 have `CONFIG.compendium.uuidRedirects`: "Redirect UUIDs from one compendium to another", configured before `ready` (`client/config.mjs:109-126` in v14, `:100-117` in v13), applied by `parseUuid` (`common/utils/helpers.mjs:1329`) to every uuid it resolves. A redirect `"Compendium.genesys.crb-skills" → "Compendium.<id>.crb-skills"` would keep old links working without rewriting them. **Unconfirmed** for each path that bypasses `parseUuid`, if any; the pack's document ids stay the same, since `packs/crb-skills/*.yml` keep their `_id`.
-   **`_stats.systemId`.** Foundry stamps every new document with the running system's id (`common/data/fields.mjs:4074`), but the client code reads it only to fill an export's `exportSource` (`client/documents/abstract/client-document.mjs:943-948`). Old documents keeping `genesys` there is harmless as far as the client goes.

## Part 2: what a world stores that depends on the id

| Stored | Where in the world | What breaks under a new id |
|---|---|---|
| The world's system | `world.json` `"system": "genesys"`, `"systemVersion"` | The world needs the `genesys` system to launch. |
| World compendium packs | `world.json` `packs[].system`; Foundry fills it with the world's system (`common/packages/base-package.mjs:565-579`) | Their `system` still says `genesys`. The Project FU tutorial replaces "each one of" the `"system"` lines. Whether Foundry hides a world pack whose `system` differs is **unconfirmed** (server-side). |
| World settings | `data/settings`, keys `genesys.<key>` | The system reads its defaults: Skills Compendium, difficulty, house rules, Style, Story Points, and `alphaVersion`/`migrationVersion` (the trap above). |
| Client settings | each browser's `localStorage`, `genesys.<key>`, shared by every world of that server origin | Each player loses their 5 dice prompt and symbol preferences. |
| Document flags | `flags.genesys` of actors (and their tokens' deltas), items, effects, combats | `getFlag('genesys', …)` throws: a minion's independence, an expired effect, an Archetype's granted items. |
| Effect change keys | `changes[].key` `genesys.pool.*` | Nothing, unless the prefix changes. |
| Sheet choices | `flags.core.sheetClass` per document, `core.sheetClasses` per type | The default sheet opens instead, if the scope changes. |
| Compendium uuids | `_stats.compendiumSource` of items dragged from the pack (`client/documents/abstract/world-collection.mjs:115`), older `flags.core.sourceId`, `@UUID[Compendium.genesys.crb-skills…]` in journal pages, item descriptions, chat messages | Broken links and lost provenance, unless redirected. Characters' skills are copied with `toObject()` (`src/actor/data/CharacterDataModel.ts:180-188`): **inference**, they carry no `compendiumSource`. |
| Compendium configuration | world setting `core.compendiumConfiguration`, keyed by pack id (`client/documents/collections/compendium-collection.mjs:788-799`) | The pack's folder, lock and ownership choices are lost. |
| Paths | `systems/genesys/…` | Nothing: the system ships no images, and its documents use Foundry's `icons/`. Chat messages hold rendered HTML, which uses no path into the system. |
| Actor and item types, `system` data | `type: character`, `system.*` | Nothing: system document types aren't prefixed, and the code is the same. |
| User macros | `data/macros`, `command` text | Any macro calling `game.settings.get('genesys', …)`, `getFlag('genesys', …)`, `game.packs.get('genesys.crb-skills')` or `systems/genesys/…` breaks. `CONFIG.genesys` keeps working if kept. |
| Dice So Nice | users' Dice So Nice flags name the dice system | Nothing, if the Dice So Nice ids stay. |
| Third-party modules | their manifests, their own code | See below. |

### Third-party modules

-   Three listed modules by Stormyvil target Genesys: [Genesys Status Effects](https://github.com/Stormyvil/Genesys-Status-Effects), [Genesys Weapon Qualities](https://github.com/Stormyvil/Genesys-Weapon-Qualities) and [Automated Animations – Genesys Support](https://github.com/Stormyvil/Genesys-Automated-Animations), all at 1.0.1, verified on Foundry 13. Each `module.json` declares `"relationships": { "systems": [{ "id": "genesys", … }] }`.
-   Their code hard-codes our conventions: Status Effects writes `genesys.pool.check.self.`, `genesys.pool.skill.target.<skill>` effect keys; Weapon Qualities renders `systems/genesys/templates/chat/rolls/attack.hbs` and reads `CONFIG.genesys?.settings?.showAttackDetailsOnFailure`. Keeping `CONFIG.genesys` and `genesys.pool.*` keeps those reads working; the template path can't be kept.
-   `relationships.systems` restricts where a module can be enabled ([module development guide](https://foundryvtt.com/article/module-development/): "used as a restriction to prevent activation of a module for systems that the module does not support"). The table saw it with Pax Elfica, whose v13 and v14 versions are restricted to other systems and can't be enabled in a Genesys world (`.scratch/foundry-v14/map.md`, "Table modules"). **Inference:** under a new id, these three modules can't be enabled until their author adds the id.
-   The table's modules (Dice So Nice, Simple Calendar Reborn, fr-core, libWrapper, Custom CSS…) declare no relationship on `genesys`. Custom CSS rules written by the GM may target `.genesys` or `--genesys-*`.

### What Foundry offers

-   **No built-in migration.** "Game System: … This is required for a game world, and cannot be changed once the game world is created", and "you cannot change the game data path or game system once a Game World has been created" ([Game Worlds](https://foundryvtt.com/article/game-worlds/)). The Edit World form shows the system as a disabled select (`templates/sidebar/apps/world-config.hbs:14`; `client/applications/sidebar/apps/world-config.mjs:114-128`). The package manifest schema has no alias or "replaces" field (`common/packages/base-package.mjs`, `base-system.mjs`, `base-world.mjs`).
-   **Editing `world.json`.** `system` is a plain required string checked against package-id syntax (`common/packages/base-world.mjs:21`; [WorldManifestData](https://foundryvtt.com/api/interfaces/foundry.packages.types.WorldManifestData.html)). Editing it while Foundry is stopped is what Project FU told its users to do ([migration tutorial](https://github.com/League-of-Fabulous-Developers/FoundryVTT-Fabula-Ultima/wiki/Migration-Tutorial)): back up, open `Data/worlds/<world>/world.json`, replace each `"system": "fabulaultima"` with `"system": "projectfu"`, relaunch. On The Forge, which gives no file access, they export the world as a zip, edit it, and import it again. A Forge forum answer gives the same two facts, from users: the system can't be changed in Foundry, and the `world.json` edit works ([Forge forum](https://forums.forge-vtt.com/t/changing-a-system-when-cloning-a-world/12307)).
-   **A world whose system is missing** gets the availability code `MISSING_SYSTEM` (`common/packages/base-world.mjs:105-106`, `common/constants.mjs:885`): the Setup screen shows an error badge "requires" the system id (`client/packages/world.mjs:35-43`, `client/packages/client-package.mjs:87-93`) and the Knowledge Base says the world "may not properly launch" until its system is installed ([Game Worlds](https://foundryvtt.com/article/game-worlds/)). Same in v13 and v14. Both systems can be installed side by side, in `systems/genesys` and `systems/<id>`, so a world can be switched back by editing `world.json` again.

### Precedents

-   **Project FU** (Fabula Ultima) renamed its id from `fabulaultima` to `projectfu` in 2.1.0 (2024). Users edited `world.json`; the system ran no code to move namespaced data. Its code still holds one old key, `'fabulaultima.recentChecks'` (`module/checks/check-prompt.mjs`, found with `gh search code`). The tutorial warns that some documents "do not retain certain changes through a reload" and advises duplicating them, though that part concerned a data-model change from their legacy build. ([migration tutorial](https://github.com/League-of-Fabulous-Developers/FoundryVTT-Fabula-Ultima/wiki/Migration-Tutorial))
-   **L5R4 World Migrator** ([listing](https://foundryvtt.com/packages/l5r4-migrator), [repository](https://github.com/ernieayala/l5r4-migrator)) moves worlds from `l5r4` to the separate system `l5r4-enhanced` on Foundry 13: "You can't switch an existing world from l5r4 to l5r4-enhanced - Foundry doesn't allow it." The module exports the old world's data to a file, and imports it into a new world created on the new system. It copies characters, items, scenes, journals, folders and ownership; it leaves out compendiums, module settings, macros and chat history. The old world stays as a backup.

## Part 3: migration options

Every option starts the same way for the table: back up the world, install the new system by its manifest URL next to `genesys`, and keep `genesys` installed for a rollback. Every option also has to answer two questions that need no code: which manifest URL the new id publishes under (below), and what the three Stormyvil modules do.

### A. One-time migration inside the system, after a hand edit of `world.json`

The table edits `world.json` (`"system"` and each world pack's `"system"`), then launches the world as GM. On `ready`, before `alphaNotice` and the data migrations read anything, the Acting GM's client:

1. copies each `genesys.<key>` world setting from the raw `Setting` documents to `<id>.<key>` (or registers the old keys under `genesys`, hidden, to read them cast), then deletes or ignores the old ones;
2. moves `flags.genesys` to `flags.<id>` on world actors, their items and effects, unlinked tokens' deltas, world items, combats and combatants, and the documents of world compendiums (unlocking them, as `src/migrations/index.ts:45-58` does for actors);
3. rewrites `genesys.<Sheet>` in `core.sheetClasses` and in `flags.core.sheetClass`, the `genesys.crb-skills` key of `core.compendiumConfiguration`, and the Skills Compendium setting;
4. rewrites `Compendium.genesys.` in `_stats.compendiumSource` and rich text, or leaves them to a permanent `uuidRedirects` entry;
5. warns about macros whose command mentions `genesys`.

Each player's client copies its own 5 client settings from `localStorage` on its first load.

-   **For the table:** one file edit per world, one launch as GM. On The Forge, an export, edit and import.
-   **Risks:** the largest code of all options, to test on copies of real worlds (the e2e harness can: seed a world on `genesys`, switch `world.json`, run). A half-run migration leaves a world split across two namespaces; it needs the same resumable chain as the current migrations (`runMigrationChain`). The existing framework walks actors only; items, combats and compendium items need new walkers. Forgetting the ordering trap skips every pending data migration silently. The system can't edit `world.json` itself: the client has no API for it.

### B. Offline script on the stopped world

A Node script reads `world.json` and the world's LevelDB collections (`data/actors`, `data/items`, `data/settings`…), rewrites `system`, flags, setting keys, sheet ids and uuids, and writes them back. `@foundryvtt/foundryvtt-cli` reads and writes LevelDB packs; **inference:** world collections use the same key format (`!actors!<id>`), as `packs/` do.

-   **For the table:** stop Foundry, run a command on the host's data folder, relaunch. Impossible on The Forge or any host without a shell; our host is another player's machine.
-   **Risks:** it writes Foundry's internal storage, whose format Foundry documents only for packs, and must be kept in step with each Foundry version. It can't reach the players' `localStorage`. Nobody on the table runs Node today.

### C. A migrator module

As the L5R4 World Migrator: a module, active in the old world on `genesys`, exports its documents; the same module, in a new world created on the new system, imports them and rewrites namespaces on the way.

-   **For the table:** no file editing, works on The Forge. Creating a new world, two exports and imports, reconfiguring modules and settings.
-   **Risks:** a second package to build, release (and list, under the AI Content Policy if listed). Copying a world faithfully is much harder than it looks: ids (`keepId`), links between documents, scenes and tokens, chat, macros, playlists, calendar notes, user ownership, settings of every module. The L5R4 migrator leaves several of these out. The table's campaign would move to a world with a new id.

### D. A period that accepts both namespaces

The new system reads `flags.<id>` and falls back on `flags.genesys`, reads `<id>.<key>` and falls back on `genesys.<key>`, writes only the new namespace, and moves each document as it's updated.

-   **For the table:** the `world.json` edit, nothing else.
-   **Risks:** every read site gets a fallback (and `getFlag` can't be one: it throws for `genesys`), documents nobody touches never move, so the fallback never goes away. It is option A spread over every release instead of one.

### E. A new package id, `genesys` kept as the data namespace

Only what Foundry ties to the id changes: `system.yml`'s `id`, the `systems/<id>/` paths, the pack id (with a permanent `CONFIG.compendium.uuidRedirects` entry from `Compendium.genesys.crb-skills`) and the default Skills Compendium. Flags stay under `genesys`, read through `flags.genesys` instead of `getFlag` (3 call sites: `src/effects/GenesysEffect.ts:34,56`, `src/vue/sheets/actor/MinionSheet.vue:12`; the writes already use `flags.genesys` paths). The sheet scope, `CONFIG.genesys`, the effect keys, CSS and Dice So Nice ids stay.

-   **For the table:** the `world.json` edit; the system fixes the Skills Compendium setting and `core.compendiumConfiguration` on the first launch.
-   **Risks:** settings registered under `genesys` land under "Unmapped" in Configure Settings, so they can't stay as they are: either the 20 settings move to the new namespace (option A's step 1, the simplest step of all), or the system shows them in its own settings menu. The system writes flags under another package's id, against Foundry's own advice ("Flags set by game systems or modules should use the canonical name attribute for the module", `Document#setFlag`'s JSDoc, `common/abstract/document.mjs:964`); no running package can collide with it, since a world runs one system and module ids are another namespace (**unconfirmed**). It relies on behaviour the API doesn't promise: unvalidated flag paths and setting namespaces.

### Comparison

| | A | B | C | D | E (+ settings from A) |
|---|---|---|---|---|---|
| Table's work | edit `world.json`, launch | stop, run a script | new world, export, import | edit `world.json` | edit `world.json`, launch |
| Works on The Forge | via export/import | no | yes | via export/import | via export/import |
| Code to write | large | large | largest | spread everywhere | small |
| Data left behind | none, if complete | none, if complete | what the copy skips | untouched documents | flags stay under `genesys` by design |
| Rollback | restore the backup | restore the backup | the old world stays | restore the backup | edit `world.json` back, settings aside |

### The manifest URL

`yaml/system.yml` points `manifest` at `releases/latest/download/manifest.json`. An install of `genesys` checks that URL for updates. If the new id's releases took it over, an existing `genesys` install would read a manifest of another id. What Foundry does then is **unconfirmed** (the update logic is server-side). **Inference:** the new id needs its own manifest asset name, and the `genesys` line a last release whose welcome message says how to move.

## Open questions

-   Does the server hide or refuse a world compendium whose `system` no longer matches the world's? Needs a test on a world copy.
-   What does Foundry do when an installed package's manifest URL returns a manifest with another id? Decides the manifest naming above.
-   Does any path resolve compendium uuids without `parseUuid`, so that `uuidRedirects` misses it (drag and drop from chat, `@UUID` enrichers, `fromUuidSync`)? Needs a test.
-   Do all clients, not only the Acting GM's, need the settings copied before `ready`, given `alphaNotice` runs on every client?
-   Will Stormyvil add the new id to their three modules? Their last release is 7 months old and verified on Foundry 13 only.
-   Does the host's setup allow editing `world.json` (self-hosted on another player's machine, per the table's notes), or must the GM send them the edit?
