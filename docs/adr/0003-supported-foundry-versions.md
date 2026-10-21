# Support Foundry v12 and v13 until the table moves on

The system supports Foundry v12 and v13. Our own table's host runs v12, and its modules gate the upgrade, which goes v12 → v13 → v14, one step at a time. A version leaves support once the table no longer runs it, not when Foundry releases the next one.

Code that only one version needs is marked where it lives: a `*.v12.*` suffix on files only v12 uses (the current file has no suffix), and a `// v12:` comment on a branch inside shared code. When a version leaves support, one dedicated PR deletes every marked file and branch, and raises `compatibility.minimum` in `yaml/system.yml`.

## Consequences

- Each Foundry-dependent change is tested on both versions, and some features ship twice (the combat tracker and the effect sheet have a v12 template and a v13 one).
- Dropping a version is a search for its marker, not an archaeology session.
- v14 joins once v13 is the oldest version the table runs; the work it needs (AppV2 sheets, Node 24) is prepared ahead.
