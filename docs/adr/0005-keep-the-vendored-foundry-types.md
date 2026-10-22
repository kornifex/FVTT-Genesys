# Keep the vendored Foundry types until v12 leaves support

`types/foundry` holds 309 files of pre-v13 Foundry types taken from the pf2e system. We measured a swap to the League of Foundry Developers' `fvtt-types` and keep the vendored types for now: the swap costs about 900 type errors, can only target one Foundry version while we support two (ADR 0003), and its v13 types are still in beta. What the vendored types lack for v13 we declare ourselves, in a thin layer beside them. We measure again once v12 leaves support and the sheets are on ApplicationV2.

## Measurements (2026-10-22)

`fvtt-types` configured with the system's document classes, data models and `CONFIG.genesys`, on the code of `43a7631`:

|                                                                                             | v13 (`13.346.0-beta.20251209192131`) | v12 (`12.331.5`) |
| ------------------------------------------------------------------------------------------- | ------------------------------------ | ---------------- |
| Type errors                                                                                 | 951 in 119 of 170 files              | 851 in 118 files |
| Data models (abstract fields, `parent`)                                                     | 88                                   | 86               |
| Sheets through the `VueSheet` mixin (`actor`, `_onDropItem`, `defaultOptions`)              | 91                                   | 91               |
| Global names only pf2e declares (`DocumentModificationContext`, `DropCanvasData`, 33 names) | 80                                   | 67               |
| Missing `override` modifiers                                                                | 60                                   | 57               |
| Null and undefined checks                                                                   | 34                                   | 31               |
| Documents read back as `Stored<…>` or `never` (Combat, Combatant)                           | 49                                   | —                |
| Other kinds, mostly assignment and argument mismatches (rows are buckets of the messages)   | about 550                            | about 520        |
| Removing `@ts-nocheck` from the v13 combat tracker, on top of the total                     | +36                                  | —                |

By folder, the v13 errors sit in the Vue sheets (230), `actor` (222, mostly the sheet classes and data models) and `combat` (119); the files with the most are `AdversarySheet.vue` (70), `CharacterSheet.ts` (61), `GenesysCombat.ts` (57) and `GenesysCombatTracker.v12.ts` (48). Without configuration, v13 gives 1328 errors. With `fvtt-types`, two of the four `@ts-expect-error` become unneeded (the read-only `turn` in `GenesysCombat.ts`, the `legacyTransferral` setting in `effects/index.ts`). The code had 5 `any`, 31 `as unknown as` and one `@ts-nocheck` at the time.

## Considered options

- **Adopt `fvtt-types`.** It declares globals of the same names as the vendored types, so only one Foundry version can be typed at a time: the v13 types break the `*.v12.*` files and the v12 types break the v13 combat tracker and effect sheet. The v13 types are a beta with no build since December 2025, while v14 betas ship, and v12 support is partial; the v12 package's entry point is broken, so `types: ["fvtt-types"]` fails and the package has to be imported. From v13 on, the package pulls three git dependencies (forks of pixi.js) that pnpm 12 refuses unless `blockExoticSubdeps` is turned off. Its README also forbids giving its source to an AI, because it carries Foundry's documentation, so an agent would fix its errors from compiler messages alone.
- **Write our own thin types for everything.** It would replace 309 files with what the system calls, but rewrite the same ground the vendored types already cover for v12.
- **Keep the vendored types and add what v13 needs.** Chosen: no churn while two versions are supported, and the sheets, which hold about a third of the errors, are rewritten onto ApplicationV2 (#71) anyway.

## Consequences

- The v13 APIs the system uses (ApplicationV2 and its document sheets for #71, the v13 combat tracker, the `legacyTransferral` setting) get local declarations (#91), so the `@ts-nocheck` in `GenesysCombatTracker.ts` and the `@ts-expect-error` in `combat/index.ts` and `effects/index.ts` can go.
- When v12 leaves support, the vendored types and those declarations are replaced in the same move, and `fvtt-types` for the then-oldest version is measured again (#92).
