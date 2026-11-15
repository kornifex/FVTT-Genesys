# Support only Foundry v14, with no maintenance line for v13

Supersedes ADR 0003's rule for when a version leaves `main`. ADR 0003 dropped a version once a maintenance line kept it for our own table. The table has run Foundry v14 since 0.5.0's table tests, so no line needs v13. From 0.7.1 on, `main` supports v14 alone (`minimum: 14`), and 0.7.0 is the last release for v13. v13 cost every Foundry-dependent change a second branch and every e2e scenario a second run: 31 `isFoundryV13()` checks in 11 files, 3 `*.v13.*` files and about 30 `// v13:` comments in `src`, as many again in `e2e`.

## Rule

A version leaves `main` when the table no longer runs it. A maintenance line is cut only if the table still runs the version at that point. The markers of `docs/agents/code-style.md` stay, so the next version to leave is found the same way.

## Version

Dropping v13 breaks a v13 world, which in 0.x calls for a minor version: release-please computes 0.8.0. The release is 0.7.1 instead, forced with `release-as`, because our table is the system's only known user: it ships with the fixes 0.7.1 already held, and no one else waits on a version number.

## Manifests

A v13 world reads `releases/latest`, is offered 0.7.1 with `minimum: 14`, and Foundry refuses it as incompatible, as it refused 0.5.0 on v12 (#106). The world keeps 0.7.0, which `releases/download/v0.7.0/manifest.json` still installs.

## Data a dropped version stored

Foundry v14 migrates in `migrateData` the core data v13 stored: an effect's `changes` move to `system.changes`, a numeric `mode` becomes a `type`, a string value is parsed, a duration's `rounds` become a `value` and `units`. The data only the system wrote for v13 goes through a system migration, never through runtime code: migration 8 turns the `flags.genesys.expired` flag into v14's `duration.expired`. After it, no code reads a shape v13 stored, and a world that goes from v13 with 0.7.0 to v14 with 0.7.1 in one step is migrated on its first load.

## Considered options

-   **Keep a 0.7.x line for v13.** The system is listed publicly (ADR 0008), so v13 worlds we don't know of may exist, but each fix would be ported by hand, with no table to test it on.
-   **Keep v13 on `main` until v15 ships.** Two branches and two e2e runs per change for a version the table left.
-   **Keep reading the v13 flag at runtime, without a marker.** Legacy code with no end; the migration reads it once.
-   **Release it as 0.8.0, as release-please computes.** The version would say what breaks, for users we don't have.

## Consequences

-   0.7.0 doesn't say it is the last release for v13: the decision came after it. 0.7.1's notes and welcome message say it needs v14.
-   0.7.1 also removes what v13 shaped on the v14 side: the APIs v14 deprecates and the abstractions that only bridged the two versions. The AppV1 styling of the Vue sheets goes in a later release (#838).
-   The e2e run v14 only. The jump from v13 is covered by migration 8's unit tests and one manual check on 0.7.1's checklist.
