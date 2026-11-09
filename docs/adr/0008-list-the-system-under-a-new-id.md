# List the system in the Foundry package registry under a new id

Supersedes ADR 0002. The registry listing for `genesys` belongs to Assembling Kings, who won't hand it over; it still offers 0.2.18, for Foundry 12–13, so a table on Foundry v14 that searches the registry finds no Genesys system it can play. We list this system under a new package id, so other tables can find and install it from Foundry. Foundry ties little to the id: the world's system, the compendium pack ids, the `systems/<id>/` paths, the flag scopes `getFlag` and `setFlag` accept, and where Configure Settings files our settings. The rest of our data (`CONFIG.genesys`, flag data, i18n keys, effect keys, CSS classes) can keep `genesys` as its namespace, so moving a world costs a hand edit of its `world.json` and a copy of its settings, not a rewrite of its documents.

Listing is conditional: before any world is migrated, Foundry staff confirm in `#dev-support` that they accept a fork of a listed system under the title we choose. If they refuse, ADR 0002 stands and the id stays `genesys`: the switch to the registry's `genesys` is not worth a migration of every world on its own, since it only happens if a version under `genesys` runs on the host's Foundry build and is above ours. Locking the system covers that case until we decide again.

ADR 0002 governs every release until the one that changes the id.

## Consequences

-   Foundry's AI Content Policy binds every listed version. Agents may still write code, as long as the maintainer answers for every line. Every user-facing English string, the welcome message and the listing description are written by the maintainer: about 160 English strings written since the fork are rewritten once, before the first listed version. French and Spanish translations are reviewed by a fluent speaker before each release.
-   Release candidates stay off the registry, which has no pre-release channel. Testers install them by manifest URL.
-   Stormyvil's Genesys modules declare only the `genesys` system and stop loading under the new id. We tell their author before submitting.
-   Each world is migrated once, by hand: the `world.json` edit can't be done from inside Foundry. Old compendium uuids resolve through `CONFIG.compendium.uuidRedirects`.

## Corrections to ADR 0002

-   Settings, flags and the socket are not all bound to the id. Flag data under `genesys` survives a change of id; only `getFlag` and `setFlag` refuse a scope that isn't a running package's. The socket is gone since 0.3.0. Settings register under any namespace, but one that isn't the system's id shows under "Unmapped": the 20 settings move to the new namespace, copied before any data migration reads its version from them.
-   Foundry switches an install to the registry only when the newest registry version that runs on the current Foundry build is above the version our manifest serves, not the installed one. Locking a package hides its Update button and makes Update All skip it.
