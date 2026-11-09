# When Foundry switches an install to the registry listing

Research for #604 (map #601). Question: under which conditions do Foundry v13 and v14 offer or perform a switch of an installed package to the registry listing that has the same id, what protects an install, and is our table exposed if Assembling Kings puts their 14.x rewrite under the `genesys` listing?

Checked on 2026-11-09 against Foundry 13.348 and 14.369 (the latest stable is 14.370; its notes change nothing here).

## Answer in short

-   **Both versions compare two candidates on every update check**: the version served by the manifest URL the install tracks, and the newest version on the registry listing with the same id that is compatible with the running Foundry build. When the registry's candidate is the higher one, the registry wins. Otherwise the install keeps following its own manifest. (Experiment below.)
-   **v13 asks; v14 doesn't.** v13 shows a "Updated version available at new installation URL" dialog whose default button switches. v14 (from 14.366) has no such dialog any more: Update and Update All install straight from the registry's manifest URL.
-   **The manifest URL an install came from protects nothing** once the registry has a higher compatible version. It only protects while the registry has nothing higher, or nothing compatible with the running build.
-   **Locking the package is the only setting that prevents it**: a locked package has no Update button and is skipped by Update All, in v13 and v14 alike.
-   **The table isn't exposed today.** The `genesys` listing's newest version is 0.2.18, capped at Foundry 13: on v14 the registry has no candidate, and on v13 it's lower than our 0.5.0. **It becomes exposed the moment the listing gets any 14.x version compatible with the host's build**: the next time the host clicks Update on the system, or Update All on Game Systems, v14 replaces our system with Assembling Kings' rewrite, without a prompt.

## What the sources say

### The v14 change: 14.366

