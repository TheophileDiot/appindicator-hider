# Release Process

`extensions.gnome.org` owns the extension version number shown on the GNOME website. Do not add a `version` key to `metadata.json`.

This repository tracks source releases with `VERSION` and matching Git tags such as `v0.1.0`.

## Branches

- `dev` is the integration branch for feature work, fixes, and Dependabot updates.
- `main` is the release branch.
- Open release PRs from `dev` to `main`, then tag the merged `main` commit.

## Prepare a Release

1. Start from `dev` and update `VERSION`.
2. Keep `metadata.json` minimal:
   - no `version` key
   - `shell-version` contains only current stable GNOME Shell releases
   - `uuid` remains `appindicator-hider@theophilediot.github.io`
3. Run:

```bash
make release-check
```

4. Commit the release changes.
5. Merge `dev` into `main`.
6. Tag the merged `main` commit:

```bash
git tag v$(cat VERSION)
git push origin main v$(cat VERSION)
```

The GitHub Actions release workflow validates the package, checks that the tag matches `VERSION`, and attaches the extension ZIP to a GitHub Release. When GNOME upload automation is enabled, the workflow then submits the same artifact to `extensions.gnome.org` for review.

The workflow is intentionally limited:

- package validation runs with read-only repository contents
- publishing gets `contents: write` only in the tag-only release job
- GNOME upload runs only after the GitHub Release job, only for tags, and only when explicitly enabled
- external Actions are pinned to full commit SHAs
- workflow files are checked for forbidden triggers, secret usage, broad write permissions, and shell-download pipes
- GitHub Release publishing uses the GitHub CLI from the runner, not a third-party release Action
- no repository or organization secrets are required unless GNOME upload automation is enabled

## GNOME Extensions Upload Automation

The release workflow can submit the GitHub Release artifact to `extensions.gnome.org` by using the official upload API. GNOME still reviews the submitted version before publishing it.

Configure GitHub before enabling the upload job:

1. Create an environment named `gnome-extensions`.
2. Add yourself as a required reviewer for that environment.
3. Add or refresh an environment secret named `GNOME_EXTENSIONS_TOKEN` shortly before release.
4. Add a repository variable named `GNOME_EXTENSIONS_UPLOAD_ENABLED` with value `true`.

Use a revocable `extensions.gnome.org` API token for `GNOME_EXTENSIONS_TOKEN`. Do not store your GNOME password in GitHub. The GNOME Extensions website uses short-lived Knox API tokens, so expect to refresh this secret before release submissions.

The workflow sends the release ZIP as `source` with `shell_license_compliant=true` and `tos_compliant=true` to:

```text
https://extensions.gnome.org/api/v1/extensions
```

If the repository variable is missing or set to anything other than `true`, the GNOME upload job is skipped and the GitHub Release still completes. If a fresh token is not available, keep automation disabled and use the manual upload path.

## Manual GNOME Upload

If automation is disabled, download the ZIP from the GitHub Release, sign in at:

```text
https://extensions.gnome.org/upload/
```

Then upload the ZIP and wait for review.

## Review Notes

- The package must contain only runtime files: `metadata.json`, `extension.js`, `prefs.js`, and the schema XML.
- `schemas/gschemas.compiled` and files under `dist/` are generated artifacts and must stay out of source control.
- GNOME review guidelines require cleanup of all Shell-side state in `disable()` and no GTK/Adwaita imports in `extension.js`.
- Before tagging, review the full diff for secrets, generated files, unpinned Actions, and unexpected release workflow permission changes.
