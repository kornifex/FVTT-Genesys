# Support Foundry v12 on a maintenance branch once main moves to v14

Our own table's host runs Foundry v12, and its modules gate the upgrade, which goes v12 → v13 → v14, one step at a time. The system follows the table on two release lines:

- **0.4.0** ships from `main` with v12 and v13.
- **`0.4.x`**, cut from the 0.4.0 tag, keeps v12 and v13 and only takes the fixes the table needs. It is retired once the table runs v13.
- **`main`** then drops v12 and adds v14: from 0.5.0 on, one build declares `minimum: 13`, `verified: 14`.

A version leaves `main` when Foundry has moved past it and the table has a line that still runs it, not when Foundry releases the next one.

Code that only one version needs is marked where it lives: a `*.v12.*` suffix on files only v12 uses (the current file has no suffix), and a `// v12:` comment on a branch inside shared code. When a version leaves `main`, one dedicated PR deletes every marked file and branch, and raises `compatibility.minimum` in `yaml/system.yml`.

## Manifests

Foundry updates a system from the manifest URL it installed, and `yaml/system.yml` points to `releases/latest`.

- `main`'s releases are the latest. A v13 world gets 0.5.0 through `releases/latest`; a v12 world is offered a release with `minimum: 13`, which Foundry should refuse as incompatible (to check on the e2e harness, #106).
- `0.4.x`'s releases are published without `--latest`. The table installs each one from its versioned manifest, `releases/download/v0.4.<n>/manifest.json`.

The branch is named `0.4.x`, not `release/0.4.x`: the old `release` branch already holds that ref prefix.

## Considered options

- **Keep v14 on its own branch, and `main` on v12 and v13 until the table moves on.** New work would land on the line with no future, `main` would be merged into the v14 branch for months, and both lines would compete for `releases/latest`, so a v13 world could be offered a v14-only release.
- **Keep v12 on a maintenance branch, and move `main` to v13 and v14.** Chosen: new work goes on the line with a future, the v12 line only takes fixes for one table for a short time, and v13 worlds keep updating through `releases/latest`.

## Consequences

- Until 0.4.0, each Foundry-dependent change is tested on v12 and v13, and some features ship twice (the combat tracker and the effect sheet have a v12 template and a v13 one). From 0.5.0 on, `main` tests on v13 and v14.
- A fix the table needs is made on `main` and backported to `0.4.x` while the two lines share the code.
- Dropping a version is a search for its marker, not an archaeology session.
- The vendored Foundry types are replaced when v12 leaves `main` (ADR 0005).