Release 14.366 (V14 Stable 8, 2026-08-14), Package Development: "Package update checks now use the website package repository instead of the upstream manifest, so updates offer the most recent version compatible with your Foundry version." ([release notes](https://foundryvtt.com/releases/14.366), [foundryvtt#7547](https://github.com/foundryvtt/foundryvtt/issues/7547), milestone "V14 Stable 8 - 14.366", part of the package-installation epic [foundryvtt#14528](https://github.com/foundryvtt/foundryvtt/issues/14528)).

The same notes introduce a new package index that "allows us to know what the latest version of a package for your given core version is" ([release notes](https://foundryvtt.com/releases/14.366)). #7547 was about users stuck on an old version when the newest release needed a newer Foundry; the fix is aimed at that, not at forks. A later issue describes the shipped behaviour as "hitting update on a package now grabs the latest _compatible_ version if the absolute latest version is not compatible with your current core version" ([foundryvtt#14757](https://github.com/foundryvtt/foundryvtt/issues/14757)).

The notes of 14.367, 14.368, 14.369 and 14.370 contain no further change to update checks ([14.367](https://foundryvtt.com/releases/14.367), [14.368](https://foundryvtt.com/releases/14.368), [14.369](https://foundryvtt.com/releases/14.369), [14.370](https://foundryvtt.com/releases/14.370)). Neither do 13.350 and 13.351 ([13.350](https://foundryvtt.com/releases/13.350), [13.351](https://foundryvtt.com/releases/13.351)).

### The documented v13 flow

The Knowledge Base article "Package Management", section "How Foundry checks for Package Updates" ([article](https://foundryvtt.com/article/package-management/)), still describes the pre-14.366 flow:

1. The user clicks "Check Update" on a package or "Update All".
2. If the package is listed in the Package Repository, Foundry checks whether the listing's `manifest` "has changed … and points to a newer version compatible with the installed version of Foundry"; if so it asks whether to keep the local value or use the repository's ("recommended"), and "Yes" overwrites the local `manifest`.
3. Otherwise Foundry fetches the installed manifest's URL and compares versions.

The idea dates back to 0.8.2, where the repository was added as a source for forks taken over by a new maintainer: "This will allow for occasions where repositories that have been forked will be able to continue using the current package listing without the user having to uninstall/reinstall" ([foundryvtt#4219](https://github.com/foundryvtt/foundryvtt/issues/4219)). In that thread, users asked for installs made by manifest URL to be exempt from repository updates, "to continue tracking alternate package branches/forks without worrying about newly published package versions changing targets on them"; that was never built ([foundryvtt#4219](https://github.com/foundryvtt/foundryvtt/issues/4219)). An opt-out flag for manifests, "which bypasses attempts to sidegrade or discover available updates through the foundryvtt.com website", has been open since 2022 ([foundryvtt#8524](https://github.com/foundryvtt/foundryvtt/issues/8524)).

### The client code (allowed: client-side only)

Foundry 13.348, `public/scripts/foundry.mjs`, class `SetupPackages`:

-   `#updateCheck` turns a server response carrying `trackChange: {manifest, version}` into the state `"trackChange"`, and `#promptTrackChange` shows `templates/setup/manifest-update.hbs`. Its strings are `SETUP.ManifestUpdate` ("Updated version available at new installation URL"), `SETUP.ManifestUpdateAvailable` ("A newer version of "{package}" is available at a different installation URL. This happens when the package hosting location or the author has changed.") and `SETUP.SwapToTheUpdatedManifest` ("Would you like to switch to the new manifest URL? (this is recommended)"). "Yes" is the default button.
-   Accepting writes the new URL into the package's `manifest` and installs from it. Declining stores the installed version in the core setting `declinedManifestUpgrades`, keyed by package id, so the prompt stays silent until the installed version changes.
-   A plain update installs from the package's own `manifest` (`pkg.manifest`).

Foundry 14.369, same class:

-   No `"trackChange"` state, no `#promptTrackChange`, no `declinedManifestUpgrades`; the four strings above are gone from `lang/en.json`.
-   An update installs from the manifest URL the server returns with the check (`responseData.manifest`), no longer from `pkg.manifest`. The only dialog left on that path is the module-to-system compatibility warning, which doesn't apply to a system.

Both versions:

-   Update All only takes packages that have a `manifest` and are not `locked`, and the Update button is only rendered for packages that are not locked (`templates/setup/parts/package-*.hbs`, `{{#unless package.locked}}`). The lock's hint reads "Locking a Package prevents it from being uninstalled or updated" (`SETUP.LockHint`). It is toggled from the package's context menu in Setup ("Lock System").
-   Updates run only when someone clicks Update or Update All: nothing in Setup triggers them on its own.

## Experiment

The server-side code that picks the update can't be read (licence), so its behaviour was observed from outside. For each build, a throwaway data directory held fake installed systems: only a `system.json`, never downloaded or installed. A headless browser opened the Setup screen and called `game.checkPackage({type: "system", id})`, the call behind the Update button, and recorded the server's answer. A local HTTP server played the part of a fork's manifest URL.

`dnd5e` stands in for a listing that has versions for the running build: on 2026-11-09 its registry offers 6.0.6 (14.367+) and, for 13.348, 5.1.10 (13.347+) ([listing](https://foundryvtt.com/packages/dnd5e)). `genesys` is the real case: registry 0.2.18 for Foundry 12–13 ([listing](https://foundryvtt.com/packages/genesys)), our manifest URL serving 0.5.0.

| Build  | Installed                    | Its manifest serves | Registry, newest compatible | Server's answer                                                                             |
| ------ | ---------------------------- | ------------------- | --------------------------- | ------------------------------------------------------------------------------------------- |
| 14.369 | `dnd5e` 0.0.1, fork manifest | 0.0.2               | 6.0.6                       | update, manifest = registry's `release-6.0.6/system.json` (**switch, no prompt in the UI**) |
| 14.369 | `dnd5e` 0.0.1, fork manifest | 7.0.0               | 6.0.6                       | update, manifest = the fork's                                                               |
| 14.369 | `genesys` 0.4.0, our URL     | 0.5.0               | none (0.2.18 is v12–13)     | update, manifest = ours                                                                     |
| 14.369 | `genesys` 0.1.0, our URL     | 0.5.0               | none (0.2.18 is v12–13)     | update, manifest = ours                                                                     |
| 13.348 | `dnd5e` 0.0.1, fork manifest | 0.0.2               | 5.1.10                      | `trackChange` to registry's `release-5.1.10/system.json` (**prompt**)                       |
| 13.348 | `dnd5e` 0.0.1, fork manifest | 7.0.0               | 5.1.10                      | update from the fork, no `trackChange`                                                      |
| 13.348 | `genesys` 0.4.0, our URL     | 0.5.0               | 0.2.18                      | update from ours, no `trackChange`                                                          |
| 13.348 | `genesys` 0.1.0, our URL     | 0.5.0               | 0.2.18                      | update from ours, no `trackChange`                                                          |

What it shows:

-   The server fetched the fork's manifest on every check (local access log), so both candidates are always looked at.
-   The registry wins only when its newest compatible version is higher than **the version the install's manifest serves**, not merely higher than the installed version: `genesys` 0.1.0 on 13.348 got no prompt, because 0.5.0 beats 0.2.18.
-   Registry versions that don't fit the running build are ignored: on 14.369 the `genesys` listing offers nothing.
-   The two builds pick the same candidate. The difference is the dialog: v13 asks, v14 installs.

Not covered: equal versions on both sides, prerelease versions such as `0.6.0-rc.1`, and a v14 build older than 14.366 (none at hand). The lock was checked in the client code only, not in this experiment.

## Exposure of the table

-   The host runs Foundry v14 since about 2026-11-03, on a build later than 14.366 if it's current. Its `genesys` was installed from our manifest URL, `https://github.com/kornifex/FVTT-Genesys/releases/latest/download/manifest.json`, which serves 0.5.0 today (README).
-   **Today: not exposed.** The listing's newest version, 0.2.18, is capped at Foundry 13, so a v14 install has no registry candidate. A v13 install would compare 0.2.18 with 0.5.0 and keep ours.
-   **When Assembling Kings publishes a 14.x version under the `genesys` listing**, compatible with the host's build (the rewrite targets v14; map #601 gives `ak-genesys` 14.5.0, 2026-10-26): 14.x is above any 0.x we ship, so the next Update on the system or Update All on Game Systems replaces our system with theirs, silently, and the install then tracks their manifest. Worlds keep `genesys` as their system and would load under a rewrite with a different data model.
-   A v13 table in the same situation would get the prompt, with the switch as its default button. If the new version needs v14, a v13 table sees nothing.
-   Possible second path, not verified: the "Reinstall" button of Setup's package warnings reinstalls from a manifest the server supplies, and its failure message speaks of "the central package repository" (`SETUP.ReinstallPackageNotFound`).
-   A user who installs "Genesys" from the Install System browser gets Assembling Kings' listing, overwriting ours. That is a new install, not a switch, but the effect is the same.

## Mitigations

Ordered from cheapest; none of them was decided here.

1. **Lock the system on the host** (Setup → Game Systems → context menu → Lock System). This is the only built-in protection. Updating our system then means unlocking and reinstalling from our manifest URL (Install System → Manifest URL, which replaces the installed system in place), not clicking Update. Today a manifest-URL install even overwrites a locked package; Foundry intends to block that ([foundryvtt#13524](https://github.com/foundryvtt/foundryvtt/issues/13524)), so the procedure should unlock first.
2. **Tell users**: README, the welcome message and the release notes for the table. Never click Update or Update All for the Genesys system; reinstall from the manifest URL; lock it; back up before updating.
3. **Keep our version above theirs.** v14 follows the higher version, so a fork version above Assembling Kings' would keep winning (second row of the table). Their versions follow Foundry generations (14.x), so this means renumbering ours above it and staying there, an arms race that breaks the meaning of our versions. Last resort.
4. **Ask Assembling Kings** not to put the rewrite under `genesys`, or to tell us before they do. They keep the listing for the rewrite (map #601), so this would at best buy time.
5. **List under a new id** (map #601). It removes the conflict for good, at the cost of the world migration ADR 0002 avoided. Until the table has migrated, the risk stays.
6. **Recovery** if it happens: reinstall from our manifest URL, then restore the world from a backup if the rewrite migrated it.

## Open questions

-   Does the server's check skip a locked package too, or is the lock only a UI guard? The client hides the button and filters Update All, which is enough for the table, but a module or script calling `game.checkPackage` / `game.installPackage` directly would bypass it.
-   What does the package-warnings Reinstall button install for a listed id whose installed manifest differs from the listing's?
-   How does the comparison treat our prerelease versions (`0.6.0-rc.1`) and equal versions?
-   Will Assembling Kings' rewrite, once listed under `genesys`, carry `id: genesys` in its manifest? If it carries `ak-genesys`, the outcome of a switch is unknown.
-   Which build does the host run, and does it ever click Update All?

## Note on ADR 0002

Its Consequences say "If that listing ever shows a higher version than the fork's, Foundry v12/v13 offers to switch the install back to it, and v14 (from 14.366) switches silently on update." This holds, with two precisions found here: the registry version must also be compatible with the running Foundry build, and it is compared with the version our manifest URL serves, not with the installed one. v12 wasn't tested.
