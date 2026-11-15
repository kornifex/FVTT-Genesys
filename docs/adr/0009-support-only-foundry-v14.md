# Support only Foundry v14, with no maintenance line for v13

Supersedes ADR 0003's rule for when a version leaves `main`. ADR 0003 dropped a version once a maintenance line kept it for our own table. The table has run Foundry v14 since 0.5.0's table tests, so no line needs v13. From 0.8.0 on, `main` supports v14 alone (`minimum: 14`), and the last 0.7.x release is the last one for v13. v13 cost every Foundry-dependent change a second branch and every e2e scenario a second run: 31 `isFoundryV13()` checks in 11 files, 3 `*.v13.*` files and about 30 `// v13:` comments in `src`, as many again in `e2e`.

## Rule

A version leaves `main` when the table no longer runs it. A maintenance line is cut only if the table still runs the version at that point. The markers of `docs/agents/code-style.md` stay, so the next version to leave is found the same way.

## Manifests

A v13 world reads `releases/latest`, is offered 0.8.0 with `minimum: 14`, and Foundry refuses it as incompatible, as it refused 0.5.0 on v12 (#106). The world keeps its 0.7.x, which `releases/download/v0.7.<n>/manifest.json` still installs.

## Data a dropped version stored

Foundry v14 migrates in `migrateData` the core data v13 stored: an effect's `changes` move to `system.changes`, a numeric `mode` becomes a `type`, a string value is parsed, a duration's `rounds` become a `value` and `units`. The data only the system wrote for v13 goes through a system migration, never through runtime code: migration 8 turns the `flags.genesys.expired` flag into v14's `duration.expired`. After it, no code reads a shape v13 stored, and a world that goes from v13 with 0.7.x to v14 with 0.8.0 in one step is migrated on its first load.

## Considered options

-   **Keep a 0.7.x line for v13.** The system is listed publicly (ADR 0008), so v13 worlds we don't know of may exist, but each fix would be ported by hand, with no table to test it on.
-   **Keep v13 on `main` until v15 ships.** Two branches and two e2e runs per change for a version the table left.
-   **Keep reading the v13 flag at runtime, without a marker.** Legacy code with no end; the migration reads it once.

## Consequences

-   The last 0.7.x release says, in its notes and welcome message, that it is the last for v13 and that 0.8.0 needs v14.
-   0.8.0 also removes what v13 shaped on the v14 side: the APIs v14 deprecates, the abstractions that only bridged the two versions, and the AppV1 styling of the Vue sheets.
-   The e2e run v14 only. The jump from v13 is covered by migration 8's unit tests and one manual check on 0.8.0's checklist.
