# Contributing

Thanks for helping improve AppIndicator Hider. Keep changes focused, reproducible, and easy to review.

## Branches

- Open normal pull requests against `dev`.
- Keep `main` for release-ready code and release tags.
- Release PRs should merge `dev` into `main`, then tag the merged `main` commit.

## Issues

Use the issue templates. A useful bug report includes:

- GNOME Shell version
- Wayland or X11 session type
- Linux distribution
- extension version, release, or commit
- affected AppIndicator/KStatusNotifier app
- exact reproduction steps
- relevant GNOME Shell or preferences logs with private data removed

## Pull Requests

Before opening a PR:

- keep the change scoped to the extension, preferences UI, metadata, schemas, packaging, docs, or release workflow
- avoid unrelated refactors
- do not commit generated artifacts such as `schemas/gschemas.compiled` or files under `dist/`
- do not include credentials, tokens, cookies, private keys, or private logs
- run `make release-check` when the change touches runtime files, schemas, metadata, packaging, or release docs

## Security Expectations

- Do not add repository or organization secrets unless a maintainer explicitly approves the release design.
- Do not add third-party GitHub Actions. If an Action is necessary, pin it to a full 40-character commit SHA and include the upstream version as a comment.
- Keep workflow permissions least-privilege. Validation jobs should use read-only repository contents.
- Do not add `pull_request_target`, `workflow_run`, or `repository_dispatch` workflows for this project.
- Avoid vendored, minified, generated, or binary blobs unless a maintainer explicitly asks for them.
- Remove private data from issue reports, screenshots, logs, and shell output before posting.

See `SECURITY.md` for the release security policy.

## Local Development

Install from source:

```bash
make install
```

Restart GNOME Shell:

- X11: press `Alt` + `F2`, type `r`, press `Enter`
- Wayland: log out and back in

Enable the extension:

```bash
gnome-extensions enable appindicator-hider@theophilediot.github.io
```

Open preferences:

```bash
gnome-extensions prefs appindicator-hider@theophilediot.github.io
```

## Validation

Run the release check before release-facing changes:

```bash
make release-check
```

This runs schema compilation, package validation, a lightweight secret scan, and workflow security checks.

The package should contain only:

- `extension.js`
- `prefs.js`
- `metadata.json`
- `schemas/org.gnome.shell.extensions.appindicator-hider.gschema.xml`

## GNOME Shell Extension Rules

- Keep `metadata.json` minimal and do not add a manual `version` key.
- Use stable GNOME Shell versions only in `shell-version`.
- Create Shell-side state from `enable()` and clean it up in `disable()`.
- Do not import GTK, Gdk, or Adwaita in `extension.js`.
- Do not import Shell, St, Clutter, or Meta in `prefs.js`.
- Gate debug logging behind settings.

## Releases

Source releases are tracked with `VERSION` and tags such as `v0.1.0`.
The GNOME Extensions website assigns its own version after upload, so `metadata.json` intentionally has no `version` key.

See `RELEASE.md` for the maintainer release flow.
