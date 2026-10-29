# Type the system against fvtt-types for Foundry v14

Supersedes ADR 0005. Now that `main` supports v13 and v14 (ADR 0003), we replace the vendored v12 types in `types/foundry` and the v13 layer in `types/foundry-v13` with the League of Foundry Developers' `fvtt-types`, built for Foundry v14. ADR 0005 planned to measure the build for the oldest supported version, v13. We measured it, the v14 build, and the declarations Foundry v14 ships with its client code. Both `fvtt-types` builds cost about 620 errors, and Foundry's declarations about 980. We chose the newest version over the oldest: only the v14 build is still maintained, and it is the one that sees the v14 changes behind the bugs of the first v14 runs (#241–#244).

## Measurements (2026-10-29)

`vue-tsc --noEmit` on `ca871c7`, which has 0 errors with the vendored types (4 `any`, 30 `as unknown as`, 2 `@ts-expect-error`). `src/global.d.ts` was rewritten as `fvtt-types` configuration (`DocumentClassConfig`, `DataModelConfig` for every actor and item type, `SettingConfig` for every setting, `CONFIG.genesys`, `AssumeHookRan` set to `ready`). Foundry's own declarations can't be configured that way, so only `CONFIG.genesys` was declared for them.

|                                                                      | `fvtt-types` v14 (`14.369.0-beta.20261027165341`) | `fvtt-types` v13 (`13.346.0-beta.20251209192131`) | Foundry 14.369's `.d.mts` |
| -------------------------------------------------------------------- | ------------------------------------------------- | ------------------------------------------------- | ------------------------- |
| Type errors                                                          | 613 in 110 files                                  | 626 in 115 files                                  | 979 in 117 files          |
| Base classes and their subclasses (`DataModel`, `Combatant`, sheets) | 62                                                | 66                                                | 92                        |
| Global and namespace names only the vendored types declare           | 77                                                | 77                                                | 139                       |
| Null and undefined checks                                            | 113                                               | 104                                               | 31                        |
| Sheet, directory and tracker classes                                 | 57                                                | 64                                                | 59                        |
| Documents read back as `Stored<…>` or `never` (Combat, Combatant)    | 32                                                | 36                                                | —                         |
| `override` modifiers                                                 | 19                                                | 20                                                | 17                        |
| Data models                                                          | 17                                                | 15                                                | 62                        |
| Fields and methods missing from documents (`name`, `id`, `update`)   | 17                                                | 17                                                | 351                       |
| Other kinds, mostly assignment and argument mismatches               | about 220                                         | about 230                                         | about 230                 |

The rows are buckets of the compiler's messages. The missing names are 23 globals (`DocumentModificationContext`, `DeepPartial`, `ConstructorOf`…) and a few namespace members. Many errors follow from a few roots: 23 generic-arity errors on the base classes (`DataModel`, `Combatant`, `DocumentSheetV2`) leave 11 data models extending nothing, and their members then report errors of their own. By folder, the v14 errors sit in the Vue sheets and components (254), `actor` (91), `item` (78), `combat` (76) and `effects` (31), and the remaining 83 in 12 smaller folders and files; the files with the most are `GenesysCombat.ts` (45), `AdversarySheet.vue` (41), `TalentsTab.vue` (25), `InventoryItem.vue` (24) and `SkillsTab.vue` (23). With either build, the `@ts-expect-error` on the read-only `turn` in `GenesysCombat.ts` becomes unneeded. A document's `system` reads as an empty object, because the data models extend `DataModel` instead of `TypeDataModel` (#246). `ui.combat` stays the core Combat Tracker type, because our `UiApplications` declaration doesn't configure it.

The vendored types accepted the code behind the four bugs of the first v14 runs (#241–#244). With `fvtt-types`:

-   The global `Die` (#241) is missing from both builds, as from Foundry's declarations, so `GenesysDie extends Die` would not have compiled. The lint rule of #245 already rejects it and the other deprecated globals, whatever the types.
-   The v14 build declares the static `ActiveEffect.applyChange` that v14 calls instead of the instance `apply` (#242), so `GenesysEffect.applyChange` needs `override`. It also makes the effect sheet's `changes` read-only, which v14 moved to `system.changes` (#243). The v13 build has neither, and no lint rule sees a moved member or field.
-   v14 renamed the fields of the combat tracker's menu entries (`name` to `label`, `callback` to `onClick`), so the system missed core's reroll entry (#244). The v14 build declares the new names, which the v13 build rejects on the system's v14 branch.

## Considered options

-   **`fvtt-types` for v13, the oldest supported version, as ADR 0005 planned.** Its last build is from 2025-12-09, a beta with no v14 APIs, so the v14 branches, where #241–#244 were, would need local declarations.
-   **`fvtt-types` for v14.** Chosen. New betas follow Foundry's builds, and 14.369's came out two days before this measurement. Typing against the newer version shows where the older version's APIs went away. The v13-only code is small and marked for deletion: 9 `// v13:` comments in 6 files, and the roll-mode calls `eslint.config.ts` lists. It gets local declarations or narrow casts, deleted with its markers when v13 leaves `main`.
-   **Foundry's own declarations.** Foundry 14.369 ships 735 `.d.mts` beside its client and common code, emitted by its `tsconfig.json`. Foundry 13.348 ships only 2 global declarations, so v13 has no API declarations at all. 63 of the v14 files contain `typeof X.__#45@#name` for private static members, which neither TypeScript 5.6 (the version Foundry pins) nor 6.0 parses, so they have to be patched first. Even then, the emit drops what defines a document: schema fields are declared at runtime, and the members the client mixins add (`update`, `getFlag`) are missing too. They can't be configured with the system's document classes either. They sit in the licensed install, so CI could only use them if we committed them or gave CI a licence.
-   **Keep the vendored v12 types.** They are two versions behind, and they accepted the code that broke on v14. Every v13 or v14 API the system calls would go into a local layer that grows with each Foundry version.

## Consequences

-   #375 makes the swap in one move: `types/foundry`, `types/foundry-v13` and the vendored `Config` in `src/global.d.ts` go together, and the errors above are fixed in the same PR. #246 then moves the data models onto `TypeDataModel`.
-   `fvtt-types` is pinned to an exact v14 beta and updated when `yaml/system.yml` verifies a newer Foundry build. The types follow the newest version `main` supports.
-   Its three git dependencies (forks of `pixi.js`, `@pixi/basis` and `@pixi/particle-emitter`) need `blockExoticSubdeps: false` in `pnpm-workspace.yaml`, without which pnpm 12 refuses them. The setting applies to every package's subdependencies, so the lockfile review covers them. The package adds 6.4 MB and 153 packages.
-   The `fvtt-types` README dropped its request not to give its source to an AI (commit "Remove AI section", 2026-05-10). Agents may read its `.d.mts` as they read Foundry's client code.
