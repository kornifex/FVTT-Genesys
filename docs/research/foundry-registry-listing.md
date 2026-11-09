# How a system gets listed in the Foundry package registry

Research for [#602](https://github.com/kornifex/FVTT-Genesys/issues/602), part of the map [#601](https://github.com/kornifex/FVTT-Genesys/issues/601) (list the system under a new id, or stay off the registry). Sources were read on 2026-11-09. Every claim links to the page it comes from; claims marked **unconfirmed** have no primary source, and claims marked **inference** are our reading of several sources together.

## Summary

-   Submitting needs a logged-in foundryvtt.com account that owns an active Foundry VTT license. Systems go through a **manual review and approval** by Foundry staff. No official review time is published. ([Packages page](https://foundryvtt.com/packages/), [FAQ](https://foundryvtt.com/article/faq/))
-   The review checks rights, not code quality: does the author have the rights to everything in the package, does third-party content meet its owner's license, is the art the author's own. ([Licensed Content](https://foundryvtt.com/article/licensing-guide/))
-   A listed package must comply with the [AI Content Policy](https://foundryvtt.com/article/ai-policy/) from its first submission. The listing's description must be written by a human. Its cost is a separate ticket of #601.
-   One listing per id; the `genesys` id is taken. Foundry publishes **no rule** on forks of listed packages or on titles that share a word with another listing; listed modules named "Genesys …" exist. The only title rule found: don't put "Foundry Virtual Tabletop" in the title.
-   Foundry **does not require** a trademark disclaimer. Assembling Kings' disclaimer is their own text. The [Terms of Service](https://foundryvtt.com/article/terms-of-service/) forbid trademark infringement on the platform, which puts the burden on us.
-   After approval, new versions can be published from CI with the [Package Release API](https://foundryvtt.com/article/package-release-api/): one POST per version with a per-package token, a dry-run mode, and **no pre-release flag**. Our release assets already fit what it asks for (a manifest pinned to each release).

## The account

-   "Packages can be submitted by any user who is the owner of an active Foundry Virtual Tabletop software license." ([Packages page](https://foundryvtt.com/packages/), footer)
-   The submission form needs a login: an anonymous visitor to <https://foundryvtt.com/packages/submit> gets "You must be a logged in user to submit a new package listing." (fetched 2026-11-09)
-   Registering an account binds its owner to the [Terms of Service](https://foundryvtt.com/article/terms-of-service/). Item 2: "I will not use the Software or its Communities to violate intellectual property law, including but not limited to copyright or trademark infringement."
-   Developing and publishing packages at all falls under the **Limited License for Package Development**, part of the [Software License](https://foundryvtt.com/article/license/) (version 11.293, 2023-03-02). Its four terms: packages may reference or duplicate Foundry code only as far as strictly necessary and must not work without the software; they may be distributed only for use with a licensed copy; the author answers for the intellectual property of their content; each published change binds the package to the latest version of the license. These terms apply whether or not the package is listed ([AI Content Policy §1.2](https://foundryvtt.com/article/ai-policy/)).

## The submission form

-   The [system development guide](https://foundryvtt.com/article/system-development/) links the form at <https://foundryvtt.com/packages/submit>; the packages page footer links `/creators/submit/`. Both send an anonymous visitor back to the packages page with the login notice above. Its fields are behind the login and couldn't be read for this note: **unconfirmed** from a primary source.
-   A community source, the League of Foundry Developers' [module template README](https://github.com/League-of-Foundry-Developers/FoundryVTT-Module-Template/blob/master/README.md) (written around 2021, before the current front-end tools), describes it: "Package Name" must match the id in the manifest, "Package Title" is the display name, "Package URL" is the repository URL.
-   The [AI Content Policy §4.4](https://foundryvtt.com/article/ai-policy/) says authors "must attest" at submission that they understand and can maintain every part of their code. Whether the form carries that attestation as a checkbox is **unconfirmed**.

## The staff review and its delay

-   "The on-boarding process for Modules and Systems requires a manual review and approval." ([FAQ](https://foundryvtt.com/article/faq/), [Packages page](https://foundryvtt.com/packages/))
-   What reviewers look at ([Licensed Content](https://foundryvtt.com/article/licensing-guide/)):
    -   "Does the author have the rights to everything this module contains?"
    -   "Does it contain content from another company, and if so, does it meet that company's licensing requirements?"
    -   "Does it contain art assets which the author did not create?"
    -   Whole pages copied from a rulebook are refused without a license; "a line or two of text from a rule-book" inside a mostly original package is usually fine. Modules that only change core functionality are "mostly exempted", "as they primarily bring code changes". A game system is mostly code too, but its compendiums (talents, qualities, skills) are rules text: the reviewer will look at them.
    -   Artwork, icons and music must be ours to distribute. That covers the dice and symbol images we ship.
-   **Delay: unconfirmed.** Foundry publishes no timeline. The [module template README](https://github.com/League-of-Foundry-Developers/FoundryVTT-Module-Template/blob/master/README.md) says staff "will typically get back to you with an approval or any further questions within a few days" (community source, about 2021). The [AI Content Policy §7](https://foundryvtt.com/article/ai-policy/) says of compliance reports that Foundry does not "commit to specific investigation timelines".
-   After approval the author gets an **Edit** button on the package page and in <https://foundryvtt.com/me/packages>, which replaced the old `/admin` panel in December 2023 ([New front-end package management tools](https://foundryvtt.com/article/front-end-package-management/)).
-   A new package starts with no version. "If a package has no Package Versions present, it will not be available on either the official package list or in the Foundry UI." ([Package Management](https://foundryvtt.com/article/package-management/)) So listing takes two steps: approval, then a first version.

## What the package must meet

### Manifest

-   The id must be unique and match the folder name. The [system development guide](https://foundryvtt.com/article/system-development/) asks for "an all lower-case string with no special characters"; the [module guide](https://foundryvtt.com/article/module-development/) adds "hyphens (not underscores) to separate multiple terms". The software itself is looser: `BasePackage.validateId` (Foundry 14 client-side `common/packages/base-package.mjs`) accepts `^[A-Za-z0-9-_]+$` and rejects Windows device names (`con`, `prn`, `aux`, `nul`, `com0-9`, `lpt0-9`).
-   Required fields: `id`, `title`, `description`, `version` ([system development guide](https://foundryvtt.com/article/system-development/)). The manifest schema also has `license`, `url`, `manifest`, `download`, `compatibility` ([BasePackage API](https://foundryvtt.com/api/classes/foundry.packages.BasePackage.html)).
-   `manifest`: "A stable URL that describes the latest release version of your system manifest file", consulted on each update check. `download`: "A public URL that provides a zip archive of your system." ([system development guide](https://foundryvtt.com/article/system-development/))
-   Each **registry version** points to the manifest **of that version**, whose `download` is the zip of that version only, so users can install an older version from the history ([Package Management](https://foundryvtt.com/article/package-management/); [Package Release API](https://foundryvtt.com/article/package-release-api/): "it should point to a **specific** release").
-   Compatibility: `minimum` and `maximum` are hard limits, `verified` is a hint. For systems, Foundry suggests setting `maximum` to the current generation until the next one is verified, so worlds don't migrate forward with no way back ([Package Management](https://foundryvtt.com/article/package-management/)).

Our releases already fit: `release.yml` attaches `manifest.json` and `genesys.zip` to each GitHub release, and `build/pinRelease.ts` pins the release's `download` to its own tag, while the manifest's own `manifest` field stays on `releases/latest`. The per-version manifest URL is `https://github.com/kornifex/FVTT-Genesys/releases/download/<tag>/manifest.json`.

### License

-   Foundry asks for **no particular license** on the package's code: none of the pages read sets one, and the manifest's `license` field is optional ([BasePackage API](https://foundryvtt.com/api/classes/foundry.packages.BasePackage.html)). Our MIT license (Mezryss 2023, kornifex 2026) lets us redistribute the fork's code.
-   What matters is the rights over the content ([Licensed Content](https://foundryvtt.com/article/licensing-guide/)): rules text, names and art from the Genesys books. Foundry points authors to the publisher: "the best answers about compliance will **always** come from the publishers themselves."

### Download hosting

-   Any public URL works; Foundry recommends "the tags and releases features which are supported by most git repositories" ([module development guide](https://foundryvtt.com/article/module-development/)). GitHub releases, as today, need no change.

## Id and title

-   **One listing per id.** The listing URL is `/packages/<id>`, dependencies are resolved "from the Foundry VTT website listing" by id ([system development guide](https://foundryvtt.com/article/system-development/)), and a release names its package by id ([Package Release API](https://foundryvtt.com/article/package-release-api/)). `genesys` belongs to Assembling Kings' listing "Genesys Unofficial (Alpha)" ([listing](https://foundryvtt.com/packages/genesys)). Their rewrite's id `ak-genesys` had no listing on 2026-11-09 (<https://foundryvtt.com/packages/ak-genesys> returns 404).
-   **Forks: no published rule** allows or forbids listing a fork of a listed package. The review asks whether the author "has the rights to everything" ([Licensed Content](https://foundryvtt.com/article/licensing-guide/)); the MIT license gives us those rights over the code. **Inference:** a fork under its own id is reviewed like any other package. Asking staff before submitting (Discord `#dev-support`, or the [contact form](https://foundryvtt.com/contact-us/)) would settle it.
-   **Titles: no published rule** on uniqueness or on sharing a word with another listing. Listed modules already use "Genesys" in their title and id: [Genesys Status Effects](https://foundryvtt.com/packages/genesys-status-effects), [Genesys Weapon Qualities](https://foundryvtt.com/packages/Genesys-Weapon-Qualities), [Automated Animations – Genesys Support](https://foundryvtt.com/packages/aa-genesys).
-   The one title rule found: don't use "Foundry Virtual Tabletop" in a project's title, and avoid shortening it to "Foundry" ([Branding Guide](https://foundryvtt.com/article/branding/)).
-   Those three modules list "Genesys Unofficial (Alpha)", the `genesys` id, under "Supported Game Systems". **Inference:** under a new id they would not declare support for our system until their author adds it.

## The trademark disclaimer

-   Foundry **does not require** a disclaimer in the listing or the manifest: none of the pages read asks for one. The Terms of Service only forbid infringing trademarks on its platforms ([Terms of Service](https://foundryvtt.com/article/terms-of-service/), item 2).
-   Assembling Kings' listing carries its own "Copyright Disclaimer" ([listing](https://foundryvtt.com/packages/genesys)): the project is unaffiliated with EDGE Studio and Fantasy Flight Games, unrelated to Genesys Foundry (their community content program), and "Genesys and its logo, and Genesys Foundry and its logo, are trademarks of Fantasy Flight Games in the U.S.A. and other countries."
-   Who owns the Genesys trademark today, and whether EDGE Studio or Fantasy Flight Games publish a fan content policy, is **unconfirmed**: no publisher policy was found. Note that "Genesys Foundry" is also a trademark per that disclaimer, a second reason to keep "Foundry" out of our title.
-   The listing description is marketing material, so it "must be human-written" ([AI Content Policy §4.5](https://foundryvtt.com/article/ai-policy/)). The disclaimer belongs to it.

## The Package Release API

All from [Package Release API](https://foundryvtt.com/article/package-release-api/) unless noted.

-   **What it does:** creates a new version on an already approved package, updates its "last updated" date, and posts a release note to the Foundry Discord. It replaces filling the version form by hand.
-   **Endpoint:** `POST https://foundryvtt.com/_api/packages/release_version/`
-   **Token:** the "Package Release Token" field on the package's edit page, just above "Save Package", one per package, prefixed `fvttp_`. Sent as is in the `Authorization` header (no `Bearer`). A "Refresh" button revokes it and issues a new one; a leaked token gets refreshed or revoked by Foundry. It exists only once the package is approved.
-   **Payload:**

    ```json
    {
    	"id": "example-module",
    	"dry-run": true,
    	"release": {
    		"version": "1.0.0",
    		"manifest": "https://github.com/example/example-module/releases/download/release-1.0.0/system.json",
    		"notes": "https://github.com/example/example-module/releases/tag/release-1.0.0",
    		"compatibility": { "minimum": "10.312", "verified": "11", "maximum": "" }
    	}
    }
    ```

    `id`, `release.version`, `release.manifest` (pinned to the version), `release.compatibility.minimum` and `.verified` are required; `notes`, `maximum` and `dry-run` are optional. The documented compatibility values are strings.

-   **Dry run:** `"dry-run": true` validates and processes the request without saving, and answers `200` with "Dry run completed successfully. To save, submit the request again without dry-run". Whether it fetches the manifest URL to check it is **unconfirmed**.
-   **Responses:** `200` with `{"status": "success", "page": "https://foundryvtt.com/packages/<id>/edit/"}`; `400` with field errors, including `__all__` / `unique_together` when the version already exists; `429` with `Retry-After` when two releases of a package arrive within 60 seconds.
-   **Pre-releases: the API has no pre-release flag**, and the registry has no channels. The Setup screen installs "the latest release with a matching core version" from the listing, and an update check prompts users when the listing's manifest points to a newer version ([Package Management](https://foundryvtt.com/article/package-management/)). **Inference:** a release candidate sent to the registry reaches every user, and its Discord note is public. Release candidates should stay off the registry and keep their manifest URL install, as today. A known quirk adds to this: Foundry's `isNewerVersion` doesn't see `0.6.0` as newer than `0.6.0-rc.1` (see `docs/agents/releasing.md`).
-   **Third-party wrappers** exist, such as the [Publish FoundryVTT Package](https://github.com/marketplace/actions/publish-foundryvtt-package) GitHub Action. A plain `curl` is enough and adds no dependency.

### Calling it from `release.yml` (sketch, untested)

A step at the end of the `publish` job, for final versions only, with the token stored as the repository secret `FOUNDRY_RELEASE_TOKEN`. It reads the id, version and compatibility from the built `dist/system.json`, and turns the compatibility numbers into strings.

```yaml
- name: Publish to the Foundry package registry
  if: ${{ !contains(env.TAG, '-') }}
  env:
      FOUNDRY_RELEASE_TOKEN: ${{ secrets.FOUNDRY_RELEASE_TOKEN }}
  run: |
      jq --arg repo "$GITHUB_REPOSITORY" --arg tag "$TAG" '{
        id: .id,
        release: {
          version: .version,
          manifest: "https://github.com/\($repo)/releases/download/\($tag)/manifest.json",
          notes: "https://github.com/\($repo)/releases/tag/\($tag)",
          compatibility: (.compatibility | map_values(tostring))
        }
      }' dist/system.json > foundry-release.json
      curl --fail-with-body --silent --show-error \
        -X POST https://foundryvtt.com/_api/packages/release_version/ \
        -H 'Content-Type: application/json' \
        -H "Authorization: $FOUNDRY_RELEASE_TOKEN" \
        --data @foundry-release.json
```

The same body with `"dry-run": true` could run before `Publish the Release`, so a refused version stops the job before the GitHub release goes public. The step should also skip a final version lower than the latest, such as a fix on a retired line, as `Publish the Release` already does for `releases/latest`: **unconfirmed** whether the registry would then offer the lower version to new installs on the matching Foundry generation.

## Open questions

-   The submission form's fields, and whether it carries the AI attestation: readable only once logged in.
-   How long the review takes today. Only a community estimate ("a few days", about 2021) exists.
-   Whether staff accept a fork of a listed system, and a title close to "Genesys Unofficial (Alpha)". Worth asking on Discord `#dev-support` before submitting.
-   Whether the review requires a publisher license or permission to ship Genesys rules text in compendiums, and who to ask at EDGE Studio or Fantasy Flight Games.
-   Whether a dry run fetches the manifest, and how the registry orders versions when a lower version is published after a higher one.
