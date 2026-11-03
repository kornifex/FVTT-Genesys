# Releasing

release-please keeps a release PR open on `main`, titled `chore: release <version>`. It holds the changelog and the version (`package.json`, `yaml/system.yml`), both computed from the Conventional Commits. Merging it releases: the `Release` workflow tags the version, checks and builds it, attaches `manifest.json` and `genesys.zip`, and publishes the GitHub Release. The maintainer merges a release candidate's PR once `e2e:all` passes, so that testers can install it for the table tests, and the final version's PR once the release's test checklist issue is done.

## Release lines

`main` is the only release line: it prepares 0.6.0, for Foundry v13 and v14. ADR 0003's `0.4.x` line, for Foundry v12 and v13, was retired once 0.5.0 was out and the table ran v14: 0.4.0 is its last release, and its branch takes no more fixes.

A release PR with nothing for the table, only `ci:`, `docs:` or `chore:` commits, can be closed, with its `autorelease: pending` label removed: release-please ignores a closed PR, and opens a new one on the next push, such as a fix's merge.

A release is marked latest, the one Foundry offers as an update, unless a higher version already is.

## Before merging the release PR

1. `pnpm e2e:all` passes on every supported Foundry version, on the release PR's head: it runs every scenario of `e2e/scenarios/` and exits with 1 on a failed assertion ([`e2e/README.md`](../../e2e/README.md)). It needs the licensed installs, so it can't run in CI.
2. Its summary (the last lines it prints) goes into a comment on the release's test checklist issue.
3. For the final version only: the checklist items no test proves, listed atop that issue, are tested at the table, on a release candidate.

Before that, a PR rewrites the summary of the welcome message, which the GM reads in the chat when the world runs a new version: a handful of the changes that matter at the table, since the previous release candidate for a candidate, since the previous final version for a final version. Each change is a line of `public/templates/chat/alpha-notice.hbs`, tagged FIX, FEATURE or STYLING and linked to its PR, and a key under `Genesys.AlphaNotice` in every language file. The last line links to the version's GitHub Release, for every change.

## Release notes

release-please's list in a GitHub Release only holds the commits since the previous release, a candidate's included. Once the version is published, a hand-written summary goes above it:

- For a candidate: a French "Pour la table, en bref" section for the testers, with the install link and the changes since the previous candidate.
- For a final version: an "Upgrading from <previous final version>" section in English (the Foundry versions, the backup, what breaks a macro or a module), then the French section, with every change since the previous final version, as features, fixes and other changes, and last the ones since the last candidate.

The wiki's [Changes since the fork](https://github.com/kornifex/FVTT-Genesys/wiki/Changes-since-the-fork) page gets a final version's changes too, each with its first release, and the README's "What's new since the fork" its biggest ones.

## Versions

- In 0.x, `feat` and breaking changes bump the minor, `fix` the patch.
- A version with a pre-release part (`0.4.0-rc.1`) is published as a GitHub pre-release. Foundry reads `releases/latest` for updates, so only testers get it, by installing `https://github.com/kornifex/FVTT-Genesys/releases/download/v<version>/manifest.json`.
- Foundry never offers `0.4.0` as an update to `0.4.0-rc.1`: it compares `0` with `0-rc` as text. Testers reinstall the final version from its manifest.

## Release candidates

`release-as` in `release-please-config.json` forces the next version. It has to change after every release, or the next release PR reuses a version that already exists:

1. A `ci:` PR sets `release-as` to the candidate (`0.4.0-rc.1`), and release-please updates its release PR. The maintainer merges that release PR once `e2e:all` passes, and the table tests run on the published candidate.
2. Once that candidate is out, and before any other release PR is merged, the next `ci:` PR sets the next one (`0.4.0-rc.2`) when testers need to test again, or the final version (`0.4.0`).
3. After the final version is out, a `ci:` PR removes `release-as`.

## Changelog

- Every commit type has a section. A commit that is not a Conventional Commit is left out.
- To change what a merged PR adds to the changelog, edit that PR's body before the release PR is merged: a `BEGIN_COMMIT_OVERRIDE` … `END_COMMIT_OVERRIDE` block replaces its commit, and can hold several messages separated by blank lines.

## Token

The workflow opens the release PR with the `RELEASE_PLEASE_TOKEN` secret, a fine-grained PAT (Contents and Pull requests, read and write, this repository only): a PR opened with the `GITHUB_TOKEN` runs no workflow, and `main` requires the CI checks. When it expires, renew it under the same name.

## A release by hand

To test the workflow without a release PR, push a tag, create a draft pre-release on it, and run the workflow on it. A draft gets no tag until published, so the tag comes first:

```sh
git push origin <sha>:refs/tags/v<version>
gh release create v<version> --verify-tag --draft --prerelease
gh workflow run release.yml --ref main -f tag=v<version>
```

Delete it afterwards with `gh release delete v<version> --cleanup-tag`: release-please could take it for the latest release.
