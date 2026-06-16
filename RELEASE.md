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

The GitHub Actions release workflow validates the package, checks that the tag matches `VERSION`, and attaches the extension ZIP to a GitHub Release.

The workflow is intentionally limited:

- package validation runs with read-only repository contents
- publishing gets `contents: write` only in the tag-only release job
- external Actions are pinned to full commit SHAs
- workflow files are checked for forbidden triggers, secret usage, broad write permissions, and shell-download pipes
- no repository or organization secrets are required

## Upload to GNOME Extensions

1. Download the ZIP from the GitHub Release, or use the local file:

```text
dist/appindicator-hider@theophilediot.github.io.shell-extension.zip
```

2. Sign in at:

```text
https://extensions.gnome.org/upload/
```

3. Upload the ZIP and wait for review.

## Review Notes

- The package must contain only runtime files: `metadata.json`, `extension.js`, `prefs.js`, and the schema XML.
- `schemas/gschemas.compiled` and files under `dist/` are generated artifacts and must stay out of source control.
- GNOME review guidelines require cleanup of all Shell-side state in `disable()` and no GTK/Adwaita imports in `extension.js`.
- Before tagging, review the full diff for secrets, generated files, unpinned Actions, and unexpected release workflow permission changes.
