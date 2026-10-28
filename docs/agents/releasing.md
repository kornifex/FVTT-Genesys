# Releasing

release-please keeps a release PR open on each release line, titled `chore: release <version>`. It holds the changelog and the version (`package.json`, `yaml/system.yml`), both computed from the Conventional Commits. Merging it releases: the `Release` workflow tags the version, checks and builds it, attaches `manifest.json` and `genesys.zip`, and publishes the GitHub Release. The maintainer merges a release candidate's PR once `e2e:all` passes, so that testers can install it for the table tests, and the final version's PR once the release's test checklist issue is done.

## Release lines

ADR 0003 sets two lines, each with its own release PR and its own `release-please-config.json`:

- `main` prepares 0.5.0, for Foundry v13 and v14.
- `0.4.x` prepares 0.4.0 and its fixes, for Foundry v12 and v13. It was cut from the code of `0.4.0-rc.1`, so the rest of 0.4.0's candidates and the final version come from it. It only takes the fixes our table needs, and is retired once the table runs v13.

A fix goes to the line of the release that needs it: a PR whose base is `0.4.x` for 0.4.0, then a cherry-pick PR to `main` when the code is still shared. A `feat` would bump `0.4.x`'s minor, so it doesn't go there.

A release is marked latest, the one Foundry offers as an update, unless a higher version already is: once 0.5.0 is out, a 0.4.x fix stays off `releases/latest`, and the table installs it from its versioned manifest.

## Before merging the release PR

1. `pnpm e2e:all` passes on every supported Foundry version, on the release PR's head: it runs every scenario of `e2e/scenarios/` and exits with 1 on a failed assertion ([`e2e/README.md`](../../e2e/README.md)). It needs the licensed installs, so it can't run in CI.
2. Its summary (the last lines it prints) goes into a comment on the release's test checklist issue.
3. For the final version only: the checklist items no test proves, listed atop that issue, are tested at the table, on a release candidate.

## Versions

- In 0.x, `feat` and breaking changes bump the minor, `fix` the patch.
- A version with a pre-release part (`0.4.0-rc.1`) is published as a GitHub pre-release. Foundry reads `releases/latest` for updates, so only testers get it, by installing `https://github.com/kornifex/FVTT-Genesys/releases/download/v<version>/manifest.json`.
- Foundry never offers `0.4.0` as an update to `0.4.0-rc.1`: it compares `0` with `0-rc` as text. Testers reinstall the final version from its manifest.

## Release candidates

`release-as` in `release-please-config.json` forces the next version. It has to change after every release, or the next release PR reuses a version that already exists:

1. A `ci:` PR sets `release-as` to the candidate (`0.4.0-rc.1`), and release-please updates its release PR. The maintainer merges that release PR once `e2e:all` passes, and the table tests run on the published candidate.
2. Once that candidate is out, and before any other release PR is merged, the next `ci:` PR sets the next one (`0.4.0-rc.2`) when testers need to test again, or the final version (`0.4.0`).
3. After the final version is out, a `ci:` PR removes `release-as`.

These PRs target the line of the release: `0.4.x` for 0.4.0's candidates.

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
